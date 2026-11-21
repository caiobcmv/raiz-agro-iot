const API_URL = "http://localhost:8000";

import { liveTelemetry } from '../live-telemetry.js';
/**
 * VIEW: DASHBOARD PRINCIPAL - COM SUPORTE AOS MODOS RESUMIDO E DETALHADO DO FIGMA
 * E SUPORTE COMPLETO AO PERFIL ANALISTA (LUIZ FELIPE)
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

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
  const elTempResumido = document.getElementById('sse-temp-resumido') || document.querySelector('[data-live="resumido-temp"]');
  if (elTempResumido) {
    elTempResumido.textContent = tempIntStr;
    _pulseElement(elTempResumido);
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

  const elPillTemp = document.getElementById('miniChart4-pill');
  if (elPillTemp && !isNaN(tempNum)) {
    elPillTemp.textContent = `${tempNum.toFixed(1)}°C Ideal`;
    _pulseElement(elPillTemp);
  }

  // 2. Atualizar Umidade na tela
  const elUmidResumido = document.getElementById('sse-umid-resumido') || document.querySelector('[data-live="umid-ar"]');
  if (elUmidResumido) {
    elUmidResumido.textContent = umidStr;
    _pulseElement(elUmidResumido);
  }

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
    elPillUmid.textContent = `${Math.round(umidNum)}% Ideal`;
    _pulseElement(elPillUmid);
  }

  // 3. Selo "Real" ou "Simulado" conforme campo "origem"
  const origemValor = String(data.origem || '').toLowerCase();
  const isReal = origemValor === 'real';
  const seloTexto = isReal ? 'Real' : 'Simulado';
  const seloClasseRemover = isReal ? 'pill-blue' : 'pill-green';
  const seloClasseAdicionar = isReal ? 'pill-green' : 'pill-blue';

  document.querySelectorAll('#sse-origem-badge, #sse-origem-badge-detalhado, .sse-origem-badge').forEach(badge => {
    badge.textContent = seloTexto;
    badge.classList.remove(seloClasseRemover);
    badge.classList.add(seloClasseAdicionar);
  });

  // 4. Horário da última leitura em pt-BR (America/Recife)
  const horaFormatadaRecife = formatarTimestampRecife(data.timestamp);
  document.querySelectorAll('#sse-horario-leitura, #sse-horario-leitura-detalhado, .sse-horario-leitura').forEach(el => {
    el.textContent = horaFormatadaRecife ? `Última leitura: ${horaFormatadaRecife}` : '';
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

function iniciarSSEDashboard() {
  if (sseConnection) {
    try { sseConnection.close(); } catch (e) {}
    sseConnection = null;
  }

  const sseUrl = `${API_URL}/dashboard/stream`;
  let es = null;
  try {
    es = new EventSource(sseUrl);
    sseConnection = es;
  } catch (err) {
    console.warn('[SSE] Falha ao instanciar EventSource:', err);
    return;
  }

  es.onopen = () => {
    // Esconder aviso no onopen
    document.querySelectorAll('.sse-aviso-reconectando, #sse-aviso-reconectando, #sse-aviso-reconectando-detalhado').forEach(el => {
      el.style.display = 'none';
    });
  };

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      atualizarDashboardComSSE(data);
    } catch (err) {
      console.warn('Erro ao decodificar JSON do SSE:', err);
    }
  };

  es.onerror = () => {
    // Mostrar aviso "Reconectando..." no onerror sem chamar es.close()
    document.querySelectorAll('.sse-aviso-reconectando, #sse-aviso-reconectando, #sse-aviso-reconectando-detalhado').forEach(el => {
      el.style.display = 'inline-flex';
    });
  };

  // Encerra SSE no evento beforeunload
  window.addEventListener('beforeunload', () => {
    if (es) {
      es.close();
    }
  });

  // Encerra SSE se o usuário navegar para fora do dashboard no modo SPA
  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#/' && window.location.hash !== '#/dashboard') {
      if (sseConnection) {
        sseConnection.close();
        sseConnection = null;
      }
    }
  });
}

const DEFAULT_DADOS_GRAFICOS = {
  umidade_ar_24h: [61, 60, 59, 58, 60, 61, 63, 62],
  umidade_solo_24h: [54, 53, 55, 57, 59, 58, 57, 58],
  temp_solo_24h: [24.1, 23.9, 24.3, 24.6, 24.8, 24.5, 24.4, 24.5],
  temp_ar_24h: [26.2, 25.8, 26.8, 28.2, 29.0, 28.1, 27.5, 27.8],
  conformidade_geral_pct: 90,
  saude_plantacao_pct: 85,
  umidade_dossel_pct: 67,
  temp_foliar_c: 27,
  agua_reservatorio_pct: 63,
  vazao_ldia: 4200
};

export async function renderDashboard() {
  const profileRole = auth.getActiveProfile();
  if (profileRole === 'admin') {
    return renderAdminDashboard();
  }
  if (profileRole === 'analista') {
    return renderAnalistaDashboard();
  }

  const isResumido = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
  
  // Busca dados reais do PostgreSQL em paralelo (sem usar cache desatualizado)
  let resumo = null, clima = null, graficos = null;
  try {
    const results = await Promise.allSettled([
      api.getDashboardResumo(),
      api.getClimaAtual(),
      api.getDadosGraficos()
    ]);
    resumo = results[0].status === 'fulfilled' ? results[0].value : null;
    clima = results[1].status === 'fulfilled' ? results[1].value : null;
    graficos = results[2].status === 'fulfilled' ? results[2].value : null;
  } catch (e) {
    console.warn('Erro ao obter métricas online:', e);
  }

  dadosGraficosCache = {
    ...DEFAULT_DADOS_GRAFICOS,
    ...(graficos || {})
  };

  // Modo detalhado: recomendação de irrigação e sensores (para checar se há sensor de solo real)
  let extrasDetalhado = { irrigacao: null, sensores: null };
  if (!isResumido) {
    const [irr, sens] = await Promise.allSettled([api.getPrevisoesIrrigacao(), api.getSensores()]);
    extrasDetalhado = {
      irrigacao: irr.status === 'fulfilled' ? irr.value : null,
      sensores: sens.status === 'fulfilled' ? sens.value : null
    };
  }

  return `
    <div class="dashboard-canvas apple-animate-in">
      ${isResumido ? renderModoResumido(resumo, clima, dadosGraficosCache) : renderModoDetalhado(resumo, clima, dadosGraficosCache, extrasDetalhado)}
    </div>
  `;
}

/**
 * 0. DASHBOARD DO PERFIL ANALISTA (LUIZ FELIPE - VISÃO GERAL DO SISTEMA)
 * Fiel à Imagem 1 do Figma
 */
function renderAnalistaDashboard() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info">
          <span class="analista-dot-pulse"></span>
          <span>GATEWAY PETROLINA-04 • CONCENTRADOR ESP32 ATIVO</span>
          <span class="analista-badge-tech">ESP-MESH v4.2.1-prod</span>
        </div>
        <div class="analista-subbar-actions">
          
          <button class="btn-analista-sync" id="btn-sync-thingspeak">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Sincronizar Ingestão ThingSpeak</span>
          </button>
          <button class="btn-analista-export" id="btn-export-telemetria">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Telemetria</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs do Analista -->
      <div class="kpi-grid-4col">
        <!-- KPI 1: SAÚDE DA REDE MESH -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SAÚDE DA REDE MESH</span>
            <span class="kpi-badge green">EXCELENTE</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="rede-saude">96%</span>
            <span class="kpi-sub-num" data-kpi="rede-status">24 de 25 nós operacionais</span>
          </div>
          <div class="kpi-bottom-row">
            <span>Latência média: <strong>124 ms</strong></span>
            <span style="color: #059669; font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="check-circle-2" style="width: 13px; height: 13px;"></i> Mesh OK
            </span>
          </div>
        </div>

        <!-- KPI 2: SENSORES E SONDAS -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SENSORES E SONDAS</span>
            <span style="color: #0284C7;"><i data-lucide="cpu" style="width: 16px; height: 16px;"></i></span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="sensores-total">24</span>
            <span class="kpi-sub-num">unidades ativas</span>
          </div>
          <div class="kpi-bottom-row" style="gap: 6px;">
            <span style="background: #ECFDF5; color: #047857; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 10px;">16 Umidade do Solo</span>
            <span style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 10px;">8 Microclima (Ar)</span>
          </div>
        </div>

        <!-- KPI 3: MÉDIA CLIMÁTICA E SOLO -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">MÉDIA CLIMÁTICA E SOLO</span>
            <span class="kpi-badge green">FAIXA ADEQUADA</span>
          </div>
          <div class="kpi-value-row" style="gap: 16px;">
            <div>
              <span class="kpi-big-num" data-kpi="temp-ar">27.4°C</span>
              <div style="font-size: 10px; color: #64748B;">Temp. Ar [Teto 32°C]</div>
            </div>
            <div>
              <span class="kpi-big-num" style="color: #0284C7;" data-kpi="umid-solo">46.2%</span>
              <div style="font-size: 10px; color: #64748B;">Umidade Solo VWC</div>
            </div>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #059669; font-weight: 500;">Equilíbrio hídrico e térmico sustentado</span>
          </div>
        </div>

        <!-- KPI 4: ALERTAS DO SISTEMA -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">ALERTAS DO SISTEMA</span>
            <span class="kpi-badge yellow">ATENÇÃO LEVE</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #D97706;" data-kpi="alertas-count">2</span>
            <span class="kpi-sub-num">Necessitam revisão em campo</span>
          </div>
          <div class="kpi-bottom-row">
            <span>1 Nível Alto • 1 Nível Médio</span>
            <a href="#/alertas" style="color: #0284C7; font-weight: 600; text-decoration: none;">Ver central &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Seção Principal: Topologia de Sensores no Campo -->
      <div class="analista-map-card">
        <div class="map-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="map" style="width: 18px; height: 18px; color: #10B981;"></i>
              Topologia de Sensores no Campo
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Visualização da área de cobertura georreferenciada e dispersão dos nós
            </p>
          </div>

          <!-- Filtros de Topologia -->
          <div class="map-filter-tabs">
            <button class="map-tab-btn active" data-filter="todos">Todos (24)</button>
            <button class="map-tab-btn" data-filter="solo">Umidade do Solo (16)</button>
            <button class="map-tab-btn" data-filter="ar">Microclima / Ar (8)</button>
            <button class="map-tab-btn" data-filter="alerta">Em Alerta (2)</button>
          </div>
        </div>

        <!-- Viewport Aérea com Nós Posicionados conforme Figma -->
        <div class="map-view-viewport" id="analista-map-viewport">
          <img src="assets/images/topologia-sensores-campo.jpg" alt="Topologia de Sensores no Campo - Vale do São Francisco" class="map-view-bg">

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

          <!-- Gateway Central ESP32 com Pulso Radar -->
          <div class="gateway-center-marker" style="top: 42%; left: 58%;" title="Gateway Central ESP32 - Concentrador Ativo" data-node="gateway">
            <div class="gateway-pulse-ring"></div>
            <i data-lucide="radio" style="width: 22px; height: 22px;"></i>
          </div>

          <!-- Pinos de Sensores Interativos -->
          <div class="sensor-pin-marker green" style="top: 36%; left: 44%;" data-node="03" data-tipo="solo" title="Nó 03: Sensor de Umidade do Solo • 48% VWC">
            03
          </div>

          <div class="sensor-pin-marker red" style="top: 46%; left: 43%;" data-node="19" data-tipo="alerta" title="Nó 19: Alerta Térmico • 62.4°C (Outlier)">
            19
          </div>

          <div class="sensor-pin-marker green" style="top: 48%; left: 48%;" data-node="01" data-tipo="solo" title="Nó 01: Sensor de Umidade do Solo A1 • 46.2% VWC">
            01
          </div>

          <div class="sensor-pin-marker blue" style="top: 38%; left: 72%;" data-node="04" data-tipo="ar" title="Nó 04: Sensor DHT11 Ar • 27.8°C / 61% UR">
            04
          </div>

          <div class="sensor-pin-marker blue" style="top: 45%; left: 74%;" data-node="08" data-tipo="ar" title="Nó 08: Sensor DHT11 Dossel • 26.5°C">
            08
          </div>

          <div class="sensor-pin-marker blue" style="top: 50%; left: 70%;" data-node="07" data-tipo="ar" title="Nó 07: Sensor DHT11 Perimetral • 27.1°C">
            07
          </div>

          <!-- Pill de Área no Canto Inferior Esquerdo -->
          <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #047857;">
              <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #0F172A;">Área de cultivo</div>
              <div style="font-size: 10px; color: #64748B;">Vale do São Francisco — PE (45.0 ha)</div>
            </div>
          </div>
        </div>

        <!-- Legenda Inferior do Mapa -->
        <div class="map-legend-row">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
              Sensores Ativos (22)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span>
              Atenção / Limiar (2)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #94A3B8;">
              <i data-lucide="radio" style="width: 12px; height: 12px;"></i>
              ThingSpeak: 5 min (Wi-Fi ESP32)
            </span>
          </div>

          <a href="#/sensores" style="color: #0284C7; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;">
            Ver telemetria detalhada &rarr;
          </a>
        </div>
      </div>

      <!-- Grid Inferior (2 Cards): Auditoria de Ingestão e Modelos Preditivos -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Card Esquerda: Auditoria de Ingestão e Leituras Rejeitadas -->
        <div class="kpi-analista-card" style="min-height: auto; padding: 20px;">
          <div class="kpi-top-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="shield-alert" style="width: 16px; height: 16px; color: #F59E0B;"></i>
                Auditoria de Ingestão e Leituras Rejeitadas
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Filtragem de ruídos físicos da tabela <code style="background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">leitura_rejeitada</code>
              </p>
            </div>
            <span class="kpi-badge yellow">2 Descartadas Hoje</span>
          </div>

          <!-- Item 1 Rejeitado -->
          <div style="border-top: 1px solid #F1F5F9; padding: 12px 0; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 700; color: #0F172A;">Sonda Solo #SNS-SL-04</span>
              <span style="font-size: 10px; background: #ECFDF5; color: #065F46; padding: 2px 6px; border-radius: 4px; font-weight: 600;">LOTE A1 • Uva Vitória</span>
            </div>
            <div style="font-size: 11px; color: #B91C1C; margin-bottom: 8px;">
              Motivo: Outlier térmico (temperatura_bruta = 62.4°C acima do limite físico)
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="incident-btn-secondary btn-recalibrar" style="font-size: 11px; padding: 4px 10px;" data-sensor="SNS-SL-04">
                Recalibrar Offset
              </button>
              <div style="flex: 1; text-align: right;">
                <span style="font-size: 10px; color: #64748B;">Confiabilidade pós-descarte: <strong>98.4%</strong></span>
              </div>
            </div>
          </div>

          <!-- Item 2 Rejeitado -->
          <div style="border-top: 1px solid #F1F5F9; padding: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 700; color: #0F172A;">Sensor de Umidade do Solo #SNS-SL-07</span>
              <span style="font-size: 10px; background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">LOTE C2 • Manga Palmer</span>
            </div>
            <div style="font-size: 11px; color: #D97706; margin-bottom: 8px;">
              Motivo: Leitura analógica corrompida (umidade_bruta &lt; 0% VWC)
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <button class="incident-btn-secondary btn-ver-log" style="font-size: 11px; padding: 4px 10px;" data-sensor="SNS-SL-07">
                Ver Log ThingSpeak
              </button>
              <div style="flex: 1; text-align: right;">
                <span style="font-size: 10px; color: #64748B;">Progresso reteste: <strong>65% (46h/72h)</strong></span>
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B;">
            <span>Última sincronização ThingSpeak às 15:42</span>
            <a href="#/sensores" style="color: #0284C7; font-weight: 600; text-decoration: none;">Histórico completo &rarr;</a>
          </div>
        </div>

        <!-- Card Direita: Modelos Preditivos e Limiares de Alerta -->
        <div class="kpi-analista-card" style="min-height: auto; padding: 20px;">
          <div class="kpi-top-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="sliders" style="width: 16px; height: 16px; color: #10B981;"></i>
                Modelos Preditivos e Limiares de Alerta
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Regras automatizadas de estabilidade e provisão agronômica
              </p>
            </div>
          </div>

          <!-- Risco de Déficit Hídrico -->
          <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 700; color: #92400E; display: flex; align-items: center; gap: 6px;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #D97706;"></span>
                Risco de Déficit Hídrico Severo
              </span>
              <span style="font-size: 10px; font-weight: 700; background: #FDE68A; color: #92400E; padding: 2px 6px; border-radius: 4px;">CORTE PREDITIVO: ALTO</span>
            </div>
            <p style="font-size: 11px; color: #78350F; line-height: 1.4; margin-bottom: 6px;">
              Probabilidade projetada em 84% para as próximas 12 horas no LOTE A1 com base na evapotranspiração Penman-Monteith.
            </p>
            <div style="font-size: 11px; font-weight: 600; color: #92400E; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="lightbulb" style="width: 13px; height: 13px;"></i>
              Ação recomendada: Antecipar irrigação matinal em 40 min.
            </div>
          </div>

          <!-- Configurações de Transmissão -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
              <div>
                <div style="font-size: 12px; font-weight: 600; color: #0F172A;">Frequência de Ingestão ThingSpeak</div>
                <div style="font-size: 10px; color: #64748B;">Balanço de energia solar vs transmissão de pacotes</div>
              </div>
              <button class="incident-btn-secondary" id="btn-freq-ingestao" style="font-size: 11px; padding: 4px 8px;">
                A cada 5 min (Wi-Fi)
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
              <div>
                <div style="font-size: 12px; font-weight: 600; color: #0F172A;">Filtro de Ruído e Auto-calibração do Solo</div>
                <div style="font-size: 10px; color: #64748B;">Compensação de umidade e condutividade em ciclo de 7 dias</div>
              </div>
              <label style="position: relative; display: inline-block; width: 40px; height: 22px;">
                <input type="checkbox" id="check-filtro-ruido" checked style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #10B981; transition: .3s; border-radius: 34px;">
                  <span style="position: absolute; content: ''; height: 16px; width: 16px; left: 20px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%;"></span>
                </span>
              </label>
            </div>
          </div>

          <!-- Banner de Sucesso Inferior -->
          <div style="background: #183D2E; color: #FFFFFF; border-radius: 8px; padding: 10px 14px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="check" style="width: 14px; height: 14px; color: #34D399;"></i>
              <div>
                <strong>Transição Concluída com Sucesso</strong>
                <div style="font-size: 10px; color: #A7F3D0;">Integridade de dados 100% sincronizada com canais ThingSpeak.</div>
              </div>
            </div>
            <button style="background: none; border: none; color: #A7F3D0; cursor: pointer; font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
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
  const confPct = Number(dg.conformidade_geral_pct ?? 90);
  const saudePct = Number(dg.saude_plantacao_pct ?? 85);
  const umidDosselPct = Number(dg.umidade_dossel_pct ?? 67);
  const tempFoliar = Number(dg.temp_foliar_c ?? 27);
  const aguaPct = Number(dg.agua_reservatorio_pct ?? 63);
  const vazaoLdia = Number(dg.vazao_ldia ?? 4200);
  const uArLast = (dg.umidade_ar_24h && dg.umidade_ar_24h.length) ? dg.umidade_ar_24h[dg.umidade_ar_24h.length - 1] : 62;
  const uSoloLast = (dg.umidade_solo_24h && dg.umidade_solo_24h.length) ? dg.umidade_solo_24h[dg.umidade_solo_24h.length - 1] : 58;
  const tSoloLast = (dg.temp_solo_24h && dg.temp_solo_24h.length) ? dg.temp_solo_24h[dg.temp_solo_24h.length - 1] : 24.5;
  const tArLast = (dg.temp_ar_24h && dg.temp_ar_24h.length) ? dg.temp_ar_24h[dg.temp_ar_24h.length - 1] : 27.8;

  return `
    <!-- Top Row: 3 Cards (Condição Geral, Lotes em Operação, Previsão do Tempo) -->
    <div class="top-kpi-3col">
      
      <!-- CARD 1: CONDIÇÃO GERAL -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span class="card-header-label">CONDIÇÃO GERAL</span>
          <span class="card-status-pill pill-green">Excelente</span>
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
              <!-- Arco Base Cinza de 180 graus (R=50, centro em 65, 60) -->
              <path d="M 15,60 A 50,50 0 0,1 115,60" fill="none" stroke="#F1F5F9" stroke-width="11" stroke-linecap="round"/>
              <!-- Arco Preenchido com Gradiente Suave -->
              <path d="M 15,60 A 50,50 0 0,1 115,60" fill="none" stroke="url(#gauge-grad-card1)" stroke-width="11" stroke-linecap="round" stroke-dasharray="148 157.1" stroke-dashoffset="0"/>
              
              <!-- Ponteiro indicador Apple perfeitamente alinhado na direção do valor (34 graus) -->
              <line x1="65" y1="60" x2="101" y2="36" stroke="#183D2E" stroke-width="3" stroke-linecap="round"/>
              <circle cx="65" cy="60" r="5" fill="#183D2E"/>
              <circle cx="65" cy="60" r="2" fill="#FFFFFF"/>
            </svg>
            <div style="font-size: 18px; font-weight: 800; color: #1E293B; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              96% <span style="font-size: 9px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 4px;">Ótimo</span>
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 2px;">ÍNDICE GERAL</span>
          </div>

          <!-- Barras de Sub-métricas -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Água e Solo</span>
                <strong style="color: #1E293B;">98%</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: 98%; background: #10B981;"></div>
              </div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Saúde Foliar</span>
                <strong style="color: #1E293B;">96%</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: 96%; background: #059669;"></div>
              </div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="color: #64748B;">Microclima</span>
                <strong style="color: #1E293B;">94%</strong>
              </div>
              <div class="progress-track-bg">
                <div class="progress-fill-bar" style="width: 94%; background: #0EA5E9;"></div>
              </div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; margin-top: auto;">
          <span>Parâmetros 100% Ideais</span>
          <span style="color: #047857; font-weight: 600;">● 24h Conforme</span>
        </div>
      </div>

      <!-- CARD 2: LOTES EM OPERAÇÃO -->
      <div class="figma-card">
        <div class="card-top-title-row">
          <span class="card-header-label">LOTES EM OPERAÇÃO</span>
          <span class="card-status-pill pill-blue">6 Ativos</span>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; margin: 12px 0;">
          <!-- Rosca de Capacidade -->
          <div style="position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="90" height="90" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="4.5"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="50, 100" fill="none" stroke="#059669" stroke-width="4.5"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="33, 100" stroke-dashoffset="-50" fill="none" stroke="#0284C7" stroke-width="4.5"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="17, 100" stroke-dashoffset="-83" fill="none" stroke="#F59E0B" stroke-width="4.5"/>
            </svg>
            <div style="position: absolute; text-align: center;">
              <span style="font-size: 18px; font-weight: 800; color: #1E293B;">6<small style="font-size: 11px; color: #94A3B8;">/10</small></span>
              <div style="font-size: 8px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Capacidade</div>
            </div>
          </div>

          <!-- Lista de Categorias -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#059669;"></span>Colheita</span>
                <strong style="color: #334155;">3 lotes</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 50%; background: #059669;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#0284C7;"></span>Maturação</span>
                <strong style="color: #334155;">2 lotes</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 33%; background: #0284C7;"></div></div>
            </div>

            <div class="metric-progress-item">
              <div class="metric-labels-row">
                <span style="display: flex; align-items: center; gap: 6px; color: #475569;"><span style="width:7px; height:7px; border-radius:50%; background:#F59E0B;"></span>Em Produção</span>
                <strong style="color: #334155;">1 lote</strong>
              </div>
              <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 17%; background: #F59E0B;"></div></div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-top: auto;">
          <span>● 3 Colheita</span>
          <span>● 2 Maturação</span>
          <span>● 1 Em Produção</span>
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
              <div style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1;" id="sse-temp-resumido" data-live="resumido-temp">28°C</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Ensolarado • Vento 12 km/h</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; text-align: center; font-size: 10px;">
            <div><span style="color:#94A3B8;">MANHÃ</span><div style="font-weight:700; color:#334155;">22°</div></div>
            <div style="border-right: 1px solid #E2E8F0;"></div>
            <div><span style="color:#94A3B8;">TARDE</span><div style="font-weight:700; color:#D97706;">31°</div></div>
            <div style="border-right: 1px solid #E2E8F0;"></div>
            <div><span style="color:#94A3B8;">NOITE</span><div style="font-weight:700; color:#334155;">24°</div></div>
          </div>
        </div>

        <div style="border-top: 1px solid #F1F5F9; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; margin-top: auto;">
          <div><span style="color:#94A3B8; font-size:10px;">UMIDADE</span><div style="font-weight:700; color:#1E293B;" id="sse-umid-resumido" data-live="umid-ar">62%</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">CHUVA</span><div style="font-weight:700; color:#1E293B;">0 mm</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">UV</span><div style="font-weight:700; color:#047857;">Mod. 29°</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">Qua</span><div style="font-weight:700; color:#334155;">28°</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">Qui</span><div style="font-weight:700; color:#334155;">28°</div></div>
          <div><span style="color:#94A3B8; font-size:10px;">Sex</span><div style="font-weight:700; color:#334155;">27°</div></div>
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
              <path d="M 45,120 A 85,85 0 0,1 215,120" fill="none" stroke="#059669" stroke-width="20" stroke-linecap="round" stroke-dasharray="241 268" stroke-dashoffset="0"/>
            </svg>
            <div class="gauge-pct-number">90%</div>
          </div>
          <div class="gauge-caption">LEITURAS CONFORMES</div>
        </div>

        <!-- Barras de Saúde, Umidade e Temperatura -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; border-top: 1px solid #F1F5F9; padding-top: 14px;">
          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Saúde da Plantação (NDVI)</span>
              <strong style="color: #1E293B;">85%</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 85%; background: #059669;"></div></div>
          </div>

          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Umidade Média do Dossel</span>
              <strong style="color: #1E293B;">67%</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 67%; background: #0284C7;"></div></div>
          </div>

          <div class="metric-progress-item">
            <div class="metric-labels-row">
              <span style="color:#475569; font-weight: 500;">● Temperatura Foliar</span>
              <strong style="color: #1E293B;">27°C</strong>
            </div>
            <div class="progress-track-bg"><div class="progress-fill-bar" style="width: 60%; background: #F59E0B;"></div></div>
          </div>
        </div>

        <!-- Rodapé Duplo: Culturas e Status da Água -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid #F1F5F9; padding-top: 14px; margin-top: auto;">
          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">CULTURAS</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
              <span style="color: #334155; font-weight: 600;">Vitória:</span>
              <strong style="color: #047857;">55%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #334155; font-weight: 600;">Palmer:</span>
              <strong style="color: #0369A1;">35%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #94A3B8;">Outras:</span>
              <span style="color: #94A3B8;">10%</span>
            </div>
          </div>

          <div style="background: rgba(248, 250, 252, 0.8); border: 1px solid #F1F5F9; border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">STATUS ÁGUA</div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <span style="font-size: 16px; font-weight: 700; color: #1E293B;">63%</span>
                <div style="font-size: 10px; color: #94A3B8;">4.200 L/dia</div>
              </div>
              <span style="background: #D1FAE5; color: #065F46; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Auto</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Direito: Monitoramento da Propriedade e Talhões (Foto de Satélite com Overlays Fiéis ao Figma) -->
      <div class="figma-card" style="padding: 24px; display: flex; flex-direction: column;">
        <div class="card-top-title-row" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="min-width: 0;">
            <span style="font-size: 13px; font-weight: 700; color: #1E293B; letter-spacing: 0.5px; text-transform: uppercase; display: block; line-height: 1.3;">
              MONITORAMENTO DA PROPRIEDADE E TALHÕES
            </span>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 3px; margin-bottom: 0;">Fazenda Vale das Uvas • Setor 04 (48 ha)</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <span class="card-status-pill pill-green" style="font-size: 10px; padding: 3px 8px; font-weight: 700;">sentinel-2</span>
            <div style="display: flex; gap: 4px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 2px;">
              <button type="button" id="btn-map-zoom-in" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" title="Aproximar zoom">+</button>
              <button type="button" id="btn-map-zoom-out" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" title="Afastar zoom">&minus;</button>
              <button type="button" id="btn-map-fullscreen" style="width: 26px; height: 26px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Redefinir visualização / Tela inteira">
                <i data-lucide="maximize-2" style="width: 13px; height: 13px;"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Área Fotográfica em Alta Resolução com Overlays Exatos do Figma e Zoom Interativo -->
        <div id="satellite-map-viewport" class="satellite-map-container" style="position: relative; overflow: hidden; border-radius: 12px; min-height: 270px; flex: 1; background: #0F172A; cursor: grab; user-select: none;">
          <div id="satellite-map-stage" style="position: absolute; inset: 0; transform-origin: center center; transition: transform 0.2s ease-out;">
            <img src="assets/images/topologia-sensores-campo.jpg" alt="Visão Aérea dos Talhões" class="satellite-bg-img" style="width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; border-radius: 12px;">

            <!-- Overlay 1: Talhão A • Vitória (Top Left) -->
            <div style="position: absolute; top: 12%; left: 8%; width: 32%; height: 32%; border: 1.5px solid #10B981; background: rgba(16, 185, 129, 0.15); border-radius: 8px; backdrop-filter: blur(1px); display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="background: rgba(15, 23, 42, 0.75); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Talhão A • Vitória</span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; border: 1.5px solid #FFFFFF;"></span>
              </div>
              <div style="text-align: center;">
                <span style="background: rgba(16, 185, 129, 0.85); color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">NDVI 0.88</span>
              </div>
            </div>

            <!-- Overlay 2: Talhão C • Palmer (Top Right) -->
            <div style="position: absolute; top: 12%; right: 8%; width: 28%; height: 32%; border: 1.5px solid #F59E0B; background: rgba(245, 158, 11, 0.15); border-radius: 8px; backdrop-filter: blur(1px); display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="background: rgba(15, 23, 42, 0.75); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Talhão C • Palmer</span>
              </div>
              <div style="text-align: center;">
                <span style="background: #F59E0B; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Alerta Hídrico</span>
              </div>
            </div>

            <!-- Gateway Central ESP32 (Centro) -->
            <div style="position: absolute; top: 48%; left: 34%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-size: 11px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 6px; z-index: 10; border: 1px solid rgba(255,255,255,0.8);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
              <span>Gateway Central ESP32</span>
            </div>

            <!-- Overlay 3: Talhão B • Thompson (Bottom Left) -->
            <div style="position: absolute; bottom: 12%; left: 14%; width: 30%; height: 32%; border: 1.5px solid #0284C7; background: rgba(2, 132, 199, 0.15); border-radius: 8px; backdrop-filter: blur(1px); display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; box-shadow: 0 0 12px rgba(2, 132, 199, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="background: rgba(15, 23, 42, 0.75); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Talhão B • Thompson</span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7; border: 1.5px solid #FFFFFF;"></span>
              </div>
              <div style="text-align: center;">
                <span style="background: #0284C7; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">VWC 48%</span>
              </div>
            </div>
          </div>

          <!-- Indicador Flutuante de Zoom -->
          <div id="map-zoom-badge" style="position: absolute; bottom: 10px; right: 10px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; pointer-events: none; opacity: 0; transition: opacity 0.3s; z-index: 20;">
            100%
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 11px; color: #94A3B8;">
          <div style="display: flex; gap: 16px;">
            <span><strong style="color: #10B981;">●</strong> Ótimo</span>
            <span><strong style="color: #0284C7;">●</strong> Atenção</span>
            <span><strong style="color: #F59E0B;">●</strong> Crítico</span>
          </div>
          <div>Passagem orbital há 42 min</div>
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
            <span id="sse-origem-badge" class="card-status-pill pill-blue sse-origem-badge" style="font-size: 10px; padding: 2px 8px; margin-left: 8px;">Simulado</span>
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
            <span class="mini-chart-pill pill-green" id="miniChart1-pill">62% Ideal</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart1"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Agora</span>
          </div>
        </div>

        <!-- Gráfico 2: Umidade do Solo -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Umidade do Solo</span>
            <span class="mini-chart-pill pill-green">58% Ideal</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart2"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Agora</span>
          </div>
        </div>

        <!-- Gráfico 3: Temperatura do Solo -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Temperatura do Solo</span>
            <span class="mini-chart-pill pill-blue">24.5°C Segura</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart3"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Agora</span>
          </div>
        </div>

        <!-- Gráfico 4: Temperatura do Ar -->
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <span class="mini-chart-title">Temperatura do Ar</span>
            <span class="mini-chart-pill pill-green" id="miniChart4-pill">27.8°C Ideal</span>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="miniChart4"></canvas>
          </div>
          <div class="chart-time-labels">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Agora</span>
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
  const temValor = (v) => v !== null && v !== undefined && !Number.isNaN(Number(v));

  // --- Condição geral: rótulo calculado pelo backend (vw_lote_saude) ---
  const cond = r.condicao_geral || {};
  const condRotulo = cond.rotulo || 'Excelente';
  const condDotCor = cond.nivel === 'critica' ? '#EF4444' : cond.nivel === 'atencao' ? '#F59E0B' : '#059669';

  // --- Lotes em operação ---
  const lotesTotal = r.lotes_monitorados?.total ?? 6;

  // --- Alertas ativos ---
  const alertasAbertos = Number(r.alertas?.abertos ?? 2);
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
  const confPct = temValor(rc.pct_na_faixa) ? Math.round(Number(rc.pct_na_faixa)) : Number(dg.conformidade_geral_pct ?? 90);
  const umidVal = temValor(rc.umidade_ar_media) ? Math.round(Number(rc.umidade_ar_media)) : 67;
  const tempVal = temValor(rc.temperatura_ar_media) ? fmtNum(rc.temperatura_ar_media, 0) : '27';
  const vpdVal = temValor(rc.vpd_medio_kpa) ? `${fmtNum(rc.vpd_medio_kpa, 2)} kPa` : '— kPa';
  const vpdSub = temValor(rc.vpd_medio_kpa) ? 'Déficit de pressão' : 'Valor não informado';

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
            28 set — 04 out
          </div>
          <p style="font-size: 11px; color: #64748B; margin: 0 0 16px 0;">
            Período recomendado · setembro / outubro
          </p>

          <!-- 7 Dias da Janela de Colheita -->
          <div class="harvest-days-grid" style="margin-bottom: 20px;">
            <div class="harvest-day-box">
              <span class="harvest-day-name">SEG</span>
              <strong class="harvest-day-num">28</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">TER</span>
              <strong class="harvest-day-num">29</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">QUA</span>
              <strong class="harvest-day-num">30</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">QUI</span>
              <strong class="harvest-day-num">01</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">SEX</span>
              <strong class="harvest-day-num">02</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">SÁB</span>
              <strong class="harvest-day-num">03</strong>
            </div>
            <div class="harvest-day-box">
              <span class="harvest-day-name">DOM</span>
              <strong class="harvest-day-num">04</strong>
            </div>
          </div>

          <!-- Probabilidade com aro circular 88% -->
          <div style="display: flex; align-items: center; gap: 14px; padding-top: 4px;">
            <div style="position: relative; width: 40px; height: 40px; flex-shrink: 0;">
              <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(-90deg);">
                <circle cx="20" cy="20" r="15.5" fill="none" stroke="#E2E8F0" stroke-width="3.5" />
                <circle cx="20" cy="20" r="15.5" fill="none" stroke="#059669" stroke-width="3.5" stroke-dasharray="97.4" stroke-dashoffset="11.7" stroke-linecap="round" />
              </svg>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #1E293B;">
                88%
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
                <span id="sse-origem-badge-detalhado" class="card-status-pill pill-blue sse-origem-badge" style="font-size: 10px; padding: 1px 7px;">Simulado</span>
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
                  <span style="font-size: 26px; font-weight: 800; color: #1E293B; line-height: 1;">${confPct}%</span>
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
            <!-- Uva Vitória -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; position: relative;">
              <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Uva Vitória</div>
              <div style="display: flex; align-items: baseline; justify-content: space-between;">
                <span style="font-size: 20px; font-weight: 800; color: #1E293B;">R$ 14,20</span>
                <span style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">+8%</span>
              </div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 2px; margin-bottom: 10px;">por kg</div>
              <div style="width: 100%; height: 3px; background: #059669; border-radius: 2px;"></div>
            </div>

            <!-- Manga Palmer -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; position: relative;">
              <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">Manga Palmer</div>
              <div style="display: flex; align-items: baseline; justify-content: space-between;">
                <span style="font-size: 20px; font-weight: 800; color: #1E293B;">R$ 6,80</span>
                <span style="background: #F1F5F9; color: #64748B; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px;">Estável</span>
              </div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 2px; margin-bottom: 10px;">por kg</div>
              <div style="width: 100%; height: 3px; background: #E2E8F0; border-radius: 2px; overflow: hidden;">
                <div style="width: 45%; height: 100%; background: #059669;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card: Previsão do tempo -->
        <div class="dd-card dd-card-lg" style="padding: 20px 22px;">
          <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0 0 12px;">Previsão do tempo</h3>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span style="font-size: 28px; font-weight: 800; color: #1E293B; line-height: 1;">28°C</span>
            <div>
              <div style="font-size: 12.5px; font-weight: 700; color: #1E293B;">Ensolarado</div>
              <div style="font-size: 10.5px; color: #64748B;">Sensação térmica 30°C</div>
            </div>
            <div style="font-size: 10.5px; color: #64748B; line-height: 1.5; text-align: right;">
              <div>62% umidade · 0 mm chuva</div>
              <div>Vento 12 km/h · UV moderado</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; border-top: 1px solid #F1F5F9; padding-top: 10px; text-align: center;">
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Qua 23/09</span><strong style="font-size: 11px; color: #1E293B;">29° / 20°</strong></div>
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Qui 24/09</span><strong style="font-size: 11px; color: #1E293B;">28° / 19°</strong></div>
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Sex 25/09</span><strong style="font-size: 11px; color: #1E293B;">27° / 19°</strong></div>
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Sáb 26/09</span><strong style="font-size: 11px; color: #1E293B;">27° / 18°</strong></div>
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Dom 27/09</span><strong style="font-size: 11px; color: #1E293B;">26° / 18°</strong></div>
            <div><span style="font-size: 10px; color: #94A3B8; display: block;">Seg 28/09</span><strong style="font-size: 11px; color: #1E293B;">27° / 19°</strong></div>
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
              <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.4;">Organize as atividades para 28/09 a 04/10.</p>
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
    criarMiniGraficoApple('miniChart3', dg.temp_solo_24h || DEFAULT_DADOS_GRAFICOS.temp_solo_24h, '#0284C7');
    criarMiniGraficoApple('miniChart4', dg.temp_ar_24h || DEFAULT_DADOS_GRAFICOS.temp_ar_24h, '#16A34A');
  } else {
    // No modo Detalhado, os 4 gráficos são em tom verde esmeralda com pontos conforme Figma
    criarMiniGraficoApple('miniChart1', dg.umidade_ar_24h || DEFAULT_DADOS_GRAFICOS.umidade_ar_24h, '#10B981');
    criarMiniGraficoApple('miniChart2', dg.umidade_solo_24h || DEFAULT_DADOS_GRAFICOS.umidade_solo_24h, '#10B981');
    criarMiniGraficoApple('miniChart3', dg.temp_solo_24h || DEFAULT_DADOS_GRAFICOS.temp_solo_24h, '#10B981');
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
              <input id="inp-dg-conf" type="number" min="0" max="100" value="${cur.conformidade_geral_pct ?? 90}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Saúde NDVI (%)</label>
              <input id="inp-dg-saude" type="number" min="0" max="100" value="${cur.saude_plantacao_pct ?? 85}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Umidade Dossel (%)</label>
              <input id="inp-dg-dossel" type="number" min="0" max="100" value="${cur.umidade_dossel_pct ?? 67}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Temp. Foliar (°C)</label>
              <input id="inp-dg-tfoliar" type="number" step="0.1" value="${cur.temp_foliar_c ?? 27}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Status Água (%)</label>
              <input id="inp-dg-agua" type="number" min="0" max="100" value="${cur.agua_reservatorio_pct ?? 63}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
            </div>
            <div>
              <label style="display:block; font-weight:700; margin-bottom:4px;">Vazão (L/dia)</label>
              <input id="inp-dg-vazao" type="number" step="50" value="${cur.vazao_ldia ?? 4200}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px;">
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
            <label style="display:block; font-weight:700; margin-bottom:4px;">Série Gráfico 3 — Temperatura do Solo 24h (°C)</label>
            <input id="inp-dg-tsolo" type="text" value="${(cur.temp_solo_24h || []).join(', ')}" style="width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:8px; font-family:monospace;">
          </div>
          <div>
            <label style="display:block; font-weight:700; margin-bottom:4px;">Série Gráfico 4 — Temperatura do Ar 24h (°C)</label>
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
          temp_solo_24h: parseSeries(document.getElementById('inp-dg-tsolo')?.value, cur.temp_solo_24h),
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
        criarMiniGraficoApple('miniChart3', cur.temp_solo_24h || DEFAULT_DADOS_GRAFICOS.temp_solo_24h, '#0284C7');
        criarMiniGraficoApple('miniChart4', cur.temp_ar_24h || DEFAULT_DADOS_GRAFICOS.temp_ar_24h, '#16A34A');
      } else if (tf === '7d') {
        criarMiniGraficoApple('miniChart1', [58, 62, 65, 60, 59, 63, 62], '#10B981');
        criarMiniGraficoApple('miniChart2', [52, 54, 58, 61, 57, 56, 58], '#0D9488');
        criarMiniGraficoApple('miniChart3', [23.8, 24.2, 24.9, 25.1, 24.4, 24.2, 24.5], '#0284C7');
        criarMiniGraficoApple('miniChart4', [25.5, 27.0, 28.5, 29.2, 28.0, 27.2, 27.8], '#16A34A');
      } else {
        criarMiniGraficoApple('miniChart1', [55, 58, 62, 64, 60, 59, 61, 63, 65, 62, 60, 62], '#10B981');
        criarMiniGraficoApple('miniChart2', [50, 52, 55, 58, 60, 57, 56, 58, 59, 57, 58, 58], '#0D9488');
        criarMiniGraficoApple('miniChart3', [23.5, 23.9, 24.5, 25.2, 25.0, 24.6, 24.3, 24.5, 24.8, 24.4, 24.5, 24.5], '#0284C7');
        criarMiniGraficoApple('miniChart4', [25.0, 26.5, 28.0, 29.5, 28.8, 27.8, 27.2, 27.9, 28.4, 27.5, 27.8, 27.8], '#16A34A');
      }
    });
  });
}

/**
 * Função de renderização de gráficos Chart.js refinados com estética Apple em Alta Resolução (Retina DPI)
 */
function criarMiniGraficoApple(canvasId, dataPoints, strokeColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

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
  iniciarSSEDashboard();
  liveTelemetry.start();

  // Sincronizar Ingestão ThingSpeak
  const btnSync = document.getElementById('btn-sync-thingspeak');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      const icon = btnSync.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      btnSync.style.opacity = '0.7';

      setTimeout(() => {
        if (icon) icon.classList.remove('animate-spin');
        btnSync.style.opacity = '1';
        toast.success('ThingSpeak Sincronizado', '24 nós ESP32 atualizados em tempo real (Canal #248901).');
      }, 900);
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
            subtitle: 'Série 24h • DHT11 ESP32-C3 & Sonda Solo FDR',
            headers,
            rows
          });
          toast.success('Download PDF Concluído', `telemetria_petrolina_us915_${dataTag}.pdf baixado com sucesso.`);
        }
      );

    });
  }

  // Alternar entre Resumido e Detalhado na sub-barra do Analista
  const btnRes = document.getElementById('btn-analista-resumido');
  const btnDet = document.getElementById('btn-analista-detalhado');
  if (btnRes && btnDet) {
    btnRes.addEventListener('click', () => {
      btnRes.classList.add('active');
      btnDet.classList.remove('active');
      toast.info('Modo Resumido Ativo', 'Exibindo indicadores consolidados da malha ESP-MESH.');
    });
    btnDet.addEventListener('click', () => {
      btnDet.classList.add('active');
      btnRes.classList.remove('active');
      toast.info('Modo Detalhado Ativo', 'Camadas técnicas de RSSI e telemetria ativadas.');
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
        if (filter === 'todos') {
          m.style.display = 'flex';
        } else if (filter === 'solo') {
          m.style.display = tipo === 'solo' ? 'flex' : 'none';
        } else if (filter === 'ar') {
          m.style.display = tipo === 'ar' ? 'flex' : 'none';
        } else if (filter === 'alerta') {
          m.style.display = tipo === 'alerta' ? 'flex' : 'none';
        }
      });
    });
  });

  // Interatividade nos Pinos do Mapa
  document.querySelectorAll('.sensor-pin-marker').forEach(pin => {
    pin.addEventListener('click', (e) => {
      const nodeNum = e.currentTarget.dataset.node;
      const tipo = e.currentTarget.dataset.tipo;
      let modalTitle = `Nó de Campo #${nodeNum}`;
      let modalBody = '';

      if (nodeNum === '19') {
        modalTitle = `Alerta Crítico — Nó #${nodeNum} (Outlier Térmico)`;
        modalBody = `
          <div style="background:#FEE2E2; border:1px solid #FCA5A5; border-radius:10px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:#991B1B; font-size:13px;">Leitura Irregular Detectada</div>
            <div style="font-size:12px; color:#7F1D1D; margin-top:4px;">
              Temperatura bruta reportada: <strong>62.4°C</strong> (Limite de segurança biológica: 35.0°C).
            </div>
          </div>
          <div style="font-size:12px; color:#475569; line-height:1.6;">
            <strong>Hardware:</strong> Sensor de Umidade do Solo #SNS-SL-04<br>
            <strong>Localização:</strong> LOTE A1 • Uva Vitória (Setor 4)<br>
            <strong>Canal ThingSpeak:</strong> #248901 (Entry #14.892)<br>
            <strong>Ação recomendada:</strong> Executar calibração de offset ou inspecionar cabeamento analógico.
          </div>
        `;
      } else {
        modalTitle = `Telemetria em Tempo Real — Nó #${nodeNum}`;
        modalBody = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
              <div style="font-size:10px; color:#64748B;">Umidade Solo (VWC)</div>
              <div style="font-size:18px; font-weight:700; color:#0F172A;">46.8%</div>
            </div>
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
              <div style="font-size:10px; color:#64748B;">Temperatura Solo</div>
              <div style="font-size:18px; font-weight:700; color:#059669;">24.2°C</div>
            </div>
          </div>
          <div style="font-size:12px; color:#475569; line-height:1.6;">
            <strong>Status Wi-Fi ESP32:</strong> RSSI -68 dBm (Excelente)<br>
            <strong>Bateria:</strong> 96% (Painel Solar 5W)<br>
            <strong>Último Pacote ESP32:</strong> há 42 segundos via Wi-Fi
          </div>
        `;
      }

      Modal.open(modalTitle, modalBody, () => {
        toast.success('Nó Verificado', `Sinal do Nó #${nodeNum} confirmado com concentrador.`);
      }, 'Verificar Conexão');
    });
  });

  // Interatividade no Gateway Central
  const gatewayMarker = document.querySelector('[data-node="gateway"]');
  if (gatewayMarker) {
    gatewayMarker.addEventListener('click', () => {
      Modal.open('Gateway Central ESP32 — Petrolina-04', `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <div style="width:44px; height:44px; border-radius:50%; background:#183D2E; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800;">GW</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:#0F172A;">Gateway Central ESP32 (Wi-Fi / ThingSpeak)</div>
            <div style="font-size:11px; color:#059669; font-weight:600;">Status: 100% Operacional • Latência: 48ms</div>
          </div>
        </div>
        <div style="font-size:12px; color:#475569; line-height:1.6;">
          <strong>Topologia:</strong> Rede Wi-Fi ESP32 v4.2.1-prod<br>
          <strong>Nós Conectados:</strong> 24 de 25 nós operacionais<br>
          <strong>Canal ThingSpeak Primário:</strong> #248901 (Cadência 5 min)<br>
          <strong>Coordenadas:</strong> 09°23'34" S, 40°30'28" W (45.0 ha)
        </div>
      `, () => {
        toast.info('Ping Gateway', 'Resposta recebida em 48ms do concentrador Petrolina-04.');
      }, 'Executar Ping');
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

  // Recalibrar Offset
  document.querySelectorAll('.btn-recalibrar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sensor = e.currentTarget.dataset.sensor;
      Modal.open(`Recalibrar Offset — ${sensor}`, `
        <div style="font-size:12px; color:#475569; line-height:1.5; margin-bottom:12px;">
          Esta rotina aplicará compensação matemática de <strong>-35.0°C</strong> na curva analógica de leitura para suprimir ruído de radiofrequência induzida.
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px; font-family:monospace; font-size:11px; color:#0F172A;">
          calibration_offset = reading_raw - 35.0<br>
          filter_pipeline: 'noise_gate_v2' (habilitado)
        </div>
      `, () => {
        toast.success('Offset Calibrado', `Compensação aplicada na Sonda ${sensor}. Leitura normalizada.`);
      }, 'Aplicar Calibração');
    });
  });

  // Ver Log ThingSpeak
  document.querySelectorAll('.btn-ver-log').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sensor = e.currentTarget.dataset.sensor;
      Modal.open(`Log de Ingestão ThingSpeak — ${sensor}`, `
        <div style="font-family:monospace; font-size:11px; background:#0F172A; color:#38BDF8; padding:12px; border-radius:8px; line-height:1.6; max-height:220px; overflow-y:auto;">
          [2026-09-22 15:42:01] INGEST CH:248901 ENTRY:14892 STATUS:200 OK<br>
          [2026-09-22 15:37:04] INGEST CH:248901 ENTRY:14891 STATUS:200 OK<br>
          [2026-09-22 15:32:00] REJECT CH:248905 ENTRY:14890 VALUE:-4.2% MOTIVO:UNDERFLOW_ANALOG<br>
          [2026-09-22 15:27:02] INGEST CH:248901 ENTRY:14889 STATUS:200 OK<br>
          [2026-09-22 15:22:01] INGEST CH:248901 ENTRY:14888 STATUS:200 OK
        </div>
      `, () => {
        toast.info('Log Exportado', 'Dump do canal ThingSpeak gerado para análise técnica.');
      }, 'Exportar Log Técnico');
    });
  });

  // Botão Frequência de Ingestão
  const btnFreq = document.getElementById('btn-freq-ingestao');
  if (btnFreq) {
    btnFreq.addEventListener('click', () => {
      Modal.open('Cadência de Ingestão ThingSpeak', `
        <div style="font-size:12px; color:#475569; margin-bottom:12px;">
          Selecione o intervalo de transmissão entre os nós ESP32 e a nuvem:
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
            <input type="radio" name="cadencia" value="1min"> A cada 1 minuto (Modo Calibração / Alto consumo de bateria)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
            <input type="radio" name="cadencia" value="5min" checked> A cada 5 minutos (Padrão Wi-Fi / Equilíbrio Solar)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
            <input type="radio" name="cadencia" value="15min"> A cada 15 minutos (Econômico / Safra Estabilizada)
          </label>
        </div>
      `, () => {
        toast.success('Cadência Atualizada', 'Novo ciclo de envio de 5 minutos configurado nos nós.');
      }, 'Salvar Intervalo');
    });
  }

  // Toggle Filtro de Ruído
  const checkFiltro = document.getElementById('check-filtro-ruido');
  if (checkFiltro) {
    checkFiltro.addEventListener('change', (e) => {
      if (e.target.checked) {
        toast.success('Filtro Habilitado', 'Compensação ativada nos sensores de umidade do solo.');
      } else {
        toast.warning('Filtro Desativado', 'Sensores transmitindo valores analógicos brutos.');
      }
    });
  }
}

/**
 * 3. DASHBOARD DO ADMINISTRADOR (FIGMA MOCKUP 1: LORENA LIRA)
 * Visão Geral do Sistema com Governança, Lotes, Sensores, Conformidade e Atividade 24h
 */
function renderAdminDashboard() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Administrador -->
      <div class="analista-subbar" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> Polo Sertão São Francisco
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #0284C7; background: #F0F9FF; border: 1px solid #BAE6FD; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="wifi" style="width: 12px; height: 12px;"></i> Rede ESP32 Wi-Fi + Gateway Online
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="file-check" style="width: 12px; height: 12px;"></i> 3 Regras Agronômicas Vigentes
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #15803D; background: #DCFCE7; border: 1px solid #86EFAC; padding: 4px 10px; border-radius: 20px;">
            <i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> Auditoria GlobalGAP em Dia
          </span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-analista-sync" id="btn-admin-convidar-user" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
            <span>Convidar Usuário</span>
          </button>
          <button class="btn-analista-sync" id="btn-admin-parametros-safra" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Parâmetros da Safra</span>
          </button>
          <button class="btn-analista-export" id="btn-admin-emitir-relatorio" style="background: #183D2E; border: none; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
            <span>Emitir Relatório Executivo</span>
          </button>
        </div>
      </div>

      <!-- 4 Cards Superiores de Governança -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <!-- Card 1: Perfis de Usuários -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">PERFIS DE USUÁRIOS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">12 ATIVOS</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 14px 0;">
            <div style="width: 58px; height: 58px; border-radius: 50%; border: 5px solid #10B981; border-top-color: #0284C7; border-right-color: #0F172A; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span style="font-size: 15px; font-weight: 800; color: #0F172A; line-height: 1;">12</span>
              <span style="font-size: 8px; color: #64748B;">MEMBROS</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
                <span style="color: #475569;">Produtores: <strong>5</strong> <span style="color: #94A3B8;">(42%)</span></span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
                <span style="color: #475569;">Analistas: <strong>4</strong> <span style="color: #94A3B8;">(33%)</span></span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0F172A;"></span>
                <span style="color: #475569;">Admins: <strong>3</strong> <span style="color: #94A3B8;">(25%)</span></span>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Acesso à Plataforma</span>
            <strong style="color: #047857;">100% Autenticados</strong>
          </div>
        </div>

        <!-- Card 2: Lotes e Culturas -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">LOTES E CULTURAS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">3 LOTES ATIVOS</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">1.800</span>
                <span style="font-size: 12px; font-weight: 600; color: #64748B;">kg</span>
              </div>
              <span style="font-size: 10px; font-weight: 600; color: #059669; background: #ECFDF5; padding: 2px 6px; border-radius: 6px;">Safra 2026</span>
            </div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 55%; background: #10B981;" title="Manga: 1.000kg"></div>
              <div style="width: 30%; background: #3B82F6;" title="Uva: 500kg"></div>
              <div style="width: 15%; background: #F59E0B;" title="Melão: 300kg"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px;">
              <span>• Manga (1.000kg)</span>
              <span>• Uva (500kg)</span>
              <span>• Melão (300kg)</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>3 Setores</span>
            <strong style="color: #0F172A;">Petrolina Setor 04 e Vale</strong>
          </div>
        </div>

        <!-- Card 3: Sensores de Campo (IoT) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">SENSORES DE CAMPO (IOT)</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">100% ONLINE</span>
          </div>
          <div style="margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 20px; font-weight: 800; color: #0F172A;">99.8 %</span>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Transmissão em Tempo Real</div>
              <div style="font-size: 10px; color: #94A3B8;">Nós DHT11 + Solo TDR</div>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 3px; height: 36px;">
              <span style="width: 5px; height: 18px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 5px; height: 26px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 5px; height: 32px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 5px; height: 28px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 5px; height: 36px; background: #10B981; border-radius: 2px;"></span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Cadência de Leitura</span>
            <strong style="color: #0F172A;">A cada 300s (5 min)</strong>
          </div>
        </div>

        <!-- Card 4: Alertas e Incidentes -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">ALERTAS E INCIDENTES</span>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">OPERAÇÃO ESTÁVEL</span>
          </div>
          <div style="margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 20px; font-weight: 800; color: #0F172A;">2 ativos</span>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">0 Críticos • 1 Atenção • 1 Info</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #94A3B8;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #F59E0B;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #3B82F6;"></span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Resolução Média</span>
            <strong style="color: #0F172A;">14 minutos</strong>
          </div>
        </div>
      </div>

      <!-- Gráfico Central: Atividade Operacional da Fazenda (Últimas 24h) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Atividade Operacional da Fazenda (Últimas 24h)</h3>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">Tempo Real</span>
            </div>
            <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">Monitoramento consolidado dos lotes: umidade do solo (VWC) e temperatura média com faixa agronômica ideal</p>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; font-size: 11px;">
            <span style="display: flex; align-items: center; gap: 6px; color: #047857; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span> Umidade do Solo (VWC)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #0284C7; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7;"></span> Temp. Média Lotes (°C)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 600;">
              <span style="width: 12px; height: 6px; background: #D1FAE5; border-radius: 2px;"></span> Faixa Agronômica Ideal (40-60%)
            </span>
          </div>
        </div>

        <!-- Canvas do Gráfico -->
        <div style="height: 240px; position: relative;">
          <canvas id="chart-admin-atividade"></canvas>
        </div>

        <!-- 3 Métricas Rápidas abaixo do Gráfico -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">UMIDADE MÉDIA DO SOLO</span>
              <div style="font-size: 16px; font-weight: 800; color: #047857; margin-top: 2px;">46.8% VWC</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">Dentro da Faixa</span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">TEMPERATURA MÉDIA</span>
              <div style="font-size: 16px; font-weight: 800; color: #0284C7; margin-top: 2px;">11.8°C</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #E0F2FE; padding: 3px 8px; border-radius: 6px;">Estável</span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; font-weight: 700; color: #64748B;">CICLOS DE IRRIGAÇÃO</span>
              <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 2px;">3 concluídos hoje</div>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">100% Eficiência</span>
          </div>
        </div>
      </div>

      <!-- Seção: Gestão de Perfis e Acessos Recentes -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="users" style="width: 16px; height: 16px; color: #0F172A;"></i>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Gestão de Perfis e Acessos Recentes</h3>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">4 MEMBROS ONLINE HOJE</span>
            </div>
            <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">Atividades operacionais em tempo real e sessões ativas da equipe de campo e gestão</p>
          </div>
          <a href="#/usuarios" style="font-size: 12px; font-weight: 600; color: #0284C7; text-decoration: none; display: flex; align-items: center; gap: 4px;">
            Gerenciar Todos os Usuários &rarr;
          </a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
          <!-- Usuário 1: Maria Clara -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #D1FAE5; border: 1.5px solid #10B981; color: #065F46; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">MC</div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="font-size: 13px; color: #0F172A;">Maria Clara</strong>
                  <span style="font-size: 9px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 1px 6px; border-radius: 4px;">Produtor</span>
                </div>
                <div style="font-size: 11px; color: #64748B;">Colheita Lote #7 Manga</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #64748B;">15:47</span>
              <div style="font-size: 10px; font-weight: 700; color: #047857;">Ativo</div>
            </div>
          </div>

          <!-- Usuário 2: Luiz Felipe -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #E0F2FE; border: 1.5px solid #0284C7; color: #0369A1; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">LF</div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="font-size: 13px; color: #0F172A;">Luiz Felipe</strong>
                  <span style="font-size: 9px; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 1px 6px; border-radius: 4px;">Analista</span>
                </div>
                <div style="font-size: 11px; color: #64748B;">Laudo Uva Vitória</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #64748B;">15:15</span>
              <div style="font-size: 10px; font-weight: 600; color: #64748B;">27m</div>
            </div>
          </div>

          <!-- Usuário 3: Rodrigo Alves -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #F1F5F9; border: 1.5px solid #94A3B8; color: #334155; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">RA</div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="font-size: 13px; color: #0F172A;">Rodrigo Alves</strong>
                  <span style="font-size: 9px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 1px 6px; border-radius: 4px;">Produtor</span>
                </div>
                <div style="font-size: 11px; color: #64748B;">Turno fertirrigação</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #64748B;">14:50</span>
              <div style="font-size: 10px; font-weight: 600; color: #64748B;">52m</div>
            </div>
          </div>

          <!-- Usuário 4: Lorena Lira -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #DCFCE7; border: 1.5px solid #86EFAC; color: #166534; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">LL</div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="font-size: 13px; color: #0F172A;">Lorena Lira</strong>
                  <span style="font-size: 9px; font-weight: 700; color: #0F172A; background: #E2E8F0; padding: 1px 6px; border-radius: 4px;">Admin</span>
                </div>
                <div style="font-size: 11px; color: #64748B;">Parâmetros de clima</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #64748B;">14:20</span>
              <div style="font-size: 10px; font-weight: 700; color: #047857;">Ativo</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Parâmetros Agronômicos e Regras Ativas + Conformidade e Despachos -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <!-- Card 1: Parâmetros Agronômicos e Regras Ativas -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Parâmetros Agronômicos e Regras Ativas</h3>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Faixas climáticas ideais validadas para as culturas da safra</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">3 REGRAS VIGENTES</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                  <strong style="font-size: 13px; color: #0F172A;">Manga (Tommy Atkins / Kent)</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Umidade ideal no solo: 55% a 65% VWC</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 12px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 2px 8px; border-radius: 6px;">10.0°C a 13.0°C</span>
                <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">• Em Faixa Ótima</div>
              </div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #3B82F6;"></span>
                  <strong style="font-size: 13px; color: #0F172A;">Uva de Mesa (Vitória Sem Semente)</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Umidade ideal no solo: 40% a 50% VWC</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 12px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 6px;">8.0°C a 11.5°C</span>
                <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">• Em Faixa Ótima</div>
              </div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span>
                  <strong style="font-size: 13px; color: #0F172A;">Melão Amarelo</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Umidade ideal no solo: 45% a 55% VWC</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 12px; font-weight: 700; color: #D97706; background: #FFFBEB; padding: 2px 8px; border-radius: 6px;">12.0°C a 15.0°C</span>
                <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">• Em Faixa Ótima</div>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
            <span style="color: #64748B;">Tolerâncias climáticas aplicadas aos atuadores</span>
            <button id="btn-config-regras" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Configurar Parâmetros</button>
          </div>
        </div>

        <!-- Card 2: Conformidade, Despachos e Auditoria -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Conformidade, Despachos e Auditoria</h3>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Rastreabilidade portuária e certificação GlobalG.A.P.</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 6px;">GLOBALGAP 100%</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 2px;">STATUS DAS ROTAS DE DESPACHO</div>
            
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; color: #0F172A;">Porto Pecém (CE)</strong>
                <div style="font-size: 10px; color: #64748B;">Melão (300 kg) • 10°C Monitorado</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 8px; border-radius: 4px;">Trânsito OK</span>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; color: #0F172A;">Porto Suape (PE)</strong>
                <div style="font-size: 10px; color: #64748B;">Uva Vitória (500 kg) • Atracado</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 2px 8px; border-radius: 4px;">Embarque</span>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; color: #0F172A;">Porto Salvador (BA)</strong>
                <div style="font-size: 10px; color: #64748B;">Manga Tommy (1.000 kg) • 24/09</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #059669; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Packing House</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
            <span style="color: #64748B;">Cadeia de Frio e Transporte Refrigerado</span>
            <strong style="color: #047857;">100% Conforme GlobalG.A.P.</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupAdminDashboardEvents() {
  iniciarSSEDashboard();
  // Destrói instâncias anteriores de gráficos
  chartInstances.forEach(c => c && c.destroy());
  chartInstances = [];

  // Botões da sub-barra do Admin
  const btnConvidar = document.getElementById('btn-admin-convidar-user');
  if (btnConvidar) {
    btnConvidar.addEventListener('click', () => {
      window.location.hash = '#/usuarios';
    });
  }

  const btnParametros = document.getElementById('btn-admin-parametros-safra');
  if (btnParametros) {
    btnParametros.addEventListener('click', () => {
      window.location.hash = '#/configuracoes';
    });
  }

  const btnRelatorio = document.getElementById('btn-admin-emitir-relatorio');
  if (btnRelatorio) {
    btnRelatorio.addEventListener('click', () => {
      window.location.hash = '#/relatorios';
    });
  }

  const btnConfigRegras = document.getElementById('btn-config-regras');
  if (btnConfigRegras) {
    btnConfigRegras.addEventListener('click', () => {
      window.location.hash = '#/configuracoes';
    });
  }

  // Gráfico: Atividade Operacional da Fazenda (Últimas 24h)
  const ctx = document.getElementById('chart-admin-atividade');
  if (ctx && window.Chart) {
    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00 (Início da Irrigação)', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', 'Agora (15:42)'];
    const vwcData = [45.2, 45.0, 44.8, 45.5, 48.0, 49.5, 49.0, 48.2, 47.5, 47.0, 46.8, 46.8];
    const tempData = [10.5, 10.2, 10.0, 10.4, 11.0, 11.5, 12.0, 12.8, 12.2, 11.8, 11.6, 11.8];

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Umidade do Solo (VWC)',
            data: vwcData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 5],
            pointBackgroundColor: '#10B981',
            yAxisID: 'y'
          },
          {
            label: 'Temp. Média Lotes (°C)',
            data: tempData,
            borderColor: '#0284C7',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: (item) => item.datasetIndex === 0 ? `Umidade: ${item.raw}% VWC` : `Temperatura: ${item.raw}°C`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#94A3B8' }
          },
          y: {
            position: 'left',
            min: 30,
            max: 70,
            ticks: {
              callback: (v) => v + '%',
              font: { size: 10 },
              color: '#10B981'
            },
            grid: { color: '#F1F5F9' }
          },
          y1: {
            position: 'right',
            min: 5,
            max: 20,
            ticks: {
              callback: (v) => v + '°C',
              font: { size: 10 },
              color: '#0284C7'
            },
            grid: { display: false }
          }
        }
      }
    });

    chartInstances.push(chart);
  }
}
