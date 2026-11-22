"""Popula o banco com dados de DEMONSTRAÇÃO para testar o card de alerta.

Cria (só o que ainda não existir): faixa em config_parametro, um lote, um sensor com lote,
um sensor SEM lote e uma série de leituras que sobe e ultrapassa o limite de temperatura.
Tudo usa a API e as funções do próprio projeto (processar_leitura), então passa pelas mesmas validações da coleta real. Sensores de demo levam "[DEMO]" no nome.

Uso (API rodando; na raiz do projeto, mesmo terminal onde SMOKE_EMAIL/SMOKE_SENHA estão definidos):
    python -m scripts.seed_demo
    python -m scripts.seed_demo --alerta-manual   # se o banco não gerar o alerta sozinho

Precisa de usuário Administrador e LOGIN_2FA_EMAIL=false no .env local.
"""
import math
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

from src import database

API = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
EMAIL, SENHA = os.getenv("SMOKE_EMAIL"), os.getenv("SMOKE_SENHA")
FRUTA_NOME = "Uva Vitória"
FAIXA_CAMPO = {"temp_min": 15.0, "temp_max": 32.0, "umidade_min": 50.0, "umidade_max": 90.0}


def login() -> requests.Session:
    if not EMAIL or not SENHA:
        sys.exit("Defina SMOKE_EMAIL e SMOKE_SENHA.")
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "senha": SENHA}, timeout=15)
    if r.status_code != 200 or r.json().get("requer_2fa"):
        sys.exit(f"Login falhou ou pediu 2FA ({r.status_code}). Use LOGIN_2FA_EMAIL=false. {r.text[:150]}")
    s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return s


def api(s, metodo, caminho, **kw):
    r = s.request(metodo, f"{API}{caminho}", timeout=20, **kw)
    if r.status_code >= 400:
        sys.exit(f"{metodo} {caminho} -> {r.status_code}: {r.text[:300]}")
    return r.json() if r.content else None


def garantir_fruta(s) -> int:
    frutas = api(s, "GET", "/frutas")
    if frutas:
        f = next((x for x in frutas if (x["nome"] or "").lower().startswith("uva")), frutas[0])
        print(f"fruta: usando '{f['nome']}' (id {f['id_fruta']})")
        return f["id_fruta"]
    # a API não tem POST /frutas; tenta direto no banco
    try:
        with database.conectar() as conn, conn.cursor() as cur:
            cur.execute("INSERT INTO fruta (nome) VALUES (%s) RETURNING id_fruta", (FRUTA_NOME,))
            novo = cur.fetchone()[0]
        print(f"fruta: criada '{FRUTA_NOME}' (id {novo})")
        return novo
    except Exception as e:
        sys.exit(f"Não consegui criar a fruta (a tabela pode ter outras colunas obrigatórias): {e}\n"
                 "Crie uma fruta manualmente no banco e rode de novo.")


def garantir_config(s, id_fruta: int) -> dict:
    """Devolve a faixa de campo da fruta (a existente, ou a criada)."""
    cfgs = api(s, "GET", "/config-parametros")
    for c in cfgs:
        if c["id_fruta"] == id_fruta and str(c["etapa"]).lower() == "campo":
            faixa = {k: float(c[k]) for k in FAIXA_CAMPO}
            print(f"config_parametro: faixa de campo já existe (mantida): {faixa}")
            return faixa
    api(s, "POST", "/config-parametros", json={"id_fruta": id_fruta, "etapa": "campo", **FAIXA_CAMPO})
    print(f"config_parametro: faixa de campo criada {FAIXA_CAMPO}")
    return dict(FAIXA_CAMPO)


def garantir_sensores(s, id_fruta: int):
    sensores = api(s, "GET", "/sensores")
    com_lote = next((x for x in sensores if (x["nome"] or "").startswith("[DEMO] Com lote")), None)
    sem_lote = next((x for x in sensores if (x["nome"] or "").startswith("[DEMO] Sem lote")), None)
    if not com_lote:
        lote = api(s, "POST", "/lotes", json={"id_fruta": id_fruta, "quantidade": 2000,
                                              "unidade": "kg", "status": "Em produção"})
        com_lote = api(s, "POST", "/sensores", json={
            "nome": "[DEMO] Com lote", "tipo_sensor": "DHT22", "localizacao": "Talhão A1",
            "id_lote": lote["id_lote"], "ambiente": "ar", "status": "ativo"})
        print(f"lote {lote['id_lote']} (etapa '{lote.get('etapa')}') + sensor {com_lote['id_sensor']} criados")
    else:
        print(f"sensor [DEMO] Com lote já existe (id {com_lote['id_sensor']})")
    if not sem_lote:
        sem_lote = api(s, "POST", "/sensores", json={
            "nome": "[DEMO] Sem lote", "tipo_sensor": "DHT22", "localizacao": "Casa de máquinas",
            "ambiente": "ar", "status": "ativo"})
        print(f"sensor sem lote criado (id {sem_lote['id_sensor']})")
    return com_lote["id_sensor"], sem_lote["id_sensor"]


def gravar_serie(id_sensor: int, fim: datetime, pontos: int, passo_min: int, f_temp, f_umid):
    cont = {"gravada": 0, "duplicada": 0, "rejeitada": 0}
    for i in range(pontos):
        t = fim - timedelta(minutes=passo_min * (pontos - 1 - i))
        frac = i / max(1, pontos - 1)
        leitura = {
            "entry_id": int(t.timestamp() // 60),      # único por minuto; longe dos ids reais do ThingSpeak
            "created_at": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "temperatura": round(f_temp(frac), 1), "umidade": round(f_umid(frac), 1),
        }
        cont[database.processar_leitura(leitura, id_sensor)] += 1
    return cont


def alerta_manual(id_sensor: int):
    """Plano B quando o banco não cria alerta sozinho. Descobre os valores do enum de nivel."""
    with database.conectar() as conn, conn.cursor() as cur:
        cur.execute("""SELECT e.enumlabel FROM information_schema.columns c
                       JOIN pg_type t ON t.typname = c.udt_name
                       JOIN pg_enum e ON e.enumtypid = t.oid
                       WHERE c.table_name = 'alerta' AND c.column_name = 'nivel'
                       ORDER BY e.enumsortorder""")
        niveis = [r[0] for r in cur.fetchall()]
        if not niveis:
            sys.exit("Não consegui descobrir os valores de alerta.nivel; me mande a consulta das colunas.")
        cur.execute("""SELECT id_leitura FROM leitura_climatica WHERE fk_sensor_id_sensor = %s
                       ORDER BY data_hora DESC, id_leitura DESC LIMIT 1""", (id_sensor,))
        id_leitura = cur.fetchone()[0]
        cur.execute("""INSERT INTO alerta (tipo_alerta, descricao, nivel, status, data_hora, fk_leitura_id_leitura)
                       VALUES (%s, %s, %s, 'aberto', now() AT TIME ZONE 'UTC', %s) RETURNING id_alerta""",
                    ("Temperatura acima do limite", "[DEMO] Temperatura acima do máximo da faixa de campo.",
                     niveis[-1], id_leitura))
        novo = cur.fetchone()[0]
    print(f"alerta manual criado: id {novo} (nivel '{niveis[-1]}'; valores possíveis: {niveis})")


def main() -> int:
    s = login()
    id_fruta = garantir_fruta(s)
    faixa = garantir_config(s, id_fruta)
    id_com, id_sem = garantir_sensores(s, id_fruta)
    agora = datetime.now(timezone.utc)

    # a trigger só alerta na TRANSIÇÃO dentro -> fora da faixa. Então a série começa no meio da faixa
    # e sobe até 25% da largura acima do máximo; a umidade fica dentro da faixa.
    t_meio = (faixa["temp_min"] + faixa["temp_max"]) / 2
    t_larg = faixa["temp_max"] - faixa["temp_min"]
    u_meio = (faixa["umidade_min"] + faixa["umidade_max"]) / 2
    u_larg = faixa["umidade_max"] - faixa["umidade_min"]
    temp = lambda x: t_meio + (faixa["temp_max"] + 0.25 * t_larg - t_meio) * (x ** 1.6)
    umid = lambda x: u_meio - 0.1 * u_larg * x
    print("leituras (sensor com lote):", gravar_serie(id_com, agora, 25, 5, temp, umid))
    # sensor sem lote: última leitura há 3 h (cenário "sensor parado")
    print("leituras (sensor sem lote):", gravar_serie(
        id_sem, agora - timedelta(hours=3), 6, 5,
        lambda x: 22.0 + 1.5 * math.sin(x * 3), lambda x: 70.0))

    time.sleep(1)
    alertas = api(s, "GET", "/alertas", params={"limit": 5})
    if alertas:
        print(f"\nA trigger trg_alerta_faixa gerou {len(alertas)}+ alerta(s). Rode o smoke test.")
    elif "--alerta-manual" in sys.argv:
        print()
        alerta_manual(id_com)
    else:
        print("\nNenhum alerta foi gerado pela trigger. Veja se o lote do sensor [DEMO] está em etapa com faixa "
              "cadastrada (a trigger não alerta sem faixa). Plano B: python -m scripts.seed_demo --alerta-manual")
    return 0


if __name__ == "__main__":
    sys.exit(main())
