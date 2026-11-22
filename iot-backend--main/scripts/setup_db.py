"""Aplica todos os scripts SQL do banco RAIZ (iot_db-main) na ordem oficial.
Se o banco configurado (DB_NAME) ainda não existir localmente, cria automaticamente.

Uso:
    python -m scripts.setup_db
"""
from pathlib import Path
import sys

import psycopg2
from psycopg2 import sql as psql

from src import config, database

SQL_DIR = Path(__file__).resolve().parents[2] / "iot_db-main"

ORDEM_SCRIPTS = [
    "schema.sql",
    "implementação_ia.sql",
    "auth.sql",
    "ativacao.sql",
    "notificacoes.sql",
    "restricoes.sql",
    "seed.sql",
    "triggers.sql",
    "views.sql",
    "migracao_preferencias.sql",
]


def garantir_banco_existe() -> None:
    if config.DATABASE_URL or not config.DB_NAME:
        return
    conn = psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        dbname="postgres",
        user=config.DB_USER,
        password=config.DB_PASSWORD,
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (config.DB_NAME,))
            if not cur.fetchone():
                print(f"[DB] Criando banco '{config.DB_NAME}'...")
                cur.execute(psql.SQL("CREATE DATABASE {}").format(psql.Identifier(config.DB_NAME)))
            cur.execute(
                psql.SQL("ALTER DATABASE {} SET timezone TO 'UTC'").format(
                    psql.Identifier(config.DB_NAME)
                )
            )
    finally:
        conn.close()


def main() -> int:
    if not SQL_DIR.exists():
        print(f"[ERRO] Diretório SQL não encontrado: {SQL_DIR}")
        return 1

    try:
        garantir_banco_existe()
    except Exception as exc:
        print(f"[AVISO] Não foi possível verificar/criar o banco automaticamente: {exc}")

    conn = database.conectar()
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for nome in ORDEM_SCRIPTS:
                caminho = SQL_DIR / nome
                if not caminho.exists():
                    print(f"[AVISO] Script ausente, pulando: {nome}")
                    continue
                print(f"[SQL] Executando {nome}...")
                sql_text = caminho.read_text(encoding="utf-8")
                cur.execute(sql_text)
                print(f"[OK]  {nome}")
    except Exception as exc:
        print(f"[ERRO] Falha ao aplicar scripts SQL: {exc}")
        return 1
    finally:
        conn.close()

    print("\nBanco de dados inicializado com sucesso!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
