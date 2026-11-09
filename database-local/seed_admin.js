const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.resolve(__dirname, 'raiz_agro.db'));

// Inserir perfil Administrador se não existir
const perfilAdmin = db.prepare("SELECT * FROM perfil WHERE id_perfil = 3 OR nome = 'Administrador'").get();
if (!perfilAdmin) {
  db.exec("INSERT INTO perfil (id_perfil, nome, descricao) VALUES (3, 'Administrador', 'Controle absoluto de infraestrutura, governança de usuários e políticas globais');");
  console.log('Perfil Administrador criado com id 3');
} else {
  console.log('Perfil Administrador já existe:', perfilAdmin);
}

// Inserir usuários conforme a mockup de Gerenciamento de Usuários
const usuariosSeed = [
  { id: 1, id_perfil: 1, nome: 'Maria Clara Gestora', email: 'maria.clara@raizagro.agr.br', senha: 'hash', ativo: 1 },
  { id: 2, id_perfil: 2, nome: 'Luiz Felipe', email: 'luiz.felipe@raizagro.agr.br', senha: 'hash', ativo: 1 },
  { id: 3, id_perfil: 3, nome: 'Lorena Lira', email: 'lorena.lira@raizagro.agr.br', senha: 'hash', ativo: 1 },
  { id: 4, id_perfil: 1, nome: 'Rodrigo Alves', email: 'rodrigo.alves@raizagro.agr.br', senha: 'hash', ativo: 1 },
  { id: 5, id_perfil: 2, nome: 'Dra. Gabriela Sales', email: 'gabriela.sales@raizagro.agr.br', senha: 'hash', ativo: 1 },
  { id: 6, id_perfil: 1, nome: 'João Pedro', email: 'joao.pedro@raizagro.agr.br', senha: 'hash', ativo: 1 }
];

// Corrige bancos já criados
db.prepare("UPDATE usuario SET nome = 'Lorena Lira', email = 'lorena.lira@raizagro.agr.br' WHERE id_usuario = 3 OR email = 'carlos.silva@raizagro.agr.br'").run();

for (const u of usuariosSeed) {
  const exists = db.prepare('SELECT * FROM usuario WHERE email = ?').get(u.email);
  if (!exists) {
    db.prepare('INSERT INTO usuario (id_usuario, id_perfil, nome, email, senha_hash, ativo) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.id_perfil, u.nome, u.email, u.senha, u.ativo);
    console.log('Criado usuario:', u.nome);
  } else {
    db.prepare('UPDATE usuario SET id_perfil = ?, nome = ? WHERE email = ?').run(u.id_perfil, u.nome, u.email);
    console.log('Usuário atualizado:', u.nome);
  }
}

// Tabela de Relatórios Oficiais para o Admin (mockup 5)
db.exec(`
  CREATE TABLE IF NOT EXISTS relatorio_oficial (
    id_relatorio INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    codigo_ref VARCHAR(50),
    gerado_por VARCHAR(100),
    papel_gerador VARCHAR(50),
    data_geracao VARCHAR(50),
    formato VARCHAR(10),
    tamanho VARCHAR(20),
    parametros_json TEXT,
    arquivo_url TEXT
  );
`);

const relatorioCount = db.prepare('SELECT COUNT(*) as c FROM relatorio_oficial').get().c;
if (relatorioCount === 0) {
  db.exec(`
    INSERT INTO relatorio_oficial (titulo, tipo, codigo_ref, gerado_por, papel_gerador, data_geracao, formato, tamanho, parametros_json, arquivo_url) VALUES
    ('Fechamento de Safra 2025/2026 (Preliminar)', 'fechamento_safra', '#REL-2026-0822', 'Carlos Eduardo', 'Admin Geral', 'Hoje, 22 de Set 10:45 BRT', 'PDF', '4.2 MB', 'Talhões A1-B2 • VWC, Brix & ETo', '/downloads/relatorio-safra-preliminar.pdf'),
    ('Dossiê de Conformidade GlobalG.A.P. — Uva Vitória', 'conformidade_globalgap', '#GG-884021', 'Dra. Gabriela Sales', 'Analista Qualidade', 'Ontem 18:20 BRT', 'PDF', '8.7 MB', 'Lote EXP-2026-08 • 0% Resíduos', '/downloads/dossie-globalgap-uva.pdf'),
    ('Auditoria Forense de Sensores & Rejeições ThingSpeak', 'auditoria_sensores', 'Dump Diário Automatizado', 'Rotina Automática', 'Agendador Cron', '20 de Set 03:00 BRT', 'CSV', '1.4 MB', 'Tabela leitura_rejeitada • 3500765', '/downloads/auditoria-sensores-thingspeak.csv'),
    ('Relatório de Perda de Qualidade & Desvio Térmico', 'perda_qualidade', 'Lote Termo #T-481', 'Luiz Felipe', 'Analista IoT', '18 de Set 14:15 BRT', 'XLSX', '2.1 MB', 'Manga Palmer • Limiar > 13.0°C', '/downloads/relatorio-desvio-termico.xlsx');
  `);
  console.log('Relatórios oficiais de seed inseridos!');
}

console.log('Perfis no banco:', db.prepare('SELECT * FROM perfil').all());
console.log('Usuários no banco:', db.prepare('SELECT u.id_usuario, u.nome, u.email, p.nome as perfil FROM usuario u JOIN perfil p ON u.id_perfil = p.id_perfil').all());
console.log('Relatórios no banco:', db.prepare('SELECT COUNT(*) as c FROM relatorio_oficial').get().c);
