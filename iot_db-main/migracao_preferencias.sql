-- ============================================================================
-- MIGRAÇÃO: Persistência de Perfil e Preferências do Usuário (RAIZ Agro IoT)
-- Compatível com PostgreSQL 14+ / Neon Serverless
-- ============================================================================

-- 1. Novas colunas de customização do perfil na tabela usuario
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS cargo           VARCHAR(120),
    ADD COLUMN IF NOT EXISTS bio             TEXT,
    ADD COLUMN IF NOT EXISTS telefone        VARCHAR(40),
    ADD COLUMN IF NOT EXISTS avatar_iniciais VARCHAR(6),
    ADD COLUMN IF NOT EXISTS avatar_cor      VARCHAR(30),
    ADD COLUMN IF NOT EXISTS avatar_url      VARCHAR(500);

-- 2. Tabela dedicada de preferências vinculada ao ID do usuário (1:1)
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

-- 3. Seed inicial de preferências para os usuários existentes (idempotente)
INSERT INTO usuario_preferencia (fk_usuario_id_usuario, tema, efeitos_visuais, atualizacao_tempo_real, moeda)
SELECT id_usuario, 'claro', TRUE, TRUE, 'BRL'
FROM usuario
ON CONFLICT (fk_usuario_id_usuario) DO NOTHING;
