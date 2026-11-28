/**
 * VIEW: RELATÓRIOS
 * Integrada às rotas reais do backend:
 * - GET /relatorios?limite=500
 * - POST /relatorios
 * - GET /relatorios/{id}/csv
 * - POST /relatorios/{id}/enviar-email
 * - GET /lotes
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';

let _relatoriosList = [];
let _lotesList = [];
let _erroCarregamento = false;
let _termoBuscaRel = '';

const LABELS_TIPO = {
  saidas_faixa: 'Saídas de Faixa',
  leituras_diarias: 'Leituras Diárias',
  alertas: 'Alertas'
};

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

function formatarDataHoraBr(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return String(iso);
  }
}

function dataIsoDiasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
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

  return `
    <div id="relatorios-kpis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; width: 100%;">
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">TOTAL DE RELATÓRIOS</span>
        <div style="margin: 10px 0 4px 0;">
          <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">${total}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 4px;">relatórios registrados no banco</div>
        </div>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISTRIBUIÇÃO POR TIPO</span>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; color: #334155;">
          ${(() => {
            if (total === 0) {
              return '<span>Sem relatórios</span>'; }
            const counts = {};
            _relatoriosList.forEach(r => {
              const t = r?.tipo;
              if (t) { counts[t] = (counts[t] || 0) + 1; }
            });
            return Object.entries(counts).map(([type, cnt]) => {
              const label = LABELS_TIPO[type] || type;
              return `<span>${label}: <strong>${cnt}</strong></span>`;
            }).join('');
          })()}
        </div>
      </div>
    </div>
  `;
}

export async function renderRelatorios() {
  _termoBuscaRel = '';
  await carregarDadosRelatorios();

  const hojeIso = dataIsoDiasAtras(0);
  const seteDiasIso = dataIsoDiasAtras(7);

  const optionsLotes = _lotesList.map(l => {
    const id = l.id_lote ?? l.id;
    const fruta = l.fruta || l.cultura || '';
    return `<option value="${id}">Lote #${id}${fruta ? ` — ${fruta}` : ''}</option>`;
  }).join('');

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- KPIs calculados da lista real -->
      <div id="relatorios-kpis-container">
        ${renderTopKpisHtml()}
      </div>

      <!-- Emissão de Relatório -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="file-plus" style="width: 16px; height: 16px; color: #10B981;"></i>
            Emitir Novo Relatório
          </h3>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Tipo</label>
            <select id="relatorio-tipo" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF; cursor: pointer;">
              <option value="saidas_faixa">Saídas de Faixa</option>
              <option value="leituras_diarias">Leituras Diárias</option>
              <option value="alertas">Alertas</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Data Início</label>
            <input type="date" id="relatorio-inicio" value="${seteDiasIso}" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Data Fim</label>
            <input type="date" id="relatorio-fim" value="${hojeIso}" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Lote (opcional)</label>
            <select id="relatorio-lote" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF; cursor: pointer;">
              <option value="">Todos os lotes</option>
              ${optionsLotes}
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Agrupamento</label>
            <select id="relatorio-agrupamento" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF; cursor: pointer;">
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Descrição (opcional)</label>
            <input type="text" id="relatorio-descricao" placeholder="Descrição do relatório..." style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #F1F5F9;">
          <button class="btn btn-primary" id="btn-compilar-relatorio" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 12px; font-weight: 700; padding: 9px 18px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="file-check" style="width: 14px; height: 14px;"></i>
            <span>Gerar Relatório</span>
          </button>
        </div>
      </div>

      <!-- Lista de Relatórios -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;">Relatórios Gerados</h3>
          </div>
          <div style="position: relative;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" id="input-busca-relatorio" placeholder="Buscar por tipo ou descrição..." style="padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; width: 240px; background: #FFFFFF;">
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">
                <th style="padding: 10px 14px;">TIPO</th>
                <th style="padding: 10px 14px;">DESCRIÇÃO</th>
                <th style="padding: 10px 14px;">PERÍODO</th>
                <th style="padding: 10px 14px;">DATA DE GERAÇÃO</th>
                <th style="padding: 10px 14px; text-align: right;">AÇÕES</th>
              </tr>
            </thead>
            <tbody id="tbody-relatorios">
              ${renderLinhasRelatoriosHtml()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function getRelatoriosFiltrados() {
  if (!_termoBuscaRel) return _relatoriosList;
  const t = _termoBuscaRel.toLowerCase();
  return _relatoriosList.filter(r => {
    const tipoLabel = (LABELS_TIPO[r?.tipo] || r?.tipo || '').toLowerCase();
    const desc = (r?.descricao || '').toLowerCase();
    return tipoLabel.includes(t) || desc.includes(t);
  });
}

function renderLinhasRelatoriosHtml() {
  if (_erroCarregamento) {
    return `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: #DC2626;">
          Não foi possível carregar os relatórios. Verifique sua conexão e tente novamente.
        </td>
      </tr>
    `;
  }

  const filtrados = getRelatoriosFiltrados();
  if (filtrados.length === 0) {
    return `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: #64748B;">
          Nenhum relatório gerado
        </td>
      </tr>
    `;
  }

  return filtrados.map(r => {
    const tipoTxt = LABELS_TIPO[r.tipo] || r.tipo || '—';
    const descTxt = r.descricao || '—';
    const periodoTxt = `${formatarDataBr(r.inicio)} – ${formatarDataBr(r.fim)}`;
    const dataGeracaoTxt = formatarDataHoraBr(r.data_geracao);

    return `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 12px 14px;">
          <span style="font-size: 11px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 3px 8px; border-radius: 4px;">${tipoTxt}</span>
        </td>
        <td style="padding: 12px 14px; color: #0F172A;">
          ${descTxt}
        </td>
        <td style="padding: 12px 14px; color: #475569; font-size: 11px;">
          ${periodoTxt}
        </td>
        <td style="padding: 12px 14px; color: #475569; font-size: 11px;">
          ${dataGeracaoTxt}
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          ${['saidas_faixa','leituras_diarias','alertas'].includes(r.tipo) ? `<div style="display: inline-flex; gap: 6px; align-items: center;">
            <button class="btn-baixar-csv-rel" data-id="${r.id_relatorio}" style="background: #183D2E; color: #FFFFFF; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
              <i data-lucide="download" style="width: 12px; height: 12px;"></i>
              <span>Baixar CSV</span>
            </button>
          </div>` : '<span>—</span>'}
        </td>
      </tr>
    `;
  }).join('');
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

function atualizarTelaRelatorios() {
  const kpisContainer = document.getElementById('relatorios-kpis-container');
  if (kpisContainer) {
    kpisContainer.innerHTML = renderTopKpisHtml();
  }
  const tbody = document.getElementById('tbody-relatorios');
  if (tbody) {
    tbody.innerHTML = renderLinhasRelatoriosHtml();
    if (window.lucide) window.lucide.createIcons();
    vincularEventosTabelaRel();
  }
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

  // Envio por e-mail desabilitado enquanto não há endpoint correspondente no back-end
}

export function setupRelatoriosEvents() {
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
      btnCompilar.innerHTML = '<span>Gerando...</span>';

      try {
        await api.request('/relatorios', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Relatório Gerado', 'Relatório criado e salvo no banco com sucesso.');
        const res = await api.request('/relatorios?limite=500');
        _relatoriosList = extrairLista(res, 'relatorios');
        _erroCarregamento = false;
        atualizarTelaRelatorios();
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
      const tbody = document.getElementById('tbody-relatorios');
      if (tbody) {
        tbody.innerHTML = renderLinhasRelatoriosHtml();
        if (window.lucide) window.lucide.createIcons();
        vincularEventosTabelaRel();
      }
    });
  }

  vincularEventosTabelaRel();
}
