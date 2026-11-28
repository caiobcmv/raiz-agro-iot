/**
 * VIEW: SENSORES E TELEMETRIA DE CAMPO (PERFIL ANALISTA)
 * Integrado aos endpoints FastAPI:
 * - GET /analista/sensores/resumo
 * - GET /sensores
 * - GET /lotes
 * - GET /sensores/{id}/leituras?periodo=24h|7d|30d
 * - GET /leituras/ultima?id_sensor=
 * - GET /dashboard/resumo
 * - GET /config-parametros
 * - GET /alertas-preditivos?status=EM ABERTO&limit=200
 * - GET /alertas-preditivos/cortes
 * - GET /leituras-rejeitadas?limit=5
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';
import { liveTelemetry } from '../live-telemetry.js';
import {
  calcularStatusColeta,
  contarSensoresAtivosReais,
  sensorEstaAtivoRecente,
  obterLabelOrigem,
  resumirAlertasAnalista,
  formatarDataHoraRecife
} from '../utils/analista-metrics.js';

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E RESILIÊNCIA
// ==========================================

function formatarDataRecife(isoTimestamp) {
  if (!isoTimestamp) return '—';
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return String(isoTimestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return String(isoTimestamp);
  }
}

function formatarHoraSimplesRecife(isoTimestamp) {
  if (!isoTimestamp) return '—';
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return '';
  }
}

function formatarDataRelativaRecife(isoTimestamp) {
  if (!isoTimestamp) return '—';
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return String(isoTimestamp);
    const agora = new Date();
    const hora = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);

    const df = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', day: 'numeric', month: 'numeric', year: 'numeric' });
    const strData = df.format(d);
    const strHoje = df.format(agora);

    const ontem = new Date(agora.getTime() - 24 * 3600 * 1000);
    const strOntem = df.format(ontem);

    if (strData === strHoje) return `Hoje ${hora}`;
    if (strData === strOntem) return `Ontem ${hora}`;
    return `${strData} ${hora}`;
  } catch (e) {
    return String(isoTimestamp);
  }
}

function calcularHorasDesde(isoTimestamp) {
  if (!isoTimestamp) return null;
  const t = new Date(isoTimestamp).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 3600000));
}

function extrairArraySeguro(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    if (Array.isArray(val.itens)) return val.itens;
    if (Array.isArray(val.items)) return val.items;
    if (Array.isArray(val.leituras)) return val.leituras;
    if (Array.isArray(val.rejeitadas)) return val.rejeitadas;
    if (Array.isArray(val.alertas)) return val.alertas;
    if (Array.isArray(val.sensores)) return val.sensores;
    if (Array.isArray(val.cortes)) return val.cortes;
    if (Array.isArray(val.lotes)) return val.lotes;
    if (Array.isArray(val.data)) return val.data;
  }
  return [];
}

function gerarCodigoSensor(ambiente, idSensor) {
  const sigla = (ambiente || '').toLowerCase() === 'solo' ? 'SL' : 'AR';
  return `SNS-${sigla}-${String(idSensor || 0).padStart(3, '0')}`;
}

// ==========================================
let sensoresState = {
  resumo: null,
  sensores: [],
  lotes: [],
  dashResumo: null,
  configParametros: [],
  alertasPreditivos: [],
  cortes: [],
  rejeitadas: [],
  ultimaLeitura: null,
  // Controles do Gráfico de Correlação
  loteSelecionadoId: null,
  periodoSelecionado: '24h',
  leiturasAr: [],
  leiturasSolo: [],
  // Paginação e Busca do Inventário
  termoBusca: '',
  paginaAtual: 1,
  itensPorPagina: 10,
  // Timer de Auto-Refresh
  intervalId: null
};

export async function renderSensores() {
  try {
    const [
      resumoRes,
      sensoresRes,
      lotesRes,
      dashResumoRes,
      configRes,
      centralAlertasRes,
      cortesRes,
      rejeitadasRes,
      ultimaLeituraRes,
      estatisticasRes
    ] = await Promise.allSettled([
      api.getAnalistaSensoresResumo(),
      api.getSensores(),
      api.getLotes(),
      api.getDashboardResumo(),
      api.getConfigParametros(),
      api.getCentralAlertas({ status: 'aberto' }),
      api.getCortesPreditivos(),
      api.getLeiturasRejeitadas({ limit: 5 }),
      api.getUltimaLeitura(),
      api.getEstatisticasLeituras()
    ]);

    sensoresState.resumo = (resumoRes.status === 'fulfilled' && resumoRes.value && typeof resumoRes.value === 'object') ? resumoRes.value : null;
    sensoresState.sensores = extrairArraySeguro(sensoresRes.status === 'fulfilled' ? sensoresRes.value : null);
    sensoresState.lotes = extrairArraySeguro(lotesRes.status === 'fulfilled' ? lotesRes.value : null);
    sensoresState.dashResumo = (dashResumoRes.status === 'fulfilled' && dashResumoRes.value && typeof dashResumoRes.value === 'object') ? dashResumoRes.value : null;
    sensoresState.configParametros = extrairArraySeguro(configRes.status === 'fulfilled' ? configRes.value : null);
    const centralVal = centralAlertasRes.status === 'fulfilled' ? centralAlertasRes.value : null;
    sensoresState.alertasPreditivos = Array.isArray(centralVal?.itens) ? centralVal.itens : extrairArraySeguro(centralVal);
    sensoresState.cortes = extrairArraySeguro(cortesRes.status === 'fulfilled' ? cortesRes.value : null);
    sensoresState.rejeitadas = extrairArraySeguro(rejeitadasRes.status === 'fulfilled' ? rejeitadasRes.value : null);
    sensoresState.ultimaLeitura = (ultimaLeituraRes.status === 'fulfilled' && ultimaLeituraRes.value && typeof ultimaLeituraRes.value === 'object') ? ultimaLeituraRes.value : null;
    sensoresState.estatisticas = (estatisticasRes.status === 'fulfilled' && estatisticasRes.value && typeof estatisticasRes.value === 'object') ? estatisticasRes.value : null;
  } catch (err) {
    console.warn('[Sensores] Erro ao carregar dados:', err);
  }

  // Lote fixo 145 (único lote com sensor vinculado)
  sensoresState.loteSelecionadoId = 145;

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 1. QUATRO CARDS NO TOPO -->
      <div class="kpi-grid-4col" id="sensores-kpis-container">
        ${renderTopKpisHtml()}
      </div>

      <!-- 2. GRÁFICO DE CORRELAÇÃO MULTIDIMENSIONAL -->
      <div class="analista-chart-box" id="correlacao-box-container" style="margin-top: 20px;">
        ${renderCorrelacaoBoxHtml()}
      </div>

      <!-- 3. INVENTÁRIO DE SENSORES -->
      <div class="analista-chart-box" id="inventario-box-container" style="margin-top: 20px;">
        ${renderInventarioBoxHtml()}
      </div>

      <!-- GRID INFERIOR (2 COLUNAS): ALERTAS PREDITIVOS E AUDITORIA -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;" class="grid-inferior-analista">
        <!-- 4. ALERTAS PREDITIVOS POR SENSOR -->
        <div class="analista-chart-box" id="preditivos-donut-container">
          ${renderPreditivosDonutBoxHtml()}
        </div>

        <!-- 5. AUDITORIA E LEITURAS REJEITADAS -->
        <div class="analista-chart-box" id="rejeitadas-audit-container">
          ${renderAuditoriaBoxHtml()}
        </div>
      </div>

      <!-- Rodapé discreto -->
      <div style="text-align: center; margin-top: 24px; margin-bottom: 8px; font-size: 11px; color: #94A3B8;">
        Raíz - Plataforma de Inteligência Agro IoT • Telemetria de nós ESP32 e sondas de campo • Vale do São Francisco
      </div>
    </div>
  `;
}

// ==========================================
// RENDERIZADORES DE CADA BLOCO
// ==========================================

function renderTopKpisHtml() {
  const { resumo, sensores, dashResumo, alertasPreditivos, cortes } = sensoresState;
  const sensoresInfo = resumo?.sensores || {};
  const ingestao_24h = resumo?.ingestao_24h || {};
  const intervaloSeg = resumo?.coleta?.intervalo_s ?? null;
  const statusColeta = calcularStatusColeta(ingestao_24h.ultima_leitura, intervaloSeg);

  // Card 1: Sensores ativos (sensor sem leitura recente não conta como ativo)
  const total = sensoresInfo.total ?? sensores.length;
  const ativos = contarSensoresAtivosReais(sensores, statusColeta, intervaloSeg);
  const inativos = Math.max(0, total - ativos);
  const ativosAr = sensores.filter(s => s.ambiente === 'ar' && sensorEstaAtivoRecente(s, statusColeta, intervaloSeg)).length;
  const ativosSolo = sensores.filter(s => s.ambiente === 'solo' && sensorEstaAtivoRecente(s, statusColeta, intervaloSeg)).length;

  // Card 2: Umidade (prioriza umidade_solo real do sensor de solo e média 24h de /dashboard/resumo)
  const soloVals = sensores
    .filter(s => s.ambiente === 'solo')
    .map(s => (s.umidade_solo != null ? s.umidade_solo : s.umidade))
    .filter(v => v != null && !isNaN(Number(v)))
    .map(Number);
  const sensoresArComUmid = sensores.filter(s => s.ambiente === 'ar' && s.umidade != null);

  const soloMediaResumo = dashResumo?.resumo_condicoes?.umidade_solo_media;
  const mediaSolo = (soloMediaResumo != null && !isNaN(Number(soloMediaResumo)))
    ? Number(soloMediaResumo).toFixed(1)
    : (soloVals.length > 0
      ? (soloVals.reduce((acc, v) => acc + v, 0) / soloVals.length).toFixed(1)
      : '—');
  const mediaAr = sensoresArComUmid.length > 0
    ? (sensoresArComUmid.reduce((acc, s) => acc + Number(s.umidade), 0) / sensoresArComUmid.length).toFixed(1)
    : '—';

  // Card 3: Temperatura (ar) + mín/máx reais de GET /leituras/estatisticas
  const tempArMedia = dashResumo?.resumo_condicoes?.temperatura_ar_media ?? sensoresState.estatisticas?.temperatura_media;
  const tempArMediaStr = tempArMedia != null ? `${Number(tempArMedia).toFixed(1)}°C` : '—';
  const est = sensoresState.estatisticas || null;
  const faixaTempTexto = (est && est.temperatura_min != null && est.temperatura_max != null)
    ? `Mín ${Number(est.temperatura_min).toFixed(1)}°C • Máx ${Number(est.temperatura_max).toFixed(1)}°C`
    : 'Microclima de campo';

  // Card 4: Ingestão e rejeição (alertas pela mesma função unificada)
  const taxaPct = ingestao_24h.taxa_sucesso_pct != null ? Number(ingestao_24h.taxa_sucesso_pct) : null;
  const taxaStr = taxaPct != null ? `${taxaPct.toFixed(1)}%` : '—';
  let taxaCor = statusColeta.ativo ? '#059669' : statusColeta.cor;
  if (statusColeta.ativo && taxaPct != null) {
    if (taxaPct < 80) taxaCor = '#DC2626';
    else if (taxaPct < 95) taxaCor = '#D97706';
  }
  const rejeitadasHoje = resumo?.rejeitadas_hoje ?? 0;
  const alertasTotal = resumirAlertasAnalista(alertasPreditivos, cortes).total;

  return `
    <!-- KPI 1: Sensores Ativos -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">SENSORES ATIVOS</span>
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: #0284C7;">
          <i data-lucide="radio" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num">${ativos}/${total}</span>
        <span class="kpi-sub-num" style="color: #059669; font-weight: 600;">${ativos} em operação</span>
      </div>
      <div style="display: flex; gap: 4px; margin: 8px 0;">
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
        <div style="flex: 1; height: 6px; border-radius: 3px; background: #38BDF8;"></div>
      </div>
      <div class="kpi-bottom-row">
        <span style="display: inline-flex; align-items: center; gap: 4px; color: #059669; font-weight: 700;">
          <i data-lucide="check-circle-2" style="width: 13px; height: 13px; color: #059669;"></i>
          <span>${ativosAr} ar • ${ativosSolo} solo</span>
        </span>
        <span style="color: #64748B;">${inativos} inativos</span>
      </div>
    </div>

    <!-- KPI 2: Umidade -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">UMIDADE</span>
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #10B981;">
          <i data-lucide="droplet" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num">${mediaSolo !== '—' ? mediaSolo + '%' : '—'}</span>
        <span class="kpi-sub-num">solo médio</span>
      </div>
      <div style="height: 18px; margin: 8px 0; width: 100%;">
        <svg viewBox="0 0 120 18" style="width: 100%; height: 100%;" preserveAspectRatio="none">
          <path d="M 0,14 Q 35,13 65,9 T 114,4" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
          <circle cx="114" cy="4" r="3" fill="#10B981"/>
        </svg>
      </div>
      <div class="kpi-bottom-row">
        <span style="color: #047857; font-weight: 700;">● Solo: ${mediaSolo !== '—' ? mediaSolo + '%' : '—'}</span>
        <span style="color: #64748B;">Ar: ${mediaAr !== '—' ? mediaAr + '%' : '—'}</span>
      </div>
    </div>

    <!-- KPI 3: Temperatura (ar) -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">TEMPERATURA (AR)</span>
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
          <i data-lucide="thermometer" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num">${tempArMediaStr}</span>
        <span class="kpi-sub-num">média regional</span>
      </div>
      <div style="height: 6px; width: 100%; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin: 10px 0;">
        <div style="width: 50%; height: 100%; background: #0284C7;"></div>
        <div style="width: 30%; height: 100%; background: #93C5FD;"></div>
      </div>
      <div class="kpi-bottom-row">
        <span style="color: #475569;">${faixaTempTexto}</span>
        <span style="color: ${statusColeta.ativo ? '#0284C7' : statusColeta.cor}; font-weight: 600;">${statusColeta.ativo ? 'Monitoramento ativo' : statusColeta.label}</span>
      </div>
    </div>

    <!-- KPI 4: Ingestão e rejeição -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">INGESTÃO E REJEIÇÃO</span>
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
          <i data-lucide="cloud-check" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num" style="color: ${taxaCor};">${taxaStr}</span>
        <span class="kpi-sub-num">taxa de sucesso</span>
      </div>
      <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 6px; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin: 8px 0;">
        <span style="color: ${statusColeta.cor}; font-weight: 700;">${statusColeta.ativo ? 'Telemetria contínua' : statusColeta.label}</span>
        <span style="color: #64748B; font-size: 10px;">${statusColeta.tempoRelativo}</span>
      </div>
      <div class="kpi-bottom-row">
        <span style="color: #475569;">Rejeitadas: <strong style="color: #0F172A;">${rejeitadasHoje} hoje</strong></span>
        <span style="color: #D97706; font-weight: 600;">Alertas abertos: ${alertasTotal}</span>
      </div>
    </div>
  `;
}

function renderCorrelacaoBoxHtml() {
  const { lotes, loteSelecionadoId, periodoSelecionado, sensores } = sensoresState;

  // Lote fixo 145 (único com sensor vinculado)
  const loteAtual = lotes.find(l => String(l.id_lote || l.id) === '145') || {};
  const frutaAtual = loteAtual.cultura || loteAtual.fruta || '';
  const idLoteAtual = 145;
  const labelLoteFixo = frutaAtual ? `Lote 145 • ${frutaAtual}` : 'Lote 145';

  // Sensores deste lote
  const sensorAr = sensores.find(s => String(s.id_lote) === String(idLoteAtual) && s.ambiente === 'ar');
  const sensorSolo = sensores.find(s => String(s.id_lote) === String(idLoteAtual) && s.ambiente === 'solo');

  let avisosSemSensor = '';
  if (!sensorAr && !sensorSolo) {
    avisosSemSensor = '<div style="background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:6px 12px; border-radius:6px; font-size:11px; margin-bottom:12px;">Lote sem sensores de solo e ar vinculados.</div>';
  } else if (!sensorAr) {
    avisosSemSensor = '<div style="background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:6px 12px; border-radius:6px; font-size:11px; margin-bottom:12px;">Lote sem sensor de ar vinculado.</div>';
  } else if (!sensorSolo) {
    avisosSemSensor = '<div style="background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:6px 12px; border-radius:6px; font-size:11px; margin-bottom:12px;">Lote sem sensor de solo vinculado.</div>';
  }

  // Opções do Select de Lotes
  const optionsLotes = lotes.map(l => {
    const id = l.id_lote || l.id;
    const fruta = l.cultura || l.fruta || 'Fruta';
    const isSelected = String(id) === String(idLoteAtual) ? 'selected' : '';
    return `<option value="${id}" ${isSelected}>Lote ${id} • ${fruta}</option>`;
  }).join('');

  return `
    <div class="chart-header-row">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A;">
          Correlação: Microclima e Solo
        </h3>
        <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
          Série temporal integrada de temperatura do ar, umidade do ar e umidade do solo
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; color: #1E293B;">
          ${labelLoteFixo}
        </span>
        <div style="display: flex; background: #F1F5F9; border-radius: 8px; padding: 2px; gap: 2px;">
          <button class="btn-periodo-correlacao ${periodoSelecionado === '24h' ? 'active' : ''}" data-periodo="24h" style="border:none; background:${periodoSelecionado === '24h' ? '#FFFFFF' : 'transparent'}; color:${periodoSelecionado === '24h' ? '#0F172A' : '#64748B'}; font-weight:700; font-size:11px; padding:5px 10px; border-radius:6px; cursor:pointer;">24h</button>
          <button class="btn-periodo-correlacao ${periodoSelecionado === '7d' ? 'active' : ''}" data-periodo="7d" style="border:none; background:${periodoSelecionado === '7d' ? '#FFFFFF' : 'transparent'}; color:${periodoSelecionado === '7d' ? '#0F172A' : '#64748B'}; font-weight:700; font-size:11px; padding:5px 10px; border-radius:6px; cursor:pointer;">7d</button>
          <button class="btn-periodo-correlacao ${periodoSelecionado === '30d' ? 'active' : ''}" data-periodo="30d" style="border:none; background:${periodoSelecionado === '30d' ? '#FFFFFF' : 'transparent'}; color:${periodoSelecionado === '30d' ? '#0F172A' : '#64748B'}; font-weight:700; font-size:11px; padding:5px 10px; border-radius:6px; cursor:pointer;">30d</button>
        </div>
      </div>
    </div>

    ${avisosSemSensor}

    <!-- Legenda Dinâmica -->
    <div style="margin-bottom: 14px;">
      <div style="display: flex; align-items: center; gap: 18px; font-size: 11px; color: #64748B; flex-wrap: wrap;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
          Temperatura (ar) [°C]
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #0F766E;"></span>
          Umidade do ar [%]
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #047857;"></span>
          Umidade do solo [%]
        </span>
      </div>
    </div>

    <!-- Container do SVG do Gráfico -->
    <div id="correlacao-svg-container" style="position: relative; width: 100%; background: #F8FAFC; border-radius: 12px; overflow: hidden; padding: 16px 16px 12px 16px;">
      ${renderSvgCorrelacao()}
    </div>

    <!-- 3 Mini Cards no Rodapé do Gráfico -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;" id="correlacao-mini-cards">
      ${renderCorrelacaoMiniCards()}
    </div>
  `;
}

function renderSvgCorrelacao() {
  const { leiturasAr, leiturasSolo, configParametros, lotes, loteSelecionadoId, periodoSelecionado } = sensoresState;

  const parseTs = (t) => {
    if (!t) return null;
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const ptsTemp = (leiturasAr || [])
    .filter(p => p && p.temperatura != null)
    .map(p => ({ t: p.instante || p.data_hora, ts: parseTs(p.instante || p.data_hora), v: Number(p.temperatura), origem: p.origem }))
    .filter(p => !isNaN(p.v) && p.ts != null)
    .sort((a, b) => a.ts - b.ts);

  const ptsUmidAr = (leiturasAr || [])
    .filter(p => p && p.umidade != null)
    .map(p => ({ t: p.instante || p.data_hora, ts: parseTs(p.instante || p.data_hora), v: Number(p.umidade), origem: p.origem }))
    .filter(p => !isNaN(p.v) && p.ts != null)
    .sort((a, b) => a.ts - b.ts);

  const ptsSolo = (leiturasSolo || [])
    .filter(p => p && (p.umidade_solo != null || p.umidade != null))
    .map(p => ({ t: p.instante || p.data_hora, ts: parseTs(p.instante || p.data_hora), v: Number(p.umidade_solo != null ? p.umidade_solo : p.umidade), origem: p.origem }))
    .filter(p => !isNaN(p.v) && p.ts != null)
    .sort((a, b) => a.ts - b.ts);

  if (ptsTemp.length === 0 && ptsUmidAr.length === 0 && ptsSolo.length === 0) {
    return `
      <div style="height: 220px; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 12px; font-weight: 600;">
        Sem leituras registradas para este lote no período selecionado.
      </div>
    `;
  }

  // Lote e parâmetros ideais
  const lote = lotes.find(l => String(l.id_lote || l.id) === String(loteSelecionadoId));
  const frutaNome = lote?.cultura || lote?.fruta;
  const paramIdeal = configParametros.find(p => p.fruta === frutaNome || p.id_fruta === lote?.id_fruta);
  const temSimulado = [...ptsTemp, ...ptsUmidAr, ...ptsSolo].some(p => p.origem === 'simulado');

  const W = 860, H = 220;
  const padL = 56, padR = 56, padT = 26, padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allTs = [...ptsTemp, ...ptsUmidAr, ...ptsSolo].map(p => p.ts);
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);
  const spanTs = maxTs - minTs;

  // Escala Y esquerda: umidade (0..100%); direita: temperatura real (incluindo faixa ideal se houver)
  const tempVals = ptsTemp.map(p => p.v);
  if (paramIdeal?.temp_min != null) tempVals.push(Number(paramIdeal.temp_min));
  if (paramIdeal?.temp_max != null) tempVals.push(Number(paramIdeal.temp_max));
  const tLo = tempVals.length ? Math.min(...tempVals) : 10;
  const tHi = tempVals.length ? Math.max(...tempVals) : 40;
  const tPad = Math.max(2, (tHi - tLo) * 0.15);
  const tMin = tLo - tPad;
  const tMax = tHi + tPad;

  const xOf = (ts) => spanTs === 0 ? padL + plotW / 2 : padL + ((ts - minTs) / spanTs) * plotW;
  const yPct = (v) => padT + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  const yTemp = (v) => padT + plotH - ((v - tMin) / Math.max(0.001, tMax - tMin)) * plotH;

  // Banda de temperatura ideal na escala real de °C
  let bandaIdealHtml = '';
  if (paramIdeal && paramIdeal.temp_min != null && paramIdeal.temp_max != null) {
    const yTop = Math.max(padT, yTemp(Number(paramIdeal.temp_max)));
    const yBot = Math.min(padT + plotH, yTemp(Number(paramIdeal.temp_min)));
    const h = Math.max(6, yBot - yTop);
    bandaIdealHtml = `
      <rect x="${padL}" y="${yTop.toFixed(1)}" width="${plotW}" height="${h.toFixed(1)}" fill="#BAE6FD" fill-opacity="0.28" rx="4"/>
      <text x="${(W - padR - 4).toFixed(1)}" y="${Math.max(12, yTop - 4).toFixed(1)}" fill="#0284C7" font-size="9" font-weight="700" text-anchor="end">Faixa ideal (${paramIdeal.temp_min}°C – ${paramIdeal.temp_max}°C)</text>
    `;
  }

  const ticks = [0, 1 / 3, 2 / 3, 1];
  const gridHtml = ticks.map(f => {
    const y = padT + plotH * (1 - f);
    const uVal = Math.round(f * 100);
    const tVal = tMin + (tMax - tMin) * f;
    return `
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${padL - 8}" y="${(y + 3).toFixed(1)}" fill="#047857" font-size="10" font-weight="600" text-anchor="end">${uVal}%</text>
      <text x="${W - padR + 8}" y="${(y + 3).toFixed(1)}" fill="#0284C7" font-size="10" font-weight="600" text-anchor="start">${tVal.toFixed(0)}°C</text>
    `;
  }).join('');

  const soloCoords = ptsSolo.map(p => ({ ...p, x: xOf(p.ts), y: yPct(p.v) }));
  const umidArCoords = ptsUmidAr.map(p => ({ ...p, x: xOf(p.ts), y: yPct(p.v) }));
  const tempCoords = ptsTemp.map(p => ({ ...p, x: xOf(p.ts), y: yTemp(p.v) }));

  const poly = (coords) => coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const soloArea = soloCoords.length > 1
    ? `M ${soloCoords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} L ${soloCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')} L ${soloCoords[soloCoords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
    : '';

  const dashStyle = '';

  // Marcador real do pico de temperatura (sem fallback inventado)
  let picoHtml = '';
  if (tempCoords.length > 0) {
    const pico = tempCoords.reduce((best, c) => (c.v > best.v ? c : best), tempCoords[0]);
    const picoHora = formatarHoraSimplesRecife(pico.t) || '';
    const boxW = 136;
    const boxX = Math.min(Math.max(padL, pico.x - boxW / 2), W - padR - boxW);
    const boxY = Math.max(2, pico.y - 32);
    picoHtml = `
      <circle cx="${pico.x.toFixed(1)}" cy="${pico.y.toFixed(1)}" r="4.5" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>
      <g>
        <rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxW}" height="22" rx="4" fill="#0F172A"/>
        <text x="${(boxX + boxW / 2).toFixed(1)}" y="${(boxY + 14).toFixed(1)}" fill="#FFFFFF" font-size="10" font-weight="700" text-anchor="middle">Pico ${pico.v.toFixed(1)}°C${picoHora ? ` às ${picoHora}` : ''}</text>
      </g>
    `;
  }

  const fmtX = (ms) => periodoSelecionado === '30d'
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Recife' }).format(new Date(ms))
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife' }).format(new Date(ms));

  return `
    <div style="position: relative; width: 100%; height: 240px;">
      <svg viewBox="0 0 ${W} ${H}" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad-umidade-solo-svg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${bandaIdealHtml}
        ${gridHtml}
        ${soloArea ? `<path d="${soloArea}" fill="url(#grad-umidade-solo-svg)"/>` : ''}
        ${soloCoords.length > 0 ? `<polyline points="${poly(soloCoords)}" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${umidArCoords.length > 0 ? `<polyline points="${poly(umidArCoords)}" fill="none" stroke="#0F766E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${tempCoords.length > 0 ? `<polyline points="${poly(tempCoords)}" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${dashStyle}/>` : ''}
        ${soloCoords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="#047857" stroke="#FFFFFF" stroke-width="1"/>`).join('')}
        ${umidArCoords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" fill="#0F766E" stroke="#FFFFFF" stroke-width="1"/>`).join('')}
        ${tempCoords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="#0284C7" stroke="#FFFFFF" stroke-width="1"/>`).join('')}
        ${picoHtml}
      </svg>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 6px; padding: 0 48px;">
      <span>${fmtX(minTs)}</span>
      <span>${spanTs > 0 ? fmtX(minTs + spanTs / 2) : ''}</span>
      <span style="color: #047857; font-weight: 700;">${spanTs > 0 ? fmtX(maxTs) : ''}</span>
    </div>
  `;
}

function renderCorrelacaoMiniCards() {
  const { sensores, loteSelecionadoId, ultimaLeitura } = sensoresState;

  const sensorAr = sensores.find(s => String(s.id_lote) === String(loteSelecionadoId) && s.ambiente === 'ar');
  const sensorSolo = sensores.find(s => String(s.id_lote) === String(loteSelecionadoId) && s.ambiente === 'solo');

  const tempArAtual = sensorAr?.temperatura != null ? `${Number(sensorAr.temperatura).toFixed(1)}°C` : '—';
  const umidArAtual = sensorAr?.umidade != null ? `${Number(sensorAr.umidade).toFixed(1)}%` : '—';
  const umidSoloAtual = sensorSolo?.umidade != null ? `${Number(sensorSolo.umidade).toFixed(1)}%` : '—';

  const entryId = ultimaLeitura?.entry_id_thingspeak ?? ultimaLeitura?.entry_id ?? null;
  const entryLabel = entryId != null ? `entry_id #${entryId}` : 'Sem leitura';
  const dataHoraUltima = formatarDataHoraRecife(ultimaLeitura?.data_hora) || 'Sem leitura';

  return `
    <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #0284C7; border: 1px solid #BAE6FD;">
        <i data-lucide="thermometer" style="width: 16px; height: 16px;"></i>
      </div>
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${tempArAtual} / ${umidArAtual}</div>
        <div style="font-size: 10px; color: #64748B;">Temperatura / Umidade do Ar</div>
      </div>
    </div>

    <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #059669; border: 1px solid #BAE6FD;">
        <i data-lucide="waves" style="width: 16px; height: 16px;"></i>
      </div>
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${umidSoloAtual}</div>
        <div style="font-size: 10px; color: #64748B;">Umidade do Solo Atual</div>
      </div>
    </div>

    <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #0F172A; border: 1px solid #BAE6FD;">
        <i data-lucide="cloud-check" style="width: 16px; height: 16px;"></i>
      </div>
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${entryLabel}</div>
        <div style="font-size: 10px; color: #64748B;">Sincronizado: ${dataHoraUltima}</div>
      </div>
    </div>
  `;
}

function renderInventarioBoxHtml() {
  const { sensores, lotes, termoBusca, paginaAtual, itensPorPagina } = sensoresState;

  // Filtragem no cliente
  const termo = (termoBusca || '').toLowerCase().trim();
  const sensoresFiltrados = sensores.filter(s => {
    if (!termo) return true;
    const lote = lotes.find(l => String(l.id_lote || l.id) === String(s.id_lote));
    const fruta = lote?.cultura || lote?.fruta || '';
    const texto = `${s.nome || ''} ${s.tipo_sensor || ''} ${s.ambiente || ''} ${s.status || ''} ${s.channel_id || ''} ${fruta} ${s.id_lote || ''}`.toLowerCase();
    return texto.includes(termo);
  });

  const totalFiltrados = sensoresFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / itensPorPagina));
  const paginaCorrigida = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaCorrigida - 1) * itensPorPagina;
  const sensoresPaginados = sensoresFiltrados.slice(inicio, inicio + itensPorPagina);

  let linhasHtml = '';
  if (sensoresPaginados.length === 0) {
    linhasHtml = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: #64748B; font-size: 12px;">
          Nenhum sensor encontrado para os critérios de busca.
        </td>
      </tr>
    `;
  } else {
    linhasHtml = sensoresPaginados.map(s => {
      const codigoFormatado = gerarCodigoSensor(s.ambiente, s.id_sensor);
      const lote = lotes.find(l => String(l.id_lote || l.id) === String(s.id_lote));
      const loteFrutaStr = lote ? `Lote ${lote.id_lote || lote.id} • ${lote.cultura || lote.fruta || 'Fruta'}` : `Lote #${s.id_lote || '—'}`;

      const amb = (s.ambiente || '').toLowerCase();
      const chipAmbiente = amb === 'solo'
        ? `<span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
            <i data-lucide="sprout" style="width: 13px; height: 13px;"></i> ${s.tipo_sensor || 'Sensor Solo'} • solo
          </span>`
        : `<span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
            <i data-lucide="cloud" style="width: 13px; height: 13px;"></i> ${s.tipo_sensor || 'Estação Microclima'} • ar
          </span>`;

      const tempStr = s.temperatura != null ? `${Number(s.temperatura).toFixed(1)}°C` : '—';
      const umidStr = s.umidade != null ? `${Number(s.umidade).toFixed(1)}%` : '—';
      const labelOrig = obterLabelOrigem(s.origem);
      const origemSelo = labelOrig === 'Real'
        ? `<span style="background: #ECFDF5; color: #065F46; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; margin-left: 4px;">Real</span>`
        : (labelOrig === 'Simulado'
          ? `<span style="background: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; margin-left: 4px;">Simulado</span>`
          : '');

      const stSensor = calcularStatusColeta(s.ultima_leitura || sensoresState.resumo?.ingestao_24h?.ultima_leitura, sensoresState.resumo?.coleta?.intervalo_s);
      let statusHtml = '';
      if (s.status === 'ativo' && stSensor.ativo) {
        statusHtml = `<span style="background: #ECFDF5; color: #047857; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">Ativo</span>`;
      } else if (s.status === 'ativo') {
        statusHtml = `<span style="background: ${stSensor.estado === 'offline' ? '#FEF2F2' : '#FFFBEB'}; color: ${stSensor.cor}; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">${stSensor.label} · ${stSensor.tempoRelativo}</span>`;
      } else {
        const horasInativo = calcularHorasDesde(s.ultima_leitura);
        const tempoInatTexto = horasInativo != null ? `há ${horasInativo} h` : 'sem leitura recente';
        statusHtml = `<span style="background: #F1F5F9; color: #64748B; padding: 3px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px;">Inativo · última leitura ${tempoInatTexto}</span>`;
      }

      return `
        <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0F172A;">${codigoFormatado}</div>
            <div style="font-size: 11px; color: #64748B;">${s.nome || 'Sensor de Campo'} (id: ${s.id_sensor})</div>
          </td>
          <td style="padding: 12px 14px;">
            ${chipAmbiente}
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 600; color: #0F172A;">${loteFrutaStr}</div>
            <div style="font-size: 11px; color: #64748B;">${s.localizacao || 'Setor padrão'}</div>
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0284C7; font-family: monospace;">${s.channel_id ? 'Ch ' + s.channel_id : '—'}</div>
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0F172A;">
              ${tempStr} • ${umidStr} ${origemSelo}
            </div>
            <div style="font-size: 10px; color: #64748B;">
              ${formatarDataRecife(s.ultima_leitura)}
            </div>
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            ${statusHtml}
          </td>
        </tr>
      `;
    }).join('');
  }

  return `
    <div class="chart-header-row">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="layers" style="width: 18px; height: 18px; color: #10B981;"></i>
          Inventário de Sensores
        </h3>
        <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
          Relação completa de nós cadastrados, canais de transmissão e telemetrias recentes
        </p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">
          ● ${sensores.length} sensores cadastrados
        </span>
        <button id="btn-exportar-sensores-csv" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          <i data-lucide="download" style="width: 12px; height: 12px;"></i> Exportar
        </button>
      </div>
    </div>

    <!-- Barra de Busca -->
    <div style="position: relative; margin-bottom: 14px;">
      <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
      <input type="text" id="input-busca-sensores" value="${termoBusca}" placeholder="Filtrar por nome, lote, ambiente ('ar' / 'solo'), status ou canal…" style="width: 100%; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px 8px 36px; font-size: 12px; outline: none; transition: border-color 0.2s;">
    </div>

    <!-- Tabela Estilizada -->
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background: #F1F5F9; border-bottom: 2px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px; font-weight: 700;">ID / NOME</th>
            <th style="padding: 10px 14px; font-weight: 700;">TIPO / AMBIENTE</th>
            <th style="padding: 10px 14px; font-weight: 700;">LOTE / FRUTA</th>
            <th style="padding: 10px 14px; font-weight: 700;">CANAL</th>
            <th style="padding: 10px 14px; font-weight: 700;">ÚLTIMA LEITURA</th>
            <th style="padding: 10px 14px; text-align: center; font-weight: 700;">STATUS</th>
          </tr>
        </thead>
        <tbody id="tabela-sensores-body">
          ${linhasHtml}
        </tbody>
      </table>
    </div>

    <!-- Paginação -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 11px; color: #64748B;">
      <span>Exibindo ${totalFiltrados > 0 ? inicio + 1 : 0}-${Math.min(inicio + itensPorPagina, totalFiltrados)} de ${totalFiltrados} sensores</span>
      <div style="display: flex; gap: 4px;">
        <button id="btn-pag-ant" style="border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: ${paginaCorrigida > 1 ? 'pointer' : 'not-allowed'};" ${paginaCorrigida <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">${paginaCorrigida} de ${totalPaginas}</span>
        <button id="btn-pag-prox" style="border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: ${paginaCorrigida < totalPaginas ? 'pointer' : 'not-allowed'};" ${paginaCorrigida >= totalPaginas ? 'disabled' : ''}>Próximo</button>
      </div>
    </div>
  `;
}

function renderPreditivosDonutBoxHtml() {
  const { sensores, alertasPreditivos, cortes } = sensoresState;

  // Fonte única: filtra previsões vencidas e classifica pelos cortes reais de cortes_alerta_preditivo
  const resumoAlertas = resumirAlertasAnalista(alertasPreditivos, cortes);
  const preditivosAtivos = resumoAlertas.ativos.filter(a => a._eh_preditivo);

  let countAlta = 0;
  let countModerada = 0;
  let countBaixa = 0;
  preditivosAtivos.forEach(a => {
    if (a._nivel_padrao === 'CRITICO') countAlta++;
    else if (a._nivel_padrao === 'MEDIO') countModerada++;
    else countBaixa++;
  });

  const totalAtivos = preditivosAtivos.length;
  const pctAlta = totalAtivos > 0 ? Math.round((countAlta / totalAtivos) * 100) : 0;
  const pctMod = totalAtivos > 0 ? Math.round((countModerada / totalAtivos) * 100) : 0;
  const pctBaixa = totalAtivos > 0 ? Math.max(0, 100 - pctAlta - pctMod) : 0;

  // Faixas reais vindas de cortes_alerta_preditivo (sem números fixos)
  const corteBaixo = cortes.find(c => String(c.nivel || '').toUpperCase() === 'BAIXO');
  const corteMedio = cortes.find(c => String(c.nivel || '').toUpperCase() === 'MEDIO');
  const corteCritico = cortes.find(c => String(c.nivel || '').toUpperCase() === 'CRITICO');

  const faixaBaixaTxt = corteBaixo && corteBaixo.limiar_min != null && corteBaixo.limiar_max != null
    ? `${Math.round(Number(corteBaixo.limiar_min) * 100)}% - ${Math.round(Number(corteBaixo.limiar_max) * 100)}%`
    : '—';
  const faixaMediaTxt = corteMedio && corteMedio.limiar_min != null && corteMedio.limiar_max != null
    ? `${Math.round(Number(corteMedio.limiar_min) * 100)}% - ${Math.round(Number(corteMedio.limiar_max) * 100)}%`
    : '—';
  const faixaAltaTxt = corteCritico && corteCritico.limiar_min != null && corteCritico.limiar_max != null
    ? `${Math.round(Number(corteCritico.limiar_min) * 100)}% - ${Math.round(Number(corteCritico.limiar_max) * 100)}%`
    : '—';

  // Alerta mais recente (somente não vencido)
  const alertaMaisRecente = totalAtivos > 0
    ? [...preditivosAtivos].sort((a, b) => new Date(b.data_hora || b.data_geracao || 0) - new Date(a.data_hora || a.data_geracao || 0))[0]
    : null;

  let corteAtivoHtml = '';
  if (alertaMaisRecente) {
    const sensorId = alertaMaisRecente.id_sensor ?? alertaMaisRecente.sensor?.id_sensor ?? null;
    const sensorAlerta = sensorId != null ? sensores.find(s => s.id_sensor === sensorId) : null;
    const sensorLabel = sensorAlerta
      ? sensorAlerta.nome
      : (alertaMaisRecente.sensor_nome || alertaMaisRecente.sensor?.nome || (sensorId != null ? `Sensor #${sensorId}` : 'Sem sensor vinculado'));
    const probRaw = alertaMaisRecente.probabilidade_risco != null ? Number(alertaMaisRecente.probabilidade_risco) : (alertaMaisRecente.probabilidade != null ? Number(alertaMaisRecente.probabilidade) : null);
    const probPct = probRaw != null && !isNaN(probRaw) ? `${Math.round(probRaw > 1 ? probRaw : probRaw * 100)}%` : '—';
    const severidadeNome = alertaMaisRecente._nivel_label || 'Baixa';
    const badgeBg = severidadeNome === 'Alta' ? '#FEE2E2' : (severidadeNome === 'Moderada' ? '#DBEAFE' : '#ECFDF5');
    const badgeColor = severidadeNome === 'Alta' ? '#DC2626' : (severidadeNome === 'Moderada' ? '#1D4ED8' : '#059669');
    const loteId = alertaMaisRecente.id_lote ?? alertaMaisRecente.lote?.id_lote ?? null;

    corteAtivoHtml = `
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <span style="font-weight: 700; color: #15803D; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="triangle-alert" style="width: 14px; height: 14px; color: #0284C7;"></i>
            Corte Predição Ativo
          </span>
          <div style="color: #475569; font-size: 10px; margin-top: 2px;">${sensorLabel} • Probabilidade: ${probPct}${loteId != null ? ` • Lote #${loteId}` : ''}</div>
        </div>
        <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${severidadeNome}</span>
      </div>
    `;
  } else {
    corteAtivoHtml = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; text-align: center; color: #64748B; font-size: 11px;">
        Nenhum alerta preditivo ativo no momento.
      </div>
    `;
  }

  return `
    <div class="chart-header-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: nowrap;">
      <div style="flex: 1; min-width: 0;">
        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="pie-chart" style="width: 16px; height: 16px; color: #10B981;"></i>
          Alertas Preditivos por Sensor
        </h4>
        <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
          Distribuição de risco probabilístico configurada por cortes preditivos
        </p>
      </div>
      <span style="font-size: 10px; background: ${totalAtivos > 0 ? '#ECFDF5' : '#F1F5F9'}; color: ${totalAtivos > 0 ? '#047857' : '#64748B'}; font-weight: 600; padding: 2px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-left: auto;">
        ${totalAtivos > 0 ? `${totalAtivos} ativo(s)` : 'Sem alertas'}
      </span>
    </div>

    <div style="display: flex; align-items: center; gap: 24px; margin: 16px 0;">
      <!-- Donut SVG -->
      <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0;">
        <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="3.8"/>
          ${totalAtivos > 0 ? `
          <!-- Verde: Baixa -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="3.8" stroke-dasharray="${pctBaixa}, 100" stroke-dashoffset="0"/>
          <!-- Azul: Moderada -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0284C7" stroke-width="3.8" stroke-dasharray="${pctMod}, 100" stroke-dashoffset="-${pctBaixa}"/>
          <!-- Vermelho: Alta -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="3.8" stroke-dasharray="${pctAlta}, 100" stroke-dashoffset="-${pctBaixa + pctMod}"/>
          ` : ''}
        </svg>
        <div class="donut-center-wrap" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
          <div class="donut-center-val" style="font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1; font-family: 'Space Grotesk', sans-serif;">${totalAtivos}</div>
          <div class="donut-center-sub" style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">${totalAtivos === 1 ? 'ALERTA' : 'ALERTAS'}</div>
        </div>
      </div>

      <!-- Lista de Severidades -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
            Baixa (${faixaBaixaTxt})
          </span>
          <strong>${countBaixa} (${pctBaixa}%)</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7;"></span>
            Moderada (${faixaMediaTxt})
          </span>
          <strong>${countModerada} (${pctMod}%)</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span>
            Alta (${faixaAltaTxt})
          </span>
          <strong>${countAlta} (${pctAlta}%)</strong>
        </div>
      </div>
    </div>

    ${corteAtivoHtml}
  `;
}

function renderAuditoriaBoxHtml() {
  const { rejeitadas, sensores } = sensoresState;
  const rejeitadasSlice = rejeitadas.slice(0, 5);

  let itensRejeitadosHtml = '';
  if (rejeitadasSlice.length === 0) {
    itensRejeitadosHtml = `
      <div style="padding: 24px; text-align: center; color: #64748B; font-size: 12px;">
        Nenhum descarte de leitura registrado recentemente.
      </div>
    `;
  } else {
    itensRejeitadosHtml = rejeitadasSlice.map(r => {
      const sensor = sensores.find(s => String(s.id_sensor) === String(r.id_sensor));
      const sensorNome = sensor ? sensor.nome : `Sensor #${r.id_sensor || '—'}`;
      const ambienteStr = sensor ? (sensor.ambiente === 'solo' ? 'Solo' : 'Ar') : '—';
      const channelStr = sensor?.channel_id ? `Ch ${sensor.channel_id}` : 'Canal direto';

      const tempBruta = r.temperatura_bruta != null ? `${r.temperatura_bruta}°C` : null;
      const umidBruta = r.umidade_bruta != null ? `${r.umidade_bruta}%` : null;
      const valoresBrutos = [tempBruta ? `temp: ${tempBruta}` : null, umidBruta ? `umid: ${umidBruta}` : null].filter(Boolean).join(' • ') || 'sem valores brutos';

      return `
        <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px;">
            <span style="font-weight: 700; color: #DC2626; font-family: monospace; display: flex; align-items: center; gap: 5px;">
              <i data-lucide="circle-alert" style="width: 13px; height: 13px; color: #DC2626;"></i>
              ${r.motivo || 'DESCARTE'}
            </span>
            <span style="color: #64748B; font-size: 10px;">${formatarDataRelativaRecife(r.data_rejeicao || r.data_hora_bruta)}</span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-left: 18px;">
            ${sensorNome} • ${ambienteStr} • ${channelStr}
          </div>
          <div style="font-size: 10px; color: #64748B; margin-top: 3px; margin-left: 18px;">
            Valores brutos: ${valoresBrutos}
          </div>
        </div>
      `;
    }).join('');
  }

  return `
    <div class="chart-header-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
      <div>
        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="clipboard-x" style="width: 16px; height: 16px; color: #EF4444;"></i>
          Auditoria e Leituras Rejeitadas
        </h4>
        <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
          Descartes por inconsistência física ou falha de telemetria
        </p>
      </div>
      <span style="font-size: 11px; background: #ECFDF5; color: #047857; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; flex-shrink: 0;">
        ● Auditoria ativa
      </span>
    </div>

    ${itensRejeitadosHtml}

    <button class="btn-log-ingestao" id="btn-log-ingestao" style="width: 100%; margin-top: 10px; background: #183D2E; border: none; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: opacity 0.2s;">
      <div>
        <div style="font-weight: 700; font-size: 12px; color: #FFFFFF;">Log de Ingestão</div>
        <div style="font-size: 10px; color: rgba(255, 255, 255, 0.85); margin-top: 1px;">Ver histórico completo e paginado de descartes</div>
      </div>
      <i data-lucide="arrow-right" style="width: 16px; height: 16px; color: #FFFFFF;"></i>
    </button>
  `;
}

// ==========================================
// EVENTOS E INTERATIVIDADE
// ==========================================

export function setupSensoresEvents() {
  liveTelemetry.start();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 1. Busca e Paginação no Inventário de Sensores
  const inputBusca = document.getElementById('input-busca-sensores');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      sensoresState.termoBusca = e.target.value;
      sensoresState.paginaAtual = 1;
      atualizarInventario();
    });
  }

  const btnAnt = document.getElementById('btn-pag-ant');
  if (btnAnt) {
    btnAnt.addEventListener('click', () => {
      if (sensoresState.paginaAtual > 1) {
        sensoresState.paginaAtual--;
        atualizarInventario();
      }
    });
  }

  const btnProx = document.getElementById('btn-pag-prox');
  if (btnProx) {
    btnProx.addEventListener('click', () => {
      sensoresState.paginaAtual++;
      atualizarInventario();
    });
  }

  function atualizarInventario() {
    const container = document.getElementById('inventario-box-container');
    if (container) {
      container.innerHTML = renderInventarioBoxHtml();
      if (window.lucide) window.lucide.createIcons();
      setupInventarioListeners();
    }
  }

  function setupInventarioListeners() {
    const input = document.getElementById('input-busca-sensores');
    if (input) {
      input.focus();
      const val = input.value;
      input.value = '';
      input.value = val;
      input.addEventListener('input', (e) => {
        sensoresState.termoBusca = e.target.value;
        sensoresState.paginaAtual = 1;
        atualizarInventario();
      });
    }

    const bAnt = document.getElementById('btn-pag-ant');
    if (bAnt) {
      bAnt.addEventListener('click', () => {
        if (sensoresState.paginaAtual > 1) {
          sensoresState.paginaAtual--;
          atualizarInventario();
        }
      });
    }

    const bProx = document.getElementById('btn-pag-prox');
    if (bProx) {
      bProx.addEventListener('click', () => {
        sensoresState.paginaAtual++;
        atualizarInventario();
      });
    }

    const btnExp = document.getElementById('btn-exportar-sensores-csv');
    if (btnExp) {
      btnExp.addEventListener('click', () => {
        const headers = ['ID Sensor', 'Código', 'Nome', 'Tipo', 'Ambiente', 'Lote', 'Canal', 'Status'];
        const rows = sensoresState.sensores.map(s => [
          s.id_sensor,
          gerarCodigoSensor(s.ambiente, s.id_sensor),
          s.nome,
          s.tipo_sensor,
          s.ambiente,
          `Lote #${s.id_lote || '—'}`,
          s.channel_id || '—',
          s.status
        ]);
        const dataTag = new Date().toISOString().slice(0, 10);
        openExportChoiceModal(
          Modal,
          'Exportar Inventário de Sensores',
          () => {
            downloadCSV(`inventario_sensores_${dataTag}.csv`, headers, rows);
            toast.success('Download Concluído', 'CSV exportado com sucesso.');
          },
          () => {
            downloadPDF(`inventario_sensores_${dataTag}.pdf`, {
              title: 'Inventário de Sensores IoT',
              subtitle: 'Parque de Sensores e Telemetria Agrícola',
              headers,
              rows
            });
            toast.success('Download Concluído', 'PDF exportado com sucesso.');
          }
        );
      });
    }
  }

  setupInventarioListeners();

  // 2. Interação no Gráfico de Correlação
  async function carregarSeriesDoLote() {
    const loteId = sensoresState.loteSelecionadoId;
    const periodo = sensoresState.periodoSelecionado;

    const sensorAr = sensoresState.sensores.find(s => String(s.id_lote) === String(loteId) && s.ambiente === 'ar');
    const sensorSolo = sensoresState.sensores.find(s => String(s.id_lote) === String(loteId) && s.ambiente === 'solo');

    try {
      const promises = [];
      if (sensorAr) promises.push(api.getSensorLeituras(sensorAr.id_sensor, periodo));
      else promises.push(Promise.resolve([]));

      if (sensorSolo) promises.push(api.getSensorLeituras(sensorSolo.id_sensor, periodo));
      else promises.push(Promise.resolve([]));

      const idSensorParaUltima = sensorAr?.id_sensor || sensorSolo?.id_sensor;
      if (idSensorParaUltima) {
        promises.push(api.getUltimaLeitura(idSensorParaUltima));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [resAr, resSolo, resUltima] = await Promise.all(promises);

      sensoresState.leiturasAr = extrairArraySeguro(resAr?.pontos || resAr);
      sensoresState.leiturasSolo = extrairArraySeguro(resSolo?.pontos || resSolo);
      if (resUltima) sensoresState.ultimaLeitura = resUltima;
    } catch (e) {
      console.warn('[Sensores] Falha ao obter leituras do lote:', e);
    }

    const svgContainer = document.getElementById('correlacao-svg-container');
    if (svgContainer) svgContainer.innerHTML = renderSvgCorrelacao();

    const miniCardsContainer = document.getElementById('correlacao-mini-cards');
    if (miniCardsContainer) {
      miniCardsContainer.innerHTML = renderCorrelacaoMiniCards();
      if (window.lucide) window.lucide.createIcons();
    }
  }

  const selectLote = document.getElementById('select-correlacao-lote');
  if (selectLote) {
    selectLote.addEventListener('change', async (e) => {
      sensoresState.loteSelecionadoId = e.target.value;
      const opt = e.target.options[e.target.selectedIndex]?.text || '';
      toast.info('Lote Selecionado', `Carregando correlação para ${opt}...`);
      await carregarSeriesDoLote();
    });
  }

  document.querySelectorAll('.btn-periodo-correlacao').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const periodo = e.currentTarget.dataset.periodo;
      if (periodo && periodo !== sensoresState.periodoSelecionado) {
        sensoresState.periodoSelecionado = periodo;
        document.querySelectorAll('.btn-periodo-correlacao').forEach(b => {
          const ativo = b.dataset.periodo === periodo;
          b.style.background = ativo ? '#FFFFFF' : 'transparent';
          b.style.color = ativo ? '#0F172A' : '#64748B';
        });
        await carregarSeriesDoLote();
      }
    });
  });

  // Carrega inicialmente as séries
  carregarSeriesDoLote();

  // 3. Botão Log de Ingestão (Modal com paginação por limit/offset)
  const btnLog = document.getElementById('btn-log-ingestao');
  if (btnLog) {
    btnLog.addEventListener('click', () => {
      let offsetAtual = 0;
      const pageSize = 5;

      async function carregarModalAudit(offset) {
        try {
          const listaRaw = await api.getLeiturasRejeitadas({ limit: pageSize, offset });
          let lista = extrairArraySeguro(listaRaw);


          let linhas = '';
          if (!lista || lista.length === 0) {
            linhas = '<tr><td colspan="4" style="text-align:center; padding:14px; color:#64748B;">Nenhum descarte nesta página.</td></tr>';
          } else {
            linhas = lista.map(item => {
              const sens = sensoresState.sensores.find(s => String(s.id_sensor) === String(item.id_sensor));
              const sensNome = sens ? sens.nome : `Sensor #${item.id_sensor || '—'}`;
              const tBruta = item.temperatura_bruta != null ? `${item.temperatura_bruta}°C` : '—';
              const uBruta = item.umidade_bruta != null ? `${item.umidade_bruta}%` : '—';
              return `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:8px; font-size:11px; color:#0F172A;">${formatarDataRecife(item.data_rejeicao || item.data_hora_bruta)}</td>
                  <td style="padding:8px; font-size:11px; font-weight:600; color:#0F172A;">${sensNome}</td>
                  <td style="padding:8px; font-size:11px; font-family:monospace; color:#DC2626;">${item.motivo || 'DESCARTE'}</td>
                  <td style="padding:8px; font-size:11px; color:#475569;">${tBruta} / ${uBruta}</td>
                </tr>
              `;
            }).join('');
          }

          const conteudo = `
            <div style="font-size:12px; color:#475569; margin-bottom:12px;">
              Histórico de leituras descartadas pelo pipeline de integridade:
            </div>
            <div style="max-height:260px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:8px; margin-bottom:12px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead style="background:#F8FAFC; border-bottom:1px solid #E2E8F0; font-size:10px; color:#64748B; text-transform:uppercase;">
                  <tr>
                    <th style="padding:8px;">Data / Hora</th>
                    <th style="padding:8px;">Sensor</th>
                    <th style="padding:8px;">Motivo</th>
                    <th style="padding:8px;">Valores Brutos</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
              <button id="modal-audit-ant" style="padding:4px 10px; border:1px solid #CBD5E1; background:#fff; border-radius:6px; cursor:${offset > 0 ? 'pointer' : 'not-allowed'};" ${offset <= 0 ? 'disabled' : ''}>&larr; Anterior</button>
              <span style="color:#64748B;">Página ${Math.floor(offset / pageSize) + 1}</span>
              <button id="modal-audit-prox" style="padding:4px 10px; border:1px solid #CBD5E1; background:#fff; border-radius:6px; cursor:${lista && lista.length === pageSize ? 'pointer' : 'not-allowed'};" ${(!lista || lista.length < pageSize) ? 'disabled' : ''}>Próxima &rarr;</button>
            </div>
          `;

          Modal.open('Log Completo de Ingestão e Descartes', conteudo, () => {
            const dataTag = new Date().toISOString().slice(0, 10);
            downloadCSV(
              `log_descartes_${dataTag}.csv`,
              ['Data/Hora', 'Sensor', 'Motivo', 'Temp Bruta', 'Umid Bruta'],
              lista.map(it => [
                formatarDataRecife(it.data_rejeicao || it.data_hora_bruta),
                it.id_sensor,
                it.motivo,
                it.temperatura_bruta ?? '—',
                it.umidade_bruta ?? '—'
              ])
            );
            toast.success('Download Concluído', 'Dump CSV de descartes exportado.');
          }, 'Exportar CSV');

          const btnM_Ant = document.getElementById('modal-audit-ant');
          const btnM_Prox = document.getElementById('modal-audit-prox');
          if (btnM_Ant && offset > 0) {
            btnM_Ant.onclick = () => {
              offsetAtual = Math.max(0, offsetAtual - pageSize);
              carregarModalAudit(offsetAtual);
            };
          }
          if (btnM_Prox && lista && lista.length === pageSize) {
            btnM_Prox.onclick = () => {
              offsetAtual += pageSize;
              carregarModalAudit(offsetAtual);
            };
          }
        } catch (err) {
          toast.error('Erro na Auditoria', err.message || 'Falha ao buscar log de descartes');
        }
      }

      carregarModalAudit(0);
    });
  }

  // 4. Auto-refresh a cada 60s pausando com aba oculta
  if (sensoresState.intervalId) {
    clearInterval(sensoresState.intervalId);
    sensoresState.intervalId = null;
  }

  sensoresState.intervalId = setInterval(async () => {
    if (document.visibilityState === 'visible') {
      try {
        const [resumoRes, sensoresRes, dashResumoRes] = await Promise.allSettled([
          api.getAnalistaSensoresResumo(),
          api.getSensores(),
          api.getDashboardResumo()
        ]);
        if (resumoRes.status === 'fulfilled' && resumoRes.value) sensoresState.resumo = resumoRes.value;
        if (sensoresRes.status === 'fulfilled' && sensoresRes.value) sensoresState.sensores = extrairArraySeguro(sensoresRes.value);
        if (dashResumoRes.status === 'fulfilled' && dashResumoRes.value) sensoresState.dashResumo = dashResumoRes.value;

        const kpisCont = document.getElementById('sensores-kpis-container');
        if (kpisCont) {
          kpisCont.innerHTML = renderTopKpisHtml();
          if (window.lucide) window.lucide.createIcons();
        }
      } catch (err) {
        console.warn('[Sensores Auto-refresh] Falha silenciosa:', err);
      }
    }
  }, 60000);

  // Limpa o timer ao sair da view
  const cleanup = () => {
    if (sensoresState.intervalId) {
      clearInterval(sensoresState.intervalId);
      sensoresState.intervalId = null;
    }
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}
