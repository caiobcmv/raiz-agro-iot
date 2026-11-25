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

function temValor(v) {
  return v !== null && v !== undefined && !Number.isNaN(Number(v));
}

let chartInstances = [];
let dadosGraficosCache = null;
let sseConnection = null;

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

function _pulseElement(el) {
  if (!el) return;
  el.classList.remove('live-pulse-breath');
  void el.offsetWidth;
  el.classList.add('live-pulse-breath');
}

function atualizarDashboardComSSE(data) {
  if (!data) return;

  const tempNum = Number(data.temperatura);
  const umidNum = Number(data.umidade);
  const tempStr = !isNaN(tempNum) ? `${tempNum.toFixed(1)}°C` : '—';
  const tempIntStr = !isNaN(tempNum) ? `${Math.round(tempNum)}°C` : '—';
  const umidStr = !isNaN(umidNum) ? `${Math.round(umidNum)}%` : '—';

  // 1. Atualizar Temperatura na tela
  const elTempDetalhado = document.getElementById('sse-detalhado-temp') || document.querySelector('[data-live="temp-ar"]');
  if (elTempDetalhado) {
    elTempDetalhado.textContent = tempStr;
    _pulseElement(elTempDetalhado);
  }

  document.querySelectorAll('[data-kpi="temp-ar"], #kpi-temp-ar').forEach(el => {
    el.textContent = tempStr;
    _pulseElement(el);
  });

  const elPillTemp = document.getElementById('miniChart4-pill');
  if (elPillTemp && !isNaN(tempNum)) {
    elPillTemp.textContent = `${tempNum.toFixed(1)}°C Ideal`;
    _pulseElement(elPillTemp);
  }

  // 2. Atualizar Umidade na tela
  const elUmidDetalhado = document.getElementById('sse-detalhado-umid');
  if (elUmidDetalhado) {
    elUmidDetalhado.textContent = umidStr;
    _pulseElement(elUmidDetalhado);
  }

  const elUmidBar = document.getElementById('sse-detalhado-umid-bar') || document.querySelector('.progress-bar-umid');
  if (elUmidBar && !isNaN(umidNum)) {
    elUmidBar.style.width = `${Math.min(100, Math.max(0, umidNum))}%`;
  }

  const elPillUmid = document.getElementById('miniChart1-pill');
  if (elPillUmid && !isNaN(umidNum)) {
    elPillUmid.textContent = `${Math.round(umidNum)}%`;
    _pulseElement(elPillUmid);
  }

  // 3. Selo de origem real do sensor
  const isSemDados = data.status === 'sem_dados';
  const seloTexto = isSemDados ? 'Sem dados' : 'Sensor Real';
  const seloClasseRemover = isSemDados ? 'pill-green' : 'pill-blue';
  const seloClasseAdicionar = isSemDados ? 'pill-blue' : 'pill-green';

  document.querySelectorAll('#sse-origem-badge, #sse-origem-badge-detalhado, .sse-origem-badge').forEach(badge => {
    badge.textContent = seloTexto;
    badge.classList.remove(seloClasseRemover);
    badge.classList.add(seloClasseAdicionar);
  });

  // 4. Horário da última leitura em pt-BR (America/Recife)
  const horaFormatadaRecife = formatarTimestampRecife(data.timestamp);
  document.querySelectorAll('#sse-horario-leitura, #sse-horario-leitura-detalhado, .sse-horario-leitura').forEach(el => {
    el.textContent = horaFormatadaRecife ? `Última leitura: ${horaFormatadaRecife}` : (isSemDados ? 'Aguardando telemetria' : '');
  });

  // 5. Adicionar nova leitura ao gráfico mantendo as últimas 30 leituras
  if (window.Chart && typeof window.Chart.getChart === 'function') {
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
  
  // Busca dados reais do PostgreSQL em paralelo (sem usar cache desatualizado)
  let resumo = null, clima = null, graficos = null, series24h = null;
  try {
    const results = await Promise.allSettled([
      api.getDashboardResumo(),
      api.getClimaAtual(),
      api.getDadosGraficos(),
      api.getSeries24h()
    ]);
    resumo = results[0].status === 'fulfilled' ? results[0].value : null;
    clima = results[1].status === 'fulfilled' ? results[1].value : null;
    graficos = results[2].status === 'fulfilled' ? results[2].value : null;
    series24h = results[3].status === 'fulfilled' ? results[3].value : null;
  } catch (e) {
    console.warn('Erro ao obter métricas online:', e);
  }

  dadosGraficosCache = {
    ...DEFAULT_DADOS_GRAFICOS,
    ...(series24h || {}),
    ...(graficos || {})
  };

  // Modo detalhado: recomendação de irrigação, sensores, mercado e janela de colheita
  let extrasDetalhado = { irrigacao: null, sensores: null, mercado: null, janelas: null };
  if (!isResumido) {
    const [irr, sens, merc, jan] = await Promise.allSettled([
      api.getPrevisoesIrrigacao(),
      api.getSensores(),
      api.request('/dados-mercado'),
      api.request('/previsoes/janela-colheita')
    ]);
    extrasDetalhado = {
      irrigacao: irr.status === 'fulfilled' ? irr.value : null,
      sensores: sens.status === 'fulfilled' ? sens.value : null,
      mercado: merc.status === 'fulfilled' && Array.isArray(merc.value) ? merc.value : [],
      janelas: jan.status === 'fulfilled' && Array.isArray(jan.value) ? jan.value : []
    };
  }

  return `
    <div class="dashboard-canvas apple-animate-in">
      ${isResumido ? renderModoResumido(resumo, clima, dadosGraficosCache) : renderModoDetalhado(resumo, clima, dadosGraficosCache, extrasDetalhado)}
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
    const [resumoRes, topologiaRes, dashResumoRes, rejeitadasRes, preditivosRes, cortesRes] = await Promise.allSettled([
      api.getAnalistaSensoresResumo(),
      api.getSensoresTopologia(),
      api.getDashboardResumo(),
      api.getLeiturasRejeitadas({ limit: 5 }),
      api.getAlertasPreditivos({ status: 'EM ABERTO', limit: 20 }),
      api.getCortesPreditivos()
    ]);

    analistaDashboardData = {
      resumo: (resumoRes.status === 'fulfilled' && resumoRes.value && typeof resumoRes.value === 'object') ? resumoRes.value : null,
      topologia: (topologiaRes.status === 'fulfilled' && topologiaRes.value && typeof topologiaRes.value === 'object') ? topologiaRes.value : null,
      dashResumo: (dashResumoRes.status === 'fulfilled' && dashResumoRes.value && typeof dashResumoRes.value === 'object') ? dashResumoRes.value : null,
      rejeitadas: extrairArraySeguro(rejeitadasRes.status === 'fulfilled' ? rejeitadasRes.value : null),
      preditivos: extrairArraySeguro(preditivosRes.status === 'fulfilled' ? preditivosRes.value : null),
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
  const alertasAbertos = resumo?.alertas_abertos || {};
  const rejeitadasHoje = resumo?.rejeitadas_hoje ?? 0;

  const taxaPct = ingestao_24h.taxa_sucesso_pct != null ? Number(ingestao_24h.taxa_sucesso_pct) : null;
  const taxaStr = taxaPct != null ? `${taxaPct.toFixed(1)}%` : '—';
  let taxaBadgeClass = 'yellow';
  let taxaBadgeText = '—';
  let taxaNumColor = '#64748B';

  if (taxaPct != null) {
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

  const totalSensores = sensoresInfo.total != null ? sensoresInfo.total : (topologia?.sensores?.length ?? 0);
  const ativosSensores = sensoresInfo.ativos != null ? sensoresInfo.ativos : (topologia?.sensores?.filter(s => s.estado_mapa === 'ativo').length ?? 0);

  let tempoRelativoColeta = 'Última leitura: —';
  if (ingestao_24h.ultima_leitura) {
    const tMs = new Date(ingestao_24h.ultima_leitura).getTime();
    if (!isNaN(tMs)) {
      const diffMin = Math.max(0, Math.floor((Date.now() - tMs) / 60000));
      tempoRelativoColeta = diffMin === 1 ? 'Última leitura há 1 min' : (diffMin < 60 ? `Última leitura há ${diffMin} min` : `Última leitura há ${Math.floor(diffMin / 60)}h ${diffMin % 60}min`);
    }
  }

  // 2. Sensores e Sondas
  const totalSolo = sensoresInfo.total_solo != null ? sensoresInfo.total_solo : (topologia?.sensores?.filter(s => s.ambiente === 'solo').length ?? 0);
  const totalAr = sensoresInfo.total_ar != null ? sensoresInfo.total_ar : (topologia?.sensores?.filter(s => s.ambiente === 'ar').length ?? 0);

  // 3. Média Climática
  const condicoes = dashResumo?.resumo_condicoes || {};
  const tempArMedia = condicoes.temperatura_ar_media != null ? Number(condicoes.temperatura_ar_media) : null;
  const umidArMedia = condicoes.umidade_ar_media != null ? Number(condicoes.umidade_ar_media) : null;

  const sensoresSolo = (topologia?.sensores || []).filter(s => s.ambiente === 'solo' && s.umidade != null && !isNaN(Number(s.umidade)));
  let mediaSoloStr = '—';
  if (sensoresSolo.length > 0) {
    const sumUmidSolo = sensoresSolo.reduce((acc, s) => acc + Number(s.umidade), 0);
    mediaSoloStr = `${(sumUmidSolo / sensoresSolo.length).toFixed(1)}%`;
  }

  // 4. Alertas do Sistema
  const totalAlertas = alertasAbertos.total != null ? alertasAbertos.total : (preditivos.length);
  const reativosQtd = alertasAbertos.reativos ?? 0;
  const preditivosQtd = alertasAbertos.preditivos ?? preditivos.length;
  const badgeAlertas = totalAlertas === 0 ? 'green' : (totalAlertas > 3 ? 'red' : 'yellow');
  const badgeAlertasTexto = totalAlertas === 0 ? 'NORMAL' : 'ATENÇÃO';

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

  // D) MODELOS PREDITIVOS E LIMIARES DE ALERTA
  const preditivosList = extrairArraySeguro(preditivos);
  const alertaMaisRecente = preditivosList.length > 0
    ? [...preditivosList].sort((a, b) => new Date(b.data_geracao || 0) - new Date(a.data_geracao || 0))[0]
    : null;

  let alertaRecenteHtml = `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin: 10px 0; font-size: 12px; color: #64748B; text-align: center;">
      Nenhum alerta preditivo em aberto
    </div>
  `;

  if (alertaMaisRecente) {
    const severidade = (alertaMaisRecente.nivel_severidade || '').toUpperCase();
    const nivelLabel = severidade === 'CRITICO' ? 'Alto' : (severidade === 'MEDIO' ? 'Médio' : 'Baixo');
    const badgeBg = severidade === 'CRITICO' ? '#FEE2E2' : (severidade === 'MEDIO' ? '#FEF3C7' : '#E0F2FE');
    const badgeColor = severidade === 'CRITICO' ? '#991B1B' : (severidade === 'MEDIO' ? '#92400E' : '#0369A1');
    const dotBg = severidade === 'CRITICO' ? '#EF4444' : (severidade === 'MEDIO' ? '#D97706' : '#0284C7');
    const probPct = alertaMaisRecente.probabilidade_risco != null ? `${(Number(alertaMaisRecente.probabilidade_risco) * 100).toFixed(0)}%` : '—';
    const s = alertaMaisRecente.id_sensor ? topologiaSensorsMap[alertaMaisRecente.id_sensor] : null;
    const sensorNome = s ? s.nome : (alertaMaisRecente.id_sensor ? `Sensor #${alertaMaisRecente.id_sensor}` : 'Sensor');
    const loteTexto = alertaMaisRecente.id_lote ? `Lote #${alertaMaisRecente.id_lote}` : '';

    alertaRecenteHtml = `
      <div style="background: ${badgeBg}; border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; padding: 12px; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap:wrap; gap:6px;">
          <span style="font-size: 12px; font-weight: 700; color: ${badgeColor}; display: flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotBg};"></span>
            Risco climático
          </span>
          <span style="font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.7); color: ${badgeColor}; padding: 2px 6px; border-radius: 4px;">
            NÍVEL: ${nivelLabel.toUpperCase()} (${probPct})
          </span>
        </div>
        <p style="font-size: 11px; color: ${badgeColor}; line-height: 1.4; margin-bottom: 6px;">
          ${alertaMaisRecente.mensagem || 'Condição de alerta preditivo detectada pelo modelo.'}
        </p>
        <div style="font-size: 10px; color: ${badgeColor}; opacity: 0.9; display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:4px;">
          <span>${[sensorNome, loteTexto].filter(Boolean).join(' • ')}</span>
          <span>Previsão: ${formatarDataRecife(alertaMaisRecente.previsao_data_hora)}</span>
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
          <span class="analista-dot-pulse"></span>
          <span>${propriedade.nome.toUpperCase()} • CONCENTRADOR ATIVO</span>
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
            <span style="color: #059669; font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="check-circle-2" style="width: 13px; height: 13px;"></i> Coleta ativa
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
              <span style="width: 9px; height: 9px; border-radius: 50%; background: #10B981;"></span>
              Sensores ativos (${contadores.ativos ?? 0})
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

/**
 * 1. MODO RESUMIDO (Primeira Imagem do Figma)
 */
function renderModoResumido(resumo, clima, dg = DEFAULT_DADOS_GRAFICOS) {
  const rc = resumo?.resumo_condicoes || {};
  const confPct = dg.conformidade_geral_pct;
  const saudePct = dg.saude_plantacao_pct;
  const umidDosselPct = dg.umidade_dossel_pct;
  const tempFoliar = dg.temp_foliar_c;
  const aguaPct = dg.agua_reservatorio_pct;
  const vazaoLdia = dg.vazao_ldia;
  const uArLast = (dg.umidade_ar_24h && dg.umidade_ar_24h.length) ? dg.umidade_ar_24h[dg.umidade_ar_24h.length - 1] : null;
  const uSoloLast = (dg.umidade_solo_24h && dg.umidade_solo_24h.length) ? dg.umidade_solo_24h[dg.umidade_solo_24h.length - 1] : null;
  const tArLast = (dg.temp_ar_24h && dg.temp_ar_24h.length) ? dg.temp_ar_24h[dg.temp_ar_24h.length - 1] : null;

  // --- Clima Open-Meteo real para o Card 3 ---
  const climaAtual = clima?.agora || clima?.atual || clima || {};
  const tRaw = climaAtual.temperatura != null ? climaAtual.temperatura : (climaAtual.temperature_2m != null ? climaAtual.temperature_2m : null);
  const climaTempResumido = tRaw != null ? `${Math.round(Number(tRaw))}°C` : '—';
  const climaDescResumido = climaAtual.condicao || climaAtual.descricao || 'Predomínio de sol';
  const vRaw = climaAtual.vento_kmh != null ? climaAtual.vento_kmh : climaAtual.wind_speed_10m;
  const climaVentoResumido = vRaw != null ? `${Math.round(Number(vRaw))} km/h` : '—';
  const uRaw = climaAtual.umidade != null ? climaAtual.umidade : climaAtual.relative_humidity_2m;
  const climaUmidResumido = uRaw != null ? `${Math.round(Number(uRaw))}%` : '—';
  const cRaw = climaAtual.chuva_mm != null ? climaAtual.chuva_mm : climaAtual.precipitation;
  const climaChuvaResumido = cRaw != null ? `${cRaw} mm` : '0 mm';
  const uvRaw = climaAtual.uv != null ? climaAtual.uv : climaAtual.uv_index;
  const climaUvResumido = uvRaw != null ? `Índice ${Number(uvRaw).toFixed(1)}` : 'Mod. 5.0';

  const pDia = clima?.periodos_dia || {};
  const climaManha = pDia.manha != null ? `${Math.round(Number(pDia.manha))}°` : '—';
  const climaTarde = pDia.tarde != null ? `${Math.round(Number(pDia.tarde))}°` : '—';
  const climaNoite = pDia.noite != null ? `${Math.round(Number(pDia.noite))}°` : '—';

  const proximosDias = Array.isArray(clima?.dias) ? clima.dias.slice(1, 4) : [];
  const climaProximosDiasHtml = proximosDias.length > 0
    ? proximosDias.map(d => {
        const diaNome = d.dia_semana || (d.data ? d.data.slice(5) : '');
        const maxVal = d.temp_max != null ? d.temp_max : d.temperature_2m_max;
        const maxT = maxVal != null ? `${Math.round(Number(maxVal))}°` : '—';
        return `<div><span style="color:#94A3B8; font-size:10px;">${diaNome}</span><div style="font-weight:700; color:#334155;">${maxT}</div></div>`;
      }).join('')
    : '<div><span style="color:#94A3B8; font-size:10px;">Amanhã</span><div style="font-weight:700; color:#334155;">—</div></div>';

  // --- Indicadores Reais de Lotes e Condição Geral ---
  const condRotulo = resumo?.condicao_geral?.rotulo || (resumo?.resumo_condicoes?.pct_na_faixa != null ? (resumo.resumo_condicoes.pct_na_faixa >= 80 ? 'Boa' : 'Atenção') : 'Sem dados');
  const condPillClass = condRotulo === 'Boa' || condRotulo === 'Excelente' ? 'pill-green' : (condRotulo === 'Sem dados' ? 'pill-blue' : 'pill-amber');
  const pctNaFaixa = resumo?.resumo_condicoes?.pct_na_faixa != null ? `${resumo.resumo_condicoes.pct_na_faixa}%` : (confPct != null ? `${confPct}%` : 'Sem dados');

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

  return `
    <!-- Top Row: 3 Cards (Condição Geral, Lotes em Operação, Previsão do Tempo) -->
    <div class="top-kpi-3col">
      
      <!-- CARD 1: CONDIÇÃO GERAL -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span class="card-header-label">CONDIÇÃO GERAL</span>
          <span class="card-status-pill ${condPillClass}">${condRotulo}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; margin: 12px 0;">
          <!-- Gauge Semicircular com agulha -->
          <div style="position: relative; width: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg width="130" height="72" viewBox="0 0 130 72" style="overflow: visible;">
              <defs>
                <linearGradient id="gauge-grad-card1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#EAB308" />
                  <stop offset="45%" stop-color="#10B981" />
                  <stop offset="100%" stop-color="#059669" />
                </linearGradient>
              </defs>
              <path d="M 15,60 A 50,50 0 0,1 115,60" fill="none" stroke="#F1F5F9" stroke-width="11" stroke-linecap="round"/>
              <path d="M 15,60 A 50,50 0 0,1 115,60" fill="none" stroke="url(#gauge-grad-card1)" stroke-width="11" stroke-linecap="round" stroke-dasharray="148 157.1" stroke-dashoffset="0"/>
              <line x1="65" y1="60" x2="101" y2="36" stroke="#183D2E" stroke-width="3" stroke-linecap="round"/>
              <circle cx="65" cy="60" r="5" fill="#183D2E"/>
              <circle cx="65" cy="60" r="2" fill="#FFFFFF"/>
            </svg>
            <div style="font-size: 16px; font-weight: 800; color: #1E293B; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              ${pctNaFaixa}
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 2px;">ÍNDICE NA FAIXA</span>
          </div>

          <!-- Barras de Sub-métricas -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Água e Solo</span>
                <strong style="color: #1E293B;">${aguaPct != null ? `${aguaPct}%` : 'Sem dados'}</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: ${aguaPct != null ? aguaPct : 0}%; background: #10B981;"></div>
              </div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Saúde Foliar</span>
                <strong style="color: #1E293B;">${saudePct != null ? `${saudePct}%` : 'Sem dados'}</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: ${saudePct != null ? saudePct : 0}%; background: #059669;"></div>
              </div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Microclima</span>
                <strong style="color: #1E293B;">${pctNaFaixa}</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: ${resumo?.resumo_condicoes?.pct_na_faixa != null ? resumo.resumo_condicoes.pct_na_faixa : 0}%; background: #0EA5E9;"></div>
              </div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; margin-top: auto;">
          <span>${resumo?.resumo_condicoes?.leituras_avaliadas ? `${resumo.resumo_condicoes.leituras_avaliadas} Leituras Avaliadas` : 'Sem leituras recentes'}</span>
          <span style="color: #047857; font-weight: 600;">${resumo?.resumo_condicoes?.pct_na_faixa != null ? '● Conforme' : '● Aguardando dados'}</span>
        </div>
      </div>

      <!-- CARD 2: LOTES EM OPERAÇÃO -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span class="card-header-label">LOTES EM OPERAÇÃO</span>
          <span class="card-status-pill pill-blue">${totalLotesCadastrados} Lotes</span>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; margin: 12px 0;">
          <!-- Rosca de Capacidade -->
          <div style="position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="90" height="90" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="4.5"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="50, 100" fill="none" stroke="#059669" stroke-width="4.5"/>
            </svg>
            <div style="position: absolute; text-align: center;">
              <span style="font-size: 18px; font-weight: 800; color: #1E293B;">${lotesComSensor}<small style="font-size: 11px; color: #94A3B8;">/${totalLotesCadastrados}</small></span>
              <div style="font-size: 8px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Monitorados</div>
            </div>
          </div>

          <!-- Lista de Categorias -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
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

        <div style="border-top: 1px solid #F1F5F9; padding-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: #475569; margin-top: auto;">
          <span>● ${qtdEmProducao} Produção</span>
          <span>● ${qtdPronto} Pronto</span>
          <span>● ${qtdColhido} Colhido</span>
          <span>● ${qtdArmazenado} Armazenado</span>
          <span>● ${qtdTransporte} Transporte</span>
        </div>
      </div>

      <!-- CARD 3: PREVISÃO DO TEMPO E CLIMA -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span class="card-header-label">PREVISÃO DO TEMPO</span>
          <span class="card-status-pill pill-amber" style="display: flex; align-items: center; gap: 4px;">
            <i data-lucide="map-pin" style="width: 11px; height: 11px;"></i> Petrolina, PE • Hoje
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="sun" style="width: 26px; height: 26px; color: #F59E0B;"></i>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1;" id="clima-temp-resumido">${climaTempResumido}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${climaDescResumido} • Vento ${climaVentoResumido}</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; text-align: center; font-size: 10px;">
            <div><span style="color:#94A3B8;">MANHÃ</span><div style="font-weight:700; color:#334155;">${climaManha}</div></div>
            <div style="border-right: 1px solid #E2E8F0;"></div>
            <div><span style="color:#94A3B8;">TARDE</span><div style="font-weight:700; color:#D97706;">${climaTarde}</div></div>
            <div style="border-right: 1px solid #E2E8F0;"></div>
            <div><span style="color:#94A3B8;">NOITE</span><div style="font-weight:700; color:#334155;">${climaNoite}</div></div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; margin-top: auto;">
          <div><span style="color:#94A3B8; font-size:10px;">UMIDADE</span><div style="font-weight:700; color:#1E293B;" id="clima-umid-resumido">${climaUmidResumido}</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">CHUVA</span><div style="font-weight:700; color:#1E293B;">${climaChuvaResumido}</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">UV</span><div style="font-weight:700; color:#047857;">${climaUvResumido}</div></div>
          ${climaProximosDiasHtml}
        </div>
      </div>

    </div>

    <!-- Middle Row: Resumo da Produção (Gauge Grande) + Monitoramento da Propriedade (Satélite) -->
    <div class="middle-split-row">
      
      <!-- Card Esquerdo: Resumo das Condições e Culturas -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span style="font-size: 14px; font-weight: 700; color: #1E293B; letter-spacing: 0.5px; text-transform: uppercase;">
            RESUMO DAS CONDIÇÕES E CULTURAS
          </span>
        </div>

        <!-- Gauge Semicircular Perfeitamente Alinhado na Mesma Curva Geométrica -->
        <div class="gauge-semicircle-wrap">
          <div class="gauge-svg-container">
            <svg width="260" height="135" viewBox="0 0 260 135" style="display: block; margin: 0 auto;">
              <!-- Arco Base Cinza de 180° perfeito -->
              <path id="gauge-track" d="M 45,120 A 85,85 0 0,1 215,120" fill="none" stroke="#F1F5F9" stroke-width="20" stroke-linecap="round"/>
              <!-- Segmento Verde Contínuo -->
              <path d="M 45,120 A 85,85 0 0,1 215,120" fill="none" stroke="#059669" stroke-width="20" stroke-linecap="round" stroke-dasharray="${resumo?.resumo_condicoes?.pct_na_faixa != null ? (resumo.resumo_condicoes.pct_na_faixa * 2.68).toFixed(0) : '0'} 268" stroke-dashoffset="0"/>
            </svg>
            <div class="gauge-pct-number" style="font-size: ${pctNaFaixa === 'Sem dados' ? '18px' : '28px'};">${pctNaFaixa}</div>
          </div>
          <div class="gauge-caption">LEITURAS CONFORMES</div>
        </div>

        <!-- Barras de Saúde, Umidade e Temperatura -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; border-top: 1px solid #F1F5F9; padding-top: 14px;">
          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Saúde da Plantação (NDVI)</span>
              <strong style="color: #1E293B;">${saudePct != null ? `${saudePct}%` : 'Sem dados'}</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${saudePct != null ? saudePct : 0}%; background: #059669;"></div></div>
          </div>

          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Umidade Média do Dossel</span>
              <strong style="color: #1E293B;">${umidDosselPct != null ? `${umidDosselPct}%` : 'Sem dados'}</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${umidDosselPct != null ? umidDosselPct : 0}%; background: #0284C7;"></div></div>
          </div>

          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Temperatura Foliar</span>
              <strong style="color: #1E293B;">${tempFoliar != null ? `${tempFoliar}°C` : 'Sem dados'}</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: ${tempFoliar != null ? Math.min(100, tempFoliar * 2.5) : 0}%; background: #F59E0B;"></div></div>
          </div>
        </div>

        <!-- Rodapé Duplo: Culturas e Status da Água -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid #F1F5F9; padding-top: 14px; margin-top: auto;">
          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">CULTURAS</div>
            <div style="font-size: 12px; color: #334155; font-weight: 600; margin-top: 4px;">
              Manga, Uva e Melão
            </div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Culturas cadastradas</div>
          </div>

          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">STATUS ÁGUA</div>
            <div style="font-size: 12px; color: #334155; font-weight: 600; margin-top: 4px;">
              ${temValor(rc.pct_na_faixa) ? `${confPct}% na faixa` : 'Sem dados de irrigação'}
            </div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Parâmetro de campo</div>
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
            ${(sensores?.reais > 0 || lotesComSensor > 0)
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

        <div id="satellite-map-viewport" class="satellite-map-container" style="position: relative; overflow: hidden; border-radius: 12px; min-height: 270px; flex: 1; background: #0F172A; cursor: grab; user-select: none;">
          <div id="satellite-map-stage" style="position: absolute; inset: 0; transform-origin: center center; transition: transform 0.2s ease-out;">
            <img src="assets/images/topologia-sensores-campo.jpg" alt="Visão Aérea dos Talhões" class="satellite-bg-img" style="width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; border-radius: 12px;">

            <!-- Sensor 1: DHT11 ESP32-C3 -->
            <div style="position: absolute; top: 22%; left: 24%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 6px; z-index: 10; border: 1px solid rgba(16, 185, 129, 0.6);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
              <span>DHT11 ESP32-C3 (Ar)</span>
            </div>

            <!-- Sensor 3: Solo ESP32 -->
            <div style="position: absolute; bottom: 26%; right: 28%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 6px; z-index: 10; border: 1px solid rgba(14, 165, 233, 0.6);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #0EA5E9;"></span>
              <span>Solo ESP32</span>
            </div>
          </div>

          <div id="map-zoom-badge" style="position: absolute; bottom: 10px; right: 10px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; pointer-events: none; opacity: 0; transition: opacity 0.3s; z-index: 20;">
            100%
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 11px; color: #94A3B8;">
          <div style="display: flex; gap: 16px;">
            <span><strong style="color: #10B981;">●</strong> DHT11 (Ar)</span>
            <span><strong style="color: #0EA5E9;">●</strong> Sensor Solo</span>
          </div>
          <div>Rede Local ESP32 • ThingSpeak</div>
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
            Leituras em tempo real via ESP32 (DHT11 e Sensor de Umidade do Solo)
            <span id="sse-origem-badge" class="card-status-pill pill-green sse-origem-badge" style="font-size: 10px; padding: 2px 8px; margin-left: 8px;">Sensor Real</span>
            <span id="sse-aviso-reconectando" class="sse-aviso-reconectando" style="display: none; margin-left: 8px; font-size: 11px; font-weight: 600; color: #D97706; background: #FFFBEB; border: 1px solid #FDE68A; padding: 2px 8px; border-radius: 6px;">Reconectando...</span>
            <span id="sse-horario-leitura" class="sse-horario-leitura" style="margin-left: 8px; font-size: 11px; color: #64748B;"></span>
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
            <span class="mini-chart-pill pill-green" id="miniChart1-pill">${dg.umidade_ar_24h && dg.umidade_ar_24h.length ? `${Math.round(dg.umidade_ar_24h[dg.umidade_ar_24h.length - 1])}%` : 'Sem dados'}</span>
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
            <span class="mini-chart-pill pill-green" id="miniChart2-pill">${dg.umidade_solo_24h && dg.umidade_solo_24h.length ? `${Math.round(dg.umidade_solo_24h[dg.umidade_solo_24h.length - 1])}%` : 'Sem dados'}</span>
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
            <span class="mini-chart-title">Temperatura do Ar</span>
            <span class="mini-chart-pill pill-green" id="miniChart4-pill">${dg.temp_ar_24h && dg.temp_ar_24h.length ? `${dg.temp_ar_24h[dg.temp_ar_24h.length - 1]}°C` : 'Sem dados'}</span>
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
function renderModoDetalhado(resumo, clima, dg = DEFAULT_DADOS_GRAFICOS, extras = {}) {
  const r = resumo || {};
  const fmtNum = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
  

  // --- Condição geral: rótulo calculado pelo backend (vw_lote_saude) ---
  const cond = r.condicao_geral || {};
  const condRotulo = cond.rotulo || 'Sem dados';
  const condDotCor = cond.nivel === 'critica' ? '#EF4444' : cond.nivel === 'atencao' ? '#F59E0B' : (cond.rotulo ? '#059669' : '#94A3B8');

  // --- Lotes em operação ---
  const lotesTotal = r.lotes_monitorados?.total ?? 0;

  // --- Alertas ativos ---
  const alertasAbertos = Number(r.alertas?.abertos ?? 0);
  const alertaTexto = alertasAbertos > 0 ? `${alertasAbertos} para revisar` : 'Sem alertas';
  const alertaPillTxt = alertasAbertos === 0 ? 'Sem alertas' : 'Atenção leve';

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
      irrCaption = 'Área não informada';
    }
  }

  // --- Condições de cultivo ---
  const rc = r.resumo_condicoes || {};
  const confPct = temValor(rc.pct_na_faixa) ? Math.round(Number(rc.pct_na_faixa)) : 0;
  const umidVal = temValor(rc.umidade_ar_media) ? Math.round(Number(rc.umidade_ar_media)) : '—';
  const tempVal = temValor(rc.temperatura_ar_media) ? fmtNum(rc.temperatura_ar_media, 1) : '—';
  const vpdVal = temValor(rc.vpd_medio_kpa) ? `${fmtNum(rc.vpd_medio_kpa, 2)} kPa` : '— kPa';
  const vpdSub = temValor(rc.vpd_medio_kpa) ? 'Déficit de pressão' : 'Valor não informado';

  // --- Janela de colheita real ---
  const janLista = Array.isArray(extras.janelas) ? extras.janelas : [];
  const primeiraJanela = janLista[0] || null;
  const janProb = primeiraJanela?.probabilidade != null ? Math.round(Number(primeiraJanela.probabilidade)) : 0;
  const janDiasHtml = (primeiraJanela && Array.isArray(primeiraJanela.dias) && primeiraJanela.dias.length > 0)
    ? primeiraJanela.dias.slice(0, 7).map(d => {
        const dt = new Date(d.data || d);
        const diaSem = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        const diaNum = isNaN(dt.getTime()) ? String(d) : String(dt.getDate()).padStart(2, '0');
        return `<div class="harvest-day-box"><span class="harvest-day-name">${diaSem}</span><strong class="harvest-day-num">${diaNum}</strong></div>`;
      }).join('')
    : '<div style="grid-column: 1 / -1; text-align: center; font-size: 12px; color: #64748B; padding: 12px;">Sem previsão de janela cadastrada</div>';

  // --- Mercado real ---
  const mercadoLista = Array.isArray(extras.mercado) ? extras.mercado : [];
  const mercadoCardsHtml = mercadoLista.length > 0
    ? mercadoLista.slice(0, 2).map(m => `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; position: relative;">
          <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">${m.fruta || m.cultura || 'Cultura'}</div>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: 20px; font-weight: 800; color: #1E293B;">R$ ${m.preco_kg != null ? Number(m.preco_kg).toFixed(2).replace('.', ',') : '—'}</span>
            <span style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">${m.demanda || m.tendencia || 'Ativo'}</span>
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 2px; margin-bottom: 10px;">por kg</div>
          <div style="width: 100%; height: 3px; background: #059669; border-radius: 2px;"></div>
        </div>
      `).join('')
    : '<div style="grid-column: 1 / -1; text-align: center; font-size: 12px; color: #64748B; padding: 18px;">Nenhum dado de mercado cadastrado</div>';

  // --- Clima real ---
  const climaAtual = clima?.atual || clima?.agora || clima || {};
  const tVal = climaAtual.temperatura != null ? climaAtual.temperatura : (climaAtual.temperature_2m != null ? climaAtual.temperature_2m : null);
  const climaTemp = tVal != null ? `${Math.round(Number(tVal))}°C` : '—';
  const climaDesc = climaAtual.condicao || climaAtual.descricao || 'Dados meteorológicos';
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

  // SVG Donut calculation: raio = 44, circunferência = 2 * PI * 44 = 276.46
  const circ = 276.46;
  const strokeDashoffset = Math.round(circ - (confPct / 100) * circ);

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
          <span class="dd-caption">lotes ativos</span>
        </div>

        <!-- KPI 3: Alertas Ativos -->
        <div class="dd-card dd-kpi">
          <span class="dd-label">ALERTAS ATIVOS</span>
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0 6px;">
            <span style="font-size: 22px; font-weight: 800; color: #1E293B;" data-kpi="alertas-count">${alertaTexto}</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFBEB; display: flex; align-items: center; justify-content: center; color: #D97706;">
              <i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="dd-pill dd-pill-amber" style="font-size: 10px; padding: 2px 8px;">${alertaPillTxt}</span>
          </div>
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
        <div class="dd-card dd-card-lg" style="padding: 22px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="dd-label">JANELA IDEAL DE COLHEITA</span>
            <div style="width: 26px; height: 26px; border-radius: 6px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
              <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
            </div>
          </div>

          <div style="font-size: 28px; font-weight: 800; color: #1E293B; letter-spacing: -0.5px; margin: 4px 0 2px;">
            ${primeiraJanela ? `${primeiraJanela.janela_inicio || ''} — ${primeiraJanela.janela_fim || ''}` : 'Sem janela prevista'}
          </div>
          <p style="font-size: 11px; color: #64748B; margin: 0 0 16px 0;">
            ${primeiraJanela ? `${primeiraJanela.fruta || 'Cultura'} · ${primeiraJanela.categoria || 'Recomendado'}` : 'Aguardando geração de previsão no backend'}
          </p>

          <!-- 7 Dias da Janela de Colheita -->
          <div class="harvest-days-grid" style="margin-bottom: 20px;">
            ${janDiasHtml}
          </div>

          <!-- Probabilidade com aro circular -->
          <div style="display: flex; align-items: center; gap: 14px; padding-top: 4px;">
            <div style="position: relative; width: 40px; height: 40px; flex-shrink: 0;">
              <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(-90deg);">
                <circle cx="20" cy="20" r="15.5" fill="none" stroke="#E2E8F0" stroke-width="3.5" />
                <circle cx="20" cy="20" r="15.5" fill="none" stroke="#059669" stroke-width="3.5" stroke-dasharray="97.4" stroke-dashoffset="${Math.round(97.4 - (janProb / 100) * 97.4)}" stroke-linecap="round" />
              </svg>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #1E293B;">
                ${janProb}%
              </div>
            </div>
            <span style="font-size: 11.5px; color: #475569; line-height: 1.4;">
              de probabilidade de a janela atender às condições climáticas ideais.
            </span>
          </div>
        </div>

        <!-- Card: Condições de Cultivo -->
        <div class="dd-card dd-card-lg" style="padding: 22px 24px;">
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: #1E293B; margin: 0;">Condições de cultivo</h3>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>Últimas 24 horas</span>
                <span>•</span>
                <span id="sse-origem-badge-detalhado" class="card-status-pill pill-green sse-origem-badge" style="font-size: 10px; padding: 1px 7px;">Sensor Real</span>
                <span id="sse-aviso-reconectando-detalhado" class="sse-aviso-reconectando" style="display: none; font-size: 10px; font-weight: 600; color: #D97706; background: #FFFBEB; border: 1px solid #FDE68A; padding: 1px 6px; border-radius: 4px;">Reconectando...</span>
                <span id="sse-horario-leitura-detalhado" class="sse-horario-leitura" style="font-size: 10px; color: #64748B;"></span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 24px; align-items: center; margin-top: 10px;">
            <!-- Donut Chart 90% na faixa -->
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="position: relative; width: 110px; height: 110px;">
                <svg width="110" height="110" viewBox="0 0 110 110" style="transform: rotate(-90deg);">
                  <circle cx="55" cy="55" r="44" fill="none" stroke="#E2E8F0" stroke-width="11" />
                  <circle cx="55" cy="55" r="44" fill="none" stroke="#059669" stroke-width="11" stroke-dasharray="${circ}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />
                </svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                  <span style="font-size: 26px; font-weight: 800; color: #1E293B; line-height: 1;">${temValor(rc.pct_na_faixa) ? `${confPct}%` : '—'}</span>
                  <span style="font-size: 10px; color: #64748B; margin-top: 2px;">na faixa</span>
                </div>
              </div>
              <div style="font-size: 10px; color: #475569; display: flex; align-items: center; gap: 5px; margin-top: 10px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>
                Leituras dentro da faixa
              </div>
            </div>

            <!-- 3 Linhas de Métricas -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Umidade do ar -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <span style="font-size: 11.5px; color: #475569;">Umidade do ar</span>
                  <strong style="font-size: 16px; font-weight: 700; color: #1E293B;" data-live="umid-ar" id="sse-detalhado-umid">${umidVal}%</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 9999px; overflow: hidden;">
                  <div class="progress-bar-umid" id="sse-detalhado-umid-bar" style="width: ${umidVal}%; height: 100%; background: #059669; border-radius: 9999px; transition: width 0.6s ease;"></div>
                </div>
              </div>

              <!-- Temperatura -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 11.5px; color: #475569;">Temperatura</span>
                  <strong style="font-size: 16px; font-weight: 700; color: #1E293B;" data-live="temp-ar" id="sse-detalhado-temp">${tempVal}°C</strong>
                </div>
                <span style="font-size: 10px; color: #94A3B8;">Leitura do ambiente</span>
              </div>

              <!-- VPD Médio -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 11.5px; color: #475569;">VPD médio</span>
                  <strong style="font-size: 16px; font-weight: 700; color: #1E293B;">${vpdVal}</strong>
                </div>
                <span style="font-size: 10px; color: #94A3B8;">${vpdSub}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Linha 3: Mercado (com sub-cards estilizados) + Previsão do tempo -->
      <div class="dd-split-grid">
        <!-- Card: Preço e Demanda de Mercado -->
        <div class="dd-card dd-card-lg" style="padding: 20px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0;">Preço e demanda de mercado</h3>
            <span style="font-size: 10.5px; color: #94A3B8;">Cadastro manual</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            ${mercadoCardsHtml}
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

      <!-- Linha 4: Próximos passos -->
      <div class="dd-card dd-card-lg" style="padding: 18px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0;">Próximos passos</h3>
          <span style="font-size: 10.5px; color: #64748B;">Sugestões de acompanhamento</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          <!-- 01: Revisar os alertas -->
          <a href="#/alertas" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;">
            <i data-lucide="alert-triangle" style="width: 18px; height: 18px; color: #059669; flex-shrink: 0; margin-top: 2px;"></i>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Revisar os alertas</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">Confira os ${alertasAbertos} alertas e defina a prioridade.</p>
            </div>
          </a>

          <!-- 02: Preparar a colheita -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
            <i data-lucide="calendar" style="width: 18px; height: 18px; color: #059669; flex-shrink: 0; margin-top: 2px;"></i>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Preparar a colheita</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">${primeiraJanela ? `Janela prevista: ${primeiraJanela.janela_inicio || ''} a ${primeiraJanela.janela_fim || ''}.` : 'Aguardando previsão de janela de colheita.'}</p>
            </div>
          </div>

          <!-- 03: Acompanhar a irrigação -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #059669; display: inline-block; flex-shrink: 0; margin-top: 6px;"></span>
            <div>
              <strong style="font-size: 13px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">Acompanhar a irrigação</strong>
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">Consulte a previsão antes de aplicar água.</p>
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

  // Zoom & Pan Interativo no Mapa de Satélite
  const mapStage = document.getElementById('satellite-map-stage');
  const mapViewport = document.getElementById('satellite-map-viewport');
  const btnZoomIn = document.getElementById('btn-map-zoom-in');
  const btnZoomOut = document.getElementById('btn-map-zoom-out');
  const btnFullscreen = document.getElementById('btn-map-fullscreen');
  const zoomBadge = document.getElementById('map-zoom-badge');

  if (mapStage && mapViewport) {
    let scale = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const applyTransform = () => {
      mapStage.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
      if (zoomBadge) {
        zoomBadge.textContent = `${Math.round(scale * 100)}%`;
        zoomBadge.style.opacity = scale > 1.0 ? '1' : '0';
      }
      mapViewport.style.cursor = scale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default';
    };

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.min(2.5, +(scale + 0.25).toFixed(2));
        applyTransform();
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.max(1.0, +(scale - 0.25).toFixed(2));
        if (scale === 1.0) { panX = 0; panY = 0; }
        applyTransform();
      });
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scale = scale > 1.0 ? 1.0 : 1.5;
        if (scale === 1.0) { panX = 0; panY = 0; }
        applyTransform();
      });
    }

    // Zoom via Scroll da Roda do Mouse
    mapViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      scale = Math.min(2.5, Math.max(1.0, +(scale + delta).toFixed(2)));
      if (scale === 1.0) { panX = 0; panY = 0; }
      applyTransform();
    }, { passive: false });

    // Pan via Click e Arrastar
    mapViewport.addEventListener('mousedown', (e) => {
      if (scale <= 1.0) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      mapViewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      const maxPan = (scale - 1) * 120;
      panX = Math.max(-maxPan, Math.min(maxPan, panX));
      panY = Math.max(-maxPan, Math.min(maxPan, panY));
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        mapViewport.style.cursor = scale > 1.0 ? 'grab' : 'default';
      }
    });
  }

  // Gera curvas suaves com os dados reais persistidos no PostgreSQL
  const isResumidoCurrent = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
  if (isResumidoCurrent) {
    criarMiniGraficoApple('miniChart1', dg.umidade_ar_24h || DEFAULT_DADOS_GRAFICOS.umidade_ar_24h, '#10B981');
    criarMiniGraficoApple('miniChart2', dg.umidade_solo_24h || DEFAULT_DADOS_GRAFICOS.umidade_solo_24h, '#0D9488');
    criarMiniGraficoApple('miniChart4', dg.temp_ar_24h || DEFAULT_DADOS_GRAFICOS.temp_ar_24h, '#16A34A');
  } else {
    // No modo Detalhado, os gráficos são em tom verde esmeralda com pontos conforme Figma
    criarMiniGraficoApple('miniChart1', dg.umidade_ar_24h || DEFAULT_DADOS_GRAFICOS.umidade_ar_24h, '#10B981');
    criarMiniGraficoApple('miniChart2', dg.umidade_solo_24h || DEFAULT_DADOS_GRAFICOS.umidade_solo_24h, '#10B981');
    criarMiniGraficoApple('miniChart4', dg.temp_ar_24h || DEFAULT_DADOS_GRAFICOS.temp_ar_24h, '#10B981');
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
          saude_plantacao_pct: Number(document.getElementById('inp-dg-saude')?.value || 85),
          umidade_dossel_pct: Number(document.getElementById('inp-dg-dossel')?.value || 67),
          temp_foliar_c: Number(document.getElementById('inp-dg-tfoliar')?.value || 27),
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

  // Interatividade nos seletores de período de telemetria
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
      if (tf === '24h') {
        criarMiniGraficoApple('miniChart1', cur.umidade_ar_24h || DEFAULT_DADOS_GRAFICOS.umidade_ar_24h, '#10B981');
        criarMiniGraficoApple('miniChart2', cur.umidade_solo_24h || DEFAULT_DADOS_GRAFICOS.umidade_solo_24h, '#0D9488');
        criarMiniGraficoApple('miniChart4', cur.temp_ar_24h || DEFAULT_DADOS_GRAFICOS.temp_ar_24h, '#16A34A');
      } else {
        // Sem agregação histórica de 7d/30d registrada, passa vazio para exibir "Sem dados"
        criarMiniGraficoApple('miniChart1', [], '#10B981');
        criarMiniGraficoApple('miniChart2', [], '#0D9488');
        criarMiniGraficoApple('miniChart4', [], '#16A34A');
      }
    });
  });
}

/**
 * Função de renderização de gráficos Chart.js refinados com estética Apple em Alta Resolução (Retina DPI)
 */
function criarMiniGraficoApple(canvasId, dataPoints, strokeColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    canvas.style.display = 'none';
    if (parent && !parent.querySelector('.grafico-sem-dados')) {
      const noDataEl = document.createElement('div');
      noDataEl.className = 'grafico-sem-dados';
      noDataEl.style.cssText = 'height: 100%; min-height: 48px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94A3B8; font-style: italic;';
      noDataEl.textContent = 'Sem dados';
      parent.appendChild(noDataEl);
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

  // Exportar Telemetria (CSV & PDF Reais)
  const btnExport = document.getElementById('btn-export-telemetria');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const headers = ['Timestamp', 'Sensor', 'Lote / Talhao', 'Temp Ar (C)', 'Umidade Ar (%)', 'Umidade Solo (%)', 'Status'];
      const g = dadosGraficosCache || DEFAULT_DADOS_GRAFICOS;
      const horas = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      const rows = horas.map((h, i) => [
        `Hoje ${h}`,
        'DHT11 ESP32-C3 (#3500765)',
        'Lote #1 / Talhao A1',
        g.temp_ar_24h?.[i] ?? 27.0,
        g.umidade_ar_24h?.[i] ?? 60,
        g.umidade_solo_24h?.[i] ?? 56,
        'VALIDO'
      ]);
      const dataTag = new Date().toISOString().slice(0, 10);
      openExportChoiceModal(
        Modal,
        'Exportar Telemetria IoT — Petrolina US915',
        () => {
          downloadCSV(`telemetria_petrolina_us915_${dataTag}.csv`, headers, rows);
          toast.success('Download CSV Concluído', `telemetria_petrolina_us915_${dataTag}.csv baixado com sucesso.`);
        },
        () => {
          downloadPDF(`telemetria_petrolina_us915_${dataTag}.pdf`, {
            title: 'Relatório de Telemetria IoT — Petrolina US915',
            subtitle: 'Série 24h • Sensores de Campo',
            headers,
            rows
          });
          toast.success('Download PDF Concluído', `telemetria_petrolina_us915_${dataTag}.pdf baixado com sucesso.`);
        }
      );
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
      const umidVal = s.umidade != null ? `${Number(s.umidade).toFixed(1)}%` : '—';
      const origemBadge = s.origem_telemetria === 'real'
        ? '<span style="background:#ECFDF5; color:#065F46; padding:2px 8px; border-radius:6px; font-weight:700; font-size:10px;">Real</span>'
        : '<span style="background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:6px; font-weight:700; font-size:10px;">Sem dados</span>';

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
          <strong>Última Leitura:</strong> ${formatarDataRecife(s.ultima_leitura)}
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
let _adminDashState = { leiturasGrafico: null };

async function renderAdminDashboard() {
  const [resResumo, resUsuarios, resLotes, resRegras, resLogs, resPortos, resLeituras] = await Promise.allSettled([
    api.getDashboardResumo(),
    api.getUsuarios(),
    api.getLotes(),
    api.getConfigParametros(),
    api.getAuditoria({ limit: 4 }),
    api.getPortos(),
    api.getLeituras(24)
  ]);

  const resumo = resResumo.status === 'fulfilled' && resResumo.value ? resResumo.value : {};
  const usuarios = resUsuarios.status === 'fulfilled' && Array.isArray(resUsuarios.value) ? resUsuarios.value : [];
  const lotes = resLotes.status === 'fulfilled' && Array.isArray(resLotes.value) ? resLotes.value : [];
  const regras = resRegras.status === 'fulfilled' && Array.isArray(resRegras.value) ? resRegras.value : [];
  const logs = resLogs.status === 'fulfilled' && Array.isArray(resLogs.value) ? resLogs.value : [];
  const portos = resPortos.status === 'fulfilled' && Array.isArray(resPortos.value) ? resPortos.value : [];
  const leituras = resLeituras.status === 'fulfilled' && Array.isArray(resLeituras.value) ? resLeituras.value : [];

  _adminDashState.leiturasGrafico = leituras;

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

  // Média real de umidade_solo das leituras recentes (sem temperatura_solo)
  const leiturasSolo = leituras.map(l => Number(l.umidade_solo)).filter(v => !isNaN(v) && v > 0);
  const umidSoloMedia = leiturasSolo.length > 0
    ? `${(leiturasSolo.reduce((a, b) => a + b, 0) / leiturasSolo.length).toFixed(1)}% VWC`
    : 'Sem leitura solo 24h';

  // 6. Acessos recentes (tabela log_acesso)
  const acessosHtml = logs.length > 0 ? logs.map(log => {
    const nome = String(log.usuario || `Usuário #${log.id_usuario || 'Sistema'}`);
    const iniciais = nome.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'SY';
    const hora = log.data_hora ? new Date(log.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const ok = !String(log.resultado || '').toLowerCase().includes('falha') && !String(log.resultado || '').toLowerCase().includes('negado');
    return `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${ok ? '#D1FAE5' : '#FEE2E2'}; border: 1.5px solid ${ok ? '#10B981' : '#EF4444'}; color: ${ok ? '#065F46' : '#991B1B'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0;">${iniciais}</div>
          <div style="min-width: 0;">
            <strong style="font-size: 13px; color: #0F172A; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</strong>
            <div style="font-size: 11px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.acao || 'acesso'} • ${log.ip || 'IP N/D'}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
          <span style="font-size: 10px; color: #64748B;">${hora}</span>
          <div style="font-size: 10px; font-weight: 700; color: ${ok ? '#047857' : '#DC2626'};">${log.resultado || 'sucesso'}</div>
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
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">${pctSensOnline}% ATIVOS</span>
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
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">PostgreSQL Live</span>
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

  // Gráfico com leituras reais do PostgreSQL (leitura_climatica)
  const ctx = document.getElementById('chart-admin-atividade');
  if (ctx && window.Chart) {
    const raw = Array.isArray(_adminDashState.leiturasGrafico) ? [..._adminDashState.leiturasGrafico].reverse() : [];
    const labels = raw.length > 0
      ? raw.map(l => l.data_hora ? new Date(l.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--')
      : ['Sem dados'];
    const umidData = raw.length > 0 ? raw.map(l => l.umidade_solo != null ? Number(l.umidade_solo) : (l.umidade != null ? Number(l.umidade) : null)) : [null];
    const tempData = raw.length > 0 ? raw.map(l => l.temperatura != null ? Number(l.temperatura) : null) : [null];

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
          y1: { position: 'right', ticks: { callback: v => v + '°C', font: { size: 10 }, color: '#0284C7' }, grid: { display: false } }
        }
      }
    });

    chartInstances.push(chart);
  }
}
