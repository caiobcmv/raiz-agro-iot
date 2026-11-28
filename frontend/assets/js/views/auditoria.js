/**
 * VIEW: AUDITORIA E LOGS DO SISTEMA (CONFORME SCHEMA iot_db: log_acesso)
 * Layout alinhado à referência visual do Figma + 100% alimentado pela API real (/auditoria).
 * Suporta janela temporal real via API (24h, 7d, 30d, todos), busca, abas de filtro,
 * paginação real, resumo da janela selecionada, laudo em PDF e atualização/limpeza de filtros.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

let _logsAuditoria = [];
let _filtroCatLog = 'todos';
let _termoBuscaLog = '';
let _periodoLog = '24h';
let _paginaAtual = 1;
const _ITENS_POR_PAGINA = 10;
let _erroCarregamento = '';

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDataUtc(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  const iso = hasTz ? s : `${s.replace(' ', 'T')}Z`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatarDataRecife(raw) {
  const dt = parseDataUtc(raw);
  if (!dt) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dt);
}

function formatarDataHoraSeparada(raw) {
  const dt = parseDataUtc(raw);
  if (!dt) return { data: '—', hora: '' };
  const data = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dt);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dt);
  return { data, hora };
}

function isLogFalha(resultado, acao) {
  const r = String(resultado || '').toLowerCase();
  const a = String(acao || '').toLowerCase();
  return /falha|erro|negado|bloqueado|invalido|reutilizado|expirado|401|403|500/.test(r) ||
    /falha|reutilizado|bloqueado|erro/.test(a);
}

function classificarCategoria(acao, falha) {
  const a = String(acao || '').toLowerCase();
  if (falha) return 'erros';
  if (/exportar|relatorio|laudo|csv|pdf/.test(a)) return 'exportacoes';
  if (/login|logout|refresh|2fa|totp|senha|ativacao|sessao|token|auth/.test(a)) return 'acesso';
  if (/criar|editar|atualizar|alterar|excluir|desativar|parametro|calibracao|usuario|lote|sensor|parecer|gerar/.test(a)) return 'alteracoes';
  return 'acesso';
}

function moduloDoLog(acao) {
  const a = String(acao || '').toLowerCase();
  if (/login|logout|refresh|2fa|totp|senha|ativacao|sessao|auth/.test(a)) return 'Acesso e sessão';
  if (/previsao|risco|janela|irrigacao|prejuizo/.test(a)) return 'Previsões e alertas';
  if (/parecer/.test(a)) return 'Parecer agronômico';
  if (/exportar|relatorio/.test(a)) return 'Relatórios e exportação';
  if (/parametro|calibracao/.test(a)) return 'Parâmetros agronômicos';
  if (/sensor|leitura/.test(a)) return 'Sensores e telemetria';
  if (/usuario|perfil/.test(a)) return 'Usuários e permissões';
  if (/lote|fruta/.test(a)) return 'Lotes e safra';
  return 'Sistema';
}

function calcularIntervaloPeriodo(periodo) {
  if (periodo === 'todos') {
    return { inicio: null, fim: null };
  }
  const agora = new Date();
  const diasMap = { '24h': 1, '7d': 7, '30d': 30 };
  const dias = diasMap[periodo] || 1;
  const inicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fim: agora.toISOString() };
}

function labelPeriodo(periodo) {
  const map = { '24h': 'Últimas 24h', '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', 'todos': 'Todo o histórico' };
  return map[periodo] || periodo;
}

function mapearLogApi(l, idx) {
  const acao = l.acao || 'evento';
  const resultado = l.resultado || 'sucesso';
  const falha = isLogFalha(resultado, acao);
  const categoria = classificarCategoria(acao, falha);
  const modulo = moduloDoLog(acao);
  const dt = parseDataUtc(l.data_hora);
  const dataRecife = formatarDataRecife(l.data_hora);
  const { data: dataCurta, hora: horaCurta } = formatarDataHoraSeparada(l.data_hora);
  const usuarioTxt = l.usuario
    ? l.usuario
    : (l.id_usuario != null ? `Usuário #${l.id_usuario}` : 'Sistema / Agendador');

  return {
    id: l.id_log ?? (idx + 1),
    categoria,
    falha,
    acao,
    modulo,
    resultado,
    usuario: usuarioTxt,
    id_usuario: l.id_usuario ?? null,
    ip: l.ip || 'Interno / Sistema',
    data_raw: l.data_hora || '',
    timestamp_ms: dt ? dt.getTime() : 0,
    data: dataRecife,
    dataCurta,
    horaCurta
  };
}

async function carregarLogsDaApi(periodo = _periodoLog) {
  _erroCarregamento = '';
  const { inicio, fim } = calcularIntervaloPeriodo(periodo);
  const params = { limit: 1000 };
  if (inicio) params.inicio = inicio;
  if (fim) params.fim = fim;

  try {
    const res = await api.getAuditoria(params);
    const lista = Array.isArray(res) ? res : [];
    _logsAuditoria = lista.map(mapearLogApi);
  } catch (err) {
    console.error('Erro ao carregar logs de auditoria:', err);
    _logsAuditoria = [];
    _erroCarregamento = err?.message || 'Não foi possível consultar os registros de auditoria.';
  }
}

function getLogsFiltrados() {
  const termo = _termoBuscaLog.toLowerCase();
  return _logsAuditoria.filter(l => {
    if (_filtroCatLog !== 'todos') {
      if (_filtroCatLog === 'erros') {
        if (!l.falha) return false;
      } else if (l.categoria !== _filtroCatLog) {
        return false;
      }
    }
    if (termo) {
      const hay = `${l.id} ${l.acao} ${l.modulo} ${l.resultado} ${l.usuario} ${l.ip} ${l.data}`.toLowerCase();
      if (!hay.includes(termo)) return false;
    }
    return true;
  });
}

function calcularMetricas(lista) {
  const total = lista.length;
  const falhas = lista.filter(l => l.falha).length;
  const sucessos = total - falhas;
  const taxaSucesso = total > 0 ? `${((sucessos / total) * 100).toFixed(1)}%` : '—';
  const taxaFalha = total > 0 ? `${((falhas / total) * 100).toFixed(1)}%` : '—';
  const ultimo = lista.length > 0 ? lista[0] : null;
  return { total, sucessos, falhas, taxaSucesso, taxaFalha, ultimo };
}

function renderAbasHtml() {
  const counts = {
    todos: _logsAuditoria.length,
    acesso: _logsAuditoria.filter(l => l.categoria === 'acesso').length,
    alteracoes: _logsAuditoria.filter(l => l.categoria === 'alteracoes').length,
    exportacoes: _logsAuditoria.filter(l => l.categoria === 'exportacoes').length,
    erros: _logsAuditoria.filter(l => l.falha).length
  };
  const tabs = [
    { cat: 'todos', label: 'Todos' },
    { cat: 'acesso', label: 'Acesso' },
    { cat: 'alteracoes', label: 'Alterações' },
    { cat: 'exportacoes', label: 'Exportações' },
    { cat: 'erros', label: 'Erros' }
  ];

  return tabs.map(t => {
    const active = _filtroCatLog === t.cat;
    const style = active
      ? 'padding: 6px 14px; font-size: 12px; font-weight: 600; background: #183D2E; color: #FFFFFF; border: 1px solid #183D2E; border-radius: 8px; cursor: pointer;'
      : 'padding: 6px 14px; font-size: 12px; font-weight: 500; background: #FFFFFF; color: #475569; border: 1px solid #E2E8F0; border-radius: 8px; cursor: pointer;';
    return `<button type="button" class="tab-filtro-log ${active ? 'active' : ''}" data-cat="${t.cat}" style="${style}">${t.label} (${counts[t.cat].toLocaleString('pt-BR')})</button>`;
  }).join('');
}

function renderResumoLateralHtml() {
  const filtrados = getLogsFiltrados();
  const m = calcularMetricas(filtrados);
  const ultimo = m.ultimo;

  return `
    <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0; line-height: 1.3;">
      Resumo da Janela Selecionada
    </h3>
    <div style="font-size: 12px; color: #64748B; margin-bottom: 14px;">${escHtml(labelPeriodo(_periodoLog))}</div>

    <div style="font-size: 36px; font-weight: 800; color: #0F172A; line-height: 1.05; letter-spacing: -0.02em;">
      ${m.total.toLocaleString('pt-BR')}
    </div>
    <div style="font-size: 12px; color: #64748B; margin-top: 4px;">eventos no recorte disponível</div>

    <div style="border-top: 1px solid #F1F5F9; margin: 16px 0;"></div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <div style="font-size: 18px; font-weight: 700; color: #047857;">${m.taxaSucesso}</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Bem-sucedidas (${m.sucessos})</div>
      </div>
      <div>
        <div style="font-size: 18px; font-weight: 700; color: ${m.falhas > 0 ? '#DC2626' : '#0F172A'};">${m.taxaFalha}</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Falhas / alertas (${m.falhas})</div>
      </div>
    </div>

    <div style="border-top: 1px solid #F1F5F9; margin: 16px 0;"></div>

    <div>
      <div style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
        Último Registro Disponível
      </div>
      ${ultimo ? `
        <div style="font-size: 13px; font-weight: 700; color: #0F172A;">${escHtml(ultimo.data)}</div>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px; word-break: break-word;">${escHtml(ultimo.acao)} • ${escHtml(ultimo.usuario)}</div>
      ` : `
        <div style="font-size: 12px; color: #64748B;">Nenhum evento no recorte atual.</div>
      `}
    </div>
  `;
}

function renderTabelaLogsHtml() {
  if (_erroCarregamento) {
    return `
      <div style="padding: 20px; text-align: center; color: #991B1B; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; font-size: 12px;">
        ${escHtml(_erroCarregamento)}
      </div>
    `;
  }

  const filtrados = getLogsFiltrados();
  if (filtrados.length === 0) {
    return `
      <div style="padding: 28px; text-align: center; color: #64748B; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; font-size: 12px;">
        Nenhum registro encontrado para a janela temporal e filtros selecionados.
      </div>
    `;
  }

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / _ITENS_POR_PAGINA));
  if (_paginaAtual > totalPaginas) _paginaAtual = totalPaginas;
  const inicioIdx = (_paginaAtual - 1) * _ITENS_POR_PAGINA;
  const paginaItens = filtrados.slice(inicioIdx, inicioIdx + _ITENS_POR_PAGINA);

  return `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 11px;">
            <th style="padding: 10px 8px; font-weight: 600;">ID / Timestamp</th>
            <th style="padding: 10px 8px; font-weight: 600;">Usuário &amp; Origem</th>
            <th style="padding: 10px 8px; font-weight: 600;">Ação Realizada</th>
            <th style="padding: 10px 8px; font-weight: 600;">Módulo / Recurso</th>
            <th style="padding: 10px 8px; font-weight: 600;">Status</th>
            <th style="padding: 10px 8px; font-weight: 600; text-align: right;">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          ${paginaItens.map(l => {
            const statusBg = l.falha ? '#FEF3C7' : '#ECFDF5';
            const statusColor = l.falha ? '#B45309' : '#047857';
            const statusLabel = l.falha ? 'Falha' : 'Sucesso';
            return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 14px 8px; vertical-align: top; white-space: nowrap;">
                  <div style="font-weight: 700; color: #0F172A; font-family: monospace; font-size: 11px;">#${escHtml(l.id)}</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${escHtml(l.dataCurta)}<br>${escHtml(l.horaCurta)}</div>
                </td>
                <td style="padding: 14px 8px; vertical-align: top;">
                  <div style="font-weight: 600; color: #0F172A;">${escHtml(l.usuario)}</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px; font-family: monospace;">${escHtml(l.ip)}</div>
                </td>
                <td style="padding: 14px 8px; vertical-align: top; max-width: 260px;">
                  <div style="font-weight: 600; color: #0F172A; word-break: break-word;">${escHtml(l.acao)}</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px; word-break: break-word;">${escHtml(l.resultado)}</div>
                </td>
                <td style="padding: 14px 8px; vertical-align: top;">
                  <div style="font-weight: 600; color: #334155;">${escHtml(l.modulo)}</div>
                  <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">log_acesso</div>
                </td>
                <td style="padding: 14px 8px; vertical-align: top; white-space: nowrap;">
                  <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${statusBg}; color: ${statusColor};">
                    ${statusLabel}
                  </span>
                </td>
                <td style="padding: 14px 8px; vertical-align: top; text-align: right;">
                  <button type="button" class="btn-log-action" data-id="${escHtml(l.id)}" title="Ver detalhes do registro" style="width: 30px; height: 30px; border-radius: 8px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #334155; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                    <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPaginacaoHtml() {
  const filtrados = getLogsFiltrados();
  const total = filtrados.length;
  if (total === 0) {
    return `<span>Exibindo 0 registros</span><div></div>`;
  }
  const totalPaginas = Math.max(1, Math.ceil(total / _ITENS_POR_PAGINA));
  if (_paginaAtual > totalPaginas) _paginaAtual = totalPaginas;
  const ini = (_paginaAtual - 1) * _ITENS_POR_PAGINA + 1;
  const fim = Math.min(total, _paginaAtual * _ITENS_POR_PAGINA);

  const pagInicio = Math.max(1, _paginaAtual - 2);
  const pagFim = Math.min(totalPaginas, pagInicio + 4);
  const botoesPag = [];
  for (let p = pagInicio; p <= pagFim; p++) {
    const active = p === _paginaAtual;
    const style = active
      ? 'padding: 5px 11px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;'
      : 'padding: 5px 11px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; border-radius: 6px; cursor: pointer; font-size: 12px;';
    botoesPag.push(`<button type="button" class="btn-pag-audit ${active ? 'active' : ''}" data-pag="${p}" style="${style}">${p}</button>`);
  }

  return `
    <span style="font-size: 12px; color: #64748B;">Exibindo ${ini}–${fim} de ${total.toLocaleString('pt-BR')} registros</span>
    <div style="display: flex; gap: 6px; align-items: center;">
      <button type="button" class="btn-pag-audit" data-pag="prev" ${_paginaAtual <= 1 ? 'disabled' : ''} style="padding: 5px 12px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; border-radius: 6px; font-size: 12px; cursor: ${_paginaAtual <= 1 ? 'not-allowed' : 'pointer'}; opacity: ${_paginaAtual <= 1 ? '0.5' : '1'};">Anterior</button>
      ${botoesPag.join('')}
      <button type="button" class="btn-pag-audit" data-pag="next" ${_paginaAtual >= totalPaginas ? 'disabled' : ''} style="padding: 5px 12px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; border-radius: 6px; font-size: 12px; cursor: ${_paginaAtual >= totalPaginas ? 'not-allowed' : 'pointer'}; opacity: ${_paginaAtual >= totalPaginas ? '0.5' : '1'};">Próximo</button>
    </div>
  `;
}

function exportarLaudoParcialPdf() {
  const filtrados = getLogsFiltrados();
  if (filtrados.length === 0) {
    toast.info('Sem Registros', 'Não há registros no recorte atual para gerar o laudo.');
    return;
  }
  const m = calcularMetricas(filtrados);
  const dataTag = new Date().toISOString().slice(0, 10);
  const headers = ['ID', 'Data/Hora (Recife)', 'Usuario', 'IP', 'Acao', 'Modulo', 'Resultado'];
  const rows = filtrados.map(l => [
    `#${l.id}`, l.data, l.usuario, l.ip, l.acao, l.modulo, l.resultado
  ]);
  downloadPDF(`laudo_auditoria_raiz_agro_${dataTag}.pdf`, {
    title: 'Laudo de Auditoria — RAIZ Agro IoT',
    subtitle: `Janela: ${labelPeriodo(_periodoLog)} • Filtro: ${_filtroCatLog.toUpperCase()}`,
    metadata: [
      `Gerado em (America/Recife): ${formatarDataRecife(new Date().toISOString())}`,
      `Total no recorte: ${m.total} (${m.sucessos} bem-sucedidas / ${m.falhas} falhas — ${m.taxaSucesso})`,
      'Fonte: PostgreSQL (iot_db • log_acesso)'
    ],
    headers,
    rows
  });
  toast.success('Laudo Gerado', `laudo_auditoria_raiz_agro_${dataTag}.pdf baixado com ${filtrados.length} registro(s).`);
}

function atualizarUICompleta() {
  const abasEl = document.getElementById('auditoria-abas-filtro');
  if (abasEl) abasEl.innerHTML = renderAbasHtml();

  const feedEl = document.getElementById('container-feed-logs');
  if (feedEl) feedEl.innerHTML = renderTabelaLogsHtml();

  const pagEl = document.getElementById('auditoria-paginacao');
  if (pagEl) pagEl.innerHTML = renderPaginacaoHtml();

  const resumoEl = document.getElementById('auditoria-resumo-periodo');
  if (resumoEl) resumoEl.innerHTML = renderResumoLateralHtml();

  if (typeof window !== 'undefined' && window.lucide) {
    window.lucide.createIcons();
  }

  vincularEventosDinamicos();
}

function vincularEventosDinamicos() {
  document.querySelectorAll('.tab-filtro-log').forEach(tab => {
    tab.addEventListener('click', () => {
      _filtroCatLog = tab.dataset.cat || 'todos';
      _paginaAtual = 1;
      atualizarUICompleta();
    });
  });

  document.querySelectorAll('.btn-pag-audit').forEach(btn => {
    btn.addEventListener('click', () => {
      const filtrados = getLogsFiltrados();
      const totalPaginas = Math.max(1, Math.ceil(filtrados.length / _ITENS_POR_PAGINA));
      const val = btn.dataset.pag;
      if (val === 'prev') _paginaAtual = Math.max(1, _paginaAtual - 1);
      else if (val === 'next') _paginaAtual = Math.min(totalPaginas, _paginaAtual + 1);
      else _paginaAtual = Math.min(totalPaginas, Math.max(1, Number(val) || 1));

      const feedEl = document.getElementById('container-feed-logs');
      if (feedEl) feedEl.innerHTML = renderTabelaLogsHtml();
      const pagEl = document.getElementById('auditoria-paginacao');
      if (pagEl) pagEl.innerHTML = renderPaginacaoHtml();
      if (typeof window !== 'undefined' && window.lucide) window.lucide.createIcons();
      vincularEventosDinamicos();
    });
  });

  document.querySelectorAll('.btn-log-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const l = _logsAuditoria.find(log => Number(log.id) === id);
      if (!l) return;
      const payloadJson = JSON.stringify({
        id_log: l.id,
        data_hora_recife: l.data,
        data_hora_utc: l.data_raw,
        modulo: l.modulo,
        categoria: l.categoria,
        acao: l.acao,
        resultado: l.resultado,
        usuario: l.usuario,
        id_usuario: l.id_usuario,
        ip: l.ip,
        tabela: 'log_acesso'
      }, null, 2);

      Modal.open(`Registro de Auditoria #${l.id}`, `
        <pre style="font-family: monospace; font-size: 11px; background: #0F172A; color: #38BDF8; padding: 14px; border-radius: 8px; line-height: 1.5; max-height: 320px; overflow: auto; margin: 0;">${escHtml(payloadJson)}</pre>
      `, () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(payloadJson).catch(() => {});
        }
        toast.success('Copiado', 'Registro JSON copiado para a área de transferência.');
      }, 'Copiar JSON');
    });
  });
}

export async function renderAuditoria() {
  _paginaAtual = 1;
  await carregarLogsDaApi(_periodoLog);

  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- Header da Tela (estilo Figma: título à esquerda, seletor de janela + exportar alinhados à direita) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">
            Rastreabilidade / Auditoria
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 0 0 4px 0; letter-spacing: -0.02em;">
            Auditoria e Logs do Sistema
          </h2>
          <p style="font-size: 13px; color: #64748B; margin: 0;">
            Consulte ações, alterações e eventos registrados na plataforma.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <select id="select-periodo-auditoria" aria-label="Janela temporal" style="height: 38px; padding: 0 14px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; cursor: pointer; min-width: 145px;">
            <option value="24h" ${_periodoLog === '24h' ? 'selected' : ''}>Últimas 24h</option>
            <option value="7d" ${_periodoLog === '7d' ? 'selected' : ''}>Últimos 7 dias</option>
            <option value="30d" ${_periodoLog === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
            <option value="todos" ${_periodoLog === 'todos' ? 'selected' : ''}>Todo o histórico</option>
          </select>

          <button type="button" id="btn-exportar-auditoria-csv" style="height: 38px; padding: 0 16px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap;">
            <i data-lucide="download" style="width: 14px; height: 14px; color: #475569;"></i>
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      <!-- Layout 2 Colunas (Tabela de Registros como foco central + Lateral limpa) -->
      <div style="display: grid; grid-template-columns: minmax(0, 2.7fr) minmax(260px, 1fr); gap: 20px; align-items: start;">
        <!-- Coluna Esquerda: Registros de Auditoria -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="margin-bottom: 14px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">Registros de Auditoria</h3>
            <p style="font-size: 12px; color: #64748B; margin: 0;">Histórico de ações e eventos disponíveis para consulta.</p>
          </div>

          <div style="position: relative; width: 100%; margin-bottom: 12px;">
            <i data-lucide="search" style="position: absolute; left: 12px; top: 11px; width: 15px; height: 15px; color: #94A3B8;"></i>
            <input type="text" id="input-busca-log" value="${escHtml(_termoBuscaLog)}" placeholder="Buscar por usuário, ação ou ID" style="width: 100%; padding: 9px 12px 9px 36px; font-size: 12px; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; color: #0F172A; box-sizing: border-box;">
          </div>

          <div id="auditoria-abas-filtro" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            ${renderAbasHtml()}
          </div>

          <div id="container-feed-logs">
            ${renderTabelaLogsHtml()}
          </div>

          <div id="auditoria-paginacao" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 10px;">
            ${renderPaginacaoHtml()}
          </div>
        </div>

        <!-- Coluna Direita: Resumo da Janela Selecionada + Ações Rápidas -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div id="auditoria-resumo-periodo" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            ${renderResumoLateralHtml()}
          </div>

          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Ações Rápidas</h3>
            <p style="font-size: 12px; color: #64748B; margin: 0 0 14px 0;">Aplique as ações ao recorte atual.</p>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button type="button" id="btn-acao-laudo" style="width: 100%; padding: 11px 14px; background: #183D2E; color: #FFFFFF; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; text-align: center;">
                Gerar Laudo de Auditoria
              </button>

              <button type="button" id="btn-acao-atualizar-logs" style="width: 100%; padding: 11px 14px; background: #FFFFFF; color: #0F172A; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;">
                Limpar Filtros / Atualizar Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupAuditoriaEvents() {
  // Exportar CSV/PDF respeitando os filtros ativos
  const btnExportar = document.getElementById('btn-exportar-auditoria-csv');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      const filtrados = getLogsFiltrados();
      if (filtrados.length === 0) {
        toast.info('Sem Registros', 'Não há registros no recorte atual para exportar.');
        return;
      }
      const headers = ['ID', 'Data/Hora (Recife)', 'Usuario', 'IP', 'Acao', 'Modulo', 'Resultado'];
      const rows = filtrados.map(l => [
        `#${l.id}`, l.data, l.usuario, l.ip, l.acao, l.modulo, l.resultado
      ]);
      const dataTag = new Date().toISOString().slice(0, 10);
      openExportChoiceModal(
        Modal,
        `Exportar Auditoria (${filtrados.length} registros)`,
        () => {
          downloadCSV(`auditoria_raiz_agro_${dataTag}.csv`, headers, rows);
          toast.success('CSV Exportado', `${filtrados.length} registro(s) exportados.`);
        },
        () => {
          downloadPDF(`auditoria_raiz_agro_${dataTag}.pdf`, {
            title: 'Relatório de Auditoria — RAIZ Agro IoT',
            subtitle: `Janela: ${labelPeriodo(_periodoLog)} • Filtro: ${_filtroCatLog.toUpperCase()}`,
            headers,
            rows
          });
          toast.success('PDF Exportado', `${filtrados.length} registro(s) exportados.`);
        }
      );
    });
  }

  // Seletor de janela temporal conectado à API (/auditoria?inicio=...&fim=...)
  const selectPeriodo = document.getElementById('select-periodo-auditoria');
  if (selectPeriodo) {
    selectPeriodo.addEventListener('change', async (e) => {
      _periodoLog = e.target.value || '24h';
      _paginaAtual = 1;

      const feedEl = document.getElementById('container-feed-logs');
      if (feedEl) {
        feedEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748B; font-size: 12px;">Carregando registros (${escHtml(labelPeriodo(_periodoLog))})...</div>`;
      }

      await carregarLogsDaApi(_periodoLog);
      atualizarUICompleta();
    });
  }

  // Busca em tempo real
  const inputBusca = document.getElementById('input-busca-log');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaLog = e.target.value.trim();
      _paginaAtual = 1;
      const feedEl = document.getElementById('container-feed-logs');
      if (feedEl) feedEl.innerHTML = renderTabelaLogsHtml();
      const pagEl = document.getElementById('auditoria-paginacao');
      if (pagEl) pagEl.innerHTML = renderPaginacaoHtml();
      const resumoEl = document.getElementById('auditoria-resumo-periodo');
      if (resumoEl) resumoEl.innerHTML = renderResumoLateralHtml();
      if (typeof window !== 'undefined' && window.lucide) window.lucide.createIcons();
      vincularEventosDinamicos();
    });
  }

  // Ação rápida: Gerar Laudo de Auditoria (PDF real do recorte atual)
  const btnLaudo = document.getElementById('btn-acao-laudo');
  if (btnLaudo) {
    btnLaudo.addEventListener('click', exportarLaudoParcialPdf);
  }

  // Ação rápida: Limpar Filtros / Atualizar Logs
  const btnAtualizar = document.getElementById('btn-acao-atualizar-logs');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', async () => {
      btnAtualizar.disabled = true;
      btnAtualizar.style.opacity = '0.6';
      _filtroCatLog = 'todos';
      _termoBuscaLog = '';
      _paginaAtual = 1;
      const inputBuscaEl = document.getElementById('input-busca-log');
      if (inputBuscaEl) inputBuscaEl.value = '';
      await carregarLogsDaApi(_periodoLog);
      atualizarUICompleta();
      btnAtualizar.disabled = false;
      btnAtualizar.style.opacity = '1';
      toast.success('Logs Atualizados', `Filtros limpos e ${_logsAuditoria.length} registro(s) carregados (${labelPeriodo(_periodoLog)}).`);
    });
  }

  vincularEventosDinamicos();
}
