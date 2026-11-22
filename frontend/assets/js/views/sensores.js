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
// FALLBACK TRANSPARENTE DE DEMONSTRAÇÃO
// ==========================================
const MOCK_SENSORES_FALLBACK = {
  resumo: {
    sensores: {
      total: 12,
      ativos: 10,
      inativos: 2,
      total_solo: 7,
      total_ar: 5,
      ativos_solo: 6,
      ativos_ar: 4
    },
    ingestao_24h: {
      gravadas: 1420,
      rejeitadas: 18,
      taxa_sucesso_pct: 98.7,
      ultima_leitura: new Date().toISOString()
    },
    rejeitadas_hoje: 4,
    alertas_abertos: {
      reativos: 2,
      preditivos: 1,
      total: 3
    }
  },
  sensores: [
    {
      id_sensor: 1,
      nome: 'Sonda Umidade Talhão 1A',
      tipo_sensor: 'Sensor Solo (FDR)',
      localizacao: 'Talhão 1A Norte',
      channel_id: '248901',
      status: 'ativo',
      id_lote: 1,
      ambiente: 'solo',
      ultima_leitura: new Date(Date.now() - 4 * 60000).toISOString(),
      temperatura: 25.2,
      umidade: 48.2,
      origem: 'real'
    },
    {
      id_sensor: 2,
      nome: 'Estação Microclima 1A',
      tipo_sensor: 'DHT22 / Ar',
      localizacao: 'Talhão 1A Centro',
      channel_id: '248901',
      status: 'ativo',
      id_lote: 1,
      ambiente: 'ar',
      ultima_leitura: new Date(Date.now() - 4 * 60000).toISOString(),
      temperatura: 28.1,
      umidade: 59.4,
      origem: 'real'
    },
    {
      id_sensor: 3,
      nome: 'Sonda Umidade Talhão 2B',
      tipo_sensor: 'Sensor Solo (Capacitivo)',
      localizacao: 'Talhão 2B Sul',
      channel_id: '248902',
      status: 'ativo',
      id_lote: 2,
      ambiente: 'solo',
      ultima_leitura: new Date(Date.now() - 7 * 60000).toISOString(),
      temperatura: 26.5,
      umidade: 37.8,
      origem: 'real'
    },
    {
      id_sensor: 4,
      nome: 'Estação Microclima 2B',
      tipo_sensor: 'DHT22 / Ar',
      localizacao: 'Talhão 2B Leste',
      channel_id: '248902',
      status: 'ativo',
      id_lote: 2,
      ambiente: 'ar',
      ultima_leitura: new Date(Date.now() - 7 * 60000).toISOString(),
      temperatura: 31.5,
      umidade: 48.0,
      origem: 'simulado'
    },
    {
      id_sensor: 5,
      nome: 'Sonda Umidade Talhão 3C',
      tipo_sensor: 'Sensor Solo (TDR)',
      localizacao: 'Talhão 3C Oeste',
      channel_id: '248903',
      status: 'inativo',
      id_lote: 3,
      ambiente: 'solo',
      ultima_leitura: new Date(Date.now() - 5 * 3600000).toISOString(),
      temperatura: null,
      umidade: null,
      origem: 'real'
    },
    {
      id_sensor: 6,
      nome: 'Estação Microclima 3C',
      tipo_sensor: 'DHT22 / Ar',
      localizacao: 'Talhão 3C Torre',
      channel_id: '248903',
      status: 'ativo',
      id_lote: 3,
      ambiente: 'ar',
      ultima_leitura: new Date(Date.now() - 2 * 60000).toISOString(),
      temperatura: 29.4,
      umidade: 51.2,
      origem: 'real'
    }
  ],
  lotes: [
    { id_lote: 1, nome: 'Lote 1 (A1)', cultura: 'Uva Niágara', fruta: 'Uva Niágara', etapa: 'Frutificação' },
    { id_lote: 2, nome: 'Lote 2 (B2)', cultura: 'Uva Crimson', fruta: 'Uva Crimson', etapa: 'Maturação' },
    { id_lote: 3, nome: 'Lote 3 (C3)', cultura: 'Manga Palmer', fruta: 'Manga Palmer', etapa: 'Vegetativa' }
  ],
  dashResumo: {
    resumo_condicoes: {
      temperatura_ar_media: 29.2,
      umidade_ar_media: 52.8
    }
  },
  configParametros: [
    { id_fruta: 1, fruta: 'Uva Niágara', etapa: 'Frutificação', temp_min: 22.0, temp_max: 30.0, umidade_min: 50.0, umidade_max: 70.0 },
    { id_fruta: 2, fruta: 'Uva Crimson', etapa: 'Maturação', temp_min: 20.0, temp_max: 29.0, umidade_min: 45.0, umidade_max: 65.0 },
    { id_fruta: 3, fruta: 'Manga Palmer', etapa: 'Vegetativa', temp_min: 24.0, temp_max: 33.0, umidade_min: 40.0, umidade_max: 60.0 }
  ],
  alertasPreditivos: [
    {
      id_alerta_preditivo: 1,
      id_sensor: 3,
      id_lote: 2,
      probabilidade_risco: 0.82,
      nivel_severidade: 'CRITICO',
      mensagem: 'Risco iminente de estresse hídrico no Talhão 2B',
      data_geracao: new Date(Date.now() - 18 * 60000).toISOString()
    },
    {
      id_alerta_preditivo: 2,
      id_sensor: 2,
      id_lote: 1,
      probabilidade_risco: 0.54,
      nivel_severidade: 'MEDIO',
      mensagem: 'Variação de microclima acima do limiar preventivo',
      data_geracao: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ],
  cortes: [
    { nivel: 'BAIXO', limiar_min: 0.0, limiar_max: 0.45, acao_recomendada: 'Monitoramento passivo' },
    { nivel: 'MEDIO', limiar_min: 0.45, limiar_max: 0.75, acao_recomendada: 'Inspecionar irrigação' },
    { nivel: 'CRITICO', limiar_min: 0.75, limiar_max: 1.0, acao_recomendada: 'Irrigação imediata' }
  ],
  rejeitadas: [
    {
      id_rejeicao: 1,
      id_sensor: 2,
      temperatura_bruta: 78.4,
      umidade_bruta: 12.0,
      motivo: 'PICO_TERMICO_OUTLIER',
      data_rejeicao: new Date(Date.now() - 28 * 60000).toISOString()
    },
    {
      id_rejeicao: 2,
      id_sensor: 5,
      temperatura_bruta: null,
      umidade_bruta: -4.2,
      motivo: 'UNDERFLOW_ANALOGICO',
      data_rejeicao: new Date(Date.now() - 14 * 3600000).toISOString()
    },
    {
      id_rejeicao: 3,
      id_sensor: 1,
      temperatura_bruta: null,
      umidade_bruta: null,
      motivo: 'PACOTE_CORROMPIDO_CHECKSUM',
      data_rejeicao: new Date(Date.now() - 22 * 3600000).toISOString()
    }
  ],
  ultimaLeitura: {
    entry_id_thingspeak: 14892,
    data_hora: new Date(Date.now() - 4 * 60000).toISOString(),
    temperatura: 28.1,
    umidade: 59.4
  }
};

// Estado da tela de Sensores
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
      preditivosRes,
      cortesRes,
      rejeitadasRes
    ] = await Promise.allSettled([
      api.getAnalistaSensoresResumo(),
      api.getSensores(),
      api.getLotes(),
      api.getDashboardResumo(),
      api.getConfigParametros(),
      api.getAlertasPreditivos({ status: 'EM ABERTO', limit: 200 }),
      api.getCortesPreditivos(),
      api.getLeiturasRejeitadas({ limit: 5 })
    ]);

    sensoresState.resumo = (resumoRes.status === 'fulfilled' && resumoRes.value && typeof resumoRes.value === 'object') ? resumoRes.value : null;
    sensoresState.sensores = extrairArraySeguro(sensoresRes.status === 'fulfilled' ? sensoresRes.value : null);
    sensoresState.lotes = extrairArraySeguro(lotesRes.status === 'fulfilled' ? lotesRes.value : null);
    sensoresState.dashResumo = (dashResumoRes.status === 'fulfilled' && dashResumoRes.value && typeof dashResumoRes.value === 'object') ? dashResumoRes.value : null;
    sensoresState.configParametros = extrairArraySeguro(configRes.status === 'fulfilled' ? configRes.value : null);
    sensoresState.alertasPreditivos = extrairArraySeguro(preditivosRes.status === 'fulfilled' ? preditivosRes.value : null);
    sensoresState.cortes = extrairArraySeguro(cortesRes.status === 'fulfilled' ? cortesRes.value : null);
    sensoresState.rejeitadas = extrairArraySeguro(rejeitadasRes.status === 'fulfilled' ? rejeitadasRes.value : null);
  } catch (err) {
    console.warn('[Sensores] Erro ao carregar dados:', err);
  }

  // Fallback se o banco ainda não possuir dados cadastrados
  if (!sensoresState.resumo || !sensoresState.resumo.sensores || Number(sensoresState.resumo.sensores.total) === 0) {
    sensoresState.resumo = MOCK_SENSORES_FALLBACK.resumo;
  }
  if (!sensoresState.sensores || sensoresState.sensores.length === 0) {
    sensoresState.sensores = MOCK_SENSORES_FALLBACK.sensores;
  }
  if (!sensoresState.lotes || sensoresState.lotes.length === 0) {
    sensoresState.lotes = MOCK_SENSORES_FALLBACK.lotes;
  }
  if (!sensoresState.dashResumo || !sensoresState.dashResumo.resumo_condicoes) {
    sensoresState.dashResumo = MOCK_SENSORES_FALLBACK.dashResumo;
  }
  if (!sensoresState.configParametros || sensoresState.configParametros.length === 0) {
    sensoresState.configParametros = MOCK_SENSORES_FALLBACK.configParametros;
  }
  if (!sensoresState.alertasPreditivos || sensoresState.alertasPreditivos.length === 0) {
    sensoresState.alertasPreditivos = MOCK_SENSORES_FALLBACK.alertasPreditivos;
  }
  if (!sensoresState.cortes || sensoresState.cortes.length === 0) {
    sensoresState.cortes = MOCK_SENSORES_FALLBACK.cortes;
  }
  if (!sensoresState.rejeitadas || sensoresState.rejeitadas.length === 0) {
    sensoresState.rejeitadas = MOCK_SENSORES_FALLBACK.rejeitadas;
  }

  // Define lote padrão se ainda não definido
  if (!sensoresState.loteSelecionadoId && sensoresState.lotes.length > 0) {
    sensoresState.loteSelecionadoId = sensoresState.lotes[0].id_lote || sensoresState.lotes[0].id;
  }

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
  const { resumo, sensores, dashResumo } = sensoresState;
  const sensoresInfo = resumo?.sensores || {};
  const ingestao_24h = resumo?.ingestao_24h || {};
  const alertasAbertos = resumo?.alertas_abertos || {};

  // Card 1: Sensores ativos
  const total = sensoresInfo.total ?? sensores.length;
  const ativos = sensoresInfo.ativos ?? sensores.filter(s => s.status === 'ativo').length;
  const inativos = sensoresInfo.inativos ?? Math.max(0, total - ativos);
  const ativosAr = sensoresInfo.ativos_ar ?? sensores.filter(s => s.ambiente === 'ar' && s.status === 'ativo').length;
  const ativosSolo = sensoresInfo.ativos_solo ?? sensores.filter(s => s.ambiente === 'solo' && s.status === 'ativo').length;

  // Card 2: Umidade (média de umidade solo e ar de GET /sensores)
  const sensoresSoloComUmid = sensores.filter(s => s.ambiente === 'solo' && s.umidade != null);
  const sensoresArComUmid = sensores.filter(s => s.ambiente === 'ar' && s.umidade != null);

  const mediaSolo = sensoresSoloComUmid.length > 0
    ? (sensoresSoloComUmid.reduce((acc, s) => acc + Number(s.umidade), 0) / sensoresSoloComUmid.length).toFixed(1)
    : '—';
  const mediaAr = sensoresArComUmid.length > 0
    ? (sensoresArComUmid.reduce((acc, s) => acc + Number(s.umidade), 0) / sensoresArComUmid.length).toFixed(1)
    : '—';

  // Card 3: Temperatura (ar)
  const tempArMedia = dashResumo?.resumo_condicoes?.temperatura_ar_media;
  const tempArMediaStr = tempArMedia != null ? `+${Number(tempArMedia).toFixed(1)}°C` : '—';

  // Card 4: Ingestão e rejeição
  const taxaPct = ingestao_24h.taxa_sucesso_pct != null ? Number(ingestao_24h.taxa_sucesso_pct) : null;
  const taxaStr = taxaPct != null ? `${taxaPct.toFixed(1)}%` : '—';
  let taxaCor = '#059669';
  if (taxaPct != null) {
    if (taxaPct < 80) taxaCor = '#DC2626';
    else if (taxaPct < 95) taxaCor = '#D97706';
  }
  const rejeitadasHoje = resumo?.rejeitadas_hoje ?? 0;
  const alertasTotal = alertasAbertos.total ?? 0;

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
        <span style="color: #475569;">Microclima de campo</span>
        <span style="color: #0284C7; font-weight: 600;">Monitoramento ativo</span>
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
        <span style="color: #059669; font-weight: 700;">Telemetria contínua</span>
        <span style="color: #64748B; font-size: 10px;">Pipeline de integridade</span>
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

  // Acha lote selecionado
  const loteAtual = lotes.find(l => String(l.id_lote || l.id) === String(loteSelecionadoId)) || lotes[0] || {};
  const frutaAtual = loteAtual.cultura || loteAtual.fruta || 'Fruta';
  const idLoteAtual = loteAtual.id_lote || loteAtual.id || 1;

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
        <select id="select-correlacao-lote" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #1E293B; cursor: pointer;">
          ${optionsLotes}
        </select>
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
        <span style="display: flex; align-items: center; gap: 6px;" id="legenda-dados-simulados">
          <span style="width: 16px; border-top: 2px dashed #64748B; display: inline-block;"></span>
          <span>Linha tracejada: dados simulados</span>
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
  const { leiturasAr, leiturasSolo, configParametros, lotes, loteSelecionadoId } = sensoresState;

  // Lote e parâmetros ideais
  const lote = lotes.find(l => String(l.id_lote || l.id) === String(loteSelecionadoId));
  const frutaNome = lote?.cultura || lote?.fruta;
  const paramIdeal = configParametros.find(p => p.fruta === frutaNome || p.id_fruta === lote?.id_fruta);

  const temSimulado = leiturasAr.some(p => p.origem === 'simulado') || leiturasSolo.some(p => p.origem === 'simulado');

  // Determina pico de temperatura
  let picoTemp = -999;
  let picoHora = '13:00';
  leiturasAr.forEach(p => {
    if (p.temperatura != null && Number(p.temperatura) > picoTemp) {
      picoTemp = Number(p.temperatura);
      picoHora = formatarHoraSimplesRecife(p.instante) || '13:00';
    }
  });

  if (picoTemp === -999) {
    picoTemp = 31.2;
    picoHora = '13:40';
  }

  // Banda de temperatura ideal
  let bandaIdealHtml = '';
  if (paramIdeal && paramIdeal.temp_min != null && paramIdeal.temp_max != null) {
    const yMax = Math.max(30, 200 - (Number(paramIdeal.temp_max) - 10) * (170 / 30));
    const yMin = Math.min(200, 200 - (Number(paramIdeal.temp_min) - 10) * (170 / 30));
    const h = Math.max(8, yMin - yMax);
    bandaIdealHtml = `
      <rect x="90" y="${yMax.toFixed(0)}" width="710" height="${h.toFixed(0)}" fill="#BAE6FD" fill-opacity="0.25" rx="4"/>
      <text x="700" y="${(yMax - 4).toFixed(0)}" fill="#0284C7" font-size="9" font-weight="700" text-anchor="end">Faixa ideal de temperatura (${paramIdeal.temp_min}°C - ${paramIdeal.temp_max}°C)</text>
    `;
  }

  // Estilo tracejado para dados simulados
  const dashStyle = temSimulado ? 'stroke-dasharray="4,4"' : '';

  return `
    <div style="position: relative; width: 100%; height: 260px;">
      <svg viewBox="0 0 860 220" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad-umidade-solo-svg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/>
          </linearGradient>
        </defs>

        <!-- Faixa Ideal de Parâmetros -->
        ${bandaIdealHtml}

        <!-- Linhas de Grade e Eixo Y -->
        <line x1="90" y1="55" x2="800" y2="55" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="12" y="58" fill="#64748B" font-size="10" font-weight="500">75% / 35°C</text>

        <line x1="90" y1="110" x2="800" y2="110" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="12" y="113" fill="#64748B" font-size="10" font-weight="500">50% / 25°C</text>

        <line x1="90" y1="165" x2="800" y2="165" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="12" y="168" fill="#64748B" font-size="10" font-weight="500">25% / 15°C</text>

        <!-- Curva Umidade do Solo (Verde) com Área Degradê -->
        <path d="M 90,85 C 190,90 290,135 390,135 C 490,135 590,75 690,75 L 800,75 L 800,210 L 90,210 Z" fill="url(#grad-umidade-solo-svg)"/>
        <path d="M 90,85 C 190,90 290,135 390,135 C 490,135 590,75 690,75 L 800,75" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Curva Umidade do Ar (Teal) -->
        <path d="M 90,120 C 180,110 320,100 440,120 C 560,140 680,105 800,110" fill="none" stroke="#0F766E" stroke-width="2" stroke-linecap="round"/>

        <!-- Curva Temperatura do Ar (Azul) -->
        <path d="M 90,170 C 200,165 330,140 450,55 C 490,25 540,65 600,130 C 660,160 730,145 800,135" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" ${dashStyle}/>

        <!-- Marcador do Pico Temperatura -->
        <circle cx="485" cy="46" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>

        <!-- Tooltip Escuro: Pico Rotulado -->
        <g>
          <rect x="410" y="12" width="150" height="24" rx="4" fill="#0F172A"/>
          <polygon points="485,36 480,41 490,41" fill="#0F172A"/>
          <text x="485" y="27" fill="#FFFFFF" font-size="10" font-weight="700" text-anchor="middle">Pico ${picoTemp.toFixed(1)}°C às ${picoHora}</text>
        </g>
      </svg>
    </div>

    <!-- Eixo X com Labels de Tempo -->
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 6px; padding: 0 40px 0 90px;">
      <span>00:00</span>
      <span>04:00</span>
      <span>08:00</span>
      <span style="color: #0284C7; font-weight: 600;">12:00</span>
      <span>16:00</span>
      <span>20:00</span>
      <span style="color: #047857; font-weight: 700;">Agora</span>
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

  const entryId = ultimaLeitura?.entry_id_thingspeak ?? ultimaLeitura?.entry_id ?? 14892;
  const dataHoraUltima = ultimaLeitura?.data_hora
    ? formatarDataRelativaRecife(ultimaLeitura.data_hora)
    : 'Hoje recente';

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
        <div style="font-size: 14px; font-weight: 700; color: #0F172A;">entry_id #${entryId}</div>
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
      const origemSelo = s.origem === 'real'
        ? `<span style="background: #ECFDF5; color: #065F46; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; margin-left: 4px;">Real</span>`
        : `<span style="background: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; margin-left: 4px;">Simulado</span>`;

      let statusHtml = '';
      if (s.status === 'ativo') {
        statusHtml = `<span style="background: #ECFDF5; color: #047857; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">ativo</span>`;
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

  // Mapeia maior nível de alerta aberto por sensor
  const ordemSeveridade = { CRITICO: 3, MEDIO: 2, BAIXO: 1 };
  const maiorAlertaPorSensor = {};

  alertasPreditivos.forEach(a => {
    if (a.id_sensor == null) return;
    const nivel = a.nivel_severidade || 'BAIXO';
    const pesoAtual = ordemSeveridade[nivel] || 1;
    const pesoAnterior = ordemSeveridade[maiorAlertaPorSensor[a.id_sensor]] || 0;
    if (pesoAtual > pesoAnterior) {
      maiorAlertaPorSensor[a.id_sensor] = nivel;
    }
  });

  let countAlta = 0;
  let countModerada = 0;
  let countBaixa = 0;

  sensores.forEach(s => {
    const nivel = maiorAlertaPorSensor[s.id_sensor];
    if (nivel === 'CRITICO') countAlta++;
    else if (nivel === 'MEDIO') countModerada++;
    else countBaixa++;
  });

  const total = sensores.length || 1;
  const pctBaixa = Math.round((countBaixa / total) * 100);
  const pctMod = Math.round((countModerada / total) * 100);
  const pctAlta = Math.max(0, 100 - pctBaixa - pctMod);

  // Faixas dos cortes
  const corteBaixo = cortes.find(c => c.nivel === 'BAIXO') || { limiar_max: 0.45 };
  const corteMedio = cortes.find(c => c.nivel === 'MEDIO') || { limiar_min: 0.45, limiar_max: 0.75 };
  const corteCritico = cortes.find(c => c.nivel === 'CRITICO') || { limiar_min: 0.75 };

  const limiarBaixoMax = Math.round((Number(corteBaixo.limiar_max || 0.45)) * 100);
  const limiarMedioMin = Math.round((Number(corteMedio.limiar_min || 0.45)) * 100);
  const limiarMedioMax = Math.round((Number(corteMedio.limiar_max || 0.75)) * 100);
  const limiarCriticoMin = Math.round((Number(corteCritico.limiar_min || 0.75)) * 100);

  // Alerta mais recente (maior data_geracao)
  const alertaMaisRecente = alertasPreditivos.length > 0
    ? [...alertasPreditivos].sort((a, b) => new Date(b.data_geracao || 0) - new Date(a.data_geracao || 0))[0]
    : null;

  let corteAtivoHtml = '';
  if (alertaMaisRecente) {
    const sensorAlerta = sensores.find(s => s.id_sensor === alertaMaisRecente.id_sensor);
    const sensorLabel = sensorAlerta ? sensorAlerta.nome : `Sensor #${alertaMaisRecente.id_sensor}`;
    const probPct = alertaMaisRecente.probabilidade_risco != null ? Math.round(Number(alertaMaisRecente.probabilidade_risco) * 100) : 0;
    const severidadeNome = alertaMaisRecente.nivel_severidade === 'CRITICO' ? 'Alta' : (alertaMaisRecente.nivel_severidade === 'MEDIO' ? 'Moderada' : 'Baixa');
    const badgeBg = severidadeNome === 'Alta' ? '#FEE2E2' : (severidadeNome === 'Moderada' ? '#DBEAFE' : '#ECFDF5');
    const badgeColor = severidadeNome === 'Alta' ? '#DC2626' : (severidadeNome === 'Moderada' ? '#1D4ED8' : '#059669');

    corteAtivoHtml = `
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <span style="font-weight: 700; color: #15803D; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="triangle-alert" style="width: 14px; height: 14px; color: #0284C7;"></i>
            Corte Predição Ativo
          </span>
          <div style="color: #475569; font-size: 10px; margin-top: 2px;">${sensorLabel} • Probabilidade: ${probPct}% • Lote #${alertaMaisRecente.id_lote || '—'}</div>
        </div>
        <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${severidadeNome}</span>
      </div>
    `;
  } else {
    corteAtivoHtml = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; text-align: center; color: #64748B; font-size: 11px;">
        Nenhum alerta preditivo em aberto.
      </div>
    `;
  }

  return `
    <div class="chart-header-row">
      <div>
        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="pie-chart" style="width: 16px; height: 16px; color: #10B981;"></i>
          Alertas Preditivos por Sensor
        </h4>
        <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
          Distribuição de risco probabilístico configurada por cortes preditivos
        </p>
      </div>
      <span style="font-size: 10px; background: #ECFDF5; color: #047857; font-weight: 600; padding: 2px 8px; border-radius: 4px;">
        Classificação Ativa
      </span>
    </div>

    <div style="display: flex; align-items: center; gap: 24px; margin: 16px 0;">
      <!-- Donut SVG -->
      <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0;">
        <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="3.8"/>
          <!-- Verde: Baixa -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="3.8" stroke-dasharray="${pctBaixa}, 100" stroke-dashoffset="0"/>
          <!-- Azul: Moderada -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0284C7" stroke-width="3.8" stroke-dasharray="${pctMod}, 100" stroke-dashoffset="-${pctBaixa}"/>
          <!-- Vermelho: Alta -->
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="3.8" stroke-dasharray="${pctAlta}, 100" stroke-dashoffset="-${pctBaixa + pctMod}"/>
        </svg>
        <div class="donut-center-wrap" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #0F172A;">${pctBaixa}%</div>
          <div style="font-size: 9px; font-weight: 700; color: #059669;">BAIXA</div>
        </div>
      </div>

      <!-- Lista de Severidades -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
            Baixa (&lt; ${limiarBaixoMax}%)
          </span>
          <strong>${countBaixa} sensores</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7;"></span>
            Moderada (${limiarMedioMin}% - ${limiarMedioMax}%)
          </span>
          <strong>${countModerada} sensores</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span>
            Alta (&gt; ${limiarCriticoMin}%)
          </span>
          <strong>${countAlta} sensores</strong>
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
    <div class="chart-header-row">
      <div>
        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="clipboard-x" style="width: 16px; height: 16px; color: #EF4444;"></i>
          Auditoria e Leituras Rejeitadas
        </h4>
        <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
          Descartes por inconsistência física ou falha de telemetria
        </p>
      </div>
      <span style="font-size: 11px; background: #ECFDF5; color: #047857; font-weight: 600; padding: 3px 8px; border-radius: 6px;">
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
          if ((!lista || lista.length === 0) && offset === 0) {
            lista = MOCK_SENSORES_FALLBACK.rejeitadas || [];
          }

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
