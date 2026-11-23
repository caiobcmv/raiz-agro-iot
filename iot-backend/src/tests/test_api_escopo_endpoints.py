"""Escopo por dono nos endpoints (IDOR/BOLA) e grupos de permissão por perfil.

Dois tipos de teste, ambos sem banco real:
  1. Perfil sem permissão => 403 antes de qualquer consulta.
  2. Produtor => o id dele chega como parâmetro do SQL (o filtro por dono foi aplicado);
     Administrador/Analista => o filtro não é aplicado (escopo total).
"""
import pytest
from fastapi.testclient import TestClient

from src.api import deps_auth
from src.api.app import app
from src.api.deps import get_conn
from src.api.security_auth import criar_access_token

client = TestClient(app, raise_server_exceptions=False)  # o que importa é o SQL registrado

PRODUTOR = "Produtor/Exportador"
ANALISTA = "Analista de Dados"
ADMIN = "Administrador"
ID_PRODUTOR = 777_001   # id improvável, para não colidir com outros números dos parâmetros


class _GravaCur:
    """Cursor falso: registra o que foi executado e não devolve linhas."""
    description = []

    def __init__(self, log):
        self._log = log

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        self._log.append((sql, params))

    def fetchone(self):
        return None

    def fetchall(self):
        return []


class _Conn:
    def __init__(self, log):
        self._log = log

    def cursor(self, *a, **k):
        return _GravaCur(self._log)

    def commit(self):
        pass

    def rollback(self):
        pass


@pytest.fixture(autouse=True)
def _limpar():
    yield
    app.dependency_overrides.clear()


def _logar(monkeypatch, id_usuario, perfil):
    log = []

    def _conn():
        yield _Conn(log)

    app.dependency_overrides[get_conn] = _conn
    monkeypatch.setattr(deps_auth, "carregar_usuario", lambda conn, i: {
        "id_usuario": i, "nome": "t", "email": "t@t", "ativo": True,
        "deve_trocar_senha": False, "perfil": perfil})
    return {"Authorization": f"Bearer {criar_access_token(id_usuario, perfil)}"}, log


def _valores(params):
    if params is None:
        return []
    if isinstance(params, dict):
        return list(params.values())
    return list(params)


# ---------------------------------------------------------------- 1. permissões por perfil
@pytest.mark.parametrize("rota", [
    "/auditoria",                 # log de acesso: só Administrador
    "/analista/sensores/resumo",  # agregados sem filtro por dono: só Analista/Admin
    "/analista/alertas/resumo",
    "/relatorios",                # relatórios gerados cobrem todos os donos
])
def test_produtor_nao_acessa_rotas_sem_escopo(monkeypatch, rota):
    h, _ = _logar(monkeypatch, ID_PRODUTOR, PRODUTOR)
    assert client.get(rota, headers=h).status_code == 403


def test_analista_nao_le_auditoria(monkeypatch):
    h, _ = _logar(monkeypatch, 2, ANALISTA)
    assert client.get("/auditoria", headers=h).status_code == 403


# ---------------------------------------------------------------- 2. filtro por dono no SQL
@pytest.mark.parametrize("rota", [
    "/leituras",
    "/leituras/estatisticas",
    "/sensores",
    "/alertas-preditivos",
    "/previsoes/janela-colheita",
    "/previsoes/irrigacao",
    "/riscos/prejuizo",
    "/riscos/climatico",
])
def test_produtor_tem_filtro_por_dono_no_sql(monkeypatch, rota):
    h, log = _logar(monkeypatch, ID_PRODUTOR, PRODUTOR)
    client.get(rota, headers=h)
    enviados = [v for _, p in log for v in _valores(p)]
    assert ID_PRODUTOR in enviados, f"{rota}: o id do Produtor não chegou ao SQL (sem filtro por dono)"


@pytest.mark.parametrize("rota", ["/leituras", "/sensores", "/alertas-preditivos", "/riscos/climatico"])
def test_analista_e_admin_tem_escopo_total(monkeypatch, rota):
    for perfil in (ANALISTA, ADMIN):
        h, log = _logar(monkeypatch, ID_PRODUTOR, perfil)
        client.get(rota, headers=h)
        enviados = [v for _, p in log for v in _valores(p)]
        assert ID_PRODUTOR not in enviados, f"{rota}: {perfil} não deveria ser filtrado por dono"
