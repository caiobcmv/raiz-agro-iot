from .security_auth import hash_senha as _hash, verificar_senha as _verificar


def hash_senha(senha: str) -> str:
        return _hash(senha)


def verificar_senha(senha: str, hash_salvo: str) -> bool:
    try:
       return _verificar(senha, hash_salvo)
    except ValueError:
        return False