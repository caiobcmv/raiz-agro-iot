"""Central de Alertas e Incidentes: fila única (reativos + preditivos), curva térmica e exportação.

Os dois tipos de alerta vivem em tabelas diferentes (`alerta` e `alertas_preditivos`, com níveis e
status em formatos diferentes). Aqui eles são normalizados numa lista só:
  nivel  -> "baixo" | "medio" | "critico"   (alerta.nivel 'alto' e preditivo 'CRITICO' viram "critico")
  codigo -> "ALT-2026-001" (reativo) ou "PRD-2026-001" (preditivo); os ids das tabelas se repetem.
Escopo por dono: Produtor/Exportador só vê alertas dos próprios sensores/lotes.
"""
import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from psycopg2.extras import RealDictCursor

from src import config
from src.api.alerta_detalhe import classificar, iso_utc, minutos_desde, titulo_e_foco
from src.api.auditoria import auditar
from src.api.deps import get_conn
from src.api.deps_auth import get_current_user
from src.api.escopo import exigir_lote, id_dono

router = APIRouter(prefix="/central-alertas", tags=["central de alertas"])

NIVEIS = ("critico", "medio", "baixo")
_NIVEL_NORMAL = {
    "baixo": "baixo",
    "medio": "medio", "médio": "medio",
    "alto": "critico", "critico": "critico", "crítico": "critico",
}
_PERDA_CATEGORIA_NIVEL = {"baixo": "baixo", "médio": "medio", "medio": "medio", "alto": "critico"}
_ROTULO_NIVEL = {"critico": "Crítico", "medio": "Médio", "baixo": "Baixo"}
LIMITE_CSV = 5000


def normalizar_nivel(bruto) -> Optional[str]:
    return _NIVEL_NORMAL.get(str(bruto or "").strip().lower())


def montar_codigo(origem: str, id_: int, data_hora) -> str:
    prefixo = "ALT" if origem == "reativo" else "PRD"
    ano = data_hora.year if data_hora is not None else "0000"
    return f"{prefixo}-{ano}-{int(id_):03d}"


def _f(v):
    return None if v is None else float(v)


def _faixa_de(limites: dict, id_fruta, etapa):
    """Mesma regra de fn_alerta_faixa: transporte cai em armazenamento se não houver faixa própria."""
    if id_fruta is None or not etapa:
        return None
    r = limites.get((id_fruta, etapa))
    if r is None and etapa == "transporte":
        r = limites.get((id_fruta, "armazenamento"))
    if r is None:
        return None
    return {"temp_min": _f(r["temp_min"]), "temp_max": _f(r["temp_max"]),
            "umidade_min": _f(r["umidade_min"]), "umidade_max": _f(r["umidade_max"])}


# ---------------------------------------------------------------- fila
def montar_fila(cur, user, status: str = "aberto", nivel: Optional[str] = None, limit: int = 200) -> dict:
    dono = id_dono(user)

    cur.execute("SELECT upper(nivel) AS nivel, acao_recomendada FROM cortes_alerta_preditivo")
    acoes = {normalizar_nivel(r["nivel"]): r["acao_recomendada"] for r in cur.fetchall()}
    cur.execute("SELECT categoria::text AS categoria, fracao_perda FROM perda_risco")
    perdas = {_PERDA_CATEGORIA_NIVEL.get(r["categoria"]): round(float(r["fracao_perda"]) * 100, 1)
              for r in cur.fetchall()}
    cur.execute("""SELECT fk_fruta_id_fruta AS id_fruta, etapa::text AS etapa,
                          temp_min, temp_max, umidade_min, umidade_max FROM config_parametro""")
    limites = {(r["id_fruta"], r["etapa"]): r for r in cur.fetchall()}

    filtro_reativo = "" if status == "todos" else (
        " AND lower(a.status) = 'aberto'" if status == "aberto" else " AND lower(a.status) = 'reconhecido'")
    filtro_pred = "" if status == "todos" else (
        " AND upper(p.status) = 'EM ABERTO'" if status == "aberto" else " AND upper(p.status) = 'RECONHECIDO'")

    cur.execute(f"""
        SELECT a.id_alerta AS id, a.tipo_alerta, a.descricao, a.nivel::text AS nivel_bruto, a.status,
               a.data_hora, s.id_sensor, s.nome AS sensor_nome,
               lt.id_lote, lt.fk_fruta_id_fruta AS id_fruta, f.nome AS fruta, lt.destino,
               lt.quantidade, lt.unidade, fn_etapa_lote(lt.status) AS etapa
          FROM alerta a
          LEFT JOIN leitura_climatica r ON r.id_leitura = a.fk_leitura_id_leitura
          LEFT JOIN sensor s ON s.id_sensor = r.fk_sensor_id_sensor
          LEFT JOIN lote lt ON lt.id_lote = s.fk_lote_id_lote
          LEFT JOIN fruta f ON f.id_fruta = lt.fk_fruta_id_fruta
         WHERE (%s::int IS NULL OR s.fk_usuario_id_usuario = %s) {filtro_reativo}
    """, (dono, dono))
    reativos = cur.fetchall()

    cur.execute(f"""
        SELECT p.id_alerta_preditivo AS id, p.mensagem, p.nivel_severidade AS nivel_bruto, p.status,
               p.data_geracao AS data_hora, p.probabilidade_risco, p.previsao_data_hora,
               p.id_sensor, s.nome AS sensor_nome,
               lt.id_lote, lt.fk_fruta_id_fruta AS id_fruta, f.nome AS fruta, lt.destino,
               lt.quantidade, lt.unidade, fn_etapa_lote(lt.status) AS etapa
          FROM alertas_preditivos p
          LEFT JOIN lote lt ON lt.id_lote = p.id_lote
          LEFT JOIN fruta f ON f.id_fruta = lt.fk_fruta_id_fruta
          LEFT JOIN sensor s ON s.id_sensor = p.id_sensor
         WHERE (%s::int IS NULL OR lt.fk_usuario_id_usuario = %s) {filtro_pred}
    """, (dono, dono))
    preditivos = cur.fetchall()

    lotes_pred = [r["id_lote"] for r in preditivos if r["id_lote"] is not None]
    riscos = {}
    if lotes_pred:
        cur.execute("""
            SELECT DISTINCT ON (rc.fk_lote_id_lote)
                   rc.fk_lote_id_lote AS id_lote, rc.nivel_risco, rc.justificativa, rc.temperatura,
                   rc.umidade, rc.periodo_fim, m.nome AS modelo
              FROM risco_climatico rc
              LEFT JOIN ia_modelo m ON m.id_modelo = rc.fk_modelo_id_modelo
             WHERE rc.fk_lote_id_lote = ANY(%s)
             ORDER BY rc.fk_lote_id_lote, rc.data_previsao DESC""", (lotes_pred,))
        riscos = {r["id_lote"]: r for r in cur.fetchall()}

    itens = []
    for r in reativos:
        n = normalizar_nivel(r["nivel_bruto"])
        titulo, _ = titulo_e_foco(r["tipo_alerta"])
        if r["fruta"]:
            titulo += f" no lote de {r['fruta']}"
        itens.append(_item("reativo", r, n, titulo, r["descricao"], None, acoes, perdas, limites, None))
    for r in preditivos:
        n = normalizar_nivel(r["nivel_bruto"])
        risco = riscos.get(r["id_lote"])
        titulo = f"Risco climático {risco['nivel_risco']}" if risco and risco["nivel_risco"] else "Risco climático previsto"
        if r["fruta"]:
            titulo += f" no lote de {r['fruta']}"
        descricao = (risco["justificativa"] if risco and risco["justificativa"] else r["mensagem"])
        itens.append(_item("preditivo", r, n, titulo, descricao,
                           None if r["probabilidade_risco"] is None else round(float(r["probabilidade_risco"]) * 100),
                           acoes, perdas, limites, risco))

    itens.sort(key=lambda i: i["_ordem"], reverse=True)
    contagens = {n: sum(1 for i in itens if i["nivel"] == n) for n in NIVEIS}
    total = len(itens)
    resumo = {
        "total": total,
        "por_nivel": [
            {"nivel": n, "rotulo": _ROTULO_NIVEL[n], "qtd": contagens[n],
             "percentual": round(contagens[n] / total * 100, 1) if total else 0,
             "perda_pct": perdas.get(n)}
            for n in NIVEIS
        ],
        "por_origem": {"reativo": sum(1 for i in itens if i["origem"] == "reativo"),
                       "preditivo": sum(1 for i in itens if i["origem"] == "preditivo")},
        "acoes_por_nivel": {n: acoes.get(n) for n in NIVEIS},
    }
    if nivel:
        itens = [i for i in itens if i["nivel"] == nivel]
    for i in itens:
        i.pop("_ordem")
    return {"resumo": resumo, "itens": itens[:limit]}


def _item(origem, r, nivel, titulo, descricao, prob_pct, acoes, perdas, limites, risco):
    dt = r["data_hora"]
    projecao = None
    if risco is not None and risco["temperatura"] is not None:
        projecao = {"temperatura": _f(risco["temperatura"]), "umidade": _f(risco["umidade"]),
                    "ate": iso_utc(risco["periodo_fim"]) if risco["periodo_fim"] else None,
                    "modelo": risco["modelo"]}
    return {
        "_ordem": (iso_utc(dt) or "", r["id"]),
        "origem": origem,
        "id": r["id"],
        "codigo": montar_codigo(origem, r["id"], dt),
        "nivel": nivel,
        "titulo": titulo,
        "descricao": descricao,
        "status": r["status"],
        "data_hora": iso_utc(dt),
        "minutos_atras": minutos_desde(dt),
        "probabilidade_pct": prob_pct,          # só preditivo; reativo é fato ocorrido (null)
        "perda_pct": perdas.get(nivel),
        "acao_recomendada": acoes.get(nivel),
        "sensor": None if r["id_sensor"] is None else {"id_sensor": r["id_sensor"], "nome": r["sensor_nome"]},
        "lote": None if r["id_lote"] is None else {
            "id_lote": r["id_lote"], "fruta": r["fruta"], "destino": r["destino"],
            "quantidade": _f(r["quantidade"]), "unidade": r["unidade"], "etapa": r["etapa"]},
        "faixa": _faixa_de(limites, r["id_fruta"], r["etapa"]),
        "projecao": projecao,
    }


@router.get("")
def fila(status: str = Query("aberto", pattern="^(aberto|reconhecido|todos)$"),
         nivel: Optional[str] = Query(None, pattern="^(critico|medio|baixo)$"),
         limit: int = Query(200, ge=1, le=500),
         conn=Depends(get_conn), user=Depends(get_current_user)):
    """Fila única de incidentes + resumo (contagem por nível, % e perda de risco) para a rosca."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        return montar_fila(cur, user, status, nivel, limit)


# ---------------------------------------------------------------- ações
@router.post("/reconhecer-todos")
def reconhecer_todos(request: Request, conn=Depends(get_conn)):
    """Reconhece de uma vez todos os alertas abertos (reativos e preditivos)."""
    with auditar(request, "reconhecer_todos_alertas") as ctx:
        with conn.cursor() as cur:
            cur.execute("UPDATE alerta SET status = 'reconhecido' WHERE lower(status) = 'aberto'")
            n_reativos = cur.rowcount
            cur.execute("UPDATE alertas_preditivos SET status = 'RECONHECIDO' WHERE upper(status) = 'EM ABERTO'")
            n_preditivos = cur.rowcount
        conn.commit()
        ctx.detalhe = f"reativos={n_reativos} preditivos={n_preditivos}"
    return {"reativos": n_reativos, "preditivos": n_preditivos, "reconhecidos": n_reativos + n_preditivos}


@router.patch("/{origem}/{id_alerta}/reconhecer")
def reconhecer(origem: str, id_alerta: int, request: Request, conn=Depends(get_conn)):
    if origem not in ("reativo", "preditivo"):
        raise HTTPException(status_code=404, detail="Origem inválida")
    with auditar(request, "reconhecer_alerta") as ctx:
        ctx.detalhe = f"{origem}={id_alerta}"
        with conn.cursor() as cur:
            if origem == "reativo":
                cur.execute("UPDATE alerta SET status = 'reconhecido' WHERE id_alerta = %s", (id_alerta,))
            else:
                cur.execute("UPDATE alertas_preditivos SET status = 'RECONHECIDO' "
                            "WHERE id_alerta_preditivo = %s", (id_alerta,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Alerta não encontrado")
        conn.commit()
    return {"origem": origem, "id": id_alerta, "status": "reconhecido"}


# ---------------------------------------------------------------- CSV
COLUNAS_CSV = ["codigo", "origem", "nivel", "status", "data_hora", "titulo", "probabilidade_pct",
               "perda_pct", "fruta", "id_lote", "destino", "acao_recomendada"]


@router.get("/exportar.csv")
def exportar_csv(request: Request,
                 status: str = Query("todos", pattern="^(aberto|reconhecido|todos)$"),
                 conn=Depends(get_conn), user=Depends(get_current_user)):
    with auditar(request, "exportar_alertas") as ctx:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            itens = montar_fila(cur, user, status, None, LIMITE_CSV)["itens"]
        ctx.detalhe = f"status={status} linhas={len(itens)}"
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLUNAS_CSV, delimiter=";", extrasaction="ignore")
    w.writeheader()
    for i in itens:
        lote = i["lote"] or {}
        w.writerow({**i, "fruta": lote.get("fruta"), "id_lote": lote.get("id_lote"), "destino": lote.get("destino")})
    return Response(
        content="\ufeff" + buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="alertas.csv"'},
    )


# ---------------------------------------------------------------- curva térmica
@router.get("/curva")
def curva_termica(id_lote: int, id_sensor: Optional[int] = None,
                  horas: int = Query(24, ge=6, le=72),
                  conn=Depends(get_conn), user=Depends(get_current_user)):
    """Histórico real (média por hora), faixa segura e projeção do lote.

    A projeção é a temperatura prevista do último `risco_climatico` do lote (valor único até
    `periodo_fim`, gerado por regra/modelo registrado em ia_modelo), não uma série de ML.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        exigir_lote(cur, user, id_lote)
        cur.execute("""SELECT l.fk_fruta_id_fruta AS id_fruta, fn_etapa_lote(l.status) AS etapa, f.nome AS fruta
                         FROM lote l LEFT JOIN fruta f ON f.id_fruta = l.fk_fruta_id_fruta
                        WHERE l.id_lote = %s""", (id_lote,))
        lote = cur.fetchone()
        if lote is None:
            raise HTTPException(status_code=404, detail="Lote não encontrado")

        if id_sensor is None:
            cur.execute("SELECT id_sensor FROM sensor WHERE fk_lote_id_lote = %s ORDER BY id_sensor LIMIT 1", (id_lote,))
            s = cur.fetchone()
            id_sensor = s["id_sensor"] if s else None
        sensor = None
        historico, atual = [], None
        if id_sensor is not None:
            cur.execute("""SELECT id_sensor, nome, tipo_sensor, localizacao, channel_id, status::text AS status
                             FROM sensor WHERE id_sensor = %s AND fk_lote_id_lote = %s""", (id_sensor, id_lote))
            sensor = cur.fetchone()
            if sensor is None:
                raise HTTPException(status_code=404, detail="Sensor não encontrado neste lote")
            cur.execute("""
                SELECT date_trunc('hour', data_hora) AS t, AVG(temperatura) AS temperatura,
                       AVG(umidade) AS umidade, COUNT(*)::int AS n
                  FROM leitura_climatica
                 WHERE fk_sensor_id_sensor = %s
                   AND data_hora >= (now() AT TIME ZONE 'UTC') - make_interval(hours => %s)
                 GROUP BY 1 ORDER BY 1""", (id_sensor, horas))
            historico = [{"t": iso_utc(r["t"]), "temperatura": _f(r["temperatura"]),
                          "umidade": _f(r["umidade"]), "n": r["n"]} for r in cur.fetchall()]
            cur.execute("""SELECT data_hora, temperatura, umidade, origem FROM leitura_climatica
                            WHERE fk_sensor_id_sensor = %s ORDER BY data_hora DESC, id_leitura DESC LIMIT 1""",
                        (id_sensor,))
            u = cur.fetchone()
            if u:
                atual = {"t": iso_utc(u["data_hora"]), "temperatura": _f(u["temperatura"]),
                         "umidade": _f(u["umidade"]), "origem": u["origem"],
                         "minutos_atras": minutos_desde(u["data_hora"])}

        cur.execute("""SELECT fk_fruta_id_fruta AS id_fruta, etapa::text AS etapa,
                              temp_min, temp_max, umidade_min, umidade_max FROM config_parametro
                        WHERE fk_fruta_id_fruta = %s""", (lote["id_fruta"],))
        faixa = _faixa_de({(r["id_fruta"], r["etapa"]): r for r in cur.fetchall()}, lote["id_fruta"], lote["etapa"])

        cur.execute("""SELECT rc.temperatura, rc.umidade, rc.probabilidade, rc.nivel_risco, rc.justificativa,
                              rc.periodo_inicio, rc.periodo_fim, m.nome AS modelo
                         FROM risco_climatico rc LEFT JOIN ia_modelo m ON m.id_modelo = rc.fk_modelo_id_modelo
                        WHERE rc.fk_lote_id_lote = %s ORDER BY rc.data_previsao DESC LIMIT 1""", (id_lote,))
        rc = cur.fetchone()

    mn = faixa["temp_min"] if faixa else None
    mx = faixa["temp_max"] if faixa else None
    projecao = None
    if rc and rc["temperatura"] is not None:
        t_proj = _f(rc["temperatura"])
        status_p, desvio_p = classificar(t_proj, mn, mx)
        projecao = {
            "temperatura": t_proj, "umidade": _f(rc["umidade"]),
            "de": iso_utc(rc["periodo_inicio"]) if rc["periodo_inicio"] else None,
            "ate": iso_utc(rc["periodo_fim"]) if rc["periodo_fim"] else None,
            "probabilidade_pct": None if rc["probabilidade"] is None else round(float(rc["probabilidade"])),
            "nivel_risco": rc["nivel_risco"], "justificativa": rc["justificativa"], "modelo": rc["modelo"],
            "status": status_p, "desvio": desvio_p,
        }
    status_a, desvio_a = classificar(atual["temperatura"] if atual else None, mn, mx)
    return {
        "id_lote": id_lote, "fruta": lote["fruta"], "etapa": lote["etapa"], "horas": horas,
        "sensor": None if sensor is None else {**sensor, "intervalo_envio_s": config.ESP32_INTERVALO_ENVIO_S},
        "faixa": faixa, "historico": historico,
        "atual": None if atual is None else {**atual, "status": status_a, "desvio": desvio_a},
        "projecao": projecao,
    }
