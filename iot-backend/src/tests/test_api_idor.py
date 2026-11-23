"""IDOR/BOLA: Produtor/Exportador só alcança os próprios sensores e lotes (404 nos de outro dono)."""
import pytest
from fastapi.testclient import TestClient

from src.api import deps_auth
from src.api.app import app
from src.api.deps import get_conn
from src.api.escopo import exigir_lote, exigir_sensor, filtrar_leituras_por_dono, filtrar_por_dono, id_dono
from src.api.security_auth import criar_access_token

client = TestClient(app)

DONO_SENSOR = {10: 7, 11: 8}   # id_sensor -> id_usuario dono
DONO_LOTE = {1: 7, 2: 8}


class _Cur:
    def __init__(self):
        self._row = None

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        params = list(params or [])
        tabela = DONO_SENSOR if "FROM sensor WHERE id_sensor" in sql else DONO_LOTE if "FROM lote WHERE id_lote" in sql else None
        self._row = None
        if tabela is not None:
            dono = params[1] if len(params) > 1 else None
            if params[0] in tabela and (dono is None or tabela[params[0]] == dono):
                self._row = (1,)

    def fetchone(self):
        return self._row


class _Conn:
    def cursor(self, *a, **k):
        return _Cur()

    def commit(self):
        pass

    def rollback(self):
        pass


def _conn():
    yield _Conn()


def _logar_como(monkeypatch, id_usuario, perfil):
    app.dependency_overrides[get_conn] = _conn
    monkeypatch.setattr(deps_auth, "carregar_usuario", lambda conn, i: {
        "id_usuario": i, "nome": "t", "email": "t@t", "ativo": True,
        "deve_trocar_senha": False, "perfil": perfil})
    return {"Authorization": f"Bearer {criar_access_token(id_usuario, perfil)}"}


@pytest.fixture(autouse=True)
def _limpar():
    yield
    app.dependency_overrides.clear()


def _u(i, perfil):
    return {"id_usuario": i, "perfil": perfil}


def test_escopo_por_perfil():
    assert id_dono(_u(7, "Produtor/Exportador")) == 7
    assert id_dono(_u(1, "Administrador")) is None
    assert id_dono(_u(2, "Analista de Dados")) is None


def test_filtros_so_restringem_produtor():
    w, p = [], []
    filtrar_por_dono(_u(7, "Produtor/Exportador"), "s.fk_usuario_id_usuario", w, p)
    filtrar_leituras_por_dono(_u(7, "Produtor/Exportador"), "fk_sensor_id_sensor", w, p)
    assert p == [7, 7] and len(w) == 2
    w, p = [], []
    filtrar_por_dono(_u(1, "Administrador"), "s.fk_usuario_id_usuario", w, p)
    assert w == [] and p == []


def test_exigir_sensor_e_lote():
    from fastapi import HTTPException
    cur, prod = _Cur(), _u(7, "Produtor/Exportador")
    exigir_sensor(cur, prod, 10)
    exigir_lote(cur, prod, 1)
    for chamada, alvo in ((exigir_sensor, 11), (exigir_lote, 2), (exigir_sensor, 999)):
        with pytest.raises(HTTPException) as e:
            chamada(cur, prod, alvo)
        assert e.value.status_code == 404
    exigir_sensor(cur, _u(1, "Administrador"), 11)   # admin passa
    exigir_sensor(cur, _u(2, "Analista de Dados"), 11)  # analista passa


@pytest.mark.parametrize("rota", ["/sensores/11", "/sensores/11/leituras", "/leituras?id_sensor=11",
                                  "/leituras/ultima?id_sensor=11", "/leituras/estatisticas?id_sensor=11",
                                  "/leituras-rejeitadas?id_sensor=11", "/lotes/2"])
def test_produtor_nao_acessa_recurso_de_outro_dono(monkeypatch, rota):
    h = _logar_como(monkeypatch, 7, "Produtor/Exportador")
    assert client.get(rota, headers=h).status_code == 404
