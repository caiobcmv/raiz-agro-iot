/**
 * VIEW: RELATÓRIOS & DOCUMENTOS OFICIAIS
 * Integrada 100% às rotas reais do backend:
 * - GET /relatorios?limite=500
 * - POST /relatorios
 * - GET /relatorios/{id}
 * - GET /relatorios/{id}/csv
 * - GET /lotes
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { downloadPDF } from '../utils/export-utils.js';

let _relatoriosList = [];
let _lotesList = [];
let _erroCarregamento = false;
let _termoBuscaRel = '';
let _filtroTipoRel = 'todos';
let _formatoSelecionado = 'csv';
let _paginaAtualRel = 1;
const _POR_PAGINA_REL = 8;

const LABELS_TIPO = {
  saidas_faixa: 'Saídas de Faixa',
  leituras_diarias: 'Leituras Diárias',
  alertas: 'Alertas'
};

const CORES_TIPO = {
  saidas_faixa: { bg: '#DCFCE7', text: '#047857' },
  leituras_diarias: { bg: '#DBEAFE', text: '#1D4ED8' },
  alertas: { bg: '#FEE2E2', text: '#B91C1C' }
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extrairLista(res, chave) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (chave && Array.isArray(res[chave])) return res[chave];
    if (Array.isArray(res.itens)) return res.itens;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
  }
  return [];
}

function formatarDataBr(iso) {
  if (!iso) return '—';
  const parte = String(iso).split('T')[0];
  const p = parte.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return parte;
}

function formatarDataCurta(iso) {
  if (!iso) return '—';
  const parte = String(iso).split('T')[0];
  const p = parte.split('-');
  if (p.length !== 3) return parte;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = meses[Number(p[1]) - 1] || p[1];
  return `${p[2]} de ${m} ${p[0]}`;
}

function dataIsoDiasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function resumirParametros(r) {
  const p = r?.parametros && typeof r.parametros === 'object' ? r.parametros : {};
  const partes = [];
  if (p.id_lote != null && p.id_lote !== '') {
    partes.push(`Lote #${p.id_lote}`);
  } else {
    partes.push('Todos os lotes');
  }
  if (p.agrupamento) {
    partes.push(`agrupamento: ${p.agrupamento}`);
  }
  return partes.join(' • ');
}

async function carregarDadosRelatorios() {
  _erroCarregamento = false;
  const [resRel, resLotes] = await Promise.allSettled([
    api.request('/relatorios?limite=500'),
    api.getLotes()
  ]);

  if (resRel.status === 'fulfilled') {
    _relatoriosList = extrairLista(resRel.value, 'relatorios');
  } else {
    _relatoriosList = [];
    _erroCarregamento = true;
  }

  if (resLotes.status === 'fulfilled') {
    _lotesList = extrairLista(resLotes.value, 'lotes');
  } else {
    _lotesList = [];
  }
}

function renderTopKpisHtml() {
  const total = _relatoriosList.length;
  const qtdSaidas = _relatoriosList.filter(r => r?.tipo === 'saidas_faixa').length;
  const qtdLeituras = _relatoriosList.filter(r => r?.tipo === 'leituras_diarias').length;
  const qtdAlertas = _relatoriosList.filter(r => r?.tipo === 'alertas').length;

  const mesAtualPrefix = new Date().toISOString().slice(0, 7);
  const qtdMes = _relatoriosList.filter(r => String(r?.data_geracao || '').startsWith(mesAtualPrefix)).length;
  const tiposAtivos = [qtdSaidas, qtdLeituras, qtdAlertas].filter(n => n > 0).length;

  return `
    <div id="relatorios-kpis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 22px; width: 100%;">
      <!-- KPI 1: Relatórios Emitidos -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(15,23,42,0.03); min-height: 138px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <span style="font-size: 10.5px; font-weight: 800; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">RELATÓRIOS EMITIDOS</span>
          <span style="font-size: 11px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 3px 10px; border-radius: 999px; white-space: nowrap;">${qtdMes} no mês</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin: 12px 0;">
          <span style="font-size: 30px; font-weight: 800; color: #0F172A; line-height: 1;">${total}</span>
          <span style="font-size: 12px; color: #64748B; font-weight: 500;">documentos compilados</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 10.5px; font-weight: 700; color: #047857; background: #F0FDF4; border: 1px solid #DCFCE7; padding: 3px 8px; border-radius: 6px;">• ${qtdSaidas} Saídas</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #1D4ED8; background: #EFF6FF; border: 1px solid #DBEAFE; padding: 3px 8px; border-radius: 6px;">• ${qtdLeituras} Leituras</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #B91C1C; background: #FEF2F2; border: 1px solid #FEE2E2; padding: 3px 8px; border-radius: 6px;">• ${qtdAlertas} Alertas</span>
        </div>
      </div>

      <!-- KPI 2: Conformidade & Auditoria -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(15,23,42,0.03); min-height: 138px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10.5px; font-weight: 800; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">CONFORMIDADE & AUDITORIA</span>
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin: 12px 0;">
          <span style="font-size: 30px; font-weight: 800; color: #0F172A; line-height: 1;">100%</span>
          <span style="font-size: 12px; color: #475569; font-weight: 600;">Rastreável no Banco</span>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span style="font-size: 10.5px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 3px 9px; border-radius: 6px;">✓ Postgres Sync</span>
          <span style="font-size: 10.5px; font-weight: 600; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 6px;">CSV Oficial</span>
          <span style="font-size: 10.5px; font-weight: 600; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 6px;">PDF Executivo</span>
        </div>
      </div>

      <!-- KPI 3: Escopo & Cobertura -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(15,23,42,0.03); min-height: 138px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <span style="font-size: 10.5px; font-weight: 800; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">COBERTURA & LOTES</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 3px 9px; border-radius: 999px; white-space: nowrap;">${tiposAtivos}/3 modelos</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin: 12px 0;">
          <span style="font-size: 30px; font-weight: 800; color: #0F172A; line-height: 1;">${_lotesList.length}</span>
          <span style="font-size: 12px; color: #64748B; font-weight: 500;">lotes disponíveis para escopo</span>
        </div>
        <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
          Saídas de Faixa • Leituras Diárias • Alertas
        </div>
      </div>
    </div>
  `;
}

export async function renderRelatorios() {
  _termoBuscaRel = '';
  _filtroTipoRel = 'todos';
  _formatoSelecionado = 'csv';
  _paginaAtualRel = 1;
  await carregarDadosRelatorios();

  const hojeIso = dataIsoDiasAtras(0);
  const seteDiasIso = dataIsoDiasAtras(7);

  const optionsLotes = _lotesList.map(l => {
    const id = l.id_lote ?? l.id;
    const fruta = l.fruta || l.cultura || '';
    return `<option value="${id}">Lote #${id}${fruta ? ` — ${escapeHtml(fruta)}` : ''}</option>`;
  }).join('');

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 3 KPIs Superiores -->
      <div id="relatorios-kpis-container">
        ${renderTopKpisHtml()}
      </div>

      <!-- Emissão Imediata de Relatório -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 22px 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(15,23,42,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #ECFDF5; border: 1px solid #A7F3D0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i data-lucide="sliders" style="width: 18px; height: 18px; color: #15803D;"></i>
            </div>
            <div>
              <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;">Emissão Imediata de Relatório</h3>
              <p style="font-size: 12px; color: #64748B; margin: 2px 0 0;">Preencha os filtros para compilação tabular e processamento analítico com rastreabilidade.</p>
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 8px; font-family: monospace;">tabela: relatorio</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Tipo de Relatório</label>
            <select id="relatorio-tipo" style="width: 100%; padding: 9px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; color: #0F172A; background: #F8FAFC; cursor: pointer;">
              <option value="saidas_faixa">Saídas de Faixa (Desvios Térmicos/UR)</option>
              <option value="leituras_diarias">Leituras Diárias (Consolidado IoT)</option>
              <option value="alertas">Alertas e Incidentes (Reativos/Preditivos)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Janela Temporal</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <input type="date" id="relatorio-inicio" value="${seteDiasIso}" title="Data inicial" style="width: 100%; padding: 8px 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; background: #F8FAFC;">
              <input type="date" id="relatorio-fim" value="${hojeIso}" title="Data final" style="width: 100%; padding: 8px 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; background: #F8FAFC;">
            </div>
          </div>

          <div>
            <label style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Lote / Escopo de Coleta</label>
            <select id="relatorio-lote" style="width: 100%; padding: 9px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; color: #0F172A; background: #F8FAFC; cursor: pointer;">
              <option value="">Todos os lotes ativos (Global)</option>
              ${optionsLotes}
            </select>
          </div>

          <div>
            <label style="font-size: 11.5px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Agrupamento & Descrição</label>
            <div style="display: grid; grid-template-columns: 105px 1fr; gap: 8px;">
              <select id="relatorio-agrupamento" style="width: 100%; padding: 8px 8px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; background: #F8FAFC; cursor: pointer;">
                <option value="dia">Por Dia</option>
                <option value="semana">Semana</option>
                <option value="mes">Mês</option>
              </select>
              <input type="text" id="relatorio-descricao" placeholder="Título opcional..." style="width: 100%; padding: 8px 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; background: #F8FAFC;">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 12px; font-weight: 700; color: #475569;">Formato:</span>
            <button type="button" class="btn-formato-rel active" data-formato="csv" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid #15803D; background: #F0FDF4; color: #15803D; cursor: pointer;">
              <i data-lucide="file-spreadsheet" style="width: 14px; height: 14px;"></i>
              <span>Planilha CSV</span>
            </button>
            <button type="button" class="btn-formato-rel" data-formato="pdf" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; cursor: pointer;">
              <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
              <span>PDF Executivo</span>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <span style="font-size: 11px; color: #64748B; text-align: right; line-height: 1.3;">
              Compilação direta via API<br>Armazenado no repositório oficial
            </span>
            <button class="btn btn-primary" id="btn-compilar-relatorio" style="background: #15803D; color: #FFFFFF; border: none; font-size: 12.5px; font-weight: 700; padding: 10px 20px; border-radius: 9px; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; box-shadow: 0 2px 6px rgba(21,128,61,0.22);">
              <i data-lucide="zap" style="width: 14px; height: 14px;"></i>
              <span>Compilar & Gerar Documento</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Repositório de Relatórios & Arquivos Oficiais -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(15,23,42,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15.5px; font-weight: 800; color: #0F172A; margin: 0;">Repositório de Relatórios & Arquivos Oficiais</h3>
            <p style="font-size: 12px; color: #64748B; margin: 3px 0 0;">Histórico auditável com rastreabilidade de emissão e parâmetros registrados</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="position: relative;">
              <i data-lucide="search" style="position: absolute; left: 11px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-relatorio" placeholder="Buscar por título, tipo ou lote..." style="padding: 8px 12px 8px 34px; font-size: 12px; border: 1px solid #E2E8F0; border-radius: 8px; width: 230px; background: #F8FAFC; color: #0F172A;">
            </div>
            <div id="relatorios-filtros-tipo" style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${renderFiltrosTipoHtml()}
            </div>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;">
                <th style="padding: 11px 14px;">TIPO & IDENTIFICAÇÃO</th>
                <th style="padding: 11px 14px;">PERÍODO ANALISADO</th>
                <th style="padding: 11px 14px;">DATA DE GERAÇÃO</th>
                <th style="padding: 11px 14px;">FORMATO</th>
                <th style="padding: 11px 14px;">PARÂMETROS JSON</th>
                <th style="padding: 11px 14px; text-align: right;">AÇÕES OFICIAIS</th>
              </tr>
            </thead>
            <tbody id="tbody-relatorios">
              ${renderLinhasRelatoriosHtml()}
            </tbody>
          </table>
        </div>

        <div id="relatorios-paginacao-container" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #64748B;">
          ${renderPaginacaoRelHtml()}
        </div>
      </div>
    </div>
  `;
}

function renderFiltrosTipoHtml() {
  const total = _relatoriosList.length;
  const botoes = [
    { key: 'todos', label: `Todos (${total})` },
    { key: 'saidas_faixa', label: 'Saídas de Faixa' },
    { key: 'leituras_diarias', label: 'Leituras Diárias' },
    { key: 'alertas', label: 'Alertas' }
  ];
  return botoes.map(b => {
    const ativo = _filtroTipoRel === b.key;
    return `
      <button type="button" class="btn-filtro-tipo-rel" data-tipo="${b.key}" style="padding: 7px 12px; border-radius: 8px; font-size: 11.5px; font-weight: ${ativo ? '700' : '600'}; border: 1px solid ${ativo ? '#BFDBFE' : '#E2E8F0'}; background: ${ativo ? '#EFF6FF' : '#FFFFFF'}; color: ${ativo ? '#1D4ED8' : '#475569'}; cursor: pointer; white-space: nowrap;">
        ${b.label}
      </button>
    `;
  }).join('');
}

function getRelatoriosFiltrados() {
  return _relatoriosList.filter(r => {
    if (_filtroTipoRel !== 'todos' && r?.tipo !== _filtroTipoRel) {
      return false;
    }
    if (_termoBuscaRel) {
      const t = _termoBuscaRel.toLowerCase();
      const tipoLabel = (LABELS_TIPO[r?.tipo] || r?.tipo || '').toLowerCase();
      const desc = (r?.descricao || '').toLowerCase();
      const paramsTxt = resumirParametros(r).toLowerCase();
      const idTxt = String(r?.id_relatorio || '');
      return tipoLabel.includes(t) || desc.includes(t) || paramsTxt.includes(t) || idTxt.includes(t);
    }
    return true;
  });
}

function renderLinhasRelatoriosHtml() {
  if (_erroCarregamento) {
    return `
      <tr>
        <td colspan="6" style="padding: 28px; text-align: center; color: #DC2626;">
          Não foi possível carregar os relatórios. Verifique sua conexão e tente novamente.
        </td>
      </tr>
    `;
  }

  const filtrados = getRelatoriosFiltrados();
  if (filtrados.length === 0) {
    return `
      <tr>
        <td colspan="6" style="padding: 28px; text-align: center; color: #64748B;">
          Nenhum relatório encontrado para os filtros aplicados.
        </td>
      </tr>
    `;
  }

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / _POR_PAGINA_REL));
  if (_paginaAtualRel > totalPaginas) _paginaAtualRel = totalPaginas;
  const inicioIdx = (_paginaAtualRel - 1) * _POR_PAGINA_REL;
  const paginaItens = filtrados.slice(inicioIdx, inicioIdx + _POR_PAGINA_REL);

  return paginaItens.map(r => {
    const tipoKey = r.tipo || '';
    const tipoTxt = LABELS_TIPO[tipoKey] || tipoKey || 'Relatório';
    const cor = CORES_TIPO[tipoKey] || { bg: '#F1F5F9', text: '#475569' };
    const titulo = r.descricao ? escapeHtml(r.descricao) : `${tipoTxt} — Consolidado`;
    const periodoTxt = `${formatarDataBr(r.inicio)} – ${formatarDataBr(r.fim)}`;
    const dataGeracaoTxt = formatarDataCurta(r.data_geracao);
    const paramsTxt = escapeHtml(resumirParametros(r));
    const exportavel = ['saidas_faixa', 'leituras_diarias', 'alertas'].includes(tipoKey);

    return `
      <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;">
        <td style="padding: 14px;">
          <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 5px;">${titulo}</div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 10.5px; font-weight: 700; color: ${cor.text}; background: ${cor.bg}; padding: 2px 8px; border-radius: 5px;">${escapeHtml(tipoKey || 'relatorio')}</span>
            <span style="font-size: 10.5px; color: #94A3B8; font-family: monospace;">ID: #REL-${r.id_relatorio}</span>
          </div>
        </td>
        <td style="padding: 14px; color: #334155; font-size: 12px; white-space: nowrap;">
          ${periodoTxt}
        </td>
        <td style="padding: 14px; white-space: nowrap;">
          <div style="font-size: 12px; font-weight: 600; color: #0F172A;">${dataGeracaoTxt}</div>
          <div style="font-size: 10.5px; color: #94A3B8;">Registro oficial</div>
        </td>
        <td style="padding: 14px;">
          <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #1D4ED8; background: #EFF6FF; border: 1px solid #DBEAFE; padding: 4px 10px; border-radius: 6px;">
            <i data-lucide="file-spreadsheet" style="width: 12px; height: 12px;"></i>
            <span>CSV / PDF</span>
          </span>
        </td>
        <td style="padding: 14px;">
          <span style="display: inline-block; font-size: 11px; color: #334155; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 6px; font-family: monospace;">
            ${paramsTxt}
          </span>
        </td>
        <td style="padding: 14px; text-align: right; white-space: nowrap;">
          ${exportavel ? `
            <div style="display: inline-flex; gap: 6px; align-items: center;">
              <button type="button" class="btn-baixar-csv-rel" data-id="${r.id_relatorio}" style="background: #15803D; color: #FFFFFF; border: none; padding: 7px 12px; border-radius: 7px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                <i data-lucide="download" style="width: 13px; height: 13px;"></i>
                <span>Baixar CSV</span>
              </button>
              <button type="button" class="btn-baixar-pdf-rel" data-id="${r.id_relatorio}" title="Baixar PDF" style="background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; padding: 7px 10px; border-radius: 7px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="file-text" style="width: 13px; height: 13px;"></i>
                <span>PDF</span>
              </button>
              <button type="button" class="btn-ver-rel" data-id="${r.id_relatorio}" title="Visualizar dados" style="background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; padding: 7px 9px; border-radius: 7px; cursor: pointer; display: inline-flex; align-items: center;">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          ` : '<span style="color: #94A3B8;">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function renderPaginacaoRelHtml() {
  const filtrados = getRelatoriosFiltrados();
  const total = filtrados.length;
  if (total === 0) {
    return '<span>Exibindo 0 relatórios</span>';
  }
  const totalPaginas = Math.max(1, Math.ceil(total / _POR_PAGINA_REL));
  const inicio = (_paginaAtualRel - 1) * _POR_PAGINA_REL + 1;
  const fim = Math.min(total, _paginaAtualRel * _POR_PAGINA_REL);

  let botoesPag = '';
  if (totalPaginas > 1) {
    const paginas = [];
    for (let i = 1; i <= totalPaginas; i++) {
      if (i === 1 || i === totalPaginas || Math.abs(i - _paginaAtualRel) <= 1) {
        paginas.push(i);
      }
    }
    botoesPag = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <button type="button" class="btn-pag-rel" data-page="prev" ${_paginaAtualRel <= 1 ? 'disabled' : ''} style="padding: 5px 10px; border-radius: 6px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; font-size: 11.5px; cursor: ${_paginaAtualRel <= 1 ? 'not-allowed' : 'pointer'}; opacity: ${_paginaAtualRel <= 1 ? '0.5' : '1'};">Anterior</button>
        ${paginas.map(p => `
          <button type="button" class="btn-pag-rel" data-page="${p}" style="min-width: 30px; padding: 5px 9px; border-radius: 6px; border: 1px solid ${p === _paginaAtualRel ? '#15803D' : '#E2E8F0'}; background: ${p === _paginaAtualRel ? '#15803D' : '#FFFFFF'}; color: ${p === _paginaAtualRel ? '#FFFFFF' : '#475569'}; font-weight: ${p === _paginaAtualRel ? '700' : '500'}; font-size: 11.5px; cursor: pointer;">${p}</button>
        `).join('')}
        <button type="button" class="btn-pag-rel" data-page="next" ${_paginaAtualRel >= totalPaginas ? 'disabled' : ''} style="padding: 5px 10px; border-radius: 6px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; font-size: 11.5px; cursor: ${_paginaAtualRel >= totalPaginas ? 'not-allowed' : 'pointer'}; opacity: ${_paginaAtualRel >= totalPaginas ? '0.5' : '1'};">Próximo</button>
      </div>
    `;
  }

  return `
    <span>Exibindo ${inicio} a ${fim} de ${total} relatório(s) gerado(s)</span>
    ${botoesPag}
  `;
}

async function baixarRelatorioCsv(idRelatorio) {
  const token = api.getToken();
  const res = await fetch(`${api.baseUrl}/relatorios/${encodeURIComponent(idRelatorio)}/csv`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (!res.ok) {
    throw new Error(`Falha ao baixar CSV (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_${idRelatorio}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function baixarRelatorioPdf(idRelatorio) {
  const res = await api.request(`/relatorios/${encodeURIComponent(idRelatorio)}`);
  const meta = res?.relatorio || {};
  const dados = Array.isArray(res?.dados) ? res.dados : [];
  const tipoTxt = LABELS_TIPO[meta.tipo] || meta.tipo || 'Relatório';
  const headers = dados.length > 0 ? Object.keys(dados[0]) : ['Informação'];
  const rows = dados.length > 0
    ? dados.map(row => headers.map(h => row[h] ?? '—'))
    : [['Sem registros no período selecionado.']];

  downloadPDF(`relatorio_${idRelatorio}_${meta.tipo || 'oficial'}.pdf`, {
    title: meta.descricao || `${tipoTxt} — #REL-${idRelatorio}`,
    subtitle: `Período: ${formatarDataBr(meta.inicio)} a ${formatarDataBr(meta.fim)} • ${resumirParametros(meta)}`,
    headers,
    rows
  });
}

async function visualizarRelatorioModal(idRelatorio) {
  try {
    const res = await api.request(`/relatorios/${encodeURIComponent(idRelatorio)}`);
    const meta = res?.relatorio || {};
    const dados = Array.isArray(res?.dados) ? res.dados : [];
    const tipoTxt = LABELS_TIPO[meta.tipo] || meta.tipo || 'Relatório';

    if (dados.length === 0) {
      Modal.open(`Relatório #REL-${idRelatorio} — ${tipoTxt}`, `
        <div style="font-size: 12.5px; color: #64748B; padding: 12px 0;">
          Nenhum registro encontrado no período (${formatarDataBr(meta.inicio)} a ${formatarDataBr(meta.fim)}).
        </div>
      `, null, 'Fechar');
      return;
    }

    const cols = Object.keys(dados[0]);
    const previewRows = dados.slice(0, 15);
    Modal.open(`Relatório #REL-${idRelatorio} — ${tipoTxt}`, `
      <div style="font-size: 12px; color: #475569; margin-bottom: 10px;">
        Período: <strong>${formatarDataBr(meta.inicio)} a ${formatarDataBr(meta.fim)}</strong> • ${dados.length} linha(s) (exibindo até 15)
      </div>
      <div style="overflow-x: auto; max-height: 320px; border: 1px solid #E2E8F0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
              ${cols.map(c => `<th style="padding: 8px 10px; text-align: left; color: #475569; font-weight: 700;">${escapeHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${previewRows.map(row => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                ${cols.map(c => `<td style="padding: 7px 10px; color: #0F172A;">${escapeHtml(row[c] ?? '—')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `, null, 'Fechar');
  } catch (err) {
    toast.error('Erro ao visualizar', err?.message || 'Não foi possível carregar os dados do relatório.');
  }
}

function atualizarTelaRelatorios() {
  const kpisContainer = document.getElementById('relatorios-kpis-container');
  if (kpisContainer) {
    kpisContainer.innerHTML = renderTopKpisHtml();
  }
  const filtrosContainer = document.getElementById('relatorios-filtros-tipo');
  if (filtrosContainer) {
    filtrosContainer.innerHTML = renderFiltrosTipoHtml();
  }
  const tbody = document.getElementById('tbody-relatorios');
  if (tbody) {
    tbody.innerHTML = renderLinhasRelatoriosHtml();
  }
  const pagContainer = document.getElementById('relatorios-paginacao-container');
  if (pagContainer) {
    pagContainer.innerHTML = renderPaginacaoRelHtml();
  }
  if (window.lucide) window.lucide.createIcons();
  vincularEventosTabelaRel();
}

function vincularEventosTabelaRel() {
  document.querySelectorAll('.btn-baixar-csv-rel').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const id = button.dataset.id;
      const originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span>Baixando...</span>';
      try {
        await baixarRelatorioCsv(id);
        toast.success('Download Concluído', `CSV do relatório #${id} baixado.`);
      } catch (err) {
        toast.error('Erro no Download', err.message || 'Não foi possível baixar o CSV.');
      } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  document.querySelectorAll('.btn-baixar-pdf-rel').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const id = button.dataset.id;
      const originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span>...</span>';
      try {
        await baixarRelatorioPdf(id);
        toast.success('PDF Gerado', `PDF do relatório #${id} baixado.`);
      } catch (err) {
        toast.error('Erro ao gerar PDF', err.message || 'Não foi possível gerar o PDF.');
      } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  document.querySelectorAll('.btn-ver-rel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      visualizarRelatorioModal(id);
    });
  });

  document.querySelectorAll('.btn-filtro-tipo-rel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      _filtroTipoRel = e.currentTarget.dataset.tipo || 'todos';
      _paginaAtualRel = 1;
      atualizarTelaRelatorios();
    });
  });

  document.querySelectorAll('.btn-pag-rel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const p = e.currentTarget.dataset.page;
      const totalPaginas = Math.max(1, Math.ceil(getRelatoriosFiltrados().length / _POR_PAGINA_REL));
      if (p === 'prev') _paginaAtualRel = Math.max(1, _paginaAtualRel - 1);
      else if (p === 'next') _paginaAtualRel = Math.min(totalPaginas, _paginaAtualRel + 1);
      else _paginaAtualRel = Number(p) || 1;
      atualizarTelaRelatorios();
    });
  });
}

export function setupRelatoriosEvents() {
  document.querySelectorAll('.btn-formato-rel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      _formatoSelecionado = e.currentTarget.dataset.formato || 'csv';
      document.querySelectorAll('.btn-formato-rel').forEach(b => {
        const ativo = b.dataset.formato === _formatoSelecionado;
        b.style.border = ativo ? '1.5px solid #15803D' : '1px solid #E2E8F0';
        b.style.background = ativo ? '#F0FDF4' : '#FFFFFF';
        b.style.color = ativo ? '#15803D' : '#475569';
        b.style.fontWeight = ativo ? '700' : '600';
      });
    });
  });

  const btnCompilar = document.getElementById('btn-compilar-relatorio');
  if (btnCompilar) {
    btnCompilar.addEventListener('click', async () => {
      const tipo = document.getElementById('relatorio-tipo')?.value || 'saidas_faixa';
      const inicio = document.getElementById('relatorio-inicio')?.value;
      const fim = document.getElementById('relatorio-fim')?.value;
      const loteVal = document.getElementById('relatorio-lote')?.value;
      const agrupamento = document.getElementById('relatorio-agrupamento')?.value || 'dia';
      const descricao = document.getElementById('relatorio-descricao')?.value?.trim() || '';

      if (!inicio || !fim) {
        toast.warning('Atenção', 'Informe as datas de início e fim.');
        return;
      }

      const payload = {
        tipo,
        inicio,
        fim,
        agrupamento,
        ...(loteVal ? { id_lote: Number(loteVal) } : {}),
        ...(descricao ? { descricao } : {})
      };

      const originalHtml = btnCompilar.innerHTML;
      btnCompilar.disabled = true;
      btnCompilar.innerHTML = '<span>Compilando...</span>';

      try {
        const criado = await api.request('/relatorios', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Relatório Compilado', 'Relatório gerado e registrado no repositório oficial.');
        const res = await api.request('/relatorios?limite=500');
        _relatoriosList = extrairLista(res, 'relatorios');
        _erroCarregamento = false;
        _paginaAtualRel = 1;
        atualizarTelaRelatorios();

        const novoId = criado?.relatorio?.id_relatorio;
        if (novoId && _formatoSelecionado === 'pdf') {
          await baixarRelatorioPdf(novoId);
        } else if (novoId && _formatoSelecionado === 'csv') {
          await baixarRelatorioCsv(novoId);
        }
      } catch (err) {
        toast.error('Erro ao Gerar Relatório', err.message || 'Não foi possível gerar o relatório.');
      } finally {
        btnCompilar.disabled = false;
        btnCompilar.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  const inputBusca = document.getElementById('input-busca-relatorio');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaRel = e.target.value.trim();
      _paginaAtualRel = 1;
      atualizarTelaRelatorios();
    });
  }

  vincularEventosTabelaRel();
}
