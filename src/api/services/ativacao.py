import os
from urllib.parse import quote

from src import config
from ..email_service import enviar_link_ativacao
from ..security_auth import gerar_codigo_ativacao, hash_token, normalizar_codigo_ativacao

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def emitir_ativacao(conn, usuario: dict, ip, background) -> None:
    codigo = gerar_codigo_ativacao()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE ativacao_token SET usado_em = now() WHERE fk_usuario_id_usuario = %s AND usado_em IS NULL",
            (usuario["id_usuario"],),
        )
        cur.execute(
            """
            INSERT INTO ativacao_token (fk_usuario_id_usuario, codigo_hash, expira_em, ip)
            VALUES (%s, %s, now() + make_interval(hours => %s), %s)
            """,
            (usuario["id_usuario"], hash_token(normalizar_codigo_ativacao(codigo)), config.ATIVACAO_VALIDADE_H, ip),
        )
    link = f"{FRONTEND_URL}/primeiro-acesso?email={quote(usuario['email'])}&codigo={codigo}"
    background.add_task(enviar_link_ativacao, usuario["email"], usuario["nome"], codigo, link, config.ATIVACAO_VALIDADE_H)