"""GET /ia/parecer?id_lote=  — parecer automático de IA, SOMENTE LEITURA.

Quem chama (Produtor, Analista ou Administrador) nunca "gera" nada: o servidor devolve o parecer
guardado em parecer_ia e, quando ele vence, gera um novo sozinho. A IA é chamada no máximo uma vez
por TTL (padrão 60 min) por lote, não importa quantas telas estejam consultando.
O front só precisa chamar este GET de tempos em tempos (ex.: a cada 5 min)."""
import logging
import os
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import Json, RealDictCursor

from src.api import calculos_previsao as calc
from src.api import previsao_repo as repo
from src.api.deps import get_conn
from src.api.deps_auth import get_current_user
from src.api.escopo import exigir_lote
from src.api.schemas import ParecerEstruturadoSchema, ParecerIAResponse
from src.api.services.ia_service import gerar_parecer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ia/parecer", tags=["ia"])

TTL_MIN = int(os.getenv("PARECER_TTL_MIN", "60"))
TTL_FALLBACK_MIN = int(os.getenv("PARECER_FALLBACK_TTL_MIN", "10"))  # texto de reserva vence mais cedo
JANELA_ANALISE_DIAS = 7
_LOCK_NS = 7301  # namespace do advisory lock (um por lote)


def _f(v):
    return float(v) if v is not None else None


def _montar_snapshot(cur, lote: dict) -> dict:
    """Só junta o que o sistema já calcula/guarda. Nenhum número novo é inventado aqui."""
    id_lote = lote["id_lote"]
    cur.execute(
        """SELECT s.ambiente, l.temperatura, l.umidade, l.umidade_solo, l.origem, l.data_hora
           FROM leitura_climatica l
           JOIN sensor s ON s.id_sensor = l.fk_sensor_id_sensor
           WHERE s.fk_lote_id_lote = %(l)s
             AND l.data_hora >= (SELECT max(l2.data_hora)
                                 FROM leitura_climatica l2
                                 JOIN sensor s2 ON s2.id_sensor = l2.fk_sensor_id_sensor
                                 WHERE s2.fk_lote_id_lote = %(l)s) - interval '24 hours'""",
        {"l": id_lote},
    )
    leituras = cur.fetchall()
    ar = [r for r in leituras if r["ambiente"] != "solo" and r["temperatura"] is not None and r["umidade"] is not None]
    solo = [_f(r["umidade_solo"] if r["umidade_solo"] is not None else r["umidade"])
            for r in leituras if r["ambiente"] == "solo"]
    solo = [v for v in solo if v is not None]
    vpds = [calc.vpd_kpa(float(r["temperatura"]), float(r["umidade"])) for r in ar]

    try:
        horas = repo.horas_fora_da_faixa(cur, lote["id_fruta"], lote["etapa"], JANELA_ANALISE_DIAS)
    except TypeError:  # leitura sem temperatura no meio da sequência
        horas = None

    cur.execute("""SELECT prejuizo_estimado FROM previsao_prejuizo
                   WHERE fk_lote_id_lote = %s ORDER BY data_previsao DESC LIMIT 1""", (id_lote,))
    prej = cur.fetchone()
    cur.execute("""SELECT necessita_irrigacao, quantidade_agua_mm FROM previsao_irrigacao
                   WHERE fk_lote_id_lote = %s ORDER BY data_previsao DESC LIMIT 1""", (id_lote,))
    irr = cur.fetchone()

    return {
        "id_lote": id_lote,
        "fruta": repo.nome_fruta(cur, lote["id_fruta"]),
        "etapa": lote["etapa"],
        "janela_leituras_horas": 24,
        "n_leituras_ar": len(ar),
        "temperatura_media_c": round(mean(float(r["temperatura"]) for r in ar), 1) if ar else None,
        "umidade_ar_media_pct": round(mean(float(r["umidade"]) for r in ar), 1) if ar else None,
        "vpd_medio": round(mean(vpds), 2) if vpds else None,
        "umidade_solo_media_pct": round(mean(solo), 1) if solo else None,
        "horas_fora_da_faixa": horas,
        "nivel_risco_climatico": repo.nivel_risco_atual(cur, id_lote),
        "prejuizo_estimado_brl": _f(prej["prejuizo_estimado"]) if prej else None,
        "necessita_irrigacao": irr["necessita_irrigacao"] if irr else None,
        "irrigacao_necessaria_mm": _f(irr["quantidade_agua_mm"]) if irr else None,
        "contem_dados_simulados": any(r["origem"] == "simulado" for r in leituras),
    }


def _resposta(row: dict, origem: str) -> dict | None:
    try:
        conteudo = ParecerEstruturadoSchema(**row["conteudo_json"])
    except Exception:  # linha antiga/mal formada: trata como se não existisse
        return None
    return {"id_lote": row["id_lote"], "modelo": row["modelo"], "origem": origem,
            "conteudo": conteudo, "data_geracao": row["data_geracao"], "expira_em": row["data_expiracao"]}


_SEL = """SELECT id_lote, modelo, conteudo_json, data_geracao, data_expiracao FROM parecer_ia
          WHERE id_lote = %s {where} ORDER BY data_geracao DESC LIMIT 1"""


def _ultimo(cur, id_lote: int, so_validos: bool) -> dict | None:
    cur.execute(_SEL.format(where="AND data_expiracao > now()" if so_validos else ""), (id_lote,))
    row = cur.fetchone()
    return _resposta(row, "CACHE") if row else None


@router.get("", response_model=ParecerIAResponse)
def obter_parecer(id_lote: int = Query(..., ge=1), conn=Depends(get_conn), user=Depends(get_current_user)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        exigir_lote(cur, user, id_lote)  # 404 se o lote não existir OU for de outro dono (antes de gastar IA)
        # 1. parecer ainda válido: só devolve (caminho normal, quase sempre)
        valido = _ultimo(cur, id_lote, so_validos=True)
        if valido:
            return valido

        lotes = repo.lotes_para_prejuizo(cur, id_lote)
        if not lotes:
            raise HTTPException(404, "Lote não encontrado ou já finalizado")

        # 2. venceu: só UMA requisição gera; as outras recebem o último parecer guardado
        cur.execute("SELECT pg_try_advisory_xact_lock(%s, %s) AS ok", (_LOCK_NS, id_lote))
        if not cur.fetchone()["ok"]:
            conn.rollback()
            with conn.cursor(cursor_factory=RealDictCursor) as cur2:
                anterior = _ultimo(cur2, id_lote, so_validos=False)
            if anterior:
                return anterior
            raise HTTPException(503, "Parecer sendo gerado, tente novamente em alguns segundos")

        # outra requisição pode ter terminado entre o passo 1 e o lock
        valido = _ultimo(cur, id_lote, so_validos=True)
        if valido:
            return valido

        snapshot = _montar_snapshot(cur, lotes[0])
        conteudo, modelo, usou_fallback = gerar_parecer(snapshot)
        ttl = TTL_FALLBACK_MIN if usou_fallback else TTL_MIN
        cur.execute(
            """INSERT INTO parecer_ia (id_lote, modelo, snapshot_entrada, conteudo_json, data_expiracao)
               VALUES (%s, %s, %s, %s, now() + make_interval(mins => %s))
               RETURNING id_lote, modelo, conteudo_json, data_geracao, data_expiracao""",
            (id_lote, modelo, Json(snapshot), Json(conteudo), ttl),
        )
        novo = cur.fetchone()
    conn.commit()
    return _resposta(novo, "FALLBACK_TEMPLATE" if usou_fallback else "IA")
