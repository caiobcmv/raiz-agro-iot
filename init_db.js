/**
 * INICIALIZADOR DE BANCO DE DADOS LOCAL (SQL FÍSICO)
 * Lê e carrega as tabelas, relacionamentos e dados da pasta 'iot_db-main'
 * gerando o banco de dados relacional físico persistente 'database-local/raiz_agro.db'
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.resolve(__dirname, 'database-local');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'raiz_agro.db');
const db = new DatabaseSync(DB_PATH);

console.log('Criando banco de dados físico em:', DB_PATH);

// 1. Criação do Schema compatível com iot_db-main
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS perfil (
    id_perfil INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT
  );

  CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    id_perfil INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfil(id_perfil)
  );

  CREATE TABLE IF NOT EXISTS sensor (
    id_sensor INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(80) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    talhao VARCHAR(80) NOT NULL,
    latitude REAL,
    longitude REAL,
    canal_thingspeak INTEGER,
    bateria_nivel INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leitura_climatica (
    id_leitura INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sensor INTEGER NOT NULL,
    temperatura REAL,
    temperatura_solo REAL,
    umidade_solo REAL,
    umidade_ar REAL,
    pressao REAL,
    radiacao_solar REAL,
    rssi_dbm INTEGER,
    bateria_volts REAL,
    entry_id INTEGER,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sensor) REFERENCES sensor(id_sensor)
  );

  CREATE TABLE IF NOT EXISTS lote (
    id_lote INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    cultura VARCHAR(50) NOT NULL,
    talhao VARCHAR(50) NOT NULL,
    safra VARCHAR(20) NOT NULL,
    volume_kg REAL,
    brix REAL,
    status VARCHAR(30) DEFAULT 'maturacao',
    destino VARCHAR(100),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerta (
    id_alerta INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    nivel VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    id_sensor INTEGER,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerta_preditivo (
    id_alerta_preditivo INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sensor INTEGER,
    sensor_nome VARCHAR(80),
    talhao VARCHAR(80),
    probabilidade REAL,
    corte REAL,
    severidade VARCHAR(20),
    acao_recomendada TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leitura_rejeitada (
    id_rejeicao INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_nome VARCHAR(80),
    motivo TEXT,
    valor_bruto TEXT,
    talhao VARCHAR(80),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS viagem (
    id_viagem INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    motorista VARCHAR(100),
    placa VARCHAR(20),
    origem VARCHAR(80),
    destino VARCHAR(80),
    temp_atual REAL,
    temp_meta REAL,
    status VARCHAR(30) DEFAULT 'em_transito',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Carga inicial dos dados de seed caso o banco esteja vazio
const userCount = db.prepare('SELECT COUNT(*) as c FROM usuario').get().c;

if (userCount === 0) {
  console.log('Populando banco de dados com dados de seed do iot_db-main...');

  // Perfis
  db.exec(`
    INSERT INTO perfil (id_perfil, nome, descricao) VALUES
    (1, 'Gestor', 'Acesso administrativo e executivo de operações'),
    (2, 'Analista', 'Acesso técnico a telemetria, hardware ESP32 e calibrações'),
    (3, 'Administrador', 'Controle absoluto de infraestrutura, governança de usuários e políticas globais');
  `);

  // Usuários
  db.exec(`
    INSERT INTO usuario (id_usuario, id_perfil, nome, email, senha_hash, ativo) VALUES
    (1, 1, 'Maria Clara', 'maria.clara@raizagro.agr.br', 'pbkdf2_sha256$mocked_hash_gestora', 1),
    (2, 2, 'Luiz Felipe', 'luiz.felipe@raizagro.agr.br', 'pbkdf2_sha256$mocked_hash_analista', 1),
    (3, 3, 'Lorena Lira', 'lorena.lira@raizagro.agr.br', 'pbkdf2_sha256$mocked_hash_admin', 1);
  `);

  // Sensores
  db.exec(`
    INSERT INTO sensor (id_sensor, nome, tipo, talhao, latitude, longitude, canal_thingspeak, bateria_nivel, status) VALUES
    (1, 'SNS-SL-001', 'Solo (FDR)', 'Talhão A1 • Uva Vitória', -9.388, -40.502, 248901, 98, 'ativo'),
    (2, 'SNS-AR-002', 'Ar / Microclima', 'Talhão A1 • Uva Vitória', -9.389, -40.501, 248901, 95, 'ativo'),
    (3, 'SNS-SL-003', 'Solo (FDR)', 'Talhão B2 • Uva Thompson', -9.387, -40.504, 248902, 92, 'ativo'),
    (4, 'SNS-AR-004', 'Ar / Microclima', 'Talhão B2 • Uva Thompson', -9.386, -40.503, 248902, 90, 'ativo'),
    (5, 'SNS-SL-005', 'Solo (FDR)', 'Talhão C1 • Manga Palmer', -9.385, -40.506, 248903, 88, 'ativo'),
    (25, 'SNS-SL-025', 'Solo (Calibração)', 'Bancada Teste', -9.384, -40.507, 248904, 45, 'inativo');
  `);

  // Leituras climáticas
  db.exec(`
    INSERT INTO leitura_climatica (id_sensor, temperatura, temperatura_solo, umidade_solo, umidade_ar, pressao, radiacao_solar, rssi_dbm, bateria_volts, entry_id) VALUES
    (1, 27.4, 24.1, 46.8, 61.2, 1013.2, 780.0, -81, 3.92, 14892);
  `);

  // Lotes
  db.exec(`
    INSERT INTO lote (codigo, cultura, talhao, safra, volume_kg, brix, status, destino) VALUES
    ('LOTE-UVA-2026-A1', 'Uva Vitória', 'Talhão A1', '2025/2026', 18500, 18.2, 'maturacao', 'Exportação (Europa)'),
    ('LOTE-MANGA-2026-C1', 'Manga Palmer', 'Talhão C1', '2025/2026', 24000, 14.5, 'colheita', 'Exportação (EUA)');
  `);

  // Alertas
  db.exec(`
    INSERT INTO alerta (titulo, descricao, nivel, status, id_sensor) VALUES
    ('Desvio Térmico no Lote de Manga', 'DHT11 registrou 14.8°C acima do teto de 13.0°C em trânsito para Pecém.', 'critico', 'pendente', 1),
    ('Déficit de Umidade Relativa no Lote de Uva', 'Umidade caiu para 87.5% UR na câmara de armazenamento.', 'medio', 'pendente', 2),
    ('Oscilação Térmica em Melão Amarelo', 'Temperatura em 12.3°C na antecâmara.', 'baixo', 'reconhecido', 3);
  `);

  // Alertas Preditivos
  db.exec(`
    INSERT INTO alerta_preditivo (sensor_nome, talhao, probabilidade, corte, severidade, acao_recomendada) VALUES
    ('SNS-SL-004', 'Talhão A1', 0.84, 0.70, 'alta', 'Antecipar irrigação matinal em 40 min'),
    ('SNS-AR-002', 'Talhão B2', 0.62, 0.50, 'moderada', 'Verificar ventilação da antecâmara');
  `);

  // Leituras Rejeitadas
  db.exec(`
    INSERT INTO leitura_rejeitada (sensor_nome, motivo, valor_bruto, talhao) VALUES
    ('Sonda Solo #SNS-SL-04', 'Outlier térmico (temperatura_bruta = 62.4°C acima do limite físico)', '62.4°C', 'Talhão A1'),
    ('Sonda FDR #SNS-SL-07', 'Leitura analógica corrompida (umidade_bruta < 0% VWC)', '-4.2% VWC', 'Talhão C2');
  `);

  // Viagens
  db.exec(`
    INSERT INTO viagem (codigo, motorista, placa, origem, destino, temp_atual, temp_meta, status) VALUES
    ('VG-2026-PECEM-01', 'Reginaldo Silva', 'KLR-9A42', 'Petrolina - PE', 'Porto de Pecém - CE', 13.8, 12.0, 'em_transito');
  `);

  console.log('Seed concluído com sucesso!');
} else {
  console.log('Banco de dados já existente e operacional com registros persistidos.');
}

// Atualizar Lorena Lira para bancos já criados
try {
  db.prepare("UPDATE usuario SET nome = 'Lorena Lira', email = 'lorena.lira@raizagro.agr.br' WHERE id_usuario = 3").run();
} catch (e) {}

module.exports = { db };

