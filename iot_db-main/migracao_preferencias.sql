-- =====================================================================
-- MIGRAÇÃO DE BANCO DE DADOS (PostgreSQL / Neon.tech / Render)
-- Persistência de Perfil, Preferências, Histórico de Safra, Alertas e Gráficos
-- =====================================================================

-- 1. Novas colunas de identidade e personalização na tabela `usuario`
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS cargo VARCHAR(120),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS avatar_iniciais VARCHAR(6),
    ADD COLUMN IF NOT EXISTS avatar_cor VARCHAR(30),
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- 2. Tabela dedicada `usuario_preferencia` vinculada ao ID do usuário
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

-- 3. Tabela `historico_safra` (Ciclos de safra do perfil do Produtor/Analista)
CREATE TABLE IF NOT EXISTS historico_safra (
    id_safra                 SERIAL PRIMARY KEY,
    ciclo                    VARCHAR(40) NOT NULL UNIQUE,
    cultura                  VARCHAR(100) NOT NULL,
    area_ha                  NUMERIC(10,2) NOT NULL,
    produtividade_ton_ha     NUMERIC(10,2) NOT NULL,
    volume_total_ton         NUMERIC(10,2) NOT NULL,
    consumo_agua_m3_ha       INTEGER NOT NULL DEFAULT 3420,
    brix_medio               NUMERIC(5,2) NOT NULL DEFAULT 18.5,
    taxa_exportacao_pct      NUMERIC(5,2) NOT NULL DEFAULT 95.0,
    status                   VARCHAR(30) NOT NULL DEFAULT 'Em Andamento',
    destinacao_export_pct    INTEGER NOT NULL DEFAULT 78,
    destinacao_interno_pct   INTEGER NOT NULL DEFAULT 16,
    destinacao_industria_pct INTEGER NOT NULL DEFAULT 6,
    data_atualizacao         TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 4. Tabela `desempenho_talhao` (Rendimento detalhado por talhão da safra)
CREATE TABLE IF NOT EXISTS desempenho_talhao (
    id_talhao            SERIAL PRIMARY KEY,
    codigo               VARCHAR(30) NOT NULL UNIQUE,
    variedade            VARCHAR(80) NOT NULL,
    porta_enxerto        VARCHAR(60) NOT NULL,
    ciclo                VARCHAR(40) NOT NULL DEFAULT '2025/2026',
    area_ha              NUMERIC(8,2) NOT NULL,
    volume_ton           NUMERIC(10,2) NOT NULL,
    produtividade_ton_ha NUMERIC(8,2) NOT NULL,
    brix_medio           NUMERIC(5,2) NOT NULL,
    calibres_mm          VARCHAR(30) NOT NULL,
    status               VARCHAR(40) NOT NULL,
    data_atualizacao     TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 5. Tabela `alerta_operacional_estado` (Status persistente de alertas atendidos/pendentes)
CREATE TABLE IF NOT EXISTS alerta_operacional_estado (
    codigo_alerta    VARCHAR(60) PRIMARY KEY,
    titulo           VARCHAR(200) NOT NULL,
    severidade       VARCHAR(30) NOT NULL,
    prioridade       VARCHAR(10) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'pendente',
    lote_ou_talhao   VARCHAR(120),
    sensor_ref       VARCHAR(80),
    leitura_atual    VARCHAR(60),
    limiar_seguro    VARCHAR(80),
    acao_tomada      TEXT,
    atendido_por     VARCHAR(100),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 6. Tabela `telemetria_grafico_estado` (Dados persistentes das séries dos gráficos)
CREATE TABLE IF NOT EXISTS telemetria_grafico_estado (
    id_config              INTEGER PRIMARY KEY DEFAULT 1,
    umidade_ar_24h         JSONB NOT NULL,
    umidade_solo_24h       JSONB NOT NULL,
    temp_solo_24h          JSONB NOT NULL,
    temp_ar_24h            JSONB NOT NULL,
    conformidade_geral_pct INTEGER NOT NULL DEFAULT 90,
    saude_plantacao_pct    INTEGER NOT NULL DEFAULT 85,
    umidade_dossel_pct     INTEGER NOT NULL DEFAULT 67,
    temp_foliar_c          NUMERIC(5,2) NOT NULL DEFAULT 27.0,
    agua_reservatorio_pct  INTEGER NOT NULL DEFAULT 63,
    vazao_ldia             INTEGER NOT NULL DEFAULT 4200,
    curva_termica_analista JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_atualizacao       TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);
