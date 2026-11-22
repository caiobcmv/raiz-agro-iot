"""Teste automático de ponta a ponta: faz login, lista os alertas e valida o /detalhe de cada um.

Roda contra a API de verdade (e o banco de verdade), então pega o que os testes com banco de
mentira não pegam: nome de coluna errado, fn_etapa_lote, etapas que não casam com config_parametro.
Não altera nada no banco (só GET, fora o login).

Uso (API rodando em outro terminal: uvicorn src.api.app:app --reload):
    set SMOKE_EMAIL=seu@email.com
    set SMOKE_SENHA=suasenha
    python -m scripts.smoke_alerta_detalhe
    (Linux/Mac: export em vez de set)

Opcionais: API_URL (padrão http://localhost:8000), SMOKE_LIMITE (padrão 50 alertas).
Precisa de LOGIN_2FA_EMAIL=false no .env local da API. Sai com código 1 se algo falhar.
"""
import os
import sys

import requests

API = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
EMAIL = os.getenv("SMOKE_EMAIL")
SENHA = os.getenv("SMOKE_SENHA")
LIMITE = int(os.getenv("SMOKE_LIMITE", "50"))

CHAVES = {"alerta", "layout", "resumo", "lote", "sensor", "metricas", "limites",
          "leitura_gatilho", "serie", "acoes"}
STATUS_METRICA = {"ok", "atencao", "critico", "sem_limite", "sem_leitura"}


def login() -> str:
    if not EMAIL or not SENHA:
        sys.exit("Defina SMOKE_EMAIL e SMOKE_SENHA (variáveis de ambiente).")
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "senha": SENHA}, timeout=15)
    if r.status_code != 200:
        sys.exit(f"Login falhou: {r.status_code} {r.text[:200]}")
    j = r.json()
    if j.get("requer_2fa"):
        sys.exit("A API pediu 2FA. Ponha LOGIN_2FA_EMAIL=false no .env local e reinicie a API.")
    return j["access_token"]


def validar(d: dict) -> tuple[list[str], list[str]]:
    """Devolve (erros, avisos) para um detalhe."""
    erros, avisos = [], []
    faltando = CHAVES - d.keys()
    if faltando:
        return [f"campos ausentes: {sorted(faltando)}"], avisos

    if d["layout"] not in ("leitura", "sem_leitura"):
        erros.append(f"layout inesperado: {d['layout']}")
    if not d["metricas"]:
        erros.append("metricas vazia")
    for m in d["metricas"]:
        if m["status"] not in STATUS_METRICA:
            erros.append(f"status de métrica inválido: {m['status']}")
    ts = [p["t"] for p in d["serie"]]
    if ts != sorted(ts):
        erros.append("serie fora de ordem")
    if d["layout"] == "leitura" and d["sensor"] is None:
        erros.append("layout 'leitura' sem sensor")

    # avisos (não derrubam o teste, mas indicam dado ou config incompletos)
    if d["lote"] and d["limites"] is None:
        avisos.append(f"lote {d['lote']['id_lote']} (etapa '{d['lote']['etapa']}') sem limites em "
                      "config_parametro: etapas não casam ou falta cadastro")
    if d["sensor"] and d["lote"] is None:
        avisos.append("sensor sem lote associado")
    if d["sensor"] and d["sensor"]["sem_leitura"]:
        avisos.append(f"sensor sem leitura há {d['sensor']['minutos_sem_leitura']} min")
    return erros, avisos


def main() -> int:
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {login()}"

    r = s.get(f"{API}/alertas", params={"limit": LIMITE}, timeout=15)
    if r.status_code != 200:
        print(f"GET /alertas falhou: {r.status_code} {r.text[:200]}")
        return 1
    alertas = r.json()
    if not alertas:
        print("Nenhum alerta no banco para testar.")
        return 1

    print(f"{len(alertas)} alertas encontrados\n")
    print(f"{'id':>5}  {'nivel':<10} {'layout':<12} {'métricas (pior primeiro)':<42} resultado")
    falhas = 0
    todos_avisos = set()
    for a in alertas:
        resp = s.get(f"{API}/alertas/{a['id_alerta']}/detalhe", timeout=20)
        if resp.status_code != 200:
            falhas += 1
            print(f"{a['id_alerta']:>5}  {str(a['nivel']):<10} {'-':<12} {'-':<42} "
                  f"ERRO HTTP {resp.status_code}: {resp.text[:120]}")
            continue
        d = resp.json()
        erros, avisos = validar(d)
        todos_avisos.update(avisos)
        mets = ", ".join(f"{m['chave']}={m['valor']}({m['status']})" for m in d.get("metricas", []))
        print(f"{a['id_alerta']:>5}  {str(a['nivel']):<10} {str(d.get('layout')):<12} "
              f"{mets[:42]:<42} {'FALHOU: ' + '; '.join(erros) if erros else 'ok'}")
        falhas += bool(erros)

    if todos_avisos:
        print("\nAvisos:")
        for av in sorted(todos_avisos):
            print(f"  - {av}")
    print(f"\n{'FALHOU' if falhas else 'PASSOU'}: {falhas} alerta(s) com problema de {len(alertas)}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
