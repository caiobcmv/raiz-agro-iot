"""Testa GET /alertas/{id}/detalhe de ponta a ponta (rota + SQL roteirizado), sem banco real.

Usa o mesmo padrão do test_api_permissoes.py: override de get_conn + token falso.
O "banco" é um cursor de mentira que devolve linhas conforme o trecho do SQL executado.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from src.api import deps_auth
from src.api.app import app
from src.api.deps import get_conn
from src.api.security_auth import criar_access_token

client = TestClient(app)

AGORA = datetime.now(timezone.utc).replace(tzinfo=None)   # o banco guarda UTC sem fuso


class FakeCursor:
    def __init__(self, dados):
        self.dados, self._one, self._all = dados, None, []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        s = " ".join(sql.split())
        d = self.dados
        self._one, self._all = None, []
        if "FROM alerta a" in s:
            self._one = d.get("alerta")
        elif "FROM sensor s" in s:
            self._one = d.get("contexto")
        elif "FROM config_parametro" in s:
            self._one = d.get("limites")
        elif "ORDER BY data_hora DESC" in s:
            self._one = d.get("leitura_atual")
        elif "ORDER BY data_hora ASC" in s:
            self._all = d.get("serie", [])
        elif "WHERE id_leitura" in s:
            self._one = d.get("gatilho")

    def fetchone(self):
        return self._one

    def fetchall(self):
        return self._all


class FakeConn:
    def __init__(self, dados):
        self.dados = dados

    def cursor(self, **kw):
        return FakeCursor(self.dados)


@pytest.fixture
def api(monkeypatch):
    """Devolve uma função que registra os dados do 'banco' e faz o GET autenticado."""
    monkeypatch.setattr(deps_auth, "carregar_usuario", lambda conn, i: {
        "id_usuario": i, "nome": "Analista", "email": "a@t.com",
        "ativo": True, "deve_trocar_senha": False, "perfil": "Analista de Dados"})
    token = criar_access_token(id_usuario=1, perfil="Analista de Dados")

    def chamar(dados, id_alerta=41, autenticado=True):
        fake_conn = FakeConn(dados)
        app.dependency_overrides[get_conn] = lambda: fake_conn
        headers = {"Authorization": f"Bearer {token}"} if autenticado else {}
        return client.get(f"/alertas/{id_alerta}/detalhe", headers=headers)

    yield chamar
    app.dependency_overrides.clear()


def _alerta(id_sensor=1, id_leitura=7, status="aberto"):
    return {"id_alerta": 41, "tipo_alerta": "temperatura_fora_faixa", "descricao": "d",
            "nivel": "CRITICO", "status": status, "data_hora": AGORA,
            "id_leitura": id_leitura, "id_previsao": None,
            "id_sensor": id_sensor, "id_lote": 12}


CONTEXTO = {"id_sensor": 1, "sensor_nome": "S1", "localizacao": "Talhão A1", "ambiente": "ar",
            "sensor_status": "ativo", "id_lote": 12, "fruta": "Uva", "quantidade": 2000,
            "unidade": "kg", "etapa": "campo", "destino": None, "id_fruta": 3}
LIMITES = {"temp_min": 8, "temp_max": 32, "umidade_min": 50, "umidade_max": 90}


def test_sem_token_retorna_401(api):
    assert api({}, autenticado=False).status_code == 401


def test_alerta_inexistente_retorna_404(api):
    assert api({"alerta": None}).status_code == 404


def test_detalhe_completo(api):
    atual = {"id_leitura": 9, "temperatura": 34.1, "umidade": 70, "origem": "thingspeak",
             "data_hora": AGORA - timedelta(minutes=2)}
    serie = [{"temperatura": 30.0, "umidade": 71, "data_hora": AGORA - timedelta(minutes=60)},
             {"temperatura": 34.1, "umidade": 70, "data_hora": AGORA - timedelta(minutes=2)}]
    r = api({"alerta": _alerta(), "contexto": CONTEXTO, "limites": LIMITES,
             "leitura_atual": atual, "serie": serie, "gatilho": atual})
    assert r.status_code == 200
    j = r.json()
    assert j["layout"] == "leitura" and j["titulo"] == "Temperatura fora da faixa"
    assert j["metricas"][0]["chave"] == "temperatura" and j["metricas"][0]["status"] == "critico"
    assert j["lote"]["fruta"] == "Uva" and j["lote"]["etapa"] == "campo"
    assert j["sensor"]["localizacao"] == "Talhão A1" and j["sensor"]["sem_leitura"] is False
    assert len(j["serie"]) == 2
    assert j["acoes"] == ["reconhecer", "ver_historico"]
    assert j["alerta"]["data_hora"].endswith("Z")


def test_alerta_sem_sensor_nao_quebra(api):
    r = api({"alerta": _alerta(id_sensor=None, id_leitura=None)})
    assert r.status_code == 200
    j = r.json()
    assert j["layout"] == "sem_leitura" and j["sensor"] is None and j["metricas"][0]["valor"] is None


def test_sensor_sem_lote_vem_sem_limites(api):
    ctx = {**CONTEXTO, "id_lote": None, "fruta": None, "etapa": None, "id_fruta": None}
    atual = {"id_leitura": 9, "temperatura": 20.0, "umidade": 70, "origem": "thingspeak",
             "data_hora": AGORA}
    j = api({"alerta": _alerta(), "contexto": ctx, "leitura_atual": atual, "serie": [atual]}).json()
    assert j["lote"] is None and j["limites"] is None
    assert all(m["status"] == "sem_limite" for m in j["metricas"])


def test_sensor_parado_ha_mais_de_30_min(api):
    atual = {"id_leitura": 9, "temperatura": 20.0, "umidade": 70, "origem": "thingspeak",
             "data_hora": AGORA - timedelta(minutes=45)}
    j = api({"alerta": _alerta(), "contexto": CONTEXTO, "limites": LIMITES,
             "leitura_atual": atual, "serie": [atual]}).json()
    assert j["sensor"]["sem_leitura"] is True


def test_alerta_ja_reconhecido_nao_oferece_reconhecer(api):
    atual = {"id_leitura": 9, "temperatura": 20.0, "umidade": 70, "origem": "x", "data_hora": AGORA}
    j = api({"alerta": _alerta(status="reconhecido"), "contexto": CONTEXTO, "limites": LIMITES,
             "leitura_atual": atual, "serie": []}).json()
    assert j["acoes"] == ["ver_historico"]
