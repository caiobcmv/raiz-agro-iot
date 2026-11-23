-- 2º fator TOTP (aplicativo autenticador). Idempotente. Rode depois do auth.sql.
-- O segredo fica CIFRADO (Fernet, chave TOTP_ENC_KEY do .env). Códigos de recuperação: só o HMAC.
CREATE TABLE IF NOT EXISTS totp_segredo (
    fk_usuario_id_usuario INTEGER     PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    segredo_cifrado       TEXT        NOT NULL,
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_em         TIMESTAMPTZ,          -- NULL = cadastro iniciado, ainda não confirmado
    ultimo_passo          BIGINT                -- último time-step aceito (bloqueia reuso do código)
);

CREATE TABLE IF NOT EXISTS totp_recuperacao (
    id_recuperacao        BIGSERIAL   PRIMARY KEY,
    fk_usuario_id_usuario INTEGER     NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    codigo_hash           CHAR(64)    NOT NULL,
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
    usado_em              TIMESTAMPTZ,
    UNIQUE (fk_usuario_id_usuario, codigo_hash)
);
