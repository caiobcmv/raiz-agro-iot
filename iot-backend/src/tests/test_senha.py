import bcrypt

from src.api.security import hash_senha as criar_hash
from src.api.security import verificar_senha as conferir


def test_senha_nova_sai_em_argon2():
    h = criar_hash("SenhaTeste123")
    assert h.startswith("$argon2id$"), "A senha ainda está sendo salva em bcrypt"


def test_login_aceita_senha_certa():
    h = criar_hash("SenhaTeste123")
    assert conferir("SenhaTeste123", h)


def test_login_recusa_senha_errada():
    h = criar_hash("SenhaTeste123")
    assert not conferir("outraSenha", h)


def test_usuario_antigo_em_bcrypt_continua_entrando():
    antigo = bcrypt.hashpw(b"SenhaAntiga1", bcrypt.gensalt()).decode()
    assert conferir("SenhaAntiga1", antigo)


def test_security_py_nao_usa_mais_bcrypt():
    import os
    caminho = "src/api/security.py" if os.path.exists("src/api/security.py") else "iot-backend/src/api/security.py"
    with open(caminho, encoding="utf-8") as f:
        assert "import bcrypt" not in f.read()