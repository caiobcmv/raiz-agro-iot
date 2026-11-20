/**
 * VIEW: RELATÓRIOS & DOCUMENTOS OFICIAIS (FIGMA MOCKUP 5)
 * KPIs de Conformidade & Auditoria, Formulário de Emissão Imediata (PDF, CSV, XLSX)
 * com compilação em tempo real e download imediato, Repositório de Documentos Oficiais
 * com busca em tempo real, abas de filtro e download real.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let _relatoriosList = [
  {
    id: 1,
    titulo: 'Fechamento de Safra 2025/2026 (Preliminar)',
    tipo_label: 'fechamento_safra',
    codigo_ref: '#REL-2026-0822',
    gerado_por: 'Carlos Eduardo',
    cargo_gerador: 'Admin Geral',
    iniciais: 'CE',
    avatarBg: '#DCFCE7',
    avatarColor: '#047857',
    data: 'Hoje, 22 de Set 10:45 BRT',
    formato: 'PDF',
    tamanho: '4.2 MB',
    parametros: 'Talhões A1-B2 • VWC, Brix & ETo',
    badgeColor: '#EF4444',
    isGlobalGap: false,
    isPdf: true,
    btnEstilo: 'primario'
  },
  {
    id: 2,
    titulo: 'Dossiê de Conformidade GlobalG.A.P. — Uva Vitória',
    tipo_label: 'conformidade_globalgap',
    codigo_ref: 'Certificado #GG-884021',
    gerado_por: 'Dra. Gabriela Sales',
    cargo_gerador: 'Analista Qualidade',
    iniciais: 'GS',
    avatarBg: '#DCFCE7',
    avatarColor: '#047857',
    data: 'Ontem 18:20 BRT',
    formato: 'PDF',
    tamanho: '8.7 MB',
    parametros: 'Lote EXP-2026-08 • 0% Resíduos',
    badgeColor: '#EF4444',
    isGlobalGap: true,
    isPdf: true,
    btnEstilo: 'primario'
  },
  {
    id: 3,
    titulo: 'Auditoria Forense de Sensores & Rejeições ThingSpeak',
    tipo_label: 'auditoria_sensores',
    codigo_ref: 'Dump Diário Automatizado',
    gerado_por: 'Rotina Automática',
    cargo_gerador: 'Agendador Cron',
    iniciais: 'RA',
    avatarBg: '#F1F5F9',
    avatarColor: '#475569',
    data: '20 de Set 03:00 BRT',
    formato: 'CSV',
    tamanho: '1.4 MB',
    parametros: 'Tabela leitura_rejeitada • 3500765',
    badgeColor: '#0284C7',
    isGlobalGap: false,
    isPdf: false,
    btnEstilo: 'outline'
  },
  {
    id: 4,
    titulo: 'Relatório de Perda de Qualidade & Desvio Térmico',
    tipo_label: 'perda_qualidade',
    codigo_ref: 'Lote Termo #T-481',
    gerado_por: 'Luiz Felipe',
    cargo_gerador: 'Analista IoT',
    iniciais: 'LF',
    avatarBg: '#DCFCE7',
    avatarColor: '#047857',
    data: '18 de Set 14:15 BRT',
    formato: 'XLSX',
    tamanho: '2.1 MB',
    parametros: 'Manga Palmer • Limiar > 13.0°C',
    badgeColor: '#10B981',
    isGlobalGap: false,
    isPdf: false,
    btnEstilo: 'outline'
  }
];

let _filtroTabRel = 'todos';
let _termoBuscaRel = '';
let _paginaAtualRel = 1;

export async function renderRelatorios() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- 3 KPIs Superiores de Relatórios -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">RELATÓRIOS EMITIDOS NO MÊS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+14% ciclo</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">38</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">documentos compilados</div>
          </div>
          <div style="display: flex; gap: 12px; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>• 24 PDF</span>
            <span>• 10 CSV</span>
            <span>• 4 XLSX</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">CONFORMIDADE &amp; AUDITORIA</span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #047857; line-height: 1;">100%</div>
            <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 4px;">Homologado</div>
          </div>
          <div style="display: flex; gap: 8px; font-size: 10px; border-top: 1px solid #F1F5F9; padding-top: 8px; flex-wrap: wrap;">
            <span style="background: #DCFCE7; color: #047857; padding: 2px 8px; border-radius: 4px; font-weight: 600;">GlobalG.A.P. Ativo</span>
            <span style="background: #F1F5F9; color: #475569; padding: 2px 8px; border-radius: 4px;">MAPA Compliance Forense v4</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">AGENDAMENTOS AUTOMÁTICOS</span>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">Cron Service</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">4</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">rotinas ativas</div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            Fechamento Semanal • Dump Sensores • Auditoria Mensal • Safra
          </div>
        </div>
      </div>

      <!-- Seção: Emissão Imediata de Relatório (Filtros e Compilador) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="file-plus" style="width: 16px; height: 16px; color: #10B981;"></i>
              Emissão Imediata de Relatório
            </h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Preencha os filtros para compilação tabular e processamento analítico com assinatura digital.</p>
          </div>
          <span style="font-size: 11px; color: #64748B; font-family: monospace;">⚡ schema.sql: relatorio</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 16px;">
          <!-- Campo 1: Tipo de Relatório -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Tipo de Relatório</label>
            <select id="relatorio-tipo" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF; cursor: pointer;">
              <option value="Fechamento de Safra (Consolidado)">Fechamento de Safra (Consolidado)</option>
              <option value="Dossiê de Conformidade GlobalG.A.P.">Dossiê de Conformidade GlobalG.A.P.</option>
              <option value="Auditoria Forense de Sensores & Rejeições">Auditoria Forense de Sensores &amp; Rejeições</option>
              <option value="Relatório de Perda de Qualidade & Desvio Térmico">Relatório de Perda de Qualidade &amp; Desvio Térmico</option>
            </select>
          </div>

          <!-- Campo 2: Safra / Janela Temporal -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Safra / Janela Temporal</label>
            <div style="position: relative;">
              <input type="text" id="relatorio-janela" value="Safra 2025/2026 — Atual Ativa" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
              <i data-lucide="calendar" style="position: absolute; right: 10px; top: 9px; width: 14px; height: 14px; color: #64748B; cursor: pointer;"></i>
            </div>
          </div>

          <!-- Campo 3: Talhões / Escopo de Coleta -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Talhões / Escopo de Coleta</label>
            <select id="relatorio-talhao" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF; cursor: pointer;">
              <option value="Todos os 8 Talhões Ativos (Global)">Todos os 8 Talhões Ativos (Global)</option>
              <option value="Talhão A1 • Uva Vitória">Talhão A1 • Uva Vitória</option>
              <option value="Talhão A2 • Uva Crimson">Talhão A2 • Uva Crimson</option>
              <option value="Talhão B2 • Melão Amarelo">Talhão B2 • Melão Amarelo</option>
              <option value="Talhão C1 • Manga Tommy">Talhão C1 • Manga Tommy</option>
            </select>
          </div>
        </div>

        <!-- Linha Inferior: Formato e Botão Compilar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; padding-top: 12px; border-top: 1px solid #F1F5F9;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 11px; font-weight: 700; color: #475569;">Formato:</span>
            
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; color: #334155; font-weight: 600;">
              <input type="radio" name="relatorio-formato" value="pdf" checked style="accent-color: #10B981;">
              <span style="color: #DC2626;">📄</span> PDF Executivo
            </label>

            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; color: #334155; font-weight: 600;">
              <input type="radio" name="relatorio-formato" value="csv" style="accent-color: #10B981;">
              <span style="color: #0284C7;">📊</span> Planilha CSV
            </label>

            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; color: #334155; font-weight: 600;">
              <input type="radio" name="relatorio-formato" value="xlsx" style="accent-color: #10B981;">
              <span style="color: #059669;">📗</span> Excel XLSX
            </label>
          </div>

          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <span style="font-size: 10px; color: #64748B;">Processamento assíncrono via worker • Tempo médio estimado: ~4.8s</span>
            <button class="btn btn-primary" id="btn-compilar-relatorio" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 12px; font-weight: 700; padding: 9px 18px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
              <i data-lucide="zap" style="width: 14px; height: 14px;"></i>
              <span>Compilar &amp; Gerar Documento</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Seção: Repositório de Relatórios & Arquivos Oficiais -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;">Repositório de Relatórios &amp; Arquivos Oficiais</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Histórico auditável com rastreabilidade criptográfica de autoria</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="position: relative;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-relatorio" placeholder="Buscar por título, lote ou autor..." style="padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; width: 220px; background: #FFFFFF;">
            </div>
            <button class="btn-tab-rel active" data-tab="todos" style="padding: 6px 14px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (38)</button>
            <button class="btn-tab-rel" data-tab="pdfs" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">PDFs</button>
            <button class="btn-tab-rel" data-tab="globalgap" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">GlobalG.A.P.</button>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">
                <th style="padding: 10px 14px;">TIPO &amp; IDENTIFICAÇÃO</th>
                <th style="padding: 10px 14px;">GERADO POR (RBAC)</th>
                <th style="padding: 10px 14px;">DATA DE GERAÇÃO</th>
                <th style="padding: 10px 14px;">FORMATO &amp; TAMANHO</th>
                <th style="padding: 10px 14px;">PARÂMETROS JSON</th>
                <th style="padding: 10px 14px; text-align: right;">AÇÕES OFICIAIS</th>
              </tr>
            </thead>
            <tbody id="tbody-relatorios">
              ${renderLinhasRelatoriosHtml()}
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B; flex-wrap: wrap; gap: 8px;">
          <span>Exibindo 1 a 4 de 38 relatórios gerados</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn-pag-rel" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Anterior</button>
            <button class="btn-pag-rel active" style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700; cursor: pointer;">1</button>
            <button class="btn-pag-rel" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button class="btn-pag-rel" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
            <button class="btn-pag-rel" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">10</button>
            <button class="btn-pag-rel" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getRelatoriosFiltrados() {
  return _relatoriosList.filter(r => {
    // Busca textual
    if (_termoBuscaRel) {
      const t = _termoBuscaRel.toLowerCase();
      const matchTitulo = r.titulo.toLowerCase().includes(t);
      const matchGerador = r.gerado_por.toLowerCase().includes(t);
      const matchRef = r.codigo_ref.toLowerCase().includes(t);
      if (!matchTitulo && !matchGerador && !matchRef) return false;
    }

    // Filtro por abas
    if (_filtroTabRel === 'pdfs') {
      return r.isPdf;
    } else if (_filtroTabRel === 'globalgap') {
      return r.isGlobalGap;
    }
    return true;
  });
}

function renderLinhasRelatoriosHtml() {
  const filtrados = getRelatoriosFiltrados();
  if (filtrados.length === 0) {
    return `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #64748B;">
          Nenhum relatório encontrado com os critérios de busca.
        </td>
      </tr>
    `;
  }

  return filtrados.map(r => `
    <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.2s;">
      <td style="padding: 12px 14px;">
        <div>
          <strong style="color: #0F172A; font-size: 13px;">${r.titulo}</strong>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
            <span style="font-size: 9px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 1px 6px; border-radius: 4px;">${r.tipo_label}</span>
            <span style="font-size: 10px; color: #64748B;">ID: ${r.codigo_ref}</span>
          </div>
        </div>
      </td>
      <td style="padding: 12px 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: ${r.avatarBg}; color: ${r.avatarColor}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0;">
            ${r.iniciais}
          </div>
          <div>
            <strong style="color: #0F172A; font-size: 12px;">${r.gerado_por}</strong>
            <div style="font-size: 10px; color: #64748B;">${r.cargo_gerador}</div>
          </div>
        </div>
      </td>
      <td style="padding: 12px 14px; color: #475569; font-size: 11px;">
        ${r.data}
      </td>
      <td style="padding: 12px 14px;">
        <span style="font-size: 10px; font-weight: 700; color: #FFFFFF; background: ${r.badgeColor}; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
          ${r.formato} • ${r.tamanho}
        </span>
      </td>
      <td style="padding: 12px 14px; color: #64748B; font-size: 11px;">
        <code style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${r.parametros}</code>
      </td>
      <td style="padding: 12px 14px; text-align: right;">
        <div style="display: inline-flex; gap: 6px; align-items: center;">
          <button class="btn-baixar-relatorio" data-titulo="${r.titulo}" data-formato="${r.formato}" style="${
            r.btnEstilo === 'primario'
              ? 'background: #183D2E; color: #FFFFFF; border: none;'
              : 'background: #FFFFFF; color: #334155; border: 1px solid #CBD5E1;'
          } padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
            <i data-lucide="download" style="width: 12px; height: 12px;"></i>
            <span>Baixar ${r.formato}</span>
          </button>
          <button class="btn-compartilhar-relatorio" data-id="${r.id}" title="Compartilhar ou Inspecionar" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; padding: 5px 8px; border-radius: 6px; cursor: pointer;">
            <i data-lucide="${r.btnEstilo === 'primario' ? 'share-2' : 'eye'}" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function atualizarTabelaRelatorios() {
  const tbody = document.getElementById('tbody-relatorios');
  if (tbody) {
    tbody.innerHTML = renderLinhasRelatoriosHtml();
    if (window.lucide) window.lucide.createIcons();
    vincularEventosTabelaRel();
  }
}

function dispararDownloadReal(titulo, formato) {
  let mimeType = 'text/plain';
  let extensao = formato.toLowerCase();
  let content = '';

  if (extensao === 'csv') {
    mimeType = 'text/csv;charset=utf-8;';
    content = `timestamp;sensor;talhao;cultura;vwc_solo;temp_ar;umid_ar;rssi_dbm;status\n` +
              `2026-09-22 15:42:00;SNS-SL-001;Talhao A1;Uva Vitoria;46.8;27.4;61.2;-81;VALIDO\n` +
              `2026-09-22 15:37:00;SNS-SL-001;Talhao A1;Uva Vitoria;46.7;27.3;61.5;-80;VALIDO\n` +
              `2026-09-22 15:32:00;SNS-SL-019;Talhao C1;Manga Tommy;62.4;28.1;59.4;-85;REJEITADO_OUTLIER\n` +
              `2026-09-22 15:27:00;SNS-AR-002;Talhao A1;Uva Vitoria;46.8;28.1;59.4;-80;VALIDO\n`;
  } else if (extensao === 'xlsx') {
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    content = `RAIZ AGRO - PLATAFORMA IOT AGRICULTURA DE PRECISÃO\n` +
              `RELATORIO OFICIAL: ${titulo}\n` +
              `Safra: 2025/2026 | Polo Petrolina-PE\n` +
              `Assinatura Digital SHA-256: d41d8cd98f00b204e9800998ecf8427e\n\n` +
              `Talhao;Cultura;Produtividade (ton/ha);Brix Medio;Faixa Frio (C);Status\n` +
              `Talhao A1;Uva Vitoria;32.4;19.8;0.8;Colhido / Exportado\n` +
              `Talhao B1;Manga Palmer;29.0;16.5;12.0;Em Transito (Peceem)\n` +
              `Talhao B2;Melao Amarelo;28.1;12.4;10.5;Packing House\n`;
  } else {
    mimeType = 'application/pdf';
    content = `%PDF-1.4\n` +
              `% RAIZ AGRO PLATAFORMA IOT AGRICULTURA DE PRECISÃO\n` +
              `% RELATÓRIO OFICIAL: ${titulo}\n` +
              `% DATA: 22 de setembro de 2026\n` +
              `% POLO: Sertão do São Francisco / Petrolina - Setor 04\n` +
              `% AUDITORIA FORENSE: Homologado GlobalG.A.P. & MAPA Compliance v4\n` +
              `% ASSINATURA DIGITAL: 0x9812A7C4B29E1084F\n` +
              `% STATUS: Persistido no Banco de Dados Relacional (PostgreSQL / raiz_agro.db)\n`;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${titulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${extensao}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function vincularEventosTabelaRel() {
  document.querySelectorAll('.btn-baixar-relatorio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const titulo = e.currentTarget.dataset.titulo;
      const formato = e.currentTarget.dataset.formato;
      dispararDownloadReal(titulo, formato);
      toast.success('Download Concluído', `Arquivo ${titulo} (${formato}) baixado com sucesso.`);
    });
  });

  document.querySelectorAll('.btn-compartilhar-relatorio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const rel = _relatoriosList.find(r => r.id === parseInt(id, 10));
      
      Modal.open(`Visualização Oficial — ${rel?.titulo}`, `
        <div style="font-size: 12px; color: #334155;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div><strong>Identificador:</strong> ${rel?.codigo_ref}</div>
            <div><strong>Emissor:</strong> ${rel?.gerado_por} (${rel?.cargo_gerador})</div>
            <div><strong>Data:</strong> ${rel?.data}</div>
            <div><strong>Parâmetros:</strong> <code>${rel?.parametros}</code></div>
          </div>
          <div style="font-family: monospace; font-size: 11px; background: #0F172A; color: #38BDF8; padding: 12px; border-radius: 8px; line-height: 1.5;">
            {<br>
            &nbsp;&nbsp;"doc_id": "${rel?.codigo_ref}",<br>
            &nbsp;&nbsp;"hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",<br>
            &nbsp;&nbsp;"status": "HOMOLOGADO_GLOBALGAP",<br>
            &nbsp;&nbsp;"signature_verified": true<br>
            }
          </div>
        </div>
      `, () => {
        dispararDownloadReal(rel.titulo, rel.formato);
        toast.success('Download Iniciado', `Documento baixado.`);
      }, 'Baixar Arquivo');
    });
  });
}

export function setupRelatoriosEvents() {
  // Compilar & Gerar Documento
  const btnCompilar = document.getElementById('btn-compilar-relatorio');
  if (btnCompilar) {
    btnCompilar.addEventListener('click', () => {
      const tipo = document.getElementById('relatorio-tipo')?.value || 'Fechamento de Safra (Consolidado)';
      const talhao = document.getElementById('relatorio-talhao')?.value || 'Todos os 8 Talhões Ativos (Global)';
      const formato = document.querySelector('input[name="relatorio-formato"]:checked')?.value || 'pdf';

      btnCompilar.disabled = true;
      btnCompilar.innerHTML = `<span style="display:inline-block; animation:spin 1s linear infinite;">⟳</span> Compilando...`;

      setTimeout(() => {
        btnCompilar.disabled = false;
        btnCompilar.innerHTML = `<i data-lucide="zap" style="width: 14px; height: 14px;"></i><span>Compilar &amp; Gerar Documento</span>`;
        if (window.lucide) window.lucide.createIcons();

        const novoDoc = {
          id: Date.now(),
          titulo: `${tipo} — ${talhao.split('•')[0].trim()}`,
          tipo_label: tipo.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18),
          codigo_ref: `#REL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          gerado_por: 'Lorena Lira',
          cargo_gerador: 'Administrador',
          iniciais: 'LL',
          avatarBg: '#DCFCE7',
          avatarColor: '#047857',
          data: 'Hoje, Agora',
          formato: formato.toUpperCase(),
          tamanho: formato === 'pdf' ? '5.1 MB' : (formato === 'csv' ? '1.2 MB' : '2.4 MB'),
          parametros: `${talhao} • Assinatura Eletrônica`,
          badgeColor: formato === 'pdf' ? '#EF4444' : (formato === 'csv' ? '#0284C7' : '#10B981'),
          isGlobalGap: tipo.includes('GlobalG.A.P.'),
          isPdf: formato === 'pdf',
          btnEstilo: 'primario'
        };

        _relatoriosList.unshift(novoDoc);
        atualizarTabelaRelatorios();
        dispararDownloadReal(novoDoc.titulo, novoDoc.formato);
        toast.success('Documento Compilado', `Relatório oficial "${novoDoc.titulo}" gerado e baixado.`);
      }, 900);
    });
  }

  // Campo de busca
  const inputBusca = document.getElementById('input-busca-relatorio');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaRel = e.target.value.trim();
      atualizarTabelaRelatorios();
    });
  }

  // Abas de filtro
  document.querySelectorAll('.btn-tab-rel').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-tab-rel').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#F8FAFC';
        t.style.color = '#64748B';
        t.style.border = '1px solid #E2E8F0';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.color = '#FFFFFF';
      tab.style.border = 'none';
      tab.style.fontWeight = '700';

      _filtroTabRel = tab.dataset.tab || 'todos';
      atualizarTabelaRelatorios();
    });
  });

  // Paginação
  document.querySelectorAll('.btn-pag-rel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-pag-rel').forEach(b => {
        b.style.background = '#FFFFFF';
        b.style.color = '#475569';
        b.style.border = '1px solid #CBD5E1';
        b.style.fontWeight = '400';
      });
      btn.style.background = '#183D2E';
      btn.style.color = '#FFFFFF';
      btn.style.border = '1px solid #183D2E';
      btn.style.fontWeight = '700';
      toast.info('Paginação', 'Navegando pelo repositório histórico.');
    });
  });

  vincularEventosTabelaRel();
}
