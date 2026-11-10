import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import Json, RealDictCursor
from pydantic import BaseModel, Field

from src.api.deps import get_conn

router = APIRouter(prefix="/preferencias", tags=["preferencias"])


class PreferenciasUpdateIn(BaseModel):
    nome: Optional[str] = Field(default=None, max_length=150)
    cargo: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=600)
    telefone: Optional[str] = Field(default=None, max_length=40)
    avatar_iniciais: Optional[str] = Field(default=None, max_length=6)
    avatar_cor: Optional[str] = Field(default=None, max_length=30)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    tema: str = Field(default="claro", max_length=30)
    efeitos_visuais: bool = True
    atualizacao_tempo_real: bool = True
    idioma: str = Field(default="pt-BR", max_length=15)
    fuso_horario: str = Field(default="America/Recife", max_length=60)
    moeda: str = Field(default="BRL", max_length=10)
    notificacoes_json: Dict[str, Any] = Field(default_factory=dict)
    propriedade_json: Dict[str, Any] = Field(default_factory=dict)
    preferencias_extras: Dict[str, Any] = Field(default_factory=dict)


def _garantir_schema_preferencias(conn) -> None:
    """Garante de forma idempotente as colunas de perfil em `usuario`, os 3 usuários base e a tabela `usuario_preferencia`."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE usuario
                ADD COLUMN IF NOT EXISTS cargo VARCHAR(120),
                ADD COLUMN IF NOT EXISTS bio TEXT,
                ADD COLUMN IF NOT EXISTS telefone VARCHAR(40),
                ADD COLUMN IF NOT EXISTS avatar_iniciais VARCHAR(6),
                ADD COLUMN IF NOT EXISTS avatar_cor VARCHAR(30),
                ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS usuario_preferencia (
                fk_usuario_id_usuario  INTEGER PRIMARY KEY,
                tema                   VARCHAR(30) NOT NULL DEFAULT 'claro',
                efeitos_visuais        BOOLEAN NOT NULL DEFAULT TRUE,
                atualizacao_tempo_real BOOLEAN NOT NULL DEFAULT TRUE,
                idioma                 VARCHAR(15) NOT NULL DEFAULT 'pt-BR',
                fuso_horario           VARCHAR(60) NOT NULL DEFAULT 'America/Recife',
                moeda                  VARCHAR(10) NOT NULL DEFAULT 'BRL',
                notificacoes_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
                propriedade_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
                preferencias_extras    JSONB NOT NULL DEFAULT '{}'::jsonb,
                data_atualizacao       TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
                CONSTRAINT fk_pref_usuario FOREIGN KEY (fk_usuario_id_usuario)
                    REFERENCES usuario (id_usuario) ON DELETE CASCADE
            );
        """)
        # Garante perfis base caso o banco esteja vazio
        cur.execute("""
            INSERT INTO perfil (nome, descricao)
            SELECT p.nome, p.descricao
            FROM (VALUES
                ('Produtor/Exportador', 'Irrigação e logística fria'),
                ('Analista de Dados',   'Histórico, agregações e previsões'),
                ('Administrador',       'Usuários, parâmetros e auditoria')
            ) AS p(nome, descricao)
            WHERE NOT EXISTS (SELECT 1 FROM perfil x WHERE x.nome = p.nome);
        """)
        # Garante os 3 usuários oficiais da plataforma caso não existam
        usuarios_padrao = [
            (1, "Maria Clara", "maria.clara@raizagro.agr.br", "Gestora Técnica", "MC", "#10B981", "Produtor/Exportador"),
            (2, "Luiz Felipe", "luiz.felipe@raizagro.agr.br", "Analista IoT & Telemetria", "LF", "#0284C7", "Analista de Dados"),
            (3, "Lorena Lira", "lorena.lira@raizagro.agr.br", "Administradora", "LL", "#166534", "Administrador"),
        ]
        for uid, nome, email, cargo, iniciais, cor, nome_perfil in usuarios_padrao:
            cur.execute("SELECT 1 FROM usuario WHERE id_usuario = %s OR lower(email) = lower(%s)", (uid, email))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO usuario (id_usuario, nome, email, status, data_cadastro, cargo, avatar_iniciais, avatar_cor, fk_perfil_id_perfil)
                    OVERRIDING SYSTEM VALUE
                    VALUES (
                        %s, %s, %s, 'ativo', CURRENT_DATE, %s, %s, %s,
                        (SELECT id_perfil FROM perfil WHERE nome = %s LIMIT 1)
                    )
                """, (uid, nome, email, cargo, iniciais, cor, nome_perfil))
    conn.commit()


def _obter_perfil_e_preferencias(conn, id_usuario: int) -> dict:
    _garantir_schema_preferencias(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.cargo,
                u.bio,
                u.telefone,
                u.avatar_iniciais,
                u.avatar_cor,
                u.avatar_url,
                p.nome AS perfil,
                COALESCE(up.tema, 'claro') AS tema,
                COALESCE(up.efeitos_visuais, TRUE) AS efeitos_visuais,
                COALESCE(up.atualizacao_tempo_real, TRUE) AS atualizacao_tempo_real,
                COALESCE(up.idioma, 'pt-BR') AS idioma,
                COALESCE(up.fuso_horario, 'America/Recife') AS fuso_horario,
                COALESCE(up.moeda, 'BRL') AS moeda,
                COALESCE(up.notificacoes_json, '{}'::jsonb) AS notificacoes_json,
                COALESCE(up.propriedade_json, '{}'::jsonb) AS propriedade_json,
                COALESCE(up.preferencias_extras, '{}'::jsonb) AS preferencias_extras,
                up.data_atualizacao
            FROM usuario u
            LEFT JOIN perfil p ON p.id_perfil = u.fk_perfil_id_perfil
            LEFT JOIN usuario_preferencia up ON up.fk_usuario_id_usuario = u.id_usuario
            WHERE u.id_usuario = %s
        """, (id_usuario,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if row.get("data_atualizacao"):
        row["data_atualizacao"] = row["data_atualizacao"].isoformat()
    return dict(row)


@router.get("/usuario/{id_usuario}")
def obter_preferencias_usuario(id_usuario: int, conn=Depends(get_conn)):
    """Retorna os dados de perfil e preferências persistidas do usuário pelo ID."""
    return _obter_perfil_e_preferencias(conn, id_usuario)


@router.get("/email/{email}")
def obter_preferencias_por_email(email: str, conn=Depends(get_conn)):
    """Retorna os dados de perfil e preferências persistidas do usuário pelo e-mail."""
    _garantir_schema_preferencias(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id_usuario FROM usuario WHERE lower(email) = lower(%s)", (email.strip(),))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuário não encontrado para o e-mail informado")
    return _obter_perfil_e_preferencias(conn, row["id_usuario"])


@router.put("/usuario/{id_usuario}")
def salvar_preferencias_usuario(id_usuario: int, dados: PreferenciasUpdateIn, conn=Depends(get_conn)):
    """Salva permanentemente no banco de dados o perfil e todas as preferências do usuário."""
    _garantir_schema_preferencias(conn)
    agora = datetime.now(timezone.utc)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (id_usuario,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Atualiza colunas de perfil na tabela usuario
        sets_usuario = []
        params_usuario = []
        for campo in ("nome", "cargo", "bio", "telefone", "avatar_iniciais", "avatar_cor", "avatar_url"):
            val = getattr(dados, campo)
            if val is not None:
                sets_usuario.append(f"{campo} = %s")
                params_usuario.append(val)

        if sets_usuario:
            params_usuario.append(id_usuario)
            cur.execute(
                f"UPDATE usuario SET {', '.join(sets_usuario)} WHERE id_usuario = %s",
                params_usuario,
            )

        # Faz UPSERT na tabela usuario_preferencia
        cur.execute("""
            INSERT INTO usuario_preferencia (
                fk_usuario_id_usuario,
                tema,
                efeitos_visuais,
                atualizacao_tempo_real,
                idioma,
                fuso_horario,
                moeda,
                notificacoes_json,
                propriedade_json,
                preferencias_extras,
                data_atualizacao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (fk_usuario_id_usuario) DO UPDATE SET
                tema = EXCLUDED.tema,
                efeitos_visuais = EXCLUDED.efeitos_visuais,
                atualizacao_tempo_real = EXCLUDED.atualizacao_tempo_real,
                idioma = EXCLUDED.idioma,
                fuso_horario = EXCLUDED.fuso_horario,
                moeda = EXCLUDED.moeda,
                notificacoes_json = EXCLUDED.notificacoes_json,
                propriedade_json = EXCLUDED.propriedade_json,
                preferencias_extras = EXCLUDED.preferencias_extras,
                data_atualizacao = EXCLUDED.data_atualizacao
        """, (
            id_usuario,
            dados.tema,
            dados.efeitos_visuais,
            dados.atualizacao_tempo_real,
            dados.idioma,
            dados.fuso_horario,
            dados.moeda,
            Json(dados.notificacoes_json or {}),
            Json(dados.propriedade_json or {}),
            Json(dados.preferencias_extras or {}),
            agora,
        ))
    conn.commit()

    return _obter_perfil_e_preferencias(conn, id_usuario)
