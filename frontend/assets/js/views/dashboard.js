import { liveTelemetry } from '../live-telemetry.js';
import { dashboardStream } from '../dashboard-stream.js';
/**
 * VIEW: DASHBOARD PRINCIPAL - COM SUPORTE AOS MODOS RESUMIDO E DETALHADO DO FIGMA
 * E SUPORTE COMPLETO AO PERFIL ANALISTA (LUIZ FELIPE)
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';
import {
  calcularStatusColeta,
  contarSensoresAtivosReais,
  resumirAlertasAnalista,
  formatarDataHoraRecife
} from '../utils/analista-metrics.js';

// Sonda de solo instalada: sensor 3 (origem 'thingspeak-solo'), lida exclusivamente via GET /sensores/3/leituras
const SONDA_SOLO_INSTALADA = true;
const SENSOR_SOLO_ID = 3;

function extrairSerieUmidadeSolo(resLeituras) {
  const pontos = Array.isArray(resLeituras?.pontos)
    ? resLeituras.pontos
    : (Array.isArray(resLeituras) ? resLeituras : []);
  return pontos
    .filter(p => p && p.umidade_solo !== null && p.umidade_solo !== undefined && !Number.isNaN(Number(p.umidade_solo)))
    .map(p => Number(p.umidade_solo));
}
const LIMITE_LEITURA_RECENTE_MIN = 30;
const MAPA_PROPRIEDADE_LAT = -9.3300;   // editar aqui
const MAPA_PROPRIEDADE_LNG = -40.6000;  // editar aqui
const MAPA_PROPRIEDADE_ZOOM = 16;       // editar aqui

function temValor(v) {
  return v !== null && v !== undefined && !Number.isNaN(Number(v));
}

let chartInstances = [];
let dadosGraficosCache = null;
let sseConnection = null;
let ultimaLeituraTimestamp = null;
let resumoCache = null;

function isLeituraRecente30m(ts) {
  if (!ts) return false;
  const diffMs = Date.now() - new Date(ts).getTime();
  return !isNaN(diffMs) && diffMs >= 0 && diffMs < LIMITE_LEITURA_RECENTE_MIN * 60 * 1000;
}

function verificarLeiturasNoPeriodo(periodo) {
  const ts = ultimaLeituraTimestamp || dashboardStream?.lastPayload?.timestamp;
  if (!ts) {
    if (periodo === '24h') {
      return (resumoCache?.resumo_condicoes?.n_leituras_ar ?? 0) > 0;
    }
    return false;
  }
  const diffMs = Date.now() - new Date(ts).getTime();
  if (isNaN(diffMs) || diffMs < 0) return false;
  const diffHoras = diffMs / (1000 * 60 * 60);

  if (periodo === '24h') return diffHoras <= 24;
  if (periodo === '7d') return diffHoras <= 7 * 24;
  if (periodo === '30d') return diffHoras <= 30 * 24;
  return false;
}

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E SSE
// ==========================================

function formatarTimestampRecife(isoTimestamp) {
  if (!isoTimestamp) return '';
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

function formatarDataRecife(iso) { return formatarTimestampRecife(iso); }

function formatarHoraSimplesRecife(isoTimestamp) {
  if (!isoTimestamp) return '';
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return '';
  }
}

function parseDateBr(isoStr) {
  if (!isoStr) return null;
  const m = String(isoStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { iso: `${m[1]}-${m[2]}-${m[3]}`, br: `${m[3]}/${m[2]}`, y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) } : null;
}

function formatarTempoDecorrido(isoTimestamp) {
  if (!isoTimestamp) return 'Sem dados de leitura';
  const d = new Date(isoTimestamp);
  const ms = d.getTime();
  if (isNaN(ms)) return 'Sem dados de leitura';
  const diffMs = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `há ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

function _pulseElement(el) {
  if (!el) return;
  el.classList.remove('live-pulse-breath');
  void el.offsetWidth;
  el.classList.add('live-pulse-breath');
}

function atualizarDashboardComSSE(data) {
  if (!data) return;

  if (data.timestamp) {
    ultimaLeituraTimestamp = data.timestamp;
  }

  const tempNum = Number(data.temperatura);
  const umidNum = Number(data.umidade);
  const tempStr = !isNaN(tempNum) ? `${tempNum.toFixed(1)}°C` : '—';
  const tempIntStr = !isNaN(tempNum) ? `${Math.round(tempNum)}°C` : '—';
  const umidStr = !isNaN(umidNum) ? `${Math.round(umidNum)}%` : '—';

  // 3. Selo de origem real do sensor
  // Exibir "Sensor Real" apenas se a leitura for recente (<30 min) e houver dados
  const now = new Date();
  const ts = new Date(data.timestamp);
  const isRecent = !isNaN(ts) && (now - ts) < 30 * 60 * 1000;
  const isSemDados = data.status === 'sem_dados' || !isRecent;
  const seloTexto = isSemDados ? 'Sem dados' : 'Sensor Real';
  const seloClasseRemover = isSemDados ? 'pill-green' : 'pill-blue';
  const seloClasseAdicionar = isSemDados ? 'pill-blue' : 'pill-green';

  document.querySelectorAll('#sse-origem-badge, #sse-origem-badge-detalhado, .sse-origem-badge').forEach(badge => {
    badge.textContent = seloTexto;
    badge.classList.remove(seloClasseRemover);
    badge.classList.add(seloClasseAdicionar);
  });

  // 1 & 2. Atualizar Temperatura e Umidade na tela (SOMENTE SE RECENTE; se offline, mostra 'Sem dados')
  const elPillTemp = document.getElementById('miniChart4-pill');
  const elPillUmid = document.getElementById('miniChart1-pill');
  const elPillSolo = document.getElementById('miniChart2-pill');

  if (isRecent) {
    if (elPillTemp && !isNaN(tempNum)) {
      elPillTemp.textContent = `${tempNum.toFixed(1)}°C Ideal`;
      _pulseElement(elPillTemp);
    }
    if (elPillUmid && !isNaN(umidNum)) {
      elPillUmid.textContent = `${Math.round(umidNum)}%`;
      _pulseElement(elPillUmid);
    }
    const elTempDetalhado = document.getElementById('sse-detalhado-temp') || document.querySelector('[data-live="temp-ar"]');
    if (elTempDetalhado) {
      elTempDetalhado.textContent = tempStr;
      _pulseElement(elTempDetalhado);
    }
    document.querySelectorAll('[data-kpi="temp-ar"], #kpi-temp-ar').forEach(el => {
      el.textContent = tempStr;
      _pulseElement(el);
    });
    const elUmidDetalhado = document.getElementById('sse-detalhado-umid');
    if (elUmidDetalhado) {
      elUmidDetalhado.textContent = umidStr;
      _pulseElement(elUmidDetalhado);
    }
    const elUmidBar = document.getElementById('sse-detalhado-umid-bar') || document.querySelector('.progress-bar-umid');
    if (elUmidBar && !isNaN(umidNum)) {
      elUmidBar.style.width = `${Math.min(100, Math.max(0, umidNum))}%`;
    }
  } else {
    // Se não há leitura recente (<30min), mantém os gráficos 24h caso haja dados reais em cache
    const cacheAtual = dadosGraficosCache || {};
    const temUmidCache = Array.isArray(cacheAtual.umidade_ar_24h) && cacheAtual.umidade_ar_24h.length > 0;
    const temTempCache = Array.isArray(cacheAtual.temp_ar_24h) && cacheAtual.temp_ar_24h.length > 0;
    const temSoloCache = Array.isArray(cacheAtual.umidade_solo_24h) && cacheAtual.umidade_solo_24h.length > 0;

    if (elPillTemp && !temTempCache) {
      elPillTemp.textContent = 'Sem dados';
      elPillTemp.classList.remove('pill-green');
      elPillTemp.classList.add('pill-blue');
    }
    if (elPillUmid && !temUmidCache) {
      elPillUmid.textContent = 'Sem dados';
      elPillUmid.classList.remove('pill-green');
      elPillUmid.classList.add('pill-blue');
    }
    if (SONDA_SOLO_INSTALADA && elPillSolo && !temSoloCache) {
      elPillSolo.textContent = 'Sem dados';
      elPillSolo.classList.remove('pill-green');
      elPillSolo.classList.add('pill-blue');
    }
    if (!temUmidCache) {
      criarMiniGraficoApple('miniChart1', [], '#10B981', 'Sem leituras no período');
    }
    if (SONDA_SOLO_INSTALADA && !temSoloCache) {
      criarMiniGraficoApple('miniChart2', [], '#0D9488', 'Sem dados no período');
    }
    if (!temTempCache) {
      criarMiniGraficoApple('miniChart4', [], '#16A34A', 'Sem leituras no período');
    }
  }

  // 4. Horário da última leitura em pt-BR (America/Recife) - SEMPRE MANTÉM DATA E HORA REAIS DA ÚLTIMA LEITURA
  const horaFormatadaRecife = formatarTimestampRecife(data.timestamp);
  document.querySelectorAll('#sse-horario-leitura, #sse-horario-leitura-detalhado, .sse-horario-leitura').forEach(el => {
    el.textContent = horaFormatadaRecife ? `Última leitura: ${horaFormatadaRecife}` : '—';
  });

  // Atualiza card "Condição Geral" com dados reais do sensor de ar
  const elCondPill = document.getElementById('condicao-status-pill');
  if (elCondPill) {
    if (isRecent) {
      elCondPill.textContent = 'Leitura recente';
      elCondPill.className = 'card-status-pill pill-green';
      elCondPill.removeAttribute('style');
    } else {
      elCondPill.textContent = 'Sem leituras recentes';
      elCondPill.className = 'card-status-pill';
      elCondPill.setAttribute('style', 'background: #F1F5F9; border: 1px solid #CBD5E1; color: #64748B;');
    }
  }
  const elCondTemp = document.getElementById('condicao-temp-ar');
  if (elCondTemp && !isNaN(tempNum)) {
    elCondTemp.textContent = `${tempNum.toFixed(1).replace('.', ',')} °C`;
  }
  const elCondUmid = document.getElementById('condicao-umid-ar');
  if (elCondUmid && !isNaN(umidNum)) {
    elCondUmid.textContent = `${Math.round(umidNum)}%`;
  }
  const elCondUlt = document.getElementById('condicao-ultima-leitura');
  if (elCondUlt) {
    elCondUlt.textContent = horaFormatadaRecife ? `Última leitura: ${horaFormatadaRecife}` : 'Última leitura: —';
  }
  const elCondDecorrido = document.getElementById('condicao-tempo-decorrido');
  if (elCondDecorrido) {
    elCondDecorrido.textContent = formatarTempoDecorrido(data.timestamp);
  }

  // 5. Adicionar nova leitura ao gráfico mantendo as últimas 30 leituras (apenas se recente)
  if (isRecent && !isSemDados && window.Chart && typeof window.Chart.getChart === 'function') {
    const horaLabel = formatarHoraSimplesRecife(data.timestamp);

    // miniChart4 = Temperatura do Ar
    const chartTemp = window.Chart.getChart('miniChart4');
    if (chartTemp && chartTemp.data && chartTemp.data.datasets && chartTemp.data.datasets[0] && !isNaN(tempNum)) {
      chartTemp.data.labels.push(horaLabel);
      chartTemp.data.datasets[0].data.push(tempNum);
      while (chartTemp.data.datasets[0].data.length > 30) {
        chartTemp.data.datasets[0].data.shift();
        chartTemp.data.labels.shift();
      }
      chartTemp.update('none');
    }

    // miniChart1 = Umidade do Ar
    const chartUmid = window.Chart.getChart('miniChart1');
    if (chartUmid && chartUmid.data && chartUmid.data.datasets && chartUmid.data.datasets[0] && !isNaN(umidNum)) {
      chartUmid.data.labels.push(horaLabel);
      chartUmid.data.datasets[0].data.push(umidNum);
      while (chartUmid.data.datasets[0].data.length > 30) {
        chartUmid.data.datasets[0].data.shift();
        chartUmid.data.labels.shift();
      }
      chartUmid.update('none');
    }
  }
}

let unsubscribeDashboardSSE = null;

function iniciarSSEDashboard() {
  if (unsubscribeDashboardSSE) {
    unsubscribeDashboardSSE();
    unsubscribeDashboardSSE = null;
  }

  unsubscribeDashboardSSE = dashboardStream.subscribe((data) => {
    atualizarDashboardComSSE(data);
  });

  dashboardStream.start();

  // Encerra SSE no evento beforeunload
  window.addEventListener('beforeunload', () => {
    dashboardStream.stop();
  });

  // Encerra SSE se o usuário navegar para fora do dashboard no modo SPA
  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#/' && window.location.hash !== '#/dashboard') {
      dashboardStream.stop();
    }
  });
}

const DEFAULT_DADOS_GRAFICOS = {
  umidade_ar_24h: [],
  umidade_solo_24h: [],
  temp_solo_24h: [],
  temp_ar_24h: [],
  conformidade_geral_pct: null,
  saude_plantacao_pct: null,
  umidade_dossel_pct: null,
  temp_foliar_c: null,
  agua_reservatorio_pct: null,
  vazao_ldia: null
};

export async function renderDashboard() {
  const profileRole = auth.getActiveProfile();
  if (profileRole === 'admin') {
    return await renderAdminDashboard();
  }
  if (profileRole === 'analista') {
    return await renderAnalistaDashboard();
  }

  const isResumido = localStorage.getItem('DASHBOARD_MODE') === 'resumido';

  // Busca dados reais do PostgreSQL em paralelo (onda única, inclusive no modo detalhado)
  let resumo = null, clima = null, graficos = null, series24h = null, ultimaLeituraObj = null, lotesLista = null, solo24hRes = null;
  let extrasDetalhado = { irrigacao: null, sensores: null, mercado: null, janelas: null };
  try {
    const reqs = [
      api.getDashboardResumo(),
      api.getClimaAtual(),
      api.getDadosGraficos(),
      api.getSeries24h(),
      api.getUltimaLeitura(1),
      api.getLotes(),
      api.getSensorLeituras(SENSOR_SOLO_ID, '24h')
    ];
    if (!isResumido) {
      reqs.push(
        api.getPrevisoesIrrigacao(),
        api.getSensores(),
        api.request('/dados-mercado'),
        api.request('/previsoes/janela-colheita')
      );
    }
    const results = await Promise.allSettled(reqs);
    resumo = results[0].status === 'fulfilled' ? results[0].value : null;
    clima = results[1].status === 'fulfilled' ? results[1].value : null;
    graficos = results[2].status === 'fulfilled' ? results[2].value : null;
    series24h = results[3].status === 'fulfilled' ? results[3].value : null;
    ultimaLeituraObj = results[4].status === 'fulfilled' ? results[4].value : null;
    lotesLista = results[5].status === 'fulfilled' ? results[5].value : null;
    solo24hRes = results[6].status === 'fulfilled' ? results[6].value : null;
    if (!isResumido) {
      extrasDetalhado = {
        irrigacao: results[7]?.status === 'fulfilled' ? results[7].value : null,
        sensores: results[8]?.status === 'fulfilled' ? results[8].value : null,
        mercado: results[9]?.status === 'fulfilled' && Array.isArray(results[9].value) ? results[9].value : [],
        janelas: results[10]?.status === 'fulfilled' && Array.isArray(results[10].value) ? results[10].value : []
      };
    }
  } catch (e) {
    console.warn('Erro ao obter métricas online:', e);
  }

  resumoCache = resumo;
  if (ultimaLeituraObj?.data_hora && ultimaLeituraObj?.id_sensor !== 3) {
    ultimaLeituraTimestamp = ultimaLeituraObj.data_hora;
  }

  dadosGraficosCache = {
    ...DEFAULT_DADOS_GRAFICOS,
    ...(graficos || {}),
    ...(series24h || {}),
    // Fonte exclusiva do solo: sensor 3 via GET /sensores/3/leituras (sem fallback para series-24h)
    umidade_solo_24h: extrairSerieUmidadeSolo(solo24hRes)
  };
  if (series24h) {
    if (series24h.umidade_ar_24h) dadosGraficosCache.umidade_ar_24h = series24h.umidade_ar_24h;
    if (series24h.temp_ar_24h) dadosGraficosCache.temp_ar_24h = series24h.temp_ar_24h;
  }

  return `
    <div class="dashboard-canvas apple-animate-in">
      ${isResumido ? renderModoResumido(resumo, clima, dadosGraficosCache, ultimaLeituraTimestamp, ultimaLeituraObj, lotesLista) : renderModoDetalhado(resumo, clima, dadosGraficosCache, extrasDetalhado, lotesLista)}
    </div>
  `;
}

function extrairArraySeguro(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    if (Array.isArray(val.itens)) return val.itens;
    if (Array.isArray(val.items)) return val.items;
    if (Array.isArray(val.leituras)) return val.leituras;
    if (Array.isArray(val.rejeitadas)) return val.rejeitadas;
    if (Array.isArray(val.alertas)) return val.alertas;
    if (Array.isArray(val.cortes)) return val.cortes;
    if (Array.isArray(val.sensores)) return val.sensores;
    if (Array.isArray(val.data)) return val.data;
  }
  return [];
}


let analistaDashboardData = {
  resumo: null,
  topologia: null,
  dashResumo: null,
  rejeitadas: [],
  preditivos: [],
  cortes: []
};

/**
 * 0. DASHBOARD DO PERFIL ANALISTA (LUIZ FELIPE - VISÃO GERAL DO SISTEMA)
 * Integrado aos endpoints FastAPI:
 * - GET /analista/sensores/resumo
 * - GET /sensores/topologia
 * - GET /dashboard/resumo
 * - GET /leituras-rejeitadas?limit=5
 * - GET /alertas-preditivos?status=EM ABERTO&limit=20
 * - GET /alertas-preditivos/cortes
 */
async function renderAnalistaDashboard() {
  try {
    const [resumoRes, topologiaRes, dashResumoRes, rejeitadasRes, centralAlertasRes, cortesRes] = await Promise.allSettled([
      api.getAnalistaSensoresResumo(),
      api.getSensoresTopologia(),
      api.getDashboardResumo(),
      api.getLeiturasRejeitadas({ limit: 5 }),
      api.getCentralAlertas({ status: 'aberto' }),
      api.getCortesPreditivos()
    ]);

    const centralVal = centralAlertasRes.status === 'fulfilled' ? centralAlertasRes.value : null;
    const centralItens = Array.isArray(centralVal?.itens) ? centralVal.itens : extrairArraySeguro(centralVal);

    analistaDashboardData = {
      resumo: (resumoRes.status === 'fulfilled' && resumoRes.value && typeof resumoRes.value === 'object') ? resumoRes.value : null,
      topologia: (topologiaRes.status === 'fulfilled' && topologiaRes.value && typeof topologiaRes.value === 'object') ? topologiaRes.value : null,
      dashResumo: (dashResumoRes.status === 'fulfilled' && dashResumoRes.value && typeof dashResumoRes.value === 'object') ? dashResumoRes.value : null,
      rejeitadas: extrairArraySeguro(rejeitadasRes.status === 'fulfilled' ? rejeitadasRes.value : null),
      preditivos: centralItens,
      cortes: extrairArraySeguro(cortesRes.status === 'fulfilled' ? cortesRes.value : null)
    };
  } catch (err) {
    console.warn('Erro ao carregar dados do dashboard do analista:', err);
  }


  const { resumo, topologia, dashResumo, rejeitadas, preditivos, cortes } = analistaDashboardData;

  // A) 4 CARDS NO TOPO
  // 1. Saúde da Coleta
  const ingestao_24h = resumo?.ingestao_24h || {};
  const sensoresInfo = resumo?.sensores || {};
  const intervaloSeg = resumo?.coleta?.intervalo_s ?? null;
  const statusColeta = calcularStatusColeta(ingestao_24h.ultima_leitura, intervaloSeg);
  const rejeitadasHoje = resumo?.rejeitadas_hoje ?? 0;

  const taxaPct = ingestao_24h.taxa_sucesso_pct != null ? Number(ingestao_24h.taxa_sucesso_pct) : null;
  const taxaStr = taxaPct != null ? `${taxaPct.toFixed(1)}%` : '—';
  let taxaBadgeClass = statusColeta.badgeClass;
  let taxaBadgeText = statusColeta.ativo ? '—' : statusColeta.label.toUpperCase();
  let taxaNumColor = statusColeta.cor;

  if (statusColeta.ativo && taxaPct != null) {
    if (taxaPct >= 95) {
      taxaBadgeClass = 'green';
      taxaBadgeText = 'EXCELENTE';
      taxaNumColor = '#059669';
    } else if (taxaPct >= 80) {
      taxaBadgeClass = 'yellow';
      taxaBadgeText = 'ATENÇÃO';
      taxaNumColor = '#D97706';
    } else {
      taxaBadgeClass = 'red';
      taxaBadgeText = 'CRÍTICO';
      taxaNumColor = '#DC2626';
    }
  }

  const sensoresTopoList = Array.isArray(topologia?.sensores) ? topologia.sensores : [];
  const totalSensores = sensoresInfo.total != null ? sensoresInfo.total : sensoresTopoList.length;
  const ativosSensores = sensoresTopoList.length > 0
    ? contarSensoresAtivosReais(sensoresTopoList, statusColeta, intervaloSeg)
    : (statusColeta.ativo ? (sensoresInfo.ativos ?? 0) : 0);

  const tempoRelativoColeta = ingestao_24h.ultima_leitura
    ? `Última leitura ${statusColeta.tempoRelativo}`
    : 'Sem leitura';

  // 2. Sensores e Sondas
  const totalSolo = sensoresInfo.total_solo != null ? sensoresInfo.total_solo : (sensoresTopoList.filter(s => s.ambiente === 'solo').length);
  const totalAr = sensoresInfo.total_ar != null ? sensoresInfo.total_ar : (sensoresTopoList.filter(s => s.ambiente === 'ar').length);

  // 3. Média Climática
  const condicoes = dashResumo?.resumo_condicoes || {};
  const tempArMedia = condicoes.temperatura_ar_media != null ? Number(condicoes.temperatura_ar_media) : null;
  const umidArMedia = condicoes.umidade_ar_media != null ? Number(condicoes.umidade_ar_media) : null;

  const sensoresSolo = sensoresTopoList
    .map(s => (s.ambiente === 'solo' ? (s.umidade_solo ?? s.umidade) : null))
    .filter(v => v != null && !isNaN(Number(v)))
    .map(Number);
  let mediaSoloStr = '—';
  if (condicoes.umidade_solo_media != null && !isNaN(Number(condicoes.umidade_solo_media))) {
    mediaSoloStr = `${Number(condicoes.umidade_solo_media).toFixed(1)}%`;
  } else if (sensoresSolo.length > 0) {
    const sumUmidSolo = sensoresSolo.reduce((acc, v) => acc + v, 0);
    mediaSoloStr = `${(sumUmidSolo / sensoresSolo.length).toFixed(1)}%`;
  }

  // 4. Alertas do Sistema (fonte única unificada com Central de Alertas e Sensores)
  const resumoAlertasUnificado = resumirAlertasAnalista(preditivos, cortes);
  const totalAlertas = resumoAlertasUnificado.total;
  const reativosQtd = resumoAlertasUnificado.reativos;
  const preditivosQtd = resumoAlertasUnificado.preditivos;
  const badgeAlertas = totalAlertas === 0 ? 'green' : (resumoAlertasUnificado.critico > 0 ? 'red' : 'yellow');
  const badgeAlertasTexto = totalAlertas === 0 ? 'NORMAL' : (resumoAlertasUnificado.critico > 0 ? 'CRÍTICO' : 'ATENÇÃO');

  // B) TOPOLOGIA DE SENSORES NO CAMPO
  const propriedade = topologia?.propriedade || {
    nome: 'Fazenda Raiz Agro',
    local: 'Vale do São Francisco — PE',
    area_ha: null
  };

  const sensoresList = extrairArraySeguro(topologia?.sensores);

  const contadores = topologia?.contadores || {
    todos: sensoresList.length,
    ativos: sensoresList.filter(s => s && s.estado_mapa === 'ativo').length,
    em_alerta: sensoresList.filter(s => s && s.estado_mapa !== 'ativo').length
  };

  const topologiaSensorsMap = {};
  sensoresList.forEach(s => {
    if (s && s.id_sensor != null) {
      topologiaSensorsMap[s.id_sensor] = s;
    }
  });

  const coords = [];
  const gwLat = propriedade?.gateway_lat != null ? Number(propriedade.gateway_lat) : null;
  const gwLng = propriedade?.gateway_lng != null ? Number(propriedade.gateway_lng) : null;
  if (gwLat != null && gwLng != null && !isNaN(gwLat) && !isNaN(gwLng)) {
    coords.push({ lat: gwLat, lng: gwLng });
  }

  sensoresList.forEach(s => {
    const lat = s.lat != null ? Number(s.lat) : null;
    const lng = s.lng != null ? Number(s.lng) : null;
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      coords.push({ lat, lng });
    }
  });

  let minLat = -9.400, maxLat = -9.380, minLng = -40.510, maxLng = -40.490;
  if (coords.length > 0) {
    minLat = Math.min(...coords.map(c => c.lat));
    maxLat = Math.max(...coords.map(c => c.lat));
    minLng = Math.min(...coords.map(c => c.lng));
    maxLng = Math.max(...coords.map(c => c.lng));
  }

  let latSpan = maxLat - minLat;
  let lngSpan = maxLng - minLng;
  if (latSpan <= 0.0001) latSpan = 0.005;
  if (lngSpan <= 0.0001) lngSpan = 0.005;

  const padLat = latSpan * 0.18;
  const padLng = lngSpan * 0.18;
  const normMinLat = minLat - padLat;
  const normMaxLat = maxLat + padLat;
  const normMinLng = minLng - padLng;
  const normMaxLng = maxLng + padLng;

  function calcTop(lat) {
    if (lat == null || isNaN(lat)) return 50;
    const pct = ((normMaxLat - lat) / (normMaxLat - normMinLat)) * 100;
    return Math.max(8, Math.min(92, pct)).toFixed(2);
  }

  function calcLeft(lng) {
    if (lng == null || isNaN(lng)) return 50;
    const pct = ((lng - normMinLng) / (normMaxLng - normMinLng)) * 100;
    return Math.max(8, Math.min(92, pct)).toFixed(2);
  }

  const gwTop = gwLat != null ? calcTop(gwLat) : 42;
  const gwLeft = gwLng != null ? calcLeft(gwLng) : 58;

  const pinsHtml = sensoresList.map((s, idx) => {
    const defaultTop = 30 + ((idx * 23) % 40);
    const defaultLeft = 30 + ((idx * 31) % 40);
    const topPct = s.lat != null && !isNaN(s.lat) ? calcTop(Number(s.lat)) : defaultTop.toFixed(2);
    const leftPct = s.lng != null && !isNaN(s.lng) ? calcLeft(Number(s.lng)) : defaultLeft.toFixed(2);

    let colorClass = 'green';
    let inlineBg = '';
    if (s.estado_mapa === 'ativo') {
      colorClass = s.ambiente === 'solo' ? 'green' : 'blue';
    } else if (s.estado_mapa === 'atencao') {
      colorClass = 'orange';
      inlineBg = 'background: #F59E0B; color: #FFFFFF; border: 2px solid #FFFFFF;';
    } else if (s.estado_mapa === 'rejeicao') {
      colorClass = 'red';
      inlineBg = 'background: #EF4444; color: #FFFFFF; border: 2px solid #FFFFFF;';
    }

    const label = s.codigo ? s.codigo.replace(/^[A-Za-z]+-?/, '') : String(s.id_sensor);

    return `
      <div class="sensor-pin-marker ${colorClass}" style="top: ${topPct}%; left: ${leftPct}%; ${inlineBg}"
           data-sensor-id="${s.id_sensor}"
           data-tipo="${s.ambiente || 'solo'}"
           data-estado="${s.estado_mapa || 'ativo'}"
           title="${s.codigo || s.nome}: ${s.ambiente === 'solo' ? 'Umidade do Solo' : 'Microclima'} (${s.estado_mapa})">
        ${label}
      </div>
    `;
  }).join('');

  const temCoordenadaIlustrativa = sensoresList.some(s => s.coordenada_ilustrativa);
  const notaTransparenciaHtml = temCoordenadaIlustrativa && topologia?.nota_transparencia ? `
    <div style="font-size: 11px; color: #94A3B8; margin-top: 6px; font-style: italic; display:flex; align-items:center; gap:5px;">
      <i data-lucide="info" style="width:13px;height:13px;color:#94A3B8;"></i>
      <span>${topologia.nota_transparencia}</span>
    </div>
  ` : '';

  // C) AUDITORIA DE INGESTÃO E LEITURAS REJEITADAS
  const rejeitadasList = extrairArraySeguro(rejeitadas);
  const rejeitadasHtml = rejeitadasList.length === 0 ? `
    <div style="padding: 24px 0; text-align: center; color: #64748B; font-size: 12px;">
      Nenhuma leitura rejeitada recente registrada no backend.
    </div>
  ` : rejeitadasList.slice(0, 5).map(r => {
    const s = topologiaSensorsMap[r.id_sensor];
    const nomeSensor = s ? s.nome : (r.id_sensor ? `Sensor #${r.id_sensor}` : 'Sensor Desconhecido');
    const loteTexto = s && s.id_lote ? `Lote #${s.id_lote}` : '';
    const motivo = r.motivo || 'Motivo não informado';
    const valoresBrutos = [];
    if (r.temperatura_bruta != null) valoresBrutos.push(`Temp: ${r.temperatura_bruta}°C`);
    if (r.umidade_bruta != null) valoresBrutos.push(`Umid: ${r.umidade_bruta}%`);
    const valBrutoStr = valoresBrutos.join(' • ');
    const dataHoraStr = formatarDataRecife(r.data_rejeicao || r.data_hora_bruta);

    return `
      <div style="border-top: 1px solid #F1F5F9; padding: 12px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap:wrap; gap:6px;">
          <span style="font-size: 12px; font-weight: 700; color: #0F172A;">${nomeSensor}</span>
          ${loteTexto ? `<span style="font-size: 10px; background: #ECFDF5; color: #065F46; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${loteTexto}</span>` : ''}
        </div>
        <div style="font-size: 11px; color: #B91C1C; margin-bottom: 4px; font-weight: 600;">
          Motivo: ${motivo}
        </div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
          ${valBrutoStr ? `<span>${valBrutoStr}</span> • ` : ''}<span>${dataHoraStr}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <button class="incident-btn-secondary btn-ver-rejeitadas-sensor" data-sensor-id="${r.id_sensor}" data-sensor-nome="${nomeSensor}" style="font-size: 11px; padding: 5px 10px; cursor:pointer;">
            Ver leituras rejeitadas deste sensor
          </button>
        </div>
      </div>
    `;
  }).join('');

  const horaRecifeSinc = formatarHoraSimplesRecife(ingestao_24h.ultima_leitura);

  // D) MODELOS PREDITIVOS E LIMIARES DE ALERTA (somente ativos e não vencidos)
  const preditivosAtivos = resumoAlertasUnificado.ativos.filter(a => a._eh_preditivo);
  const alertaMaisRecente = preditivosAtivos.length > 0
    ? [...preditivosAtivos].sort((a, b) => new Date(b.data_hora || b.data_geracao || 0) - new Date(a.data_hora || a.data_geracao || 0))[0]
    : null;

  let alertaRecenteHtml = `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin: 10px 0; font-size: 12px; color: #64748B; text-align: center;">
      Nenhum alerta preditivo ativo
    </div>
  `;

  if (alertaMaisRecente) {
    const severidade = alertaMaisRecente._nivel_padrao || 'BAIXO';
    const nivelLabel = alertaMaisRecente._nivel_curto || 'Baixo';
    const badgeBg = severidade === 'CRITICO' ? '#FEE2E2' : (severidade === 'MEDIO' ? '#FEF3C7' : '#E0F2FE');
    const badgeColor = severidade === 'CRITICO' ? '#991B1B' : (severidade === 'MEDIO' ? '#92400E' : '#0369A1');
    const dotBg = severidade === 'CRITICO' ? '#EF4444' : (severidade === 'MEDIO' ? '#D97706' : '#0284C7');
    const probRaw = alertaMaisRecente.probabilidade_risco != null ? Number(alertaMaisRecente.probabilidade_risco) : (alertaMaisRecente.probabilidade != null ? Number(alertaMaisRecente.probabilidade) : null);
    const probPct = probRaw != null && !isNaN(probRaw) ? `${Math.round(probRaw > 1 ? probRaw : probRaw * 100)}%` : '—';
    const sensorId = alertaMaisRecente.id_sensor ?? alertaMaisRecente.sensor?.id_sensor ?? null;
    const s = sensorId != null ? topologiaSensorsMap[sensorId] : null;
    const sensorNome = s ? s.nome : (alertaMaisRecente.sensor_nome || alertaMaisRecente.sensor?.nome || (sensorId != null ? `Sensor #${sensorId}` : 'Sem sensor vinculado'));
    const loteId = alertaMaisRecente.id_lote ?? alertaMaisRecente.lote?.id_lote ?? null;
    const loteTexto = loteId != null ? `Lote #${loteId}` : '';

    alertaRecenteHtml = `
      <div style="background: ${badgeBg}; border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; padding: 12px; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap:wrap; gap:6px;">
          <span style="font-size: 12px; font-weight: 700; color: ${badgeColor}; display: flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotBg};"></span>
            ${alertaMaisRecente.titulo || 'Risco climático'}
          </span>
          <span style="font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.7); color: ${badgeColor}; padding: 2px 6px; border-radius: 4px;">
            NÍVEL: ${nivelLabel.toUpperCase()} (${probPct})
          </span>
        </div>
        <p style="font-size: 11px; color: ${badgeColor}; line-height: 1.4; margin-bottom: 6px;">
          ${alertaMaisRecente.descricao || alertaMaisRecente.mensagem || 'Condição de alerta preditivo detectada pelo modelo.'}
        </p>
        <div style="font-size: 10px; color: ${badgeColor}; opacity: 0.9; display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:4px;">
          <span>${[sensorNome, loteTexto].filter(Boolean).join(' • ')}</span>
          <span>${alertaMaisRecente.previsao_data_hora ? `Previsão: ${formatarDataRecife(alertaMaisRecente.previsao_data_hora)}` : ''}</span>
        </div>
      </div>
    `;
  }

  const cortesList = extrairArraySeguro(cortes);
  const ordemNiveis = ['BAIXO', 'MEDIO', 'CRITICO'];
  const cortesOrdenados = [...cortesList].sort((a, b) => {
    return ordemNiveis.indexOf(a.nivel) - ordemNiveis.indexOf(b.nivel);
  });

  const cortesHtml = cortesOrdenados.length === 0 ? `
    <div style="padding: 12px 0; color: #64748B; font-size: 11px; text-align: center;">Nenhum limiar de corte configurado no backend.</div>
  ` : cortesOrdenados.map(c => {
    const minPct = Math.round(Number(c.limiar_min ?? 0) * 100);
    const maxPct = Math.round(Number(c.limiar_max ?? 0) * 100);
    const nivelLabel = c.nivel === 'CRITICO' ? 'Alto' : (c.nivel === 'MEDIO' ? 'Médio' : 'Baixo');
    const badgeBg = c.nivel === 'CRITICO' ? '#FEE2E2' : (c.nivel === 'MEDIO' ? '#FEF3C7' : '#E0F2FE');
    const badgeColor = c.nivel === 'CRITICO' ? '#991B1B' : (c.nivel === 'MEDIO' ? '#92400E' : '#0369A1');

    return `
      <div class="corte-row" data-nivel="${c.nivel}" style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; background: #FFFFFF; margin-bottom: 8px;">
        <div class="corte-view-mode" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 140px;">
            <div style="font-size: 12px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 6px;">
              <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">
                ${nivelLabel}
              </span>
              <span>${minPct}% a ${maxPct}%</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
              ${c.acao_recomendada || 'Nenhuma ação recomendada configurada.'}
            </div>
          </div>
          <button class="incident-btn-secondary btn-editar-corte" data-nivel="${c.nivel}" style="font-size: 11px; padding: 4px 10px; cursor: pointer;">
            Editar
          </button>
        </div>

        <div class="corte-edit-mode" style="display: none; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 11px; font-weight: 700; color: #0F172A;">Faixa ${nivelLabel}:</span>
            <label style="font-size: 11px; color: #475569; display: flex; align-items: center; gap: 4px;">
              Mín: <input type="number" min="0" max="100" class="input-corte-min" value="${minPct}" style="width: 52px; padding: 4px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px;"> %
            </label>
            <label style="font-size: 11px; color: #475569; display: flex; align-items: center; gap: 4px;">
              Máx: <input type="number" min="0" max="100" class="input-corte-max" value="${maxPct}" style="width: 52px; padding: 4px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px;"> %
            </label>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; color: #475569;">Ação recomendada:</label>
            <input type="text" class="input-corte-acao" value="${c.acao_recomendada || ''}" style="width: 100%; padding: 5px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px;">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px;">
            <button class="btn-cancelar-corte" data-nivel="${c.nivel}" style="padding: 4px 10px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
              Cancelar
            </button>
            <button class="btn-salvar-corte" data-nivel="${c.nivel}" style="padding: 4px 12px; background: #059669; color: #FFFFFF; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
              Salvar
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info">
          <span class="analista-dot-pulse" style="background: ${statusColeta.cor};"></span>
          <span>${propriedade.nome.toUpperCase()} • ${statusColeta.ativo ? 'CONCENTRADOR ATIVO' : statusColeta.label.toUpperCase()}</span>
          <span class="analista-badge-tech">TELEMETRIA IOT</span>
        </div>
        <div class="analista-subbar-actions">
          <button class="btn-analista-sync" id="btn-sync-telemetria">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Atualizar Dados</span>
          </button>
          <button class="btn-analista-export" id="btn-export-telemetria">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Telemetria</span>
          </button>
        </div>
      </div>

      <!-- 4 Cards no Topo (Card A) -->
      <div class="kpi-grid-4col">
        <!-- 1. Saúde da Coleta -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SAÚDE DA COLETA</span>
            <span class="kpi-badge ${taxaBadgeClass}">${taxaBadgeText}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: ${taxaNumColor};">${taxaStr}</span>
            <span class="kpi-sub-num">${ativosSensores} de ${totalSensores} sensores ativos</span>
          </div>
          <div class="kpi-bottom-row">
            <span>${tempoRelativoColeta}</span>
            <span style="color: ${statusColeta.cor}; font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="${statusColeta.ativo ? 'check-circle-2' : 'alert-circle'}" style="width: 13px; height: 13px;"></i> ${statusColeta.coletaLabel}
            </span>
          </div>
        </div>

        <!-- 2. Sensores e Sondas -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SENSORES E SONDAS</span>
            <span style="color: #0284C7;"><i data-lucide="cpu" style="width: 16px; height: 16px;"></i></span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num">${totalSensores}</span>
            <span class="kpi-sub-num">unidades cadastradas</span>
          </div>
          <div class="kpi-bottom-row" style="gap: 6px;">
            <span style="background: #ECFDF5; color: #047857; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 10px;">${totalSolo} umidade do solo</span>
            <span style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 10px;">${totalAr} microclima (ar)</span>
          </div>
        </div>

        <!-- 3. Média Climática -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">MÉDIA CLIMÁTICA</span>
            <span class="kpi-badge green">MONITORAMENTO</span>
          </div>
          <div class="kpi-value-row" style="gap: 16px; flex-wrap: wrap;">
            <div>
              <span class="kpi-big-num">${tempArMedia != null ? `${tempArMedia.toFixed(1)}°C` : '—'}</span>
              <div style="font-size: 10px; color: #64748B;">Temp. Ar Média</div>
            </div>
            <div>
              <span class="kpi-big-num" style="color: #0284C7;">${umidArMedia != null ? `${Math.round(umidArMedia)}%` : '—'}</span>
              <div style="font-size: 10px; color: #64748B;">Umid. Ar Média</div>
            </div>
            <div>
              <span class="kpi-big-num" style="color: #059669;">${mediaSoloStr}</span>
              <div style="font-size: 10px; color: #64748B;">Umid. Solo Média</div>
            </div>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #64748B; font-size: 11px;">Média ponderada das últimas 24 horas</span>
          </div>
        </div>

        <!-- 4. Alertas do Sistema -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">ALERTAS DO SISTEMA</span>
            <span class="kpi-badge ${badgeAlertas}">${badgeAlertasTexto}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: ${totalAlertas > 0 ? '#D97706' : '#059669'};">${totalAlertas}</span>
            <span class="kpi-sub-num">${reativosQtd} reativos • ${preditivosQtd} preditivos</span>
          </div>
          <div class="kpi-bottom-row">
            <span>Necessitam acompanhamento</span>
            <a href="#/alertas" style="color: #0284C7; font-weight: 600; text-decoration: none; display:flex; align-items:center; gap:4px;">Ver central &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Seção Principal: Topologia de Sensores no Campo (Card B) -->
      <div class="analista-map-card">
        <div class="map-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="map" style="width: 18px; height: 18px; color: #10B981;"></i>
              Topologia de Sensores no Campo
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              ${propriedade.nome} — ${propriedade.local} (${propriedade.area_ha} ha)
            </p>
          </div>

          <!-- Filtros de Topologia -->
          <div class="map-filter-tabs">
            <button class="map-tab-btn active" data-filter="todos">Todos (${contadores.todos ?? sensoresList.length})</button>
            <button class="map-tab-btn" data-filter="solo">Umidade do Solo (${totalSolo})</button>
            <button class="map-tab-btn" data-filter="ar">Microclima / Ar (${totalAr})</button>
            <button class="map-tab-btn" data-filter="alerta">Em alerta (${contadores.em_alerta ?? 0})</button>
          </div>
        </div>

        <!-- Viewport Aérea com Imagem de Satélite e Marcadores Normalizados -->
        <div class="map-view-viewport" id="analista-map-viewport">
          <img src="assets/images/topologia-sensores-campo.jpg" alt="Topologia de Sensores no Campo" class="map-view-bg">

          <!-- Rosa dos Ventos (Norte) -->
          <div style="position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; background: rgba(255,255,255,0.92); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-weight: 800; font-size: 10px; color: #0F172A; z-index: 20;">
            <i data-lucide="navigation" style="width: 14px; height: 14px; color: #0284C7; transform: rotate(45deg);"></i>
            <span>N</span>
          </div>

          <!-- Controles de Zoom -->
          <div style="position: absolute; bottom: 16px; right: 16px; display: flex; flex-direction: column; background: rgba(255,255,255,0.92); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 20;">
            <button style="border: none; background: transparent; padding: 6px 10px; cursor: pointer; font-size: 14px; font-weight: 700; border-bottom: 1px solid #E2E8F0;" id="zoom-in-btn">+</button>
            <button style="border: none; background: transparent; padding: 6px 10px; cursor: pointer; font-size: 14px; font-weight: 700;" id="zoom-out-btn">&minus;</button>
          </div>

          <!-- Gateway Central Posicionado por gateway_lat/lng -->
          <div class="gateway-center-marker" style="top: ${gwTop}%; left: ${gwLeft}%;" title="Gateway Central (${propriedade.nome})" data-node="gateway">
            <div class="gateway-pulse-ring"></div>
            <i data-lucide="radio" style="width: 22px; height: 22px;"></i>
          </div>

          <!-- Pinos de Sensores Normalizados -->
          ${pinsHtml}

          <!-- Pill de Área no Canto Inferior Esquerdo -->
          <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #047857;">
              <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #0F172A;">${propriedade.nome}</div>
              <div style="font-size: 10px; color: #64748B;">${propriedade.local} (${propriedade.area_ha} ha)</div>
            </div>
          </div>
        </div>

        ${notaTransparenciaHtml}

        <!-- Legenda Inferior do Mapa -->
        <div class="map-legend-row">
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #334155;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: ${statusColeta.ativo ? '#10B981' : '#94A3B8'};"></span>
              Sensores ativos (${ativosSensores})
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #334155;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: #F59E0B;"></span>
              Atenção / limiar (${contadores.em_alerta ?? 0})
            </span>
          </div>

          <a href="#/sensores" style="color: #0284C7; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; font-size: 12px;">
            Ver telemetria detalhada &rarr;
          </a>
        </div>
      </div>

      <!-- Grid Inferior (2 Cards): Auditoria de Ingestão e Modelos Preditivos -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Card Esquerda: Auditoria de Ingestão e Leituras Rejeitadas (Card C) -->
        <div class="kpi-analista-card" style="min-height: auto; padding: 20px;">
          <div class="kpi-top-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="shield-alert" style="width: 16px; height: 16px; color: #F59E0B;"></i>
                Auditoria de Ingestão e Leituras Rejeitadas
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Monitoramento de dados brutos e validação física de integridade
              </p>
            </div>
            <span class="kpi-badge yellow">${rejeitadasHoje} Descartadas Hoje</span>
          </div>

          <!-- Lista das 5 Leituras Rejeitadas mais Recentes -->
          <div style="margin-top: 10px;">
            ${rejeitadasHtml}
          </div>

          <div style="margin-top: 10px; font-size: 11px; color: #64748B;">
            Confiabilidade pós-descarte: <strong style="color: #059669;">${taxaStr}</strong>
          </div>

          <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B;">
            <span>Última sincronização às ${horaRecifeSinc || '—'}</span>
            <a href="#/leituras" style="color: #0284C7; font-weight: 600; text-decoration: none;">Histórico completo &rarr;</a>
          </div>
        </div>

        <!-- Card Direita: Modelos Preditivos e Limiares de Alerta (Card D) -->
        <div class="kpi-analista-card" style="min-height: auto; padding: 20px;">
          <div class="kpi-top-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="sliders" style="width: 16px; height: 16px; color: #10B981;"></i>
                Modelos Preditivos e Limiares de Alerta
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Regras automatizadas de estabilidade e limiares de acionamento
              </p>
            </div>
          </div>

          <!-- Bloco: Alerta Preditivo Mais Recente (Risco Climático) -->
          ${alertaRecenteHtml}

          <!-- Editor de Cortes Preditivos -->
          <div style="margin-top: 14px;">
            <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
              <span>Faixas de Corte e Ações Recomendadas</span>
              <span style="font-size: 10px; color: #94A3B8; font-weight: 500;">Limiares de 0% a 100%</span>
            </div>
            ${cortesHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function _formatarCondicaoClima(climaObj, climaAtual) {
  const temAgora = Boolean(climaObj?.agora || climaObj?.atual || (climaAtual && (climaAtual.temperature_2m != null || climaAtual.temperatura != null)));
  const c = climaObj?.agora || climaObj?.atual || climaAtual || {};

  if (temAgora) {
    const code = c.weather_code != null ? Number(c.weather_code) : (c.weathercode != null ? Number(c.weathercode) : null);
    let desc = c.condicao || c.descricao || '';

    let isNoite = false;
    if (c.is_day != null) {
      isNoite = Number(c.is_day) === 0;
    } else {
      const t = c.time;
      let h = NaN;
      if (t && typeof t === 'string' && t.includes('T')) {
        h = parseInt(t.split('T')[1].slice(0, 2), 10);
      }
      if (Number.isNaN(h)) {
        h = new Date().getHours();
      }
      isNoite = h < 6 || h >= 18;
    }

    if (isNoite) {
      if (code === 0 || code === 1) return 'Céu limpo';
      if (code === 2) return 'Parcialmente nublado';
      if (/predom[íi]nio\s+de\s+sol/i.test(desc) || /ensolarado/i.test(desc) || /^sol$/i.test(desc) || /claro/i.test(desc)) {
        return 'Céu limpo';
      }
      if (/sol\s+com\s+nuvens/i.test(desc) || /sol\s+entre\s+nuvens/i.test(desc)) {
        return 'Parcialmente nublado';
      }
      desc = desc.replace(/(\s+com\s+sol|\s+de\s+sol)/gi, '').trim();
      return desc || 'Céu limpo';
    }

    if (code === 0) return 'Céu limpo';
    if (code === 1) return 'Predomínio de sol';
    if (code === 2) return 'Parcialmente nublado';
    return desc || 'Céu limpo';
  }

  const primeiroDia = Array.isArray(climaObj?.dias) && climaObj.dias.length > 0 ? climaObj.dias[0] : null;
  const descDia = primeiroDia?.condicao || primeiroDia?.descricao || climaObj?.condicao || climaObj?.descricao || 'Céu limpo';
  return `Hoje: ${descDia}`;
}

/**
 * 1. MODO RESUMIDO (Primeira Imagem do Figma)
 */
function renderModoResumido(resumo, clima, dg = DEFAULT_DADOS_GRAFICOS, ultimaLeituraTs = null, ultimaLeituraAr = null, lotesRaw = null) {
  const rc = resumo?.resumo_condicoes || {};
  const confPct = dg.conformidade_geral_pct;
  const saudePct = dg.saude_plantacao_pct;
  const umidDosselPct = dg.umidade_dossel_pct;
  const tempFoliar = dg.temp_foliar_c;
  const aguaPct = dg.agua_reservatorio_pct;
  const vazaoLdia = dg.vazao_ldia;
  const temUmidAr24h = Array.isArray(dg.umidade_ar_24h) && dg.umidade_ar_24h.length > 0;
  const temTempAr24h = Array.isArray(dg.temp_ar_24h) && dg.temp_ar_24h.length > 0;
  const temUmidSolo24h = Array.isArray(dg.umidade_solo_24h) && dg.umidade_solo_24h.length > 0;
  const temLeituras24h = temUmidAr24h || temTempAr24h || temUmidSolo24h;
  const uArLast = temUmidAr24h ? dg.umidade_ar_24h[dg.umidade_ar_24h.length - 1] : null;
  const uSoloLast = temUmidSolo24h ? dg.umidade_solo_24h[dg.umidade_solo_24h.length - 1] : null;
  const tArLast = temTempAr24h ? dg.temp_ar_24h[dg.temp_ar_24h.length - 1] : null;

  // --- Clima Open-Meteo real para o Card 3 ---
  const climaAtual = clima?.agora || clima?.atual || clima || {};

  const climaDescResumido = _formatarCondicaoClima(clima, climaAtual);

  const tRaw = climaAtual.temperatura != null ? climaAtual.temperatura : (climaAtual.temperature_2m != null ? climaAtual.temperature_2m : null);
  const climaTempResumido = tRaw != null ? `${Math.round(Number(tRaw))}°C` : '—';

  const vRaw = climaAtual.vento_kmh != null ? climaAtual.vento_kmh : climaAtual.wind_speed_10m;
  const climaVentoResumido = vRaw != null ? `${Math.round(Number(vRaw))} km/h` : '—';

  const uRaw = climaAtual.umidade != null ? climaAtual.umidade : climaAtual.relative_humidity_2m;
  const climaUmidResumido = uRaw != null ? `${Math.round(Number(uRaw))}%` : '—';

  const cRaw = climaAtual.chuva_mm != null ? climaAtual.chuva_mm : climaAtual.precipitation;
  const climaChuvaResumido = cRaw != null ? `${cRaw} mm` : '—';

  const uvRaw = climaAtual.uv != null ? climaAtual.uv : climaAtual.uv_index;
  const climaUvResumido = uvRaw != null ? `${Number(uvRaw).toFixed(1)}` : '—';

  // ---- Skeleton loading placeholder for forecast card ----
  const forecastContainer = document.getElementById('forecast-card-container');
  if (!forecastContainer) {
    // Insert a skeleton container the first time we render this mode
    const containerHtml = `
      <div id="forecast-card-container" class="skeleton-card" style="padding:20px;">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line long"></div>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <div class="skeleton-square" style="flex:1;"></div>
          <div class="skeleton-square" style="flex:1;"></div>
          <div class="skeleton-square" style="flex:1;"></div>
        </div>
      </div>`;
    const parent = document.querySelector('.forecast-section');
    if (parent) parent.insertAdjacentHTML('afterbegin', containerHtml);
  }

  // Toast error if core data missing
  if (climaTempResumido === '—' && climaUmidResumido === '—' && climaVentoResumido === '—') {
    toast.error('Falha ao carregar previsão', 'Tente novamente');
  }

  const pDia = { ...(clima?.periodos_dia || {}) };
  if ((pDia.manha == null || pDia.tarde == null || pDia.noite == null) && Array.isArray(clima?.horas) && clima.horas.length > 0) {
    const hojeStr = String(climaAtual?.time || clima?.dias?.[0]?.time || clima.horas[0]?.time || '').slice(0, 10);
    const horasHoje = clima.horas.filter(h => h && String(h.time || '').startsWith(hojeStr) && h.temperature_2m != null && !Number.isNaN(Number(h.temperature_2m)));
    const mediaFaixa = (hIni, hFim) => {
      const vals = horasHoje
        .filter(h => {
          const hr = Number(String(h.time).slice(11, 13));
          return !Number.isNaN(hr) && hr >= hIni && hr <= hFim;
        })
        .map(h => Number(h.temperature_2m));
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    if (pDia.manha == null) pDia.manha = mediaFaixa(6, 11);
    if (pDia.tarde == null) pDia.tarde = mediaFaixa(12, 17);
    if (pDia.noite == null) pDia.noite = mediaFaixa(18, 23);
  }
  const climaManha = pDia.manha != null ? `${Math.round(Number(pDia.manha))}°` : '—';
  const climaTarde = pDia.tarde != null ? `${Math.round(Number(pDia.tarde))}°` : '—';
  const climaNoite = pDia.noite != null ? `${Math.round(Number(pDia.noite))}°` : '—';

  const proximosDias = Array.isArray(clima?.dias) ? clima.dias.slice(1, 4) : [];
  const formatarDiaCurto = (rawData) => {
    if (!rawData) return '—';
    const m = String(rawData).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}` : String(rawData);
  };
  const climaProximosDiasHtml = proximosDias.length > 0
    ? proximosDias.map((d, idx) => {
      const diaNome = d.dia_semana || formatarDiaCurto(d.data || d.time);
      const maxVal = d.temp_max != null ? d.temp_max : d.temperature_2m_max;
      const maxT = maxVal != null ? `${Math.round(Number(maxVal))}°C` : '—';
      const minVal = d.temp_min != null ? d.temp_min : d.temperature_2m_min;
      const probVal = d.chance_chuva != null ? d.chance_chuva : d.precipitation_probability_max;
      const et0Val = d.et0 != null ? d.et0 : d.et0_fao_evapotranspiration;

      const extrasDia = [];
      if (minVal != null) extrasDia.push(`Mín ${Math.round(Number(minVal))}°C`);
      if (probVal != null) extrasDia.push(`Chuva ${Math.round(Number(probVal))}%`);
      if (et0Val != null) extrasDia.push(`ET0 ${Number(et0Val).toFixed(1)} mm`);

      const borderStyle = idx < proximosDias.length - 1 ? 'border-bottom: 1px solid #F1F5F9;' : '';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; font-size: 11px; ${borderStyle}">
          <span style="color: #475569; font-weight: 600; white-space: nowrap;">${diaNome}</span>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; color: #64748B;">
            ${extrasDia.map(item => `<span style="font-size: 10.5px;">${item}</span>`).join('')}
            <strong style="color: #1E293B; font-weight: 700;">${maxT}</strong>
          </div>
        </div>
      `;
    }).join('')
    : `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 11px;">
         <span style="color: #94A3B8;">Amanhã</span>
         <strong style="color: #334155;">—</strong>
       </div>`;

  // --- Indicadores Reais do Sensor de Ar (DHT11, sensor 1) para Condição Geral ---
  const leituraSensor1 = (ultimaLeituraAr && ultimaLeituraAr.id_sensor !== 3) ? ultimaLeituraAr : null;
  const tsCondicao = leituraSensor1?.data_hora || null;
  const leituraRecenteCondicao = isLeituraRecente30m(tsCondicao);
  const condPillTexto = leituraRecenteCondicao ? 'Leitura recente' : 'Sem leituras recentes';
  const condPillStyle = leituraRecenteCondicao ? '' : 'style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #64748B;"';
  const condPillClass = leituraRecenteCondicao ? 'card-status-pill pill-green' : 'card-status-pill';

  const tempArRaw = (leituraSensor1 && temValor(leituraSensor1.temperatura))
    ? Number(leituraSensor1.temperatura)
    : null;
  const umidArRaw = (leituraSensor1 && temValor(leituraSensor1.umidade))
    ? Number(leituraSensor1.umidade)
    : null;

  const condTempArTxt = tempArRaw != null ? `${tempArRaw.toFixed(1).replace('.', ',')} °C` : '—';
  const condUmidArTxt = umidArRaw != null ? `${Math.round(umidArRaw)}%` : '—';
  const condUltimaLeituraTxt = tsCondicao ? formatarTimestampRecife(tsCondicao) : '—';
  const condTempoDecorridoTxt = formatarTempoDecorrido(tsCondicao);

  const etapasLotes = resumo?.fluxo_lotes?.etapas || [];
  const totalLotesCadastrados = resumo?.lotes_monitorados?.total ?? 13;
  const lotesComSensor = resumo?.lotes_monitorados?.com_sensor_ativo ?? 0;
  const getQtdEtapa = (nome) => {
    const item = etapasLotes.find(e => String(e.status).toLowerCase() === nome.toLowerCase());
    return item ? item.qtd : 0;
  };
  const qtdEmProducao = getQtdEtapa('Em produção');
  const qtdPronto = getQtdEtapa('Pronto para colheita');
  const qtdColhido = getQtdEtapa('Colhido');
  const qtdArmazenado = getQtdEtapa('Armazenado');
  const qtdTransporte = getQtdEtapa('Em transporte');

  // --- Próxima janela de colheita por cultura (sem new Date() para evitar fuso) ---
  const agoraLocal = new Date();
  const hojeIso = `${agoraLocal.getFullYear()}-${String(agoraLocal.getMonth() + 1).padStart(2, '0')}-${String(agoraLocal.getDate()).padStart(2, '0')}`;
  const lotesArray = extrairArraySeguro(lotesRaw);
  const lotesElegiveis = lotesArray
    .map(l => {
      const st = String(l?.status || '').trim();
      const stLower = st.toLowerCase();
      if (stLower !== 'em produção' && stLower !== 'pronto para colheita') return null;
      const m = String(l?.data_colheita || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return null;
      const iso = `${m[1]}-${m[2]}-${m[3]}`;
      if (iso < hojeIso) return null;
      return {
        fruta: String(l?.fruta || '').trim(),
        status: st,
        iso,
        dataBr: `${m[3]}/${m[2]}/${m[1]}`
      };
    })
    .filter(Boolean);

  const culturasJanela = ['Manga', 'Uva', 'Melão'];
  const janelasPorCulturaHtml = culturasJanela.map((cultura, idx) => {
    const candidatos = lotesElegiveis
      .filter(l => l.fruta.toLowerCase().includes(cultura.toLowerCase()))
      .sort((a, b) => a.iso.localeCompare(b.iso));
    const proximo = candidatos[0] || null;
    const borderStyle = idx < culturasJanela.length - 1 ? 'border-bottom: 1px solid #E2E8F0;' : '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; font-size: 12px; ${borderStyle}">
        <span style="color: #334155; font-weight: 700;">${cultura}</span>
        ${proximo
        ? `<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
               <strong style="color: #0F172A; font-weight: 700;">${proximo.dataBr}</strong>
               <span style="font-size: 10.5px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 999px; font-weight: 600;">${proximo.status}</span>
             </div>`
        : `<span style="color: #94A3B8; font-weight: 500;">Sem dados</span>`
      }
      </div>
    `;
  }).join('');
  // Total real = soma dos status (fallback para totalLotesCadastrados se todos zero)
  const _totalLotesStatus = qtdEmProducao + qtdPronto + qtdColhido + qtdArmazenado + qtdTransporte;
  const _totalDonut = _totalLotesStatus > 0 ? _totalLotesStatus : totalLotesCadastrados;
  // Donut segmentado: r=15.9155, circ=100 (stroke-dasharray em unidades percentuais de circunferência)
  // Usamos a convenção: stroke-dasharray="X 100" com stroke-dashoffset para posicionar cada segmento
  const _donutCores = ['#059669', '#10B981', '#06B6D4', '#0284C7', '#F59E0B'];
  const _donutQtds = [qtdEmProducao, qtdPronto, qtdColhido, qtdArmazenado, qtdTransporte];
  let _donutOffset = 25; // começa no topo (25 = -90° em unidades %)
  const _donutSegmentos = _donutQtds.map((q, i) => {
    const pct = _totalDonut > 0 ? (q / _totalDonut) * 100 : 0;
    const gap = pct > 0 ? 1.5 : 0; // pequeno gap entre segmentos
    const fill = Math.max(0, pct - gap);
    const seg = `<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${_donutCores[i]}" stroke-width="4.5" stroke-dasharray="${fill.toFixed(2)} ${(100 - fill).toFixed(2)}" stroke-dashoffset="${(100 - _donutOffset).toFixed(2)}"/>`;
    _donutOffset += pct;
    return seg;
  }).join('\n              ');

  return `
    <!-- Top Row: 3 Cards (Condição Geral, Lotes em Operação, Previsão do Tempo) -->
    <div class="top-kpi-3col">
      
      <!-- CARD 1: CONDIÇÃO GERAL -->
      <div class="figma-card" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="card-top-title-row">
          <span class="card-header-label">CONDIÇÃO GERAL</span>
          <span id="condicao-status-pill" class="${condPillClass}" ${condPillStyle}>${condPillTexto}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid #F1F5F9; border-radius: 12px; padding: 18px 12px; min-height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; color: #059669;">
              <i data-lucide="thermometer" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
              <span style="font-size: 11px; font-weight: 600; color: #64748B;">Temperatura do ar</span>
            </div>
            <div id="condicao-temp-ar" style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1.1; letter-spacing: -0.5px;">${condTempArTxt}</div>
          </div>

          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid #F1F5F9; border-radius: 12px; padding: 18px 12px; min-height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; color: #0284C7;">
              <i data-lucide="droplets" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
              <span style="font-size: 11px; font-weight: 600; color: #64748B;">Umidade do ar</span>
            </div>
            <div id="condicao-umid-ar" style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1.1; letter-spacing: -0.5px;">${condUmidArTxt}</div>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; font-size: 11.5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B;">Sensor</span>
            <strong style="color: #1E293B; font-weight: 600;">DHT11</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B;">Placa</span>
            <strong style="color: #1E293B; font-weight: 600;">ESP32-C3</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
            <span style="color: #64748B;">Envio</span>
            <strong style="color: #1E293B; font-weight: 600;">ThingSpeak</strong>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; font-size: 11px; color: #64748B; margin-top: auto;">
          <div id="condicao-ultima-leitura" style="color: #334155; font-weight: 600;">Última leitura: ${condUltimaLeituraTxt}</div>
          <div id="condicao-tempo-decorrido" style="color: #94A3B8; font-size: 10.5px; margin-top: 2px;">${condTempoDecorridoTxt}</div>
        </div>
      </div>

      <!-- CARD 2: LOTES EM OPERAÇÃO -->
      <div class="figma-card" style="display: flex; flex-direction: column;">
        <div class="card-top-title-row">
          <span class="card-header-label">LOTES EM OPERAÇÃO</span>
          <span class="card-status-pill pill-blue">${totalLotesCadastrados} Lotes</span>
        </div>

        <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 6px;">
          <!-- Rosca Segmentada por Status -->
          <div style="position: relative; width: 108px; height: 108px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="108" height="108" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="4.5"/>
              ${_donutSegmentos}
            </svg>
            <div style="position: absolute; text-align: center; line-height: 1.1;">
              <span style="font-size: 22px; font-weight: 800; color: #1E293B;">${_totalDonut}</span>
              <div style="font-size: 7.5px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-top: 1px;">LOTES</div>
            </div>
          </div>

          <!-- Lista de Categorias -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 9px;">
            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#059669;"></span>Em Produção</span>
                <strong style="color: #334155;">${qtdEmProducao} ${qtdEmProducao === 1 ? 'lote' : 'lotes'}</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${totalLotesCadastrados > 0 ? (qtdEmProducao / totalLotesCadastrados * 100) : 0}%; background: #059669;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#10B981;"></span>Pronto p/ Colheita</span>
                <strong style="color: #334155;">${qtdPronto} ${qtdPronto === 1 ? 'lote' : 'lotes'}</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${totalLotesCadastrados > 0 ? (qtdPronto / totalLotesCadastrados * 100) : 0}%; background: #10B981;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#06B6D4;"></span>Colhido</span>
                <strong style="color: #334155;">${qtdColhido} ${qtdColhido === 1 ? 'lote' : 'lotes'}</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${totalLotesCadastrados > 0 ? (qtdColhido / totalLotesCadastrados * 100) : 0}%; background: #06B6D4;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#0284C7;"></span>Armazenado</span>
                <strong style="color: #334155;">${qtdArmazenado} ${qtdArmazenado === 1 ? 'lote' : 'lotes'}</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${totalLotesCadastrados > 0 ? (qtdArmazenado / totalLotesCadastrados * 100) : 0}%; background: #0284C7;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#F59E0B;"></span>Em Transporte</span>
                <strong style="color: #334155;">${qtdTransporte} ${qtdTransporte === 1 ? 'lote' : 'lotes'}</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${totalLotesCadastrados > 0 ? (qtdTransporte / totalLotesCadastrados * 100) : 0}%; background: #F59E0B;"></div></div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 8px; font-size: 11px; color: #64748B; margin-top: auto; text-align: center;">
          ${lotesComSensor} de ${_totalDonut} monitorados
        </div>
      </div>

      <!-- CARD 3: PREVISÃO DO TEMPO E CLIMA -->
      <div class="figma-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
        <div>
          <div class="card-top-title-row">
            <span class="card-header-label">PREVISÃO DO TEMPO</span>
            <span class="card-status-pill pill-amber" style="display: flex; align-items: center; gap: 4px;">
              <i data-lucide="map-pin" style="width: 11px; height: 11px;"></i> Petrolina, PE • Hoje
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
            <div style="width: 42px; height: 42px; background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i data-lucide="sun" style="width: 24px; height: 24px; color: #F59E0B;"></i>
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 26px; font-weight: 800; color: #1E293B; line-height: 1;" id="clima-temp-resumido">${climaTempResumido}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 3px;">${climaDescResumido} • Vento ${climaVentoResumido}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 10px; padding: 7px 10px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; text-align: center; font-size: 10px;">
            <div><span style="color:#94A3B8; display:block;">MANHÃ</span><strong style="color:#334155; font-size:11.5px;">${climaManha}</strong></div>
            <div style="border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;"><span style="color:#94A3B8; display:block;">TARDE</span><strong style="color:#D97706; font-size:11.5px;">${climaTarde}</strong></div>
            <div><span style="color:#94A3B8; display:block;">NOITE</span><strong style="color:#334155; font-size:11.5px;">${climaNoite}</strong></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; text-align: center;">
            <span style="color:#94A3B8; font-size:9.5px; font-weight:700; display:block;">UMIDADE</span>
            <strong style="color:#1E293B; font-size:12px;" id="clima-umid-resumido">${climaUmidResumido}</strong>
          </div>
          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; text-align: center;">
            <span style="color:#94A3B8; font-size:9.5px; font-weight:700; display:block;">CHUVA</span>
            <strong style="color:#1E293B; font-size:12px;">${climaChuvaResumido}</strong>
          </div>
          <div style="background: rgba(248, 250, 252, 0.9); border: 1px solid #F1F5F9; border-radius: 10px; padding: 8px 10px; text-align: center;">
            <span style="color:#94A3B8; font-size:9.5px; font-weight:700; display:block;">UV</span>
            <strong style="color:#047857; font-size:12px;">${climaUvResumido}</strong>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: auto;">
          <div style="font-size: 9.5px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px;">Próximos dias</div>
          ${climaProximosDiasHtml}
        </div>
      </div>

    </div>

    <!-- Middle Row: Resumo da Produção (Gauge Grande) + Monitoramento da Propriedade (Satélite) -->
    <div class="middle-split-row">
      
      <!-- Card Esquerdo: Resumo das Condições e Culturas -->
      <div class="figma-card" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="card-top-title-row">
          <span style="font-size: 14px; font-weight: 700; color: #1E293B; letter-spacing: 0.5px; text-transform: uppercase;">
            RESUMO DAS CONDIÇÕES E CULTURAS
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">LOTES PRONTOS PARA COLHEITA</div>
            <div style="font-size: 26px; font-weight: 800; color: #1E293B; margin-top: 6px; line-height: 1.1;">
              ${Array.isArray(resumo?.fluxo_lotes?.etapas) ? qtdPronto : 'Sem dados'}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Status: Pronto para colheita</div>
          </div>

          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">ALERTAS ABERTOS</div>
            <div style="font-size: 26px; font-weight: 800; color: #1E293B; margin-top: 6px; line-height: 1.1;">
              ${resumo?.alertas?.abertos != null ? resumo.alertas.abertos : 'Sem dados'}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Ocorrências em aberto</div>
          </div>
        </div>

        <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 14px 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px;">PRÓXIMA JANELA DE COLHEITA POR CULTURA</div>
          <div style="display: flex; flex-direction: column; flex: 1; justify-content: center;">
            ${janelasPorCulturaHtml}
          </div>
        </div>

        <!-- Rodapé: Culturas -->
        <div style="border-top: 1px solid #F1F5F9; padding-top: 14px; margin-top: auto;">
          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">CULTURAS</div>
            <div style="font-size: 12px; color: #334155; font-weight: 600; margin-top: 4px;">
              Manga, Uva e Melão
            </div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Culturas cadastradas</div>
          </div>
        </div>
      </div>

      <!-- Card Direito: Monitoramento da Propriedade e Sensores -->
      <div class="figma-card" style="padding: 24px; display: flex; flex-direction: column;">
        <div class="card-top-title-row" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="min-width: 0;">
            <span style="font-size: 13px; font-weight: 700; color: #1E293B; letter-spacing: 0.5px; text-transform: uppercase; display: block; line-height: 1.3;">
              MONITORAMENTO DA PROPRIEDADE E SENSORES
            </span>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 3px; margin-bottom: 0;">Topologia e Área de Cobertura dos Sensores ESP32</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            ${(resumo?.sensores?.reais > 0 || lotesComSensor > 0)
      ? '<span class="card-status-pill pill-green" style="font-size: 10px; padding: 3px 8px; font-weight: 700;">ESP32 Conectado</span>'
      : '<span class="card-status-pill pill-blue" style="font-size: 10px; padding: 3px 8px; font-weight: 700;">Sem sensor</span>'}
            <div style="display: flex; gap: 4px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 2px;">
              <button type="button" id="btn-map-zoom-in" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" title="Aproximar zoom">+</button>
              <button type="button" id="btn-map-zoom-out" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" title="Afastar zoom">&minus;</button>
              <button type="button" id="btn-map-fullscreen" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Redefinir visualização / Tela inteira">
                <i data-lucide="maximize-2" style="width: 13px; height: 13px;"></i>
              </button>
            </div>
          </div>
        </div>

        <div id="satellite-map-viewport" class="satellite-map-container" style="position: relative; overflow: hidden; border-radius: 12px; min-height: 270px; flex: 1; background: #0F172A; user-select: none;">
          <div id="leaflet-propriedade-map" style="position: absolute; inset: 0; z-index: 5; border-radius: 12px;"></div>

          <div id="satellite-map-fallback" style="position: absolute; inset: 0; z-index: 4;">
            <img src="assets/images/topologia-sensores-campo.jpg" alt="Visão Aérea dos Talhões" class="satellite-bg-img" style="width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; border-radius: 12px;">

            <!-- Sensor 1: DHT11 ESP32-C3 (ar) -->
            <div style="position: absolute; top: 22%; left: 24%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 6px; z-index: 10; border: 1px solid rgba(16, 185, 129, 0.6);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
              <span>DHT11 ESP32-C3 (ar)</span>
            </div>

            <!-- Sensor 2: Solo · em calibração -->
            <div style="position: absolute; bottom: 26%; right: 28%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 6px; z-index: 10; border: 1px solid rgba(14, 165, 233, 0.6);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #0EA5E9;"></span>
              <span>Solo · em calibração</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; font-size: 11px; color: #94A3B8;">
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <span><strong style="color: #10B981;">●</strong> DHT11 (ar)</span>
            <span><strong style="color: #0EA5E9;">●</strong> Solo (em calibração)</span>
          </div>
          <div style="font-size: 10.5px; color: #94A3B8;">Localização aproximada · Rede Local ESP32 • ThingSpeak</div>
        </div>
      </div>

    </div>

    <!-- Bottom Row: Telemetria de Campo (24h) com 4 Mini Gráficos Suaves e Organizados -->
    <div class="figma-card telemetry-4charts-container">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <span style="font-size: 14px; font-weight: 700; color: #1E293B; letter-spacing: 0.5px; text-transform: uppercase;">
            TELEMETRIA DE CAMPO (24H)
          </span>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
            Últimas leituras registradas do ESP32 (DHT11)
            <span id="sse-origem-badge" class="card-status-pill ${temLeituras24h ? 'pill-green' : 'pill-blue'} sse-origem-badge" style="font-size: 10px; padding: 2px 8px; margin-left: 8px;">${temLeituras24h ? 'Sensor Real' : 'Sem dados'}</span>
            <span id="sse-aviso-reconectando" class="sse-aviso-reconectando" style="display: none; margin-left: 8px; font-size: 11px; font-weight: 600; color: #D97706; background: #FFFBEB; border: 1px solid #FDE68A; padding: 2px 8px; border-radius: 6px;">Reconectando...</span>
            <span id="sse-horario-leitura" class="sse-horario-leitura" style="margin-left: 8px; font-size: 11px; color: #64748B;">${(ultimaLeituraTs || ultimaLeituraTimestamp) ? `Última leitura: ${formatarTimestampRecife(ultimaLeituraTs || ultimaLeituraTimestamp)}` : ''}</span>
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="telemetria-timeframe-selector" style="display: flex; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 10px;">
            <button class="timeframe-btn active" data-tf="24h" style="padding: 4px 12px; background: #fff; border-radius: 6px; font-size: 12px; font-weight: 600; color: #1E293B; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: none; cursor: pointer;">24h</button>
            <button class="timeframe-btn" data-tf="7d" style="padding: 4px 12px; font-size: 12px; font-weight: 600; color: #64748B; background: none; border: none; border-radius: 6px; cursor: pointer;">7 Dias</button>
            <button class="timeframe-btn" data-tf="30d" style="padding: 4px 12px; font-size: 12px; font-weight: 600; color: #64748B; background: none; border: none; border-radius: 6px; cursor: pointer;">30 Dias</button>
          </div>
        </div>
      </div>

      <!-- Grid com 4 Gráficos Fluidos Alinhados e Centralizados -->
      <div class="charts-4col-grid">
        
        <!-- Gráfico 1: Umidade do Ar -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Umidade do Ar</span>
            <span class="mini-chart-pill ${temUmidAr24h ? 'pill-green' : 'pill-blue'}" id="miniChart1-pill">${temUmidAr24h ? `${Math.round(dg.umidade_ar_24h[dg.umidade_ar_24h.length - 1])}%` : 'Sem dados'}</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart1"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Agora</span>
          </div>
        </div>

        <!-- Gráfico 2: Umidade do Solo -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Umidade do Solo</span>
            <span class="mini-chart-pill ${temUmidSolo24h ? 'pill-green' : 'pill-blue'}" id="miniChart2-pill">${temUmidSolo24h ? `${Math.round(uSoloLast)}%` : 'Sem dados'}</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart2"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Agora</span>
          </div>
        </div>

        <!-- Gráfico 4: Temperatura do Ar -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Temperatura <br>do Ar</span>
            <span class="mini-chart-pill ${temTempAr24h ? 'pill-green' : 'pill-blue'}" id="miniChart4-pill">${temTempAr24h ? `${dg.temp_ar_24h[dg.temp_ar_24h.length - 1]}°C` : 'Sem dados'}</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart4"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Agora</span>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * 2. MODO DETALHADO (Base 100% no Banco de Dados PostgreSQL e Telemetria Real)
 */
let ptaxDolarCache = null;

function _lerPtaxCache() {
  if (ptaxDolarCache && typeof ptaxDolarCache.valor === 'number' && ptaxDolarCache.dataBr) {
    return ptaxDolarCache;
  }
  try {
    const raw = sessionStorage.getItem('PTAX_DOLAR_CACHE');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.valor === 'number' && parsed.dataBr) {
      ptaxDolarCache = parsed;
      return parsed;
    }
  } catch (_) { }
  return null;
}

function _salvarPtaxCache(obj) {
  ptaxDolarCache = obj;
  try {
    sessionStorage.setItem('PTAX_DOLAR_CACHE', JSON.stringify(obj));
  } catch (_) { }
}

async function _buscarDolarPtax() {
  const cached = _lerPtaxCache();
  if (cached) return cached;

  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dataParam = `${mm}-${dd}-${yyyy}`;
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dataParam}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const json = await resp.json();
      const lista = Array.isArray(json?.value) ? json.value : [];
      const item = lista.length > 0 ? lista[lista.length - 1] : null;
      if (item && item.cotacaoVenda != null && !Number.isNaN(Number(item.cotacaoVenda))) {
        const dp = parseDateBr(item.dataHoraCotacao);
        const resultado = {
          valor: Number(item.cotacaoVenda),
          dataBr: dp ? dp.br : `${dd}/${mm}`
        };
        _salvarPtaxCache(resultado);
        return resultado;
      }
    } catch (_) {
      break;
    }
  }
  return _lerPtaxCache();
}

let janelasDetalhadoCache = [];
let janelaDiasAtualCache = [];
const FRUTAS_JANELA_OPCOES = ['Manga', 'Uva', 'Melão'];

function _textoMotivoDia(item) {
  if (!item || !item.raw) return '';
  const { raw: d, dp } = item;
  if (d.adequado) {
    return `${dp.br}: Dia adequado para colheita`;
  }
  const motivos = Array.isArray(d.motivos)
    ? d.motivos.map(m => String(m || '').trim()).filter(Boolean)
    : [];
  if (motivos.length === 0) return '';
  return `${dp.br}: ${motivos.join('; ')}`;
}

function _normFrutaJanela(nome) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function _hojeIsoLocal() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

function _isJanelaValida(j, hojeIso) {
  return Boolean(j && j.janela_inicio && j.janela_fim && j.janela_fim >= hojeIso);
}

function _selecionarJanelaPorFruta(janLista, frutaNome) {
  const hojeIso = _hojeIsoLocal();
  const alvo = _normFrutaJanela(frutaNome);
  const daFruta = (Array.isArray(janLista) ? janLista : []).filter(j => _normFrutaJanela(j?.fruta) === alvo);
  if (daFruta.length === 0) return { janelaExibida: null, janelaValida: null };

  const ordenarRecente = (a, b) => String(b?.gerado_em || '').localeCompare(String(a?.gerado_em || ''));
  const validas = daFruta.filter(j => _isJanelaValida(j, hojeIso)).sort(ordenarRecente);
  if (validas.length > 0) {
    return { janelaExibida: validas[0], janelaValida: validas[0] };
  }
  const recentes = [...daFruta].sort(ordenarRecente);
  return { janelaExibida: recentes[0], janelaValida: null };
}

function _frutaInicialJanela(janLista) {
  const hojeIso = _hojeIsoLocal();
  const lista = Array.isArray(janLista) ? janLista : [];
  for (const fruta of FRUTAS_JANELA_OPCOES) {
    const alvo = _normFrutaJanela(fruta);
    if (lista.some(j => _normFrutaJanela(j?.fruta) === alvo && _isJanelaValida(j, hojeIso))) {
      return fruta;
    }
  }
  return 'Manga';
}

function _renderCorpoJanelaColheita(janLista, frutaSelecionada) {
  const hojeIsoJan = _hojeIsoLocal();
  const { janelaExibida, janelaValida } = _selecionarJanelaPorFruta(janLista, frutaSelecionada);
  const janInicioP = parseDateBr(janelaValida?.janela_inicio);
  const janFimP = parseDateBr(janelaValida?.janela_fim);
  const janPeriodo = (janInicioP && janFimP) ? `${janInicioP.br} a ${janFimP.br}` : null;
  const janProb = (janelaValida && janelaValida.probabilidade != null) ? Math.round(Number(janelaValida.probabilidade)) : null;

  const _diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const janDiasLista = (janelaExibida && Array.isArray(janelaExibida.dias))
    ? janelaExibida.dias
      .map(d => {
        const dateStr = d?.data || d?.time || (typeof d === 'string' ? d : '');
        const dp = parseDateBr(dateStr);
        return dp ? { raw: d, dp } : null;
      })
      .filter(item => item && item.dp.iso >= hojeIsoJan)
      .slice(0, 7)
    : [];
  janelaDiasAtualCache = janDiasLista;

  const janDiasHtml = janDiasLista.length > 0
    ? janDiasLista.map(({ raw: d, dp }, idx) => {
      const jsDate = new Date(dp.y, dp.mo - 1, dp.d);
      const diaSem = _diasSemana[jsDate.getDay()];
      const adequado = Boolean(d?.adequado);
      const tempMaxStr = d?.temp_max != null ? `${Math.round(Number(d.temp_max))}°C` : '—';
      const probChuvaStr = d?.prob_chuva_pct != null ? `${Math.round(Number(d.prob_chuva_pct))}%` : '—';
      return `
        <div class="harvest-day-box${adequado ? '' : ' harvest-day-box--amber'}${idx === 0 ? ' harvest-day-box--selected' : ''}" data-dia-idx="${idx}" style="cursor: pointer;">
          <span class="harvest-day-name">${diaSem}</span>
          <strong class="harvest-day-num" style="font-size: 13px;">${dp.br}</strong>
          <span style="font-size: 12px; font-weight: 700; color: #1E293B; margin-top: 2px;">${tempMaxStr}</span>
          <span style="font-size: 10.5px; color: #475569; display: inline-flex; align-items: center; gap: 3px;">
            <i data-lucide="droplets" style="width: 11px; height: 11px; color: #0284C7;"></i>${probChuvaStr}
          </span>
        </div>`;
    }).join('')
    : '<div style="grid-column: 1 / -1; text-align: center; font-size: 12px; color: #64748B; padding: 18px 8px;">Previsão ainda não disponível</div>';

  const motivoInicial = janDiasLista.length > 0 ? _textoMotivoDia(janDiasLista[0]) : '';
  const motivoInicialEsc = motivoInicial.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const destaqueTexto = !janelaExibida
    ? 'Sem previsão para esta fruta'
    : (janPeriodo || 'Nenhum dia ideal na previsão');
  const loteBadge = janelaExibida?.id_lote != null
    ? `<span style="font-size: 11px; font-weight: 600; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 999px;">Lote #${janelaExibida.id_lote}</span>`
    : '';

  return `
    <!-- 2. Destaque: período ou sem janela / sem registro + lote -->
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 4px 0;">
      <div style="font-size: ${janPeriodo ? '26px' : '19px'}; font-weight: 800; color: ${janPeriodo ? '#1E293B' : '#64748B'}; letter-spacing: -0.4px;">
        ${destaqueTexto}
      </div>
      ${loteBadge}
    </div>

    <!-- 3. Grade com os dias recebidos a partir de hoje -->
    <div class="harvest-days-grid" style="flex: 1; align-content: stretch;">
      ${janDiasHtml}
    </div>

    <div id="janela-dia-motivo" style="${motivoInicial ? '' : 'display: none; '}font-size: 11.5px; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 7px 10px; line-height: 1.4;">${motivoInicialEsc}</div>

    <!-- 4. Rodapé: legenda e probabilidade (só com janela válida) -->
    <div style="padding-top: 12px; border-top: 1px solid #F1F5F9; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #475569;">
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: #F0FDF4; border: 1px solid #059669; display: inline-block;"></span>
          Adequado
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: #FFFBEB; border: 1px solid #D97706; display: inline-block;"></span>
          Fora da faixa ideal
        </span>
      </div>
      ${janPeriodo && janProb != null ? `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="position: relative; width: 38px; height: 38px; flex-shrink: 0;">
          <svg width="38" height="38" viewBox="0 0 40 40" style="transform: rotate(-90deg);">
            <circle cx="20" cy="20" r="15.5" fill="none" stroke="#E2E8F0" stroke-width="3.5" />
            <circle cx="20" cy="20" r="15.5" fill="none" stroke="#059669" stroke-width="3.5" stroke-dasharray="97.4" stroke-dashoffset="${Math.round(97.4 - (janProb / 100) * 97.4)}" stroke-linecap="round" />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #1E293B;">
            ${janProb}%
          </div>
        </div>
        <span style="font-size: 11.5px; color: #475569; line-height: 1.4;">
          de probabilidade de a janela atender às condições climáticas ideais.
        </span>
      </div>` : ''}
    </div>
  `;
}

let lotesDetalhadoParecerCache = [];

function renderModoDetalhado(resumo, clima, dg = DEFAULT_DADOS_GRAFICOS, extras = {}, lotesRaw = null) {
  const sensoresLista = extrairArraySeguro(extras?.sensores);
  const lotesComSensorSet = new Set(
    sensoresLista
      .map(s => Number(s?.id_lote ?? s?.fk_lote_id_lote ?? 0))
      .filter(id => id > 0)
  );
  if (lotesComSensorSet.size === 0) {
    lotesComSensorSet.add(145);
  }
  lotesDetalhadoParecerCache = extrairArraySeguro(lotesRaw)
    .filter(l => {
      const id = Number(l?.id_lote ?? 0);
      if (lotesComSensorSet.has(id)) return true;
      const st = _normFrutaJanela(l?.status);
      return st === 'em producao' || st === 'pronto para colheita';
    })
    .sort((a, b) => {
      const aSensor = lotesComSensorSet.has(Number(a?.id_lote ?? 0)) ? 0 : 1;
      const bSensor = lotesComSensorSet.has(Number(b?.id_lote ?? 0)) ? 0 : 1;
      if (aSensor !== bSensor) return aSensor - bSensor;
      return Number(a?.id_lote ?? 0) - Number(b?.id_lote ?? 0);
    })
    .map(l => ({ ...l, _temSensor: lotesComSensorSet.has(Number(l?.id_lote ?? 0)) }));
  const r = resumo || {};
  const fmtNum = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });


  // --- Condição geral: rótulo calculado pelo backend (vw_lote_saude) ---
  const cond = r.condicao_geral || {};
  const condRotulo = cond.rotulo || 'Sem dados';
  const condDotCor = cond.nivel === 'critica' ? '#EF4444' : cond.nivel === 'atencao' ? '#F59E0B' : (cond.rotulo ? '#059669' : '#94A3B8');

  // --- Lotes em operação ---
  const lotesTotal = r.lotes_monitorados?.total ?? 0;

  // --- Alertas abertos ---
  const alertasAbertos = Number(r.alertas?.abertos ?? 0);
  const alertaTexto = alertasAbertos > 0 ? `${alertasAbertos} para revisar` : '0';

  // --- Irrigação recomendada hoje ---
  const previsoesIrr = Array.isArray(extras.irrigacao) ? extras.irrigacao : null;
  let irrValor = 'A consultar';
  let irrCaption = '— mm · — L estimados';

  if (previsoesIrr && previsoesIrr.length) {
    const precisam = previsoesIrr.filter(p => p.necessita_irrigacao);
    const mms = precisam.map(p => Number(p.quantidade_agua_mm)).filter(v => !Number.isNaN(v) && v > 0);
    const irrMm = mms.length ? mms.reduce((a, b) => a + b, 0) / mms.length : 0;
    const areaHa = temValor(r.propriedade?.area_ha) ? Number(r.propriedade.area_ha) : null;

    if (precisam.length === 0) {
      irrValor = '0 mm';
      irrCaption = 'Sem necessidade hoje';
    } else if (irrMm && areaHa) {
      const litros = irrMm * areaHa * 10000;
      irrValor = litros >= 1e6 ? `${fmtNum(litros / 1e6, 1)} mi L` : `${fmtNum(litros / 1e3, 1)} mil L`;
      irrCaption = `${fmtNum(irrMm, 1)} mm · ${fmtNum(litros, 0)} L estimados`;
    } else if (irrMm) {
      irrValor = `${fmtNum(irrMm, 1)} mm`;
      irrCaption = 'Registrada no sistema';
    }
  }

  // --- Condições de cultivo (médias das últimas 24 h em resumo_condicoes) ---
  const rc = r.resumo_condicoes || {};
  const temPctFaixa = temValor(rc.pct_na_faixa);
  const pctFaixaNum = temPctFaixa ? Math.min(100, Math.max(0, Number(rc.pct_na_faixa))) : 0;
  const pctFaixaTexto = temPctFaixa ? `${fmtNum(rc.pct_na_faixa, 1)}% das leituras na faixa ideal` : '—';
  const qtdAvaliadas = temValor(rc.leituras_avaliadas) ? Number(rc.leituras_avaliadas) : (temValor(rc.n_leituras_ar) ? Number(rc.n_leituras_ar) : null);
  const baseLeiturasTexto = temPctFaixa
    ? (qtdAvaliadas != null && qtdAvaliadas > 0
      ? `Base: ${qtdAvaliadas} ${qtdAvaliadas === 1 ? 'leitura' : 'leituras'} nas últimas 24 h`
      : 'Últimas 24 h')
    : 'Sem leituras no período';

  const temUmidMedia = temValor(rc.umidade_ar_media);
  const umidTexto = temUmidMedia ? `${Math.round(Number(rc.umidade_ar_media))}%` : '—';
  const umidSub = temUmidMedia ? 'Média nas últimas 24 h' : 'Sem leituras no período';

  const temTempMedia = temValor(rc.temperatura_ar_media);
  const tempTexto = temTempMedia ? `${fmtNum(rc.temperatura_ar_media, 1)} °C` : '—';
  const tempSub = temTempMedia ? 'Média nas últimas 24 h' : 'Sem leituras no período';

  const temVpdMedio = temValor(rc.vpd_medio_kpa);
  const vpdTexto = temVpdMedio ? `${fmtNum(rc.vpd_medio_kpa, 2)} kPa` : '—';
  const vpdSub = temVpdMedio ? 'Quanto o ar puxa água da planta' : 'Sem leituras no período';

  // --- Janela de colheita real ---
  const janLista = Array.isArray(extras.janelas) ? extras.janelas : [];
  janelasDetalhadoCache = janLista;
  const frutaInicialJanela = _frutaInicialJanela(janLista);
  const { janelaValida: janInicialValida } = _selecionarJanelaPorFruta(janLista, frutaInicialJanela);
  const primeiraJanela = janInicialValida || janLista.find(j => _isJanelaValida(j, _hojeIsoLocal())) || null;
  const janCorpoHtml = _renderCorpoJanelaColheita(janLista, frutaInicialJanela);

  // --- Próximos passos baseados nos dados do painel ---
  const temAlertasResumo = temValor(r.alertas?.abertos);
  const passoAlertasTexto = !temAlertasResumo
    ? 'Dados de alertas indisponíveis no momento.'
    : alertasAbertos === 0
      ? 'Nenhum alerta em aberto. Continue acompanhando.'
      : alertasAbertos === 1
        ? '1 alerta em aberto para revisar.'
        : `${alertasAbertos} alertas em aberto para revisar.`;

  const pJanIni = parseDateBr(primeiraJanela?.janela_inicio);
  const pJanFim = parseDateBr(primeiraJanela?.janela_fim);
  let passoColheitaTexto = 'Previsão de colheita ainda não disponível.';
  if (primeiraJanela && pJanIni && pJanFim) {
    const detalhesJan = [
      primeiraJanela.fruta || null,
      primeiraJanela.id_lote != null ? `Lote #${primeiraJanela.id_lote}` : null
    ].filter(Boolean).join(' · ');
    passoColheitaTexto = `Janela de ${pJanIni.br} a ${pJanFim.br}${detalhesJan ? ` (${detalhesJan})` : ''}.`;
  } else {
    const janComDias = janLista.find(j => Array.isArray(j?.dias) && j.dias.length > 0);
    if (janComDias) {
      passoColheitaTexto = janComDias.fruta
        ? `Nenhum dia ideal para ${janComDias.fruta} na previsão. Acompanhe as próximas atualizações.`
        : 'Nenhum dia ideal na previsão. Acompanhe as próximas atualizações.';
    }
  }

  const hojeIsoClima = _hojeIsoLocal();
  const climaDiasArr = Array.isArray(clima?.dias) ? clima.dias : [];
  const clima3Dias = climaDiasArr
    .filter(d => {
      const dp = parseDateBr(d?.data || d?.time);
      return dp ? dp.iso >= hojeIsoClima : true;
    })
    .slice(0, 3);
  const probsChuva3d = clima3Dias
    .map(d => (d?.chance_chuva != null ? d.chance_chuva : (d?.precipitation_probability_max != null ? d.precipitation_probability_max : d?.prob_chuva_pct)))
    .filter(v => temValor(v))
    .map(v => Number(v));
  const maiorChuva3d = probsChuva3d.length > 0 ? Math.round(Math.max(...probsChuva3d)) : null;

  const irrRecomendada = (previsoesIrr && previsoesIrr.length)
    ? previsoesIrr.find(p => p?.necessita_irrigacao && temValor(p?.quantidade_agua_mm) && Number(p.quantidade_agua_mm) > 0) || null
    : null;
  let passoIrrigacaoTexto = 'Sem recomendação de irrigação no momento.';
  if (irrRecomendada) {
    const loteIrrTxt = irrRecomendada.id_lote != null ? ` (Lote #${irrRecomendada.id_lote})` : '';
    passoIrrigacaoTexto = `Recomendação registrada: ${fmtNum(irrRecomendada.quantidade_agua_mm, 1)} mm${loteIrrTxt}.`;
  }
  if (maiorChuva3d != null) {
    passoIrrigacaoTexto += ` Maior chance de chuva (hoje e próximos 2 dias): ${maiorChuva3d}%.`;
  }

  // --- Mercado real ---
  const mercadoLista = Array.isArray(extras.mercado) ? extras.mercado : [];
  const mercadoCardsHtml = mercadoLista.length > 0
    ? mercadoLista.slice(0, 2).map(m => `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">${m.fruta || m.cultura || 'Cultura'}</div>
          <div style="font-size: 20px; font-weight: 800; color: #1E293B; line-height: 1.1;">R$ ${m.preco_kg != null ? Number(m.preco_kg).toFixed(2).replace('.', ',') : '—'}</div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">por kg</div>
        </div>
      `).join('')
    : '<div style="grid-column: 1 / -1; text-align: center; font-size: 12px; color: #64748B; padding: 18px;">Nenhum dado de mercado cadastrado</div>';

  // --- Clima real ---
  const climaAtual = clima?.atual || clima?.agora || clima || {};
  const tVal = climaAtual.temperatura != null ? climaAtual.temperatura : (climaAtual.temperature_2m != null ? climaAtual.temperature_2m : null);
  const climaTemp = tVal != null ? `${Math.round(Number(tVal))}°C` : '—';
  const climaDesc = _formatarCondicaoClima(clima, climaAtual);
  const uVal = climaAtual.umidade != null ? climaAtual.umidade : (climaAtual.relative_humidity_2m != null ? climaAtual.relative_humidity_2m : null);
  const climaUmid = uVal != null ? `${Math.round(Number(uVal))}% umidade` : '— umidade';
  const vVal = climaAtual.vento_kmh != null ? climaAtual.vento_kmh : (climaAtual.wind_speed_10m != null ? climaAtual.wind_speed_10m : null);
  const climaVento = vVal != null ? `Vento ${Math.round(Number(vVal))} km/h` : 'Vento —';
  const climaDias = Array.isArray(clima?.dias) ? clima.dias.slice(0, 6) : [];
  const climaDiasHtml = climaDias.length > 0
    ? climaDias.map(d => {
      const diaNome = d.dia_semana || (d.data ? d.data.slice(5) : '');
      const maxVal = d.temp_max != null ? d.temp_max : d.temperature_2m_max;
      const minVal = d.temp_min != null ? d.temp_min : d.temperature_2m_min;
      const maxStr = maxVal != null ? `${Math.round(Number(maxVal))}°` : '—';
      const minStr = minVal != null ? `${Math.round(Number(minVal))}°` : '—';
      return `<div><span style="font-size: 10px; color: #94A3B8; display: block;">${diaNome}</span><strong style="font-size: 11px; color: #1E293B;">${maxStr} / ${minStr}</strong></div>`;
    }).join('')
    : '<div style="grid-column: 1 / -1; text-align: center; font-size: 11px; color: #94A3B8; padding: 6px;">Previsão estendida indisponível</div>';

  return `
    <div class="dd-wrap">

      <!-- Linha 1: 4 Cards KPIs Fiel ao Figma -->
      <div class="dd-kpi-grid">
        <!-- KPI 1: Condição Geral -->
        <div class="dd-card dd-kpi">
          <span class="dd-label">CONDIÇÃO GERAL</span>
          <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${condDotCor}; display: inline-block;"></span>
            <span style="font-size: 24px; font-weight: 800; color: #1E293B;">${condRotulo}</span>
          </div>
          <span class="dd-caption">Condição do cultivo</span>
        </div>

        <!-- KPI 2: Lotes em Operação -->
        <div class="dd-card dd-kpi">
          <span class="dd-label">LOTES EM OPERAÇÃO</span>
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0 6px;">
            <span style="font-size: 28px; font-weight: 800; color: #1E293B;">${lotesTotal}</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
              <i data-lucide="layout-grid" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <span class="dd-caption">lotes não finalizados</span>
        </div>

        <!-- KPI 3: Alertas Abertos -->
        <div class="dd-card dd-kpi">
          <span class="dd-label">ALERTAS ABERTOS</span>
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0 6px;">
            <span style="font-size: 22px; font-weight: 800; color: #1E293B;" data-kpi="alertas-count">${alertaTexto}</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFBEB; display: flex; align-items: center; justify-content: center; color: #D97706;">
              <i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          ${alertasAbertos > 0
      ? `<div style="display: flex; align-items: center;">
                 <span class="dd-pill dd-pill-amber" style="font-size: 10px; padding: 2px 8px;">Atenção leve</span>
               </div>`
      : `<span class="dd-caption">Nenhum alerta em aberto</span>`
    }
        </div>

        <!-- KPI 4: Irrigação Recomendada Hoje -->
        <div class="dd-card dd-kpi">
          <span class="dd-label">IRRIGAÇÃO RECOMENDADA HOJE</span>
          <div style="margin: 10px 0 6px;">
            <span style="font-size: 22px; font-weight: 800; color: #1E293B;">${irrValor}</span>
          </div>
          <span class="dd-caption">${irrCaption}</span>
        </div>
      </div>

      <!-- Linha 2: Janela de Colheita (com 7 dias) + Condições de Cultivo (com Donut Chart) -->
      <div class="dd-split-grid">
        <!-- Card: Janela Ideal de Colheita -->
        <div class="dd-card dd-card-lg" style="padding: 22px 24px; display: flex; flex-direction: column;">
          <!-- 1. Cabeçalho: título, botões de fruta e ícone -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span class="dd-label">JANELA IDEAL DE COLHEITA</span>
              <div id="janela-fruta-btns" style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${FRUTAS_JANELA_OPCOES.map(fruta => {
      const ativa = fruta === frutaInicialJanela;
      return `<button type="button" class="janela-fruta-btn${ativa ? ' is-active' : ''}" data-fruta="${fruta}" style="padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid ${ativa ? '#059669' : '#E2E8F0'}; background: ${ativa ? '#059669' : '#F8FAFC'}; color: ${ativa ? '#FFFFFF' : '#475569'}; touch-action: manipulation; transition: all 0.15s ease;">${fruta}</button>`;
    }).join('')}
              </div>
            </div>
            <div style="width: 26px; height: 26px; border-radius: 6px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;">
              <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
            </div>
          </div>

          <div id="janela-colheita-corpo" style="display: flex; flex-direction: column; flex: 1; justify-content: space-between; gap: 14px;">
            ${janCorpoHtml}
          </div>
        </div>

        <!-- Card: Condições de Cultivo -->
        <div class="dd-card dd-card-lg" style="padding: 20px 24px; display: flex; flex-direction: column; height: 100%;">
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: #1E293B; margin: 0;">Condições de cultivo</h3>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>Médias das últimas 24 horas</span>
                <span>•</span>
                <span id="sse-origem-badge-detalhado" class="card-status-pill ${isLeituraRecente30m(ultimaLeituraTimestamp) ? 'pill-green' : 'pill-blue'} sse-origem-badge" style="font-size: 10px; padding: 1px 7px;">${isLeituraRecente30m(ultimaLeituraTimestamp) ? 'Sensor Real' : 'Sem dados'}</span>
                <span id="sse-aviso-reconectando-detalhado" class="sse-aviso-reconectando" style="display: none; font-size: 10px; font-weight: 600; color: #D97706; background: #FFFBEB; border: 1px solid #FDE68A; padding: 1px 6px; border-radius: 4px;">Reconectando...</span>
                <span id="sse-horario-leitura-detalhado" class="sse-horario-leitura" style="font-size: 10px; color: #64748B;"></span>
              </div>
            </div>
          </div>

          <!-- 1. Destaque horizontal com barra de progresso -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;">
              <strong style="font-size: 15px; font-weight: 800; color: ${temPctFaixa ? '#1E293B' : '#64748B'};">${pctFaixaTexto}</strong>
              <span style="font-size: 11px; color: #64748B;">${baseLeiturasTexto}</span>
            </div>
            <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 9999px; overflow: hidden;">
              <div style="width: ${pctFaixaNum}%; height: 100%; background: #059669; border-radius: 9999px; transition: width 0.5s ease;"></div>
            </div>
          </div>

          <!-- 2. Três blocos iguais: Umidade do ar, Temperatura do ar e VPD médio -->
          <div class="dd-condicoes-grid">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <span style="font-size: 11px; font-weight: 600; color: #475569;">Umidade do ar (média)</span>
              <strong style="font-size: 20px; font-weight: 800; color: ${temUmidMedia ? '#1E293B' : '#94A3B8'}; margin: 6px 0 4px; line-height: 1.1;">${umidTexto}</strong>
              <span style="font-size: 10px; color: #64748B; line-height: 1.35;">${umidSub}</span>
            </div>

            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <span style="font-size: 11px; font-weight: 600; color: #475569;">Temperatura do ar (média)</span>
              <strong style="font-size: 20px; font-weight: 800; color: ${temTempMedia ? '#1E293B' : '#94A3B8'}; margin: 6px 0 4px; line-height: 1.1;">${tempTexto}</strong>
              <span style="font-size: 10px; color: #64748B; line-height: 1.35;">${tempSub}</span>
            </div>

            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <span style="font-size: 11px; font-weight: 600; color: #475569;">VPD médio</span>
              <strong style="font-size: 20px; font-weight: 800; color: ${temVpdMedio ? '#1E293B' : '#94A3B8'}; margin: 6px 0 4px; line-height: 1.1;">${vpdTexto}</strong>
              <span style="font-size: 10px; color: #64748B; line-height: 1.35;">${vpdSub}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Linha 3: Mercado (com sub-cards estilizados) + Previsão do tempo -->
      <div class="dd-split-grid">
        <!-- Card: Preços de Mercado -->
        <div class="dd-card dd-card-lg" style="padding: 20px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0;">Preços de mercado</h3>
            <span style="font-size: 10.5px; color: #94A3B8;">Melão e Uva: cadastro manual</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px;">
            ${mercadoCardsHtml}
            ${(() => {
      const ptaxIni = _lerPtaxCache();
      const ptaxValTxt = ptaxIni ? `R$ ${ptaxIni.valor.toFixed(2).replace('.', ',')}` : '—';
      const ptaxSubTxt = ptaxIni ? `PTAX Banco Central · ${ptaxIni.dataBr}` : 'PTAX Banco Central';
      return `
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
                  <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Dólar (PTAX)</div>
                  <div id="mercado-dolar-valor" style="font-size: 20px; font-weight: 800; color: #1E293B; line-height: 1.1;">${ptaxValTxt}</div>
                  <div id="mercado-dolar-sub" style="font-size: 10px; color: #94A3B8; margin-top: 4px;">${ptaxSubTxt}</div>
                </div>
              `;
    })()}
          </div>
        </div>

        <!-- Card: Previsão do tempo -->
        <div class="dd-card dd-card-lg" style="padding: 20px 22px;">
          <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0 0 12px;">Previsão do tempo</h3>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1;">${climaTemp}</span>
            <div>
              <div style="font-size: 12.5px; font-weight: 700; color: #1E293B;">${climaDesc}</div>
              <div style="font-size: 10.5px; color: #64748B;">${climaAtual.cidade || 'Open-Meteo'}</div>
            </div>
            <div style="font-size: 10.5px; color: #64748B; line-height: 1.5; text-align: right;">
              <div>${climaUmid}</div>
              <div>${climaVento}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; border-top: 1px solid #F1F5F9; padding-top: 10px; text-align: center;">
            ${climaDiasHtml}
          </div>
        </div>
      </div>

      <!-- Linha 4: Parecer do lote -->
      <div class="dd-card dd-card-lg" style="padding: 20px 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="width: 28px; height: 28px; border-radius: 7px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;">
              <i data-lucide="file-text" style="width: 15px; height: 15px;"></i>
            </div>
            <div>
              <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0;">Parecer do lote</h3>
              <span style="font-size: 11px; color: #64748B;">Consulta sob demanda de análise agronômica e fisiológica</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <select id="select-parecer-lote" aria-label="Selecionar lote" style="padding: 7px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; color: #1E293B; background: #FFFFFF; min-width: 190px; max-width: 100%;"></select>
            <button type="button" id="btn-ver-parecer-lote" style="padding: 8px 14px; border-radius: 8px; border: none; background: #059669; color: #FFFFFF; font-size: 12.5px; font-weight: 600; cursor: pointer; touch-action: manipulation; transition: opacity 0.15s ease;">Ver parecer</button>
          </div>
        </div>
        <div id="parecer-lote-resultado" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #475569; line-height: 1.5;">
          Selecione um lote e clique em "Ver parecer" para consultar.
        </div>
      </div>

      <!-- Linha 5: Próximos passos -->
      <div class="dd-card dd-card-lg" style="padding: 18px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0;">Próximos passos</h3>
          <span style="font-size: 10.5px; color: #64748B;">Com base nos dados do painel</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <!-- 01: Revisar os alertas -->
          <a href="#/alertas" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;">
            <i data-lucide="alert-triangle" style="width: 18px; height: 18px; color: #059669; flex-shrink: 0; margin-top: 2px;"></i>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Revisar os alertas</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">${passoAlertasTexto}</p>
            </div>
          </a>

          <!-- 02: Preparar a colheita -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
            <i data-lucide="calendar" style="width: 18px; height: 18px; color: #059669; flex-shrink: 0; margin-top: 2px;"></i>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Preparar a colheita</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">${passoColheitaTexto}</p>
            </div>
          </div>

          <!-- 03: Acompanhar a irrigação -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #059669; display: inline-block; flex-shrink: 0; margin-top: 6px;"></span>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Acompanhar a irrigação</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">${passoIrrigacaoTexto}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}
/**
 * CONFIGURAÇÃO DOS EVENTOS DO DASHBOARD E RENDERIZAÇÃO DOS 4 GRÁFICOS APPLE STYLE
 */
export async function setupDashboardEvents() {
  const profileRole = auth.getActiveProfile();
  if (profileRole === 'admin') {
    setupAdminDashboardEvents();
    return;
  }
  if (profileRole === 'analista') {
    setupAnalistaDashboardEvents();
    return;
  }

  // Inicia conexão SSE do backend FastAPI (GET http://localhost:8000/dashboard/stream)
  iniciarSSEDashboard();
  liveTelemetry.start();

  if (window.lucide) window.lucide.createIcons();

  // Destrói instâncias anteriores
  chartInstances.forEach(c => c && c.destroy());
  chartInstances = [];

  const dg = dadosGraficosCache || DEFAULT_DADOS_GRAFICOS;

  // Sincroniza estado visual do medidor de resumo
  const arcoResumo = document.getElementById('arco-resumo');
  const txtResumo = document.getElementById('texto-resumo');
  if (arcoResumo && txtResumo) {
    const rawVal = parseFloat(txtResumo.textContent);
    const temVal = Number.isFinite(rawVal) && rawVal > 0;
    const v = temVal ? Math.min(100, Math.max(0, rawVal)) : 0;
    arcoResumo.setAttribute('stroke-dasharray', `${v} 100`);
    arcoResumo.style.display = temVal ? 'inline' : 'none';
    if (!temVal && txtResumo.textContent.trim() !== '—') {
      txtResumo.textContent = '—';
    }
  }

  // Toggle Resumido vs Detalhado com animação fluida Apple
  const toggleBtn = document.getElementById('toggle-dashboard-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const atual = localStorage.getItem('DASHBOARD_MODE') || 'resumido';
      const novo = atual === 'resumido' ? 'detalhado' : 'resumido';
      localStorage.setItem('DASHBOARD_MODE', novo);

      if (novo === 'detalhado') {
        toggleBtn.classList.add('detalhado');
        document.getElementById('toggle-label-text').textContent = 'Detalhado';
      } else {
        toggleBtn.classList.remove('detalhado');
        document.getElementById('toggle-label-text').textContent = 'Resumido';
      }

      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 150);
    });
  }

  // Seletor de período da Telemetria (24h, 7 Dias, 30 Dias)
  document.querySelectorAll('.telemetria-timeframe-selector .timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.telemetria-timeframe-selector .timeframe-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'none';
        b.style.color = '#64748B';
        b.style.boxShadow = 'none';
      });
      btn.classList.add('active');
      btn.style.background = '#fff';
      btn.style.color = '#1E293B';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    });
  });

  // Seletor de fruta na Janela Ideal de Colheita (Detalhado)
  document.querySelectorAll('#janela-fruta-btns .janela-fruta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fruta = btn.getAttribute('data-fruta') || 'Manga';
      document.querySelectorAll('#janela-fruta-btns .janela-fruta-btn').forEach(b => {
        const ativo = b === btn;
        b.classList.toggle('is-active', ativo);
        b.style.background = ativo ? '#059669' : '#F8FAFC';
        b.style.color = ativo ? '#FFFFFF' : '#475569';
        b.style.borderColor = ativo ? '#059669' : '#E2E8F0';
      });
      const corpoEl = document.getElementById('janela-colheita-corpo');
      if (corpoEl) {
        corpoEl.innerHTML = _renderCorpoJanelaColheita(janelasDetalhadoCache, fruta);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  // Seletor de dia na grade da Janela Ideal de Colheita (Detalhado)
  const corpoJanelaEl = document.getElementById('janela-colheita-corpo');
  if (corpoJanelaEl) {
    corpoJanelaEl.addEventListener('click', (e) => {
      const box = e.target.closest('.harvest-day-box[data-dia-idx]');
      if (!box) return;
      const idx = Number(box.getAttribute('data-dia-idx'));
      if (Number.isNaN(idx) || !janelaDiasAtualCache[idx]) return;

      corpoJanelaEl.querySelectorAll('.harvest-day-box').forEach(b => {
        b.classList.toggle('harvest-day-box--selected', b === box);
      });
      const motivoEl = document.getElementById('janela-dia-motivo');
      if (motivoEl) {
        const texto = _textoMotivoDia(janelaDiasAtualCache[idx]);
        motivoEl.textContent = texto;
        motivoEl.style.display = texto ? '' : 'none';
      }
    });
  }

  // Cotação Dólar (PTAX) no card Preços de mercado (sem repetir se já estiver em cache)
  const dolarValEl = document.getElementById('mercado-dolar-valor');
  const dolarSubEl = document.getElementById('mercado-dolar-sub');
  if (dolarValEl && dolarSubEl && !_lerPtaxCache()) {
    _buscarDolarPtax().then(res => {
      if (res && typeof res.valor === 'number') {
        dolarValEl.textContent = `R$ ${res.valor.toFixed(2).replace('.', ',')}`;
        dolarSubEl.textContent = `PTAX Banco Central · ${res.dataBr}`;
      } else {
        dolarValEl.textContent = 'Indisponível';
        dolarSubEl.textContent = 'PTAX Banco Central';
      }
    }).catch(() => {
      dolarValEl.textContent = 'Indisponível';
      dolarSubEl.textContent = 'PTAX Banco Central';
    });
  }

  // Card "Parecer do lote" (Detalhado) — apenas sob clique, sem innerHTML para dados da API
  const selectParecer = document.getElementById('select-parecer-lote');
  const btnParecer = document.getElementById('btn-ver-parecer-lote');
  const resultadoParecer = document.getElementById('parecer-lote-resultado');
  if (selectParecer && btnParecer && resultadoParecer) {
    selectParecer.replaceChildren();
    if (lotesDetalhadoParecerCache.length === 0) {
      const optVazio = document.createElement('option');
      optVazio.value = '';
      optVazio.textContent = 'Nenhum lote elegível';
      selectParecer.appendChild(optVazio);
      selectParecer.disabled = true;
      btnParecer.disabled = true;
      btnParecer.style.opacity = '0.5';
      btnParecer.style.cursor = 'not-allowed';
      resultadoParecer.textContent = 'Nenhum lote em produção ou pronto para colheita disponível.';
    } else {
      lotesDetalhadoParecerCache.forEach(lote => {
        const opt = document.createElement('option');
        opt.value = String(lote.id_lote);
        const frutaTxt = lote.fruta ? String(lote.fruta) : 'Cultura';
        opt.textContent = `Lote #${lote.id_lote} — ${frutaTxt}${lote._temSensor ? ' (com sensores)' : ''}`;
        selectParecer.appendChild(opt);
      });

      let carregandoParecer = false;
      const resolverSeloParecer = (origem, modelo) => {
        const orig = String(origem || '').toUpperCase();
        const mod = String(modelo || '').toLowerCase();
        if (orig === 'SEM_DADOS' || mod === 'sem-dados') {
          return { texto: 'Sem leituras suficientes', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
        }
        if (orig === 'FALLBACK_TEMPLATE' || (orig === 'CACHE' && mod.includes('fallback'))) {
          return { texto: 'Texto automático (sem IA)', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
        }
        return { texto: 'Gerado por IA', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      };

      const criarSecaoTexto = (titulo, texto) => {
        const box = document.createElement('div');
        box.style.marginBottom = '10px';
        const lbl = document.createElement('div');
        lbl.style.fontSize = '11px';
        lbl.style.fontWeight = '700';
        lbl.style.color = '#334155';
        lbl.style.marginBottom = '3px';
        lbl.textContent = titulo;
        const p = document.createElement('p');
        p.style.margin = '0';
        p.style.color = '#1E293B';
        p.textContent = texto || '—';
        box.append(lbl, p);
        return box;
      };

      const criarSecaoLista = (titulo, itens) => {
        const box = document.createElement('div');
        box.style.marginBottom = '10px';
        const lbl = document.createElement('div');
        lbl.style.fontSize = '11px';
        lbl.style.fontWeight = '700';
        lbl.style.color = '#334155';
        lbl.style.marginBottom = '4px';
        lbl.textContent = titulo;
        box.appendChild(lbl);
        const lista = Array.isArray(itens) && itens.length > 0 ? itens : ['—'];
        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.paddingLeft = '18px';
        ul.style.color = '#1E293B';
        lista.forEach(item => {
          const li = document.createElement('li');
          li.style.marginBottom = '2px';
          li.textContent = String(item);
          ul.appendChild(li);
        });
        box.appendChild(ul);
        return box;
      };

      btnParecer.addEventListener('click', async () => {
        if (carregandoParecer) return;
        const idLote = Number(selectParecer.value);
        if (!idLote) return;

        carregandoParecer = true;
        btnParecer.disabled = true;
        selectParecer.disabled = true;
        btnParecer.textContent = 'Carregando...';
        btnParecer.style.opacity = '0.7';
        btnParecer.style.cursor = 'wait';
        resultadoParecer.textContent = 'Consultando parecer do lote...';

        try {
          const res = await api.getParecerIA(idLote);
          const conteudo = res?.conteudo || {};
          const seloInfo = resolverSeloParecer(res?.origem, res?.modelo);

          const wrap = document.createElement('div');

          // Cabeçalho do resultado: selo + confiança + data de geração
          const topo = document.createElement('div');
          topo.style.display = 'flex';
          topo.style.alignItems = 'center';
          topo.style.justifyContent = 'space-between';
          topo.style.flexWrap = 'wrap';
          topo.style.gap = '8px';
          topo.style.marginBottom = '12px';
          topo.style.paddingBottom = '10px';
          topo.style.borderBottom = '1px solid #E2E8F0';

          const badgesWrap = document.createElement('div');
          badgesWrap.style.display = 'flex';
          badgesWrap.style.alignItems = 'center';
          badgesWrap.style.gap = '8px';
          badgesWrap.style.flexWrap = 'wrap';

          const seloEl = document.createElement('span');
          seloEl.style.fontSize = '11px';
          seloEl.style.fontWeight = '700';
          seloEl.style.padding = '3px 9px';
          seloEl.style.borderRadius = '999px';
          seloEl.style.background = seloInfo.bg;
          seloEl.style.color = seloInfo.color;
          seloEl.style.border = `1px solid ${seloInfo.border}`;
          seloEl.textContent = seloInfo.texto;

          const confEl = document.createElement('span');
          confEl.style.fontSize = '11px';
          confEl.style.fontWeight = '600';
          confEl.style.color = '#334155';
          confEl.textContent = `Confiança: ${conteudo.nivel_confianca || '—'}`;

          badgesWrap.append(seloEl, confEl);

          const dataEl = document.createElement('span');
          dataEl.style.fontSize = '11px';
          dataEl.style.color = '#64748B';
          dataEl.textContent = `Gerado em: ${res?.data_geracao ? formatarTimestampRecife(res.data_geracao) : '—'}`;

          topo.append(badgesWrap, dataEl);
          wrap.appendChild(topo);

          wrap.appendChild(criarSecaoTexto('Parecer agronômico', conteudo.parecer_agronomico));
          wrap.appendChild(criarSecaoTexto('Parecer fisiológico', conteudo.parecer_fisiologico));
          wrap.appendChild(criarSecaoLista('Recomendações', conteudo.recomendacoes));
          wrap.appendChild(criarSecaoLista('Limitações', conteudo.limitacoes));

          resultadoParecer.replaceChildren(wrap);
        } catch (err) {
          console.error('Erro ao obter parecer do lote:', err);
          const detalhe = err?.message ? ` (${err.message})` : '';
          resultadoParecer.textContent = `Não foi possível obter o parecer${detalhe}. Tente novamente.`;
        } finally {
          carregandoParecer = false;
          btnParecer.disabled = false;
          selectParecer.disabled = false;
          btnParecer.textContent = 'Ver parecer';
          btnParecer.style.opacity = '1';
          btnParecer.style.cursor = 'pointer';
        }
      });
    }
  }

  // Mapa Interativo de Satélite com Leaflet (Esri World Imagery + fallback OSM e foto estática)
  const mapEl = document.getElementById('leaflet-propriedade-map');
  const mapViewport = document.getElementById('satellite-map-viewport');
  const mapFallback = document.getElementById('satellite-map-fallback');
  const btnZoomIn = document.getElementById('btn-map-zoom-in');
  const btnZoomOut = document.getElementById('btn-map-zoom-out');
  const btnFullscreen = document.getElementById('btn-map-fullscreen');

  if (window._propriedadeLeafletMap) {
    try { window._propriedadeLeafletMap.remove(); } catch (_) { }
    window._propriedadeLeafletMap = null;
  }

  if (mapEl && mapViewport && typeof window.L !== 'undefined') {
    try {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const map = window.L.map(mapEl, {
        center: [MAPA_PROPRIEDADE_LAT, MAPA_PROPRIEDADE_LNG],
        zoom: MAPA_PROPRIEDADE_ZOOM,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !isTouch,
        touchZoom: true
      });
      window._propriedadeLeafletMap = map;

      const esriLayer = window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19
        }
      );
      const osmLayer = window.L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      );

      let osmFallbackUsado = false;
      esriLayer.on('tileerror', () => {
        if (!osmFallbackUsado) {
          osmFallbackUsado = true;
          try {
            map.removeLayer(esriLayer);
            osmLayer.addTo(map);
          } catch (_) { }
        }
      });
      esriLayer.addTo(map);

      const criarMarcadorSensor = (lat, lng, texto, corHex, bordaRgba) => {
        const icon = window.L.divIcon({
          className: '',
          iconSize: null,
          html: `<div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #FFFFFF; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; border: 1px solid ${bordaRgba}; transform: translate(-50%, -50%);"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${corHex}; flex-shrink: 0;"></span><span>${texto}</span></div>`
        });
        return window.L.marker([lat, lng], { icon }).addTo(map);
      };

      criarMarcadorSensor(
        MAPA_PROPRIEDADE_LAT + 0.00018,
        MAPA_PROPRIEDADE_LNG - 0.00022,
        'DHT11 ESP32-C3 (ar)',
        '#10B981',
        'rgba(16, 185, 129, 0.6)'
      );
      criarMarcadorSensor(
        MAPA_PROPRIEDADE_LAT - 0.00018,
        MAPA_PROPRIEDADE_LNG + 0.00022,
        'Solo · em calibração',
        '#0EA5E9',
        'rgba(14, 165, 233, 0.6)'
      );

      if (mapFallback) mapFallback.style.display = 'none';

      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          map.zoomIn();
        });
      }
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          map.zoomOut();
        });
      }
      if (btnFullscreen) {
        btnFullscreen.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          map.setView([MAPA_PROPRIEDADE_LAT, MAPA_PROPRIEDADE_LNG], MAPA_PROPRIEDADE_ZOOM);
        });
      }

      // No celular: 1 dedo rola a página; 2 dedos movem o mapa
      if (isTouch) {
        mapEl.addEventListener('touchstart', (e) => {
          if (e.touches.length >= 2) {
            map.dragging.enable();
          } else {
            map.dragging.disable();
          }
        }, { passive: true });
        mapEl.addEventListener('touchend', (e) => {
          if (e.touches.length < 2) {
            map.dragging.disable();
          }
        }, { passive: true });
      }

      const atualizarTamanhoMapa = () => {
        try {
          if (document.body.contains(mapEl)) {
            map.invalidateSize();
          }
        } catch (_) { }
      };
      setTimeout(atualizarTamanhoMapa, 150);
      window.addEventListener('resize', atualizarTamanhoMapa);
      if (typeof ResizeObserver !== 'undefined') {
        try {
          const ro = new ResizeObserver(atualizarTamanhoMapa);
          ro.observe(mapViewport);
        } catch (_) { }
      }
    } catch (_) {
      mapEl.style.display = 'none';
      if (mapFallback) mapFallback.style.display = 'block';
    }
  } else if (mapEl && mapFallback) {
    mapEl.style.display = 'none';
    mapFallback.style.display = 'block';
  }

  // Gera curvas suaves com os dados reais de series-24h (ou mostra aviso se as listas vierem vazias)
  const isResumidoCurrent = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
  const ptsUar = Array.isArray(dg.umidade_ar_24h) ? dg.umidade_ar_24h : [];
  const ptsUsolo = Array.isArray(dg.umidade_solo_24h) ? dg.umidade_solo_24h : [];
  const ptsTar = Array.isArray(dg.temp_ar_24h) ? dg.temp_ar_24h : [];

  if (isResumidoCurrent) {
    criarMiniGraficoApple('miniChart1', ptsUar, '#10B981', 'Sem leituras no período');
    if (SONDA_SOLO_INSTALADA) {
      criarMiniGraficoApple('miniChart2', ptsUsolo, '#0D9488', 'Sem dados no período');
    }
    criarMiniGraficoApple('miniChart4', ptsTar, '#16A34A', 'Sem leituras no período');
  } else {
    // No modo Detalhado, os gráficos são em tom verde esmeralda com pontos conforme Figma
    criarMiniGraficoApple('miniChart1', ptsUar, '#10B981', 'Sem leituras no período');
    if (SONDA_SOLO_INSTALADA) {
      criarMiniGraficoApple('miniChart2', ptsUsolo, '#10B981', 'Sem dados no período');
    }
    criarMiniGraficoApple('miniChart4', ptsTar, '#10B981', 'Sem leituras no período');
  }

  // Modal para Editar Dados e Gráficos (Salva no PostgreSQL e atualiza os gráficos)
  document.querySelectorAll('.btn-editar-dados-graficos').forEach(btn => {
    btn.addEventListener('click', () => {
      const cur = dadosGraficosCache || DEFAULT_DADOS_GRAFICOS;
      Modal.open('Editar Dados e Séries dos Gráficos (Persistência PostgreSQL)', `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px; color:#334155;">
          <p style="margin:0; color:#64748B; line-height:1.4;">
            Altere os indicadores operacionais e os pontos das séries de telemetria (valores separados por vírgula). Tudo será salvo no banco de dados PostgreSQL e refletido imediatamente nos gráficos.
          </p>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Conformidade (%)</label>
              <input id="inp-dg-conf" type="number" min="0" max="100" value="${cur.conformidade_geral_pct ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Saúde NDVI (%)</label>
              <input id="inp-dg-saude" type="number" min="0" max="100" value="${cur.saude_plantacao_pct ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Umidade Dossel (%)</label>
              <input id="inp-dg-dossel" type="number" min="0" max="100" value="${cur.umidade_dossel_pct ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Temp. Foliar (°C)</label>
              <input id="inp-dg-tfoliar" type="number" step="0.1" value="${cur.temp_foliar_c ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Status Água (%)</label>
              <input id="inp-dg-agua" type="number" min="0" max="100" value="${cur.agua_reservatorio_pct ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Vazão (L/dia)</label>
              <input id="inp-dg-vazao" type="number" step="50" value="${cur.vazao_ldia ?? ''}" placeholder="Sem dados" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
          </div>

          <div>
            <label style="display:block; font-weight:700; margin-bottom:4px;">Série Gráfico 1 — Umidade do Ar 24h (%)</label>
            <input id="inp-dg-uar" type="text" value="${(cur.umidade_ar_24h || []).join(', ')}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px; font-family:monospace;">
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:4px;">Série Gráfico 2 — Umidade do Solo 24h (%)</label>
            <input id="inp-dg-usolo" type="text" value="${(cur.umidade_solo_24h || []).join(', ')}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px; font-family:monospace;">
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:4px;">Série Gráfico 3 — Temperatura do Ar 24h (°C)</label>
            <input id="inp-dg-tar" type="text" value="${(cur.temp_ar_24h || []).join(', ')}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px; font-family:monospace;">
          </div>
        </div>
      `, async () => {
        const parseSeries = (str, fallback) => {
          const arr = String(str || '')
            .split(',')
            .map(s => parseFloat(s.trim()))
            .filter(n => !Number.isNaN(n));
          return arr.length >= 2 ? arr : fallback;
        };

        const payload = {
          conformidade_geral_pct: Number(document.getElementById('inp-dg-conf')?.value || 90),
          saude_plantacao_pct: document.getElementById('inp-dg-saude')?.value ? Number(document.getElementById('inp-dg-saude').value) : null,
          umidade_dossel_pct: document.getElementById('inp-dg-dossel')?.value ? Number(document.getElementById('inp-dg-dossel').value) : null,
          temp_foliar_c: document.getElementById('inp-dg-tfoliar')?.value ? Number(document.getElementById('inp-dg-tfoliar').value) : null,
          agua_reservatorio_pct: Number(document.getElementById('inp-dg-agua')?.value || 63),
          vazao_ldia: Number(document.getElementById('inp-dg-vazao')?.value || 4200),
          umidade_ar_24h: parseSeries(document.getElementById('inp-dg-uar')?.value, cur.umidade_ar_24h),
          umidade_solo_24h: parseSeries(document.getElementById('inp-dg-usolo')?.value, cur.umidade_solo_24h),
          temp_ar_24h: parseSeries(document.getElementById('inp-dg-tar')?.value, cur.temp_ar_24h)
        };

        try {
          const saved = await api.salvarDadosGraficos(payload);
          dadosGraficosCache = { ...DEFAULT_DADOS_GRAFICOS, ...saved };
          toast.success('Gráficos Salvos no PostgreSQL', 'As séries e indicadores foram persistidos no banco de dados e atualizados.');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          return true;
        } catch (err) {
          toast.error('Erro ao Salvar Gráficos', err.message || 'Falha de comunicação com o servidor backend.');
          return false;
        }
      }, 'Salvar no Banco');
    });
  });

  // Interatividade nos seletores de período de telemetria (24h, 7d, 30d)
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.timeframe-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'none';
        b.style.color = '#64748B';
        b.style.boxShadow = 'none';
      });
      const t = e.currentTarget;
      t.classList.add('active');
      t.style.background = '#fff';
      t.style.color = '#1E293B';
      t.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';

      const tf = t.dataset.tf;
      chartInstances.forEach(c => c && c.destroy());
      chartInstances = [];

      const cur = dadosGraficosCache || DEFAULT_DADOS_GRAFICOS;
      const temSeries24h = (Array.isArray(cur.umidade_ar_24h) && cur.umidade_ar_24h.length > 0)
        || (Array.isArray(cur.temp_ar_24h) && cur.temp_ar_24h.length > 0);

      if (temSeries24h && tf === '24h') {
        criarMiniGraficoApple('miniChart1', cur.umidade_ar_24h || [], '#10B981', 'Sem leituras no período');
        criarMiniGraficoApple('miniChart4', cur.temp_ar_24h || [], '#16A34A', 'Sem leituras no período');
      } else {
        criarMiniGraficoApple('miniChart1', [], '#10B981', 'Sem leituras no período');
        criarMiniGraficoApple('miniChart4', [], '#16A34A', 'Sem leituras no período');
      }

      // Umidade do Solo: sempre busca diretamente do sensor 3 no período escolhido (24h, 7d, 30d)
      if (SONDA_SOLO_INSTALADA) {
        let ptsSoloTf = [];
        try {
          const soloRes = await api.getSensorLeituras(SENSOR_SOLO_ID, tf);
          ptsSoloTf = extrairSerieUmidadeSolo(soloRes);
        } catch (errSolo) {
          console.warn('[Dashboard] Falha ao buscar leituras de solo para', tf, errSolo);
        }
        const isResumidoTf = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
        criarMiniGraficoApple('miniChart2', ptsSoloTf, isResumidoTf ? '#0D9488' : '#10B981', 'Sem dados no período');
        const elPillSolo = document.getElementById('miniChart2-pill');
        if (elPillSolo) {
          if (ptsSoloTf.length > 0) {
            elPillSolo.textContent = `${Math.round(ptsSoloTf[ptsSoloTf.length - 1])}%`;
            elPillSolo.classList.remove('pill-blue');
            elPillSolo.classList.add('pill-green');
          } else {
            elPillSolo.textContent = 'Sem dados';
            elPillSolo.classList.remove('pill-green');
            elPillSolo.classList.add('pill-blue');
          }
        }
      }
    });
  });
}

/**
 * Função de renderização de gráficos Chart.js refinados com estética Apple em Alta Resolução (Retina DPI)
 */
function criarMiniGraficoApple(canvasId, dataPoints, strokeColor, mensagemVazio = 'Sem leituras no período') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    if (window.Chart && typeof window.Chart.getChart === 'function') {
      const existingChart = window.Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();
    }
    canvas.style.display = 'none';
    if (parent) {
      let noDataEl = parent.querySelector('.grafico-sem-dados');
      if (!noDataEl) {
        noDataEl = document.createElement('div');
        noDataEl.className = 'grafico-sem-dados';
        noDataEl.style.cssText = 'height: 100%; min-height: 48px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94A3B8; font-style: italic;';
        parent.appendChild(noDataEl);
      }
      noDataEl.textContent = mensagemVazio;
    }
    return;
  }

  if (parent) {
    const existing = parent.querySelector('.grafico-sem-dados');
    if (existing) existing.remove();
    canvas.style.display = 'block';
  }
  if (typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const isDetalhado = localStorage.getItem('DASHBOARD_MODE') === 'detalhado';

  // Gradiente suave de preenchimento Apple
  const gradient = ctx.createLinearGradient(0, 0, 0, 80);
  gradient.addColorStop(0, strokeColor + '35'); // opacidade no topo
  gradient.addColorStop(1, strokeColor + '00'); // 0% opacidade na base

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataPoints.map((_, i) => i),
      datasets: [{
        data: dataPoints,
        borderColor: strokeColor,
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.45,
        pointRadius: isDetalhado ? 2.5 : 0,
        pointBackgroundColor: strokeColor,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: strokeColor,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      layout: {
        padding: {
          top: 6,
          bottom: 2,
          left: 4,
          right: 4
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: 8,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: () => '',
            label: (ctx) => `Leitura: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          min: Math.min(...dataPoints) * 0.96,
          max: Math.max(...dataPoints) * 1.04
        }
      }
    }
  });

  chartInstances.push(chart);
}

/**
 * CONFIGURAÇÃO DOS EVENTOS INTERATIVOS DO DASHBOARD DO ANALISTA
 */
function setupAnalistaDashboardEvents() {
  const toggleBtn = document.getElementById('toggle-dashboard-mode');
  if (toggleBtn) toggleBtn.remove();

  iniciarSSEDashboard();
  liveTelemetry.start();

  if (window.lucide) window.lucide.createIcons();

  // Botão Atualizar Telemetria
  const btnSync = document.getElementById('btn-sync-telemetria');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      const icon = btnSync.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      btnSync.style.opacity = '0.7';

      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        toast.success('Telemetria Atualizada', 'Dados mais recentes sincronizados com o backend.');
      }, 700);
    });
  }

  // Exportar Telemetria (CSV & PDF a partir de GET /leituras?limit=100)
  const btnExport = document.getElementById('btn-export-telemetria');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      const originalHtml = btnExport.innerHTML;
      btnExport.disabled = true;
      try {
        const resLeituras = await api.getLeituras(100);
        const lista = extrairArraySeguro(resLeituras);
        if (lista.length === 0) {
          toast.info('Sem dados', 'Nenhuma leitura real disponível para exportar.');
          return;
        }
        const headers = ['Data/Hora (Recife)', 'ID Sensor', 'Temp Ar (°C)', 'Umidade Ar (%)', 'Umidade Solo (%)', 'Origem'];
        const rows = lista.map(l => [
          formatarDataRecife(l.data_hora),
          l.id_sensor ?? l.fk_sensor_id_sensor ?? '—',
          l.temperatura != null ? Number(l.temperatura).toFixed(1) : '—',
          l.umidade != null ? Number(l.umidade).toFixed(1) : '—',
          l.umidade_solo != null ? Number(l.umidade_solo).toFixed(1) : '—',
          l.origem || '—'
        ]);
        const dataTag = new Date().toISOString().slice(0, 10);
        openExportChoiceModal(
          Modal,
          'Exportar Telemetria IoT (Leituras Reais)',
          () => {
            downloadCSV(`telemetria_iot_${dataTag}.csv`, headers, rows);
            toast.success('Download CSV Concluído', `telemetria_iot_${dataTag}.csv baixado com ${rows.length} leitura(s).`);
          },
          () => {
            downloadPDF(`telemetria_iot_${dataTag}.pdf`, {
              title: 'Relatório de Telemetria IoT',
              subtitle: `Últimas ${rows.length} leituras registradas via API (GET /leituras)`,
              headers,
              rows
            });
            toast.success('Download PDF Concluído', `telemetria_iot_${dataTag}.pdf baixado com ${rows.length} leitura(s).`);
          }
        );
      } catch (err) {
        toast.error('Erro na Exportação', err?.message || 'Não foi possível carregar as leituras da API.');
      } finally {
        btnExport.disabled = false;
        btnExport.innerHTML = originalHtml;
      }
    });
  }

  // Filtros de Nós no Mapa da Topologia
  const filterTabs = document.querySelectorAll('.map-tab-btn[data-filter]');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      filterTabs.forEach(t => t.classList.remove('active'));
      const clicked = e.currentTarget;
      clicked.classList.add('active');
      const filter = clicked.dataset.filter;

      const markers = document.querySelectorAll('.sensor-pin-marker');
      markers.forEach(m => {
        const tipo = m.dataset.tipo;
        const estado = m.dataset.estado;
        if (filter === 'todos') {
          m.style.display = 'flex';
        } else if (filter === 'solo') {
          m.style.display = tipo === 'solo' ? 'flex' : 'none';
        } else if (filter === 'ar') {
          m.style.display = tipo === 'ar' ? 'flex' : 'none';
        } else if (filter === 'alerta') {
          m.style.display = (estado === 'atencao' || estado === 'rejeicao') ? 'flex' : 'none';
        }
      });
    });
  });

  // Interatividade nos Pinos do Mapa
  document.querySelectorAll('.sensor-pin-marker[data-sensor-id]').forEach(pin => {
    pin.addEventListener('click', (e) => {
      const sensorId = e.currentTarget.dataset.sensorId;
      const s = analistaDashboardData.topologia?.sensores?.find(item => String(item.id_sensor) === String(sensorId));
      if (!s) return;

      const ambLabel = s.ambiente === 'solo' ? 'Umidade do Solo' : 'Microclima / Ar';
      const estadoLabel = s.estado_mapa === 'ativo' ? 'Ativo' : (s.estado_mapa === 'atencao' ? 'Atenção' : 'Rejeição');
      const tempVal = s.temperatura != null ? `${Number(s.temperatura).toFixed(1)}°C` : '—';
      const umidRawModal = s.ambiente === 'solo' ? (s.umidade_solo ?? s.umidade) : s.umidade;
      const umidVal = umidRawModal != null ? `${Number(umidRawModal).toFixed(1)}%` : '—';
      const temTelemetriaReal = s.origem_telemetria === 'real'
        || s.ultima_leitura != null
        || s.temperatura != null
        || umidRawModal != null;
      const origemBadge = temTelemetriaReal
        ? '<span style="background:#ECFDF5; color:#065F46; padding:2px 8px; border-radius:6px; font-weight:700; font-size:10px;">Real</span>'
        : '<span style="background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:6px; font-weight:700; font-size:10px;">Sem dados</span>';
      const ultimaLeituraModal = s.ultima_leitura
        ? (formatarDataHoraRecife(s.ultima_leitura, true) || formatarDataRecife(s.ultima_leitura))
        : '—';

      const motivoHtml = s.motivo_rejeicao ? `
        <div style="background:#FEE2E2; border:1px solid #FCA5A5; color:#991B1B; padding:10px 12px; border-radius:8px; margin-top:12px; font-size:12px;">
          <strong>Motivo de Rejeição:</strong> ${s.motivo_rejeicao}
        </div>
      ` : '';

      Modal.open(`Sensor ${s.codigo || s.nome}`, `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#0F172A;">${s.nome}</div>
            <div style="font-size:11px; color:#64748B;">Código: <strong>${s.codigo || '—'}</strong> • Tipo: ${s.tipo_sensor || ambLabel}</div>
          </div>
          <div>${origemBadge}</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#64748B;">Temperatura</div>
            <div style="font-size:18px; font-weight:700; color:#059669;">${tempVal}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#64748B;">Umidade</div>
            <div style="font-size:18px; font-weight:700; color:#0284C7;">${umidVal}</div>
          </div>
        </div>
        <div style="font-size:11px; color:#475569; line-height:1.6;">
          <strong>Ambiente:</strong> ${ambLabel}<br>
          <strong>Estado no Mapa:</strong> ${estadoLabel}<br>
          <strong>Lote:</strong> ${s.id_lote ? 'Lote #' + s.id_lote : '—'}<br>
          <strong>Última Leitura:</strong> ${ultimaLeituraModal}
        </div>
        ${motivoHtml}
      `);
    });
  });

  // Interatividade no Gateway Central
  const gatewayMarker = document.querySelector('[data-node="gateway"]');
  if (gatewayMarker) {
    gatewayMarker.addEventListener('click', () => {
      const prop = analistaDashboardData.topologia?.propriedade || {};
      Modal.open(`Gateway — ${prop.nome || 'Propriedade'}`, `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <div style="width:44px; height:44px; border-radius:50%; background:#183D2E; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800;">GW</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:#0F172A;">${prop.nome || 'Gateway Central'}</div>
            <div style="font-size:11px; color:#059669; font-weight:600;">${prop.local || 'Localização central'}</div>
          </div>
        </div>
        <div style="font-size:12px; color:#475569; line-height:1.6;">
          <strong>Área de Cobertura:</strong> ${prop.area_ha || 0} ha<br>
          <strong>Latitude:</strong> ${prop.gateway_lat ?? '—'}<br>
          <strong>Longitude:</strong> ${prop.gateway_lng ?? '—'}
        </div>
      `);
    });
  }

  // Controles de Zoom do Mapa
  let zoomLevel = 1;
  const mapImg = document.querySelector('.map-view-bg');
  const btnZoomIn = document.getElementById('zoom-in-btn');
  const btnZoomOut = document.getElementById('zoom-out-btn');
  if (btnZoomIn && mapImg) {
    btnZoomIn.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel + 0.15, 1.6);
      mapImg.style.transform = `scale(${zoomLevel})`;
      mapImg.style.transition = 'transform 0.3s ease';
    });
  }
  if (btnZoomOut && mapImg) {
    btnZoomOut.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel - 0.15, 1);
      mapImg.style.transform = `scale(${zoomLevel})`;
      mapImg.style.transition = 'transform 0.3s ease';
    });
  }

  // Ver Leituras Rejeitadas deste Sensor (Modal com Paginação via limit/offset)
  document.querySelectorAll('.btn-ver-rejeitadas-sensor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const sensorId = e.currentTarget.dataset.sensorId;
      const sensorNome = e.currentTarget.dataset.sensorNome || `Sensor #${sensorId}`;
      let currentOffset = 0;
      const pageSize = 5;

      async function carregarTabela(offset) {
        try {
          const listaRaw = await api.getLeiturasRejeitadas({ id_sensor: sensorId, limit: pageSize, offset });
          let lista = extrairArraySeguro(listaRaw);

          let linhas = '';
          if (!lista || lista.length === 0) {
            linhas = '<tr><td colspan="4" style="text-align:center; padding:14px; color:#64748B;">Nenhuma leitura rejeitada encontrada nesta página.</td></tr>';
          } else {
            linhas = lista.map(item => `
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:8px; font-size:11px; color:#0F172A;">${formatarDataRecife(item.data_rejeicao || item.data_hora_bruta)}</td>
                <td style="padding:8px; font-size:11px; color:#B91C1C; font-weight:600;">${item.motivo || '—'}</td>
                <td style="padding:8px; font-size:11px; color:#475569;">${[item.temperatura_bruta != null ? item.temperatura_bruta + '°C' : '', item.umidade_bruta != null ? item.umidade_bruta + '%' : ''].filter(Boolean).join(' • ') || '—'}</td>
                <td style="padding:8px; font-size:11px; color:#64748B;">${item.origem || '—'}</td>
              </tr>
            `).join('');
          }

          const conteudoModal = `
            <div style="font-size:12px; color:#64748B; margin-bottom:12px;">Histórico de rejeições filtradas para <strong>${sensorNome}</strong> (ID: ${sensorId}).</div>
            <div style="overflow-x:auto; max-height:300px; border:1px solid #E2E8F0; border-radius:8px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="background:#F8FAFC; border-bottom:1px solid #E2E8F0; font-size:11px; color:#475569;">
                    <th style="padding:8px;">Data/Hora</th>
                    <th style="padding:8px;">Motivo</th>
                    <th style="padding:8px;">Bruto</th>
                    <th style="padding:8px;">Origem</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
              <button id="modal-pag-ant" style="padding:5px 12px; border:1px solid #CBD5E1; background:${offset > 0 ? '#fff' : '#F1F5F9'}; color:${offset > 0 ? '#0F172A' : '#94A3B8'}; border-radius:6px; font-size:11px; cursor:${offset > 0 ? 'pointer' : 'not-allowed'};" ${offset === 0 ? 'disabled' : ''}>&larr; Anterior</button>
              <span style="font-size:11px; color:#64748B;">Página ${Math.floor(offset / pageSize) + 1}</span>
              <button id="modal-pag-prox" style="padding:5px 12px; border:1px solid #CBD5E1; background:${lista && lista.length === pageSize ? '#fff' : '#F1F5F9'}; color:${lista && lista.length === pageSize ? '#0F172A' : '#94A3B8'}; border-radius:6px; font-size:11px; cursor:${lista && lista.length === pageSize ? 'pointer' : 'not-allowed'};" ${(!lista || lista.length < pageSize) ? 'disabled' : ''}>Próxima &rarr;</button>
            </div>
          `;

          Modal.open(`Leituras Rejeitadas — ${sensorNome}`, conteudoModal);

          const btnAnt = document.getElementById('modal-pag-ant');
          const btnProx = document.getElementById('modal-pag-prox');
          if (btnAnt && offset > 0) {
            btnAnt.onclick = () => {
              currentOffset = Math.max(0, currentOffset - pageSize);
              carregarTabela(currentOffset);
            };
          }
          if (btnProx && lista && lista.length === pageSize) {
            btnProx.onclick = () => {
              currentOffset += pageSize;
              carregarTabela(currentOffset);
            };
          }
        } catch (err) {
          toast.error('Erro ao Carregar', err.message || 'Falha ao buscar leituras rejeitadas');
        }
      }

      carregarTabela(0);
    });
  });

  // Editor de Cortes Preditivos (PUT /alertas-preditivos/cortes/{nivel})
  document.querySelectorAll('.btn-editar-corte').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const nivel = e.currentTarget.dataset.nivel;
      const row = document.querySelector(`.corte-row[data-nivel="${nivel}"]`);
      if (row) {
        row.querySelector('.corte-view-mode').style.display = 'none';
        row.querySelector('.corte-edit-mode').style.display = 'flex';
      }
    });
  });

  document.querySelectorAll('.btn-cancelar-corte').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const nivel = e.currentTarget.dataset.nivel;
      const row = document.querySelector(`.corte-row[data-nivel="${nivel}"]`);
      if (row) {
        row.querySelector('.corte-edit-mode').style.display = 'none';
        row.querySelector('.corte-view-mode').style.display = 'flex';
      }
    });
  });

  document.querySelectorAll('.btn-salvar-corte').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const nivel = e.currentTarget.dataset.nivel;
      const row = document.querySelector(`.corte-row[data-nivel="${nivel}"]`);
      if (!row) return;

      const inputMin = row.querySelector('.input-corte-min');
      const inputMax = row.querySelector('.input-corte-max');
      const inputAcao = row.querySelector('.input-corte-acao');

      const minVal = Number(inputMin.value);
      const maxVal = Number(inputMax.value);
      const acaoVal = (inputAcao.value || '').trim();

      // Validação no cliente: 0 <= min < max <= 100
      if (isNaN(minVal) || isNaN(maxVal) || minVal < 0 || maxVal > 100 || minVal >= maxVal) {
        toast.error('Validação de Limiares', 'O limiar mínimo deve ser menor que o máximo e estar entre 0% e 100%.');
        return;
      }

      const payload = {
        limiar_min: Number((minVal / 100).toFixed(4)),
        limiar_max: Number((maxVal / 100).toFixed(4)),
        acao_recomendada: acaoVal
      };

      btn.disabled = true;
      btn.textContent = 'Salvando...';

      try {
        await api.putCortePreditivo(nivel, payload);
        toast.success('Corte Atualizado', `Limiares para nível ${nivel} atualizados com sucesso.`);

        const idx = (analistaDashboardData.cortes || []).findIndex(c => c.nivel === nivel);
        if (idx !== -1) {
          analistaDashboardData.cortes[idx].limiar_min = payload.limiar_min;
          analistaDashboardData.cortes[idx].limiar_max = payload.limiar_max;
          analistaDashboardData.cortes[idx].acao_recomendada = payload.acao_recomendada;
        }

        const viewMode = row.querySelector('.corte-view-mode');
        viewMode.querySelector('span:nth-child(2)').textContent = `${minVal}% a ${maxVal}%`;
        viewMode.querySelector('div:nth-child(2)').textContent = acaoVal || 'Nenhuma ação recomendada configurada.';

        row.querySelector('.corte-edit-mode').style.display = 'none';
        viewMode.style.display = 'flex';
      } catch (err) {
        console.error('Erro ao atualizar corte:', err);
        if (err.status === 409) {
          toast.error('Conflito de Faixas', err.detail || 'A faixa informada sobrepõe outro corte existente.');
        } else if (err.status === 403) {
          toast.error('Acesso Negado', err.detail || 'Você não tem permissão para alterar limiares.');
          row.querySelector('.corte-edit-mode').style.display = 'none';
          row.querySelector('.corte-view-mode').style.display = 'flex';
        } else if (err.status === 422) {
          toast.error('Erro de Validação', err.detail || 'Parâmetros inválidos enviados ao backend.');
        } else {
          toast.error('Erro ao Salvar', err.detail || err.message || 'Falha na comunicação com o backend.');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    });
  });
}

/**
 * 3. DASHBOARD DO ADMINISTRADOR (FIGMA MOCKUP 1: LORENA LIRA)
 * Visão Geral do Sistema com Governança, Lotes, Sensores, Conformidade e Atividade 24h
 */
let _adminDashState = { leiturasGrafico: null, pontosAr: [], pontosSolo: [] };

async function renderAdminDashboard() {
  const [resResumo, resUsuarios, resLotes, resRegras, resLogs, resPortos, resLeituras, resSensores] = await Promise.allSettled([
    api.getDashboardResumo(),
    api.getUsuarios(),
    api.getLotes(),
    api.getConfigParametros(),
    api.getAuditoria({ limit: 4 }),
    api.getPortos(),
    api.getLeituras(24),
    api.getSensores()
  ]);

  const resumo = resResumo.status === 'fulfilled' && resResumo.value ? resResumo.value : {};
  const usuarios = resUsuarios.status === 'fulfilled' && Array.isArray(resUsuarios.value) ? resUsuarios.value : [];
  const lotes = resLotes.status === 'fulfilled' && Array.isArray(resLotes.value) ? resLotes.value : [];
  const regras = resRegras.status === 'fulfilled' && Array.isArray(resRegras.value) ? resRegras.value : [];
  const logs = resLogs.status === 'fulfilled' && Array.isArray(resLogs.value) ? resLogs.value : [];
  const portos = resPortos.status === 'fulfilled' && Array.isArray(resPortos.value) ? resPortos.value : [];
  const leituras = resLeituras.status === 'fulfilled' && Array.isArray(resLeituras.value) ? resLeituras.value : [];
  const sensoresLista = resSensores.status === 'fulfilled'
    ? (Array.isArray(resSensores.value) ? resSensores.value : (resSensores.value?.sensores || []))
    : [];

  // Mesma fonte agregada de 24h da tela de Sensores (priorizando sensores com telemetria ativa)
  const sensorAr =
    sensoresLista.find(s => String(s?.ambiente || '').toLowerCase() === 'ar' && s?.ultima_leitura) ||
    sensoresLista.find(s => String(s?.ambiente || '').toLowerCase() === 'ar');
  const sensorSolo =
    sensoresLista.find(s => String(s?.ambiente || '').toLowerCase() === 'solo' && s?.ultima_leitura) ||
    sensoresLista.find(s => String(s?.ambiente || '').toLowerCase() === 'solo');

  const [resPtsAr, resPtsSolo] = await Promise.allSettled([
    sensorAr ? api.getSensorLeituras(sensorAr.id_sensor, '24h') : Promise.resolve({ pontos: [] }),
    sensorSolo ? api.getSensorLeituras(sensorSolo.id_sensor, '24h') : Promise.resolve({ pontos: [] })
  ]);

  const extrairPontos = (r) => {
    if (r.status !== 'fulfilled' || !r.value) return [];
    return Array.isArray(r.value) ? r.value : (Array.isArray(r.value.pontos) ? r.value.pontos : []);
  };
  const pontosAr24h = extrairPontos(resPtsAr);
  const pontosSolo24h = extrairPontos(resPtsSolo);

  _adminDashState.leiturasGrafico = leituras;
  _adminDashState.pontosAr = pontosAr24h;
  _adminDashState.pontosSolo = pontosSolo24h;

  // 1. Usuários (tabela usuario + perfil)
  const totalUsers = usuarios.length;
  const usersAtivos = usuarios.filter(u => String(u.status || '').toLowerCase() === 'ativo').length;
  const usersPendentes = usuarios.filter(u => String(u.status || '').toLowerCase() === 'pendente').length;
  const qtdProd = usuarios.filter(u => String(u.perfil || '').toLowerCase().includes('produt')).length;
  const qtdAnal = usuarios.filter(u => String(u.perfil || '').toLowerCase().includes('analist')).length;
  const qtdAdm = usuarios.filter(u => String(u.perfil || '').toLowerCase().includes('admin')).length;
  const baseUsers = totalUsers || 1;
  const pctProd = Math.round((qtdProd / baseUsers) * 100);
  const pctAnal = Math.round((qtdAnal / baseUsers) * 100);
  const pctAdm = totalUsers ? Math.max(0, 100 - pctProd - pctAnal) : 0;

  // 2. Lotes e Culturas (tabela lote + /dashboard/resumo)
  const lotesNaoFinalizados = lotes.filter(l => String(l.status || '').toLowerCase() !== 'finalizado');
  const lotesAtivosCount = resumo?.lotes_monitorados?.total ?? lotesNaoFinalizados.length;
  const lotesComSensor = resumo?.lotes_monitorados?.com_sensor_ativo ?? 0;
  const volumePorFruta = {};
  let volumeTotalKg = 0;
  lotes.forEach(l => {
    const qtd = Number(l.quantidade) || 0;
    const kg = String(l.unidade || 'kg').toLowerCase() === 't' ? qtd * 1000 : qtd;
    const fruta = l.fruta || 'Outros';
    volumePorFruta[fruta] = (volumePorFruta[fruta] || 0) + kg;
    volumeTotalKg += kg;
  });
  const frutasOrdenadas = Object.entries(volumePorFruta).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const coresFrutas = ['#10B981', '#3B82F6', '#F59E0B'];

  // 3. Sensores (tabela sensor + /dashboard/resumo)
  const sensAtivos = resumo?.sensores?.ativos ?? 0;
  const sensTotal = resumo?.sensores?.total ?? 0;
  const sensReais = resumo?.sensores?.reais ?? 0;
  const sensSimulados = resumo?.sensores?.simulados ?? Math.max(0, sensAtivos - sensReais);
  const pctSensOnline = sensTotal > 0 ? Math.round((sensAtivos / sensTotal) * 100) : 0;
  const parseUtcMs = (raw) => {
    if (!raw) return NaN;
    const s = String(raw).trim();
    const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
    return new Date(iso).getTime();
  };
  const maxLeituraAdminTs = leituras.reduce((max, l) => {
    const t = parseUtcMs(l?.data_hora);
    return (!isNaN(t) && t > max) ? t : max;
  }, 0);
  const temLeituraRecente30m = maxLeituraAdminTs > 0 && Math.abs(Date.now() - maxLeituraAdminTs) < 30 * 60 * 1000;
  const badgeSensoresHtml = temLeituraRecente30m
    ? `<span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">${pctSensOnline}% ATIVOS</span>`
    : `<span style="font-size: 10px; font-weight: 700; color: #B45309; background: #FEF3C7; padding: 2px 8px; border-radius: 12px;">${sensTotal} cadastrados • sem leitura recente</span>`;

  // 4. Alertas (/dashboard/resumo -> tabela alerta)
  const alertAbertos = resumo?.alertas?.abertos ?? 0;
  const alertReativos = resumo?.alertas?.reativos ?? 0;
  const alertPreditivos = resumo?.alertas?.preditivos ?? 0;
  const condRotulo = resumo?.condicao_geral?.rotulo || (alertAbertos === 0 ? 'Operação Estável' : 'Atenção');
  const condCor = condRotulo === 'Crítica' ? '#DC2626' : (condRotulo === 'Atenção' ? '#D97706' : '#047857');
  const condBg = condRotulo === 'Crítica' ? '#FEE2E2' : (condRotulo === 'Atenção' ? '#FEF3C7' : '#D1FAE5');

  // 5. Condições das últimas 24h (/dashboard/resumo -> vw_lote_saude + leitura_climatica)
  const rc = resumo?.resumo_condicoes || {};
  const pctNaFaixa = rc.pct_na_faixa != null ? `${rc.pct_na_faixa}%` : '—';
  const leiturasAvaliadas = rc.leituras_avaliadas ?? 0;
  const tempArMedia = rc.temperatura_ar_media != null ? `${rc.temperatura_ar_media}°C` : '—';
  const umidArMedia = rc.umidade_ar_media != null ? `${rc.umidade_ar_media}% UR` : '—';
  const vpdMedio = rc.vpd_medio_kpa != null ? `${rc.vpd_medio_kpa} kPa` : '—';
  const areaProp = resumo?.propriedade?.area_ha != null ? `${resumo.propriedade.area_ha.toLocaleString('pt-BR')} ha` : 'Polo Petrolina';

  // Média real de umidade_solo das últimas 24h (mesma janela de /dashboard/resumo e Sensores)
  let umidSoloMedia = 'Sem leitura solo 24h';
  if (rc.umidade_solo_media != null && !isNaN(Number(rc.umidade_solo_media))) {
    umidSoloMedia = `${Number(rc.umidade_solo_media).toFixed(1)}% VWC`;
  } else {
    const valsSolo24h = pontosSolo24h
      .map(p => Number(p?.umidade_solo != null ? p.umidade_solo : p?.umidade))
      .filter(v => !isNaN(v) && v >= 0);
    if (valsSolo24h.length > 0) {
      umidSoloMedia = `${(valsSolo24h.reduce((a, b) => a + b, 0) / valsSolo24h.length).toFixed(1)}% VWC`;
    }
  }

  // 6. Acessos recentes (tabela log_acesso)
  const acessosHtml = logs.length > 0 ? logs.map(log => {
    const nome = log.usuario ? String(log.usuario) : (log.id_usuario != null ? `Usuário #${log.id_usuario}` : 'Sistema');
    const iniciais = nome === 'Sistema'
      ? 'SY'
      : (nome.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'SY');
    const rawDt = log.data_hora ? String(log.data_hora).trim() : '';
    const isoUtc = rawDt ? (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(rawDt) ? rawDt : `${rawDt.replace(' ', 'T')}Z`) : '';
    const hora = isoUtc
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoUtc))
      : '--:--';
    const resRaw = String(log.resultado || 'sucesso');
    const ok = !resRaw.toLowerCase().includes('falha') && !resRaw.toLowerCase().includes('negado') && !resRaw.toLowerCase().includes('erro');
    const statusCurto = ok ? 'sucesso' : 'falha';
    const tituloTooltip = resRaw.replace(/"/g, '&quot;');
    return `
      <div title="${tituloTooltip}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; overflow: hidden; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${ok ? '#D1FAE5' : '#FEE2E2'}; border: 1.5px solid ${ok ? '#10B981' : '#EF4444'}; color: ${ok ? '#065F46' : '#991B1B'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0;">${iniciais}</div>
          <div style="min-width: 0; flex: 1;">
            <strong style="font-size: 13px; color: #0F172A; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</strong>
            <div style="font-size: 11px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.acao || 'acesso'}${log.ip ? ` • ${log.ip}` : ''}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span style="font-size: 10px; color: #64748B; display: block;">${hora}</span>
          <div style="font-size: 10px; font-weight: 700; color: ${ok ? '#047857' : '#DC2626'}; white-space: nowrap;">${statusCurto}</div>
        </div>
      </div>
    `;
  }).join('') : `
    <div style="grid-column: 1 / -1; padding: 16px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
      Nenhum registro recente retornado por <code>GET /auditoria</code>.
    </div>
  `;

  // 7. Regras agronômicas reais (tabela config_parametro)
  const regrasHtml = regras.length > 0 ? regras.slice(0, 4).map((r, idx) => {
    const cor = coresFrutas[idx % coresFrutas.length];
    return `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${cor};"></span>
            <strong style="font-size: 13px; color: #0F172A;">${r.fruta || `Fruta #${r.id_fruta}`}</strong>
            <span style="font-size: 10px; font-weight: 700; color: #475569; background: #E2E8F0; padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">${r.etapa || 'armazenamento'}</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Umidade relativa ideal: ${r.umidade_min ?? '—'}% a ${r.umidade_max ?? '—'}%</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 12px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 2px 8px; border-radius: 6px;">${r.temp_min ?? '—'}°C a ${r.temp_max ?? '—'}°C</span>
        </div>
      </div>
    `;
  }).join('') : `
    <div style="padding: 16px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
      Nenhuma regra cadastrada em <code>config_parametro</code>.
    </div>
  `;

  // 8. Portos e rotas reais (tabela porto + rota)
  const portosHtml = portos.length > 0 ? portos.slice(0, 4).map(p => `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 12px; color: #0F172A;">${p.nome} (${p.uf})</strong>
        <div style="font-size: 10px; color: #64748B;">${p.distancia_km != null ? `${p.distancia_km} km` : `Lat ${p.latitude}, Lng ${p.longitude}`}${p.duracao_min != null ? ` • ~${Math.round(p.duracao_min / 60)}h de rota` : ''}</div>
      </div>
      <span style="font-size: 10px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 8px; border-radius: 4px;">Homologado</span>
    </div>
  `).join('') : `
    <div style="padding: 16px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
      Nenhum porto retornado por <code>GET /portos</code>.
    </div>
  `;

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Administrador -->
      <div class="analista-subbar" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ${areaProp}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #0284C7; background: #F0F9FF; border: 1px solid #BAE6FD; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="cpu" style="width: 12px; height: 12px;"></i> ${sensAtivos}/${sensTotal} Sensores Ativos (${sensReais} ThingSpeak)
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> ${regras.length} Regras em config_parametro
          </span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-analista-sync" id="btn-admin-convidar-user" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
            <span>Gerenciar Usuários</span>
          </button>
          <button class="btn-analista-sync" id="btn-admin-parametros-safra" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Regras Agronômicas</span>
          </button>
          <button class="btn-analista-export" id="btn-admin-emitir-relatorio" style="background: #183D2E; border: none; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
            <span>Emitir Relatório</span>
          </button>
        </div>
      </div>

      <!-- 4 Cards Superiores de Governança (100% PostgreSQL / FastAPI) -->
      <div class="admin-kpi-grid-4">
        <!-- Card 1: Perfis de Usuários -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">PERFIS DE USUÁRIOS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">${usersAtivos} ATIVOS</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 14px 0;">
            <div style="width: 58px; height: 58px; border-radius: 50%; border: 5px solid #10B981; border-top-color: #0284C7; border-right-color: #0F172A; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
              <span style="font-size: 15px; font-weight: 800; color: #0F172A; line-height: 1;">${totalUsers}</span>
              <span style="font-size: 8px; color: #64748B;">CONTAS</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
                <span style="color: #475569;">Produtores: <strong>${qtdProd}</strong> <span style="color: #94A3B8;">(${pctProd}%)</span></span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
                <span style="color: #475569;">Analistas: <strong>${qtdAnal}</strong> <span style="color: #94A3B8;">(${pctAnal}%)</span></span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0F172A;"></span>
                <span style="color: #475569;">Admins: <strong>${qtdAdm}</strong> <span style="color: #94A3B8;">(${pctAdm}%)</span></span>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Tabela <code>usuario</code></span>
            <strong style="color: ${usersPendentes > 0 ? '#D97706' : '#047857'};">${usersPendentes} pendente(s)</strong>
          </div>
        </div>

        <!-- Card 2: Lotes e Culturas -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">LOTES E CULTURAS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">${lotesAtivosCount} EM ABERTO</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">${volumeTotalKg.toLocaleString('pt-BR')}</span>
                <span style="font-size: 12px; font-weight: 600; color: #64748B;">kg</span>
              </div>
              <span style="font-size: 10px; font-weight: 600; color: #059669; background: #ECFDF5; padding: 2px 6px; border-radius: 6px;">${lotes.length} lotes</span>
            </div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-top: 8px;">
              ${frutasOrdenadas.map(([nome, kg], idx) => `<div style="width: ${volumeTotalKg > 0 ? Math.round((kg / volumeTotalKg) * 100) : 0}%; background: ${coresFrutas[idx]};" title="${nome}: ${kg.toLocaleString('pt-BR')} kg"></div>`).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px; flex-wrap: wrap; gap: 4px;">
              ${frutasOrdenadas.map(([nome, kg]) => `<span>• ${nome} (${Math.round(kg / 1000)}t)</span>`).join('') || '<span>Sem lotes cadastrados</span>'}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Com sensor ativo</span>
            <strong style="color: #0F172A;">${lotesComSensor} de ${lotesAtivosCount}</strong>
          </div>
        </div>

        <!-- Card 3: Sensores de Campo (IoT) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">SENSORES DE CAMPO (IOT)</span>
            ${badgeSensoresHtml}
          </div>
          <div style="margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 20px; font-weight: 800; color: #0F172A;">${sensAtivos} / ${sensTotal}</span>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${sensReais} reais (ThingSpeak) • ${sensSimulados} simulados</div>
              <div style="font-size: 10px; color: #94A3B8;">Tabela <code>sensor</code> (ar / solo)</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Leituras Ar (24h)</span>
            <strong style="color: #0F172A;">${rc.n_leituras_ar ?? 0} amostras</strong>
          </div>
        </div>

        <!-- Card 4: Alertas e Saúde dos Lotes -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">ALERTAS E INCIDENTES</span>
            <span style="font-size: 10px; font-weight: 700; color: ${condCor}; background: ${condBg}; padding: 2px 8px; border-radius: 12px;">${condRotulo.toUpperCase()}</span>
          </div>
          <div style="margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 20px; font-weight: 800; color: #0F172A;">${alertAbertos} aberto(s)</span>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${alertReativos} reativo(s) • ${alertPreditivos} preditivo(s)</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Lotes avaliados (<code>vw_lote_saude</code>)</span>
            <strong style="color: #0F172A;">${resumo?.condicao_geral?.lotes_avaliados ?? 0}</strong>
          </div>
        </div>
      </div>

      <!-- Gráfico Central: Telemetria Consolidada (Últimas Leituras Reais) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Telemetria Consolidada (<code>leitura_climatica</code>)</h3>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">Últimas leituras registradas</span>
            </div>
            <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">Temperatura do ar, umidade relativa e umidade do solo (VWC) registradas pelos sensores</p>
          </div>
        </div>

        <div style="height: 220px; position: relative;">
          <canvas id="chart-admin-atividade"></canvas>
        </div>

        <!-- 3 Métricas Reais de /dashboard/resumo (sem KPI fantasma de ciclos de irrigação) -->
        <div class="admin-kpi-grid-3" style="margin-top: 16px; margin-bottom: 0 !important;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">TEMP. / UMID. AR MÉDIA (24H)</span>
              <div style="font-size: 16px; font-weight: 800; color: #0284C7; margin-top: 2px;">${tempArMedia} • ${umidArMedia}</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #E0F2FE; padding: 3px 8px; border-radius: 6px;">VPD ${vpdMedio}</span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">UMIDADE MÉDIA DO SOLO (VWC)</span>
              <div style="font-size: 16px; font-weight: 800; color: #047857; margin-top: 2px;">${umidSoloMedia}</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">umidade_solo</span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">CONFORMIDADE NA FAIXA (24H)</span>
              <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 2px;">${pctNaFaixa}</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">${leiturasAvaliadas} leituras</span>
          </div>
        </div>
      </div>

      <!-- Seção: Gestão de Perfis e Acessos Recentes (log_acesso) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="users" style="width: 16px; height: 16px; color: #0F172A;"></i>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Acessos e Eventos Recentes (<code>log_acesso</code>)</h3>
            </div>
            <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">Últimos registros reais de autenticação e operações auditadas</p>
          </div>
          <a href="#/usuarios" style="font-size: 12px; font-weight: 600; color: #0284C7; text-decoration: none;">
            Gerenciar Usuários &rarr;
          </a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
          ${acessosHtml}
        </div>
      </div>

      <!-- 2 Cards Inferiores: Regras Agronômicas (config_parametro) + Portos Homologados (porto / rota) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Parâmetros Agronômicos (<code>config_parametro</code>)</h3>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Faixas climáticas oficiais por fruta e etapa</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">${regras.length} REGRAS</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${regrasHtml}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
            <span style="color: #64748B;">Chave única (fruta, etapa)</span>
            <button id="btn-config-regras" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Gerenciar Regras &rarr;</button>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Portos e Rotas de Escoamento (<code>porto</code>)</h3>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Destinos logísticos cadastrados no PostgreSQL</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">${portos.length} PORTOS</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${portosHtml}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
            <span style="color: #64748B;">Tabelas <code>porto</code> e <code>rota</code></span>
            <a href="#/lotes" style="color: #0284C7; font-weight: 600; text-decoration: none;">Ver Lotes e Safra &rarr;</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupAdminDashboardEvents() {
  const toggleBtn = document.getElementById('toggle-dashboard-mode');
  if (toggleBtn) toggleBtn.remove();

  iniciarSSEDashboard();
  chartInstances.forEach(c => c && c.destroy());
  chartInstances = [];

  document.getElementById('btn-admin-convidar-user')?.addEventListener('click', () => {
    window.location.hash = '#/usuarios';
  });
  document.getElementById('btn-admin-parametros-safra')?.addEventListener('click', () => {
    window.location.hash = '#/regras-agronomicas';
  });
  document.getElementById('btn-admin-emitir-relatorio')?.addEventListener('click', () => {
    window.location.hash = '#/relatorios';
  });
  document.getElementById('btn-config-regras')?.addEventListener('click', () => {
    window.location.hash = '#/regras-agronomicas';
  });

  // Gráfico sincronizado com a série agregada de 24h (mesma fonte da tela de Sensores, fuso America/Recife)
  const ctx = document.getElementById('chart-admin-atividade');
  if (ctx && window.Chart) {
    const ptsAr = Array.isArray(_adminDashState.pontosAr) ? _adminDashState.pontosAr : [];
    const ptsSolo = Array.isArray(_adminDashState.pontosSolo) ? _adminDashState.pontosSolo : [];

    const porInstante = new Map();
    const parseIso = (raw) => {
      if (!raw) return null;
      const s = String(raw).trim();
      const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    };

    ptsAr.forEach(p => {
      const d = parseIso(p?.instante || p?.data_hora);
      if (!d) return;
      const key = d.getTime();
      const cur = porInstante.get(key) || { ts: key, temp: null, solo: null };
      if (p.temperatura != null) cur.temp = Number(p.temperatura);
      porInstante.set(key, cur);
    });
    ptsSolo.forEach(p => {
      const d = parseIso(p?.instante || p?.data_hora);
      if (!d) return;
      const key = d.getTime();
      const cur = porInstante.get(key) || { ts: key, temp: null, solo: null };
      const uVal = p.umidade_solo != null ? p.umidade_solo : p.umidade;
      if (uVal != null) cur.solo = Number(uVal);
      porInstante.set(key, cur);
    });

    const serie = Array.from(porInstante.values()).sort((a, b) => a.ts - b.ts);
    const fmtRecife = (ms) => new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(ms));

    const labels = serie.length > 0 ? serie.map(s => fmtRecife(s.ts)) : ['Sem dados'];
    const umidData = serie.length > 0 ? serie.map(s => s.solo) : [null];
    const tempData = serie.length > 0 ? serie.map(s => s.temp) : [null];

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Umidade (% / VWC)',
            data: umidData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 2.2,
            fill: true,
            tension: 0.3,
            spanGaps: true,
            yAxisID: 'y'
          },
          {
            label: 'Temperatura Ar (°C)',
            data: tempData,
            borderColor: '#0284C7',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.3,
            spanGaps: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94A3B8' } },
          y: { position: 'left', min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 10 }, color: '#10B981' }, grid: { color: '#F1F5F9' } },
          y1: { position: 'right', min: 0, max: 50, ticks: { callback: v => v + '°C', font: { size: 10 }, color: '#0284C7' }, grid: { display: false } }
        }
      }
    });

    chartInstances.push(chart);
  }
}
