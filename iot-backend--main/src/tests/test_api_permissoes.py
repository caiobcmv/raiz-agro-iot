from fastapi.testclient import TestClient

from src.api import deps_auth
from src.api.app import app
from src.api.deps import get_conn
from src.api.security_auth import criar_access_token

client = TestClient(app)


def _fake_conn():
    """Evita abrir conexão real no banco durante testes unitários."""
    yield object()


def test_api_inicializa_com_sucesso():
    """Garante que o app sobe, importa todas as rotas e a raiz responde."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "docs": "/docs"}


def test_rota_protegida_sem_token_retorna_401():
    """Garante que acessar rotas privadas sem token dá 401 Unauthorized."""
    response = client.get("/usuarios")
    assert response.status_code == 401
    assert "Não autenticado" in response.json()["detail"]


def test_produtor_nao_pode_escrever_retorna_403(monkeypatch):
    """Garante que Produtor/Exportador é somente leitura (403 no POST)."""
    app.dependency_overrides[get_conn] = _fake_conn
    monkeypatch.setattr(
        deps_auth,
        "carregar_usuario",
        lambda conn, id_u: {
            "id_usuario": id_u,
            "nome": "Produtor Teste",
            "email": "prod@teste.com",
            "ativo": True,
            "deve_trocar_senha": False,
            "perfil": "Produtor/Exportador",
        },
    )
    try:
        token = criar_access_token(id_usuario=999, perfil="Produtor/Exportador")
        response = client.post(
            "/sensores",
            json={"nome": "Sensor Teste"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "Perfil sem permissão" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_analista_nao_gerencia_usuarios_retorna_403(monkeypatch):
    """Garante que Analista de Dados não acessa rotas de Admin (403)."""
    app.dependency_overrides[get_conn] = _fake_conn
    monkeypatch.setattr(
        deps_auth,
        "carregar_usuario",
        lambda conn, id_u: {
            "id_usuario": id_u,
            "nome": "Analista Teste",
            "email": "analista@teste.com",
            "deve_trocar_senha": False,
            "ativo": True,
            "perfil": "Analista de Dados",
        },
    )
    try:
        token = criar_access_token(id_usuario=888, perfil="Analista de Dados")
        response = client.get(
            "/usuarios",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "Perfil sem permissão" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()