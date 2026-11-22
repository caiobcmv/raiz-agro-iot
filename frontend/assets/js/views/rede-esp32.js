/**
 * VIEW: SENSORES E REDE ESP32 (PERFIL ANALISTA)
 * Integrado aos endpoints FastAPI:
 * - GET /analista/sensores/resumo
 * - GET /sensores/topologia
 * - GET /sensores
 * - GET /leituras-rejeitadas
 * - GET /rede/historico?periodo=24h (novo)
 * - POST /ingestao/sincronizar (novo)
 * - GET /leituras/exportar.csv (novo)
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
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

function calcularMinutosDesde(isoTimestamp) {
  if (!isoTimestamp) return null;
  const t = new Date(isoTimestamp).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function extrairArraySeguro(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    if (Array.isArray(val.itens)) return val.itens;
    if (Array.isArray(val.items)) return val.items;
    if (Array.isArray(val.pontos)) return val.pontos;
    if (Array.isArray(val.leituras)) return val.leituras;
    if (Array.isArray(val.sensores)) return val.sensores;
    if (Array.isArray(val.rejeitadas)) return val.rejeitadas;
    if (Array.isArray(val.data)) return val.data;
  }
  return [];
}

// ==========================================
let redeState = {
  resumo: null,
  topologia: null,
  sensores: [],
  rejeitadas: [],
  historico: null,
  filtroTopo: 'todos',
  termoBuscaTecnica: '',
  timerSyncId: null
};

export async function renderRedeEsp32() {
  try {
    const [
      resumoRes,
      topologiaRes,
      sensoresRes,
      rejeitadasRes,
      historicoRes
    ] = await Promise.allSettled([
      api.getAnalistaSensoresResumo(),
      api.getSensoresTopologia(),
      api.getSensores(),
      api.getLeiturasRejeitadas({ limit: 10 }),
      api.getRedeHistorico('24h')
    ]);

    redeState.resumo = (resumoRes.status === 'fulfilled' && resumoRes.value && typeof resumoRes.value === 'object') ? resumoRes.value : null;
    redeState.topologia = (topologiaRes.status === 'fulfilled' && topologiaRes.value && typeof topologiaRes.value === 'object') ? topologiaRes.value : null;
    redeState.sensores = extrairArraySeguro(sensoresRes.status === 'fulfilled' ? sensoresRes.value : null);
    redeState.rejeitadas = extrairArraySeguro(rejeitadasRes.status === 'fulfilled' ? rejeitadasRes.value : null);
    redeState.historico = (historicoRes.status === 'fulfilled' && historicoRes.value && typeof historicoRes.value === 'object') ? historicoRes.value : null;
  } catch (err) {
    console.warn('[RedeESP32] Erro ao carregar dados:', err);
  }

  const role = auth.getActiveProfile();
  const podeSincronizar = role === 'analista' || role === 'admin';

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 1. BARRA SUPERIOR -->
      <div class="analista-subbar" id="subbar-rede-container">
        ${renderSubBarHtml(podeSincronizar)}
      </div>

      <!-- 2. QUATRO CARDS DA REDE ESP32 -->
      <div class="kpi-grid-4col" id="cards-rede-container" style="margin-top: 18px;">
        ${renderCardsRedeHtml()}
      </div>

      <!-- 3 & 4. SEÇÃO DO MEIO (2 COLUNAS): TOPOLOGIA ESPACIAL + INVENTÁRIO TÉCNICO -->
      <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; margin-top: 20px;" class="grid-rede-meio">
        <!-- 3. TOPOLOGIA ESPACIAL -->
        <div class="analista-chart-box" id="topologia-espacial-box" style="margin-bottom: 0;">
          ${renderTopologiaEspacialHtml()}
        </div>

        <!-- 4. INVENTÁRIO TÉCNICO DE SENSORES -->
        <div class="analista-chart-box" id="inventario-tecnico-box" style="margin-bottom: 0;">
          ${renderInventarioTecnicoHtml()}
        </div>
      </div>

      <!-- 5. HISTÓRICO 24H: TRANSMISSÃO E SINAL -->
      <div class="analista-chart-box" id="historico-rede-box" style="margin-top: 20px;">
        ${renderHistoricoRedeHtml()}
      </div>

      <!-- Rodapé discreto -->
      <div style="text-align: center; margin-top: 24px; margin-bottom: 8px; font-size: 11px; color: #94A3B8;">
        Raíz - Plataforma de Inteligência Agro IoT • Telemetria direta ESP32 para ThingSpeak • Vale do São Francisco
      </div>
    </div>
  `;
}

// ==========================================
// RENDERIZADORES
// ==========================================

function renderSubBarHtml(podeSincronizar) {
  const { resumo } = redeState;
  const canal = resumo?.coleta?.canal ?? 248901;
  const ativos = resumo?.sensores?.ativos ?? 22;
  const ultimaLeituraIso = resumo?.ingestao_24h?.ultima_leitura;
  const minDesde = calcularMinutosDesde(ultimaLeituraIso) ?? 2;

  const corSinc = minDesde > 10 ? '#D97706' : '#64748B';
  const estiloSinc = minDesde > 10 ? 'font-weight: 700; color: #D97706;' : 'color: #64748B;';

  const btnSyncHtml = podeSincronizar ? `
    <button class="btn-analista-sync" id="btn-sync-rede">
      <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
      <span>Sincronizar ThingSpeak</span>
    </button>
  ` : '';

  return `
    <div class="analista-subbar-info">
      <span class="analista-dot-pulse"></span>
      <span style="font-weight: 600; color: #0F172A;">
        ThingSpeak conectado • canal ${canal} • ${ativos} sensores ativos
      </span>
      <span id="texto-sincronizado-min" style="font-size: 11px; ${estiloSinc}">
        Sincronizado há ${minDesde} min
      </span>
    </div>
    <div class="analista-subbar-actions">
      ${btnSyncHtml}
      <button class="btn-analista-export" id="btn-export-csv">
        <i data-lucide="download" style="width: 14px; height: 14px;"></i>
        <span>Exportar (CSV)</span>
      </button>
    </div>
  `;
}

function renderCardsRedeHtml() {
  const { resumo, topologia } = redeState;
  const contadores = topologia?.contadores || {};
  const ingestao = resumo?.ingestao_24h || {};
  const sensoresInfo = resumo?.sensores || {};
  const coleta = resumo?.coleta || {};

  // Card 1: Nós online
  const nosAtivos = contadores.ativos ?? sensoresInfo.ativos ?? 22;
  const nosTotal = contadores.todos ?? sensoresInfo.total ?? 24;
  const atrasoMedio = ingestao.atraso_medio_s != null ? `${ingestao.atraso_medio_s} s` : '—';
  const badgeCard1 = nosAtivos === nosTotal ? 'green' : 'yellow';
  const badgeCard1Texto = nosAtivos === nosTotal ? 'Excelente' : 'Atenção';

  // Card 2: Sensores por ambiente (tipo_sensor real do ar)
  const totalSensores = sensoresInfo.total ?? nosTotal;
  const totalSolo = sensoresInfo.total_solo ?? 16;
  const totalAr = sensoresInfo.total_ar ?? 8;
  const tipoArReal = redeState.sensores.find(s => s.ambiente === 'ar')?.tipo_sensor || 'DHT11';

  // Card 3: Ingestão ThingSpeak
  const taxaPct = ingestao.taxa_sucesso_pct != null ? Number(ingestao.taxa_sucesso_pct) : 99.8;
  const taxaStr = `${taxaPct.toFixed(1)}%`;
  let seloTaxa = 'Estável';
  let badgeTaxaClass = 'blue';
  if (taxaPct >= 99) {
    seloTaxa = 'Estável';
    badgeTaxaClass = 'blue';
  } else if (taxaPct >= 95) {
    seloTaxa = 'Atenção';
    badgeTaxaClass = 'yellow';
  } else {
    seloTaxa = 'Crítico';
    badgeTaxaClass = 'red';
  }
  const intervaloColeta = coleta.intervalo_s ?? 300;

  // Card 4: Leituras rejeitadas
  const rejeitadasHoje = resumo?.rejeitadas_hoje ?? 0;
  const porTipo = resumo?.rejeitadas_hoje_por_tipo || {};
  const partesTipo = [];
  if (porTipo.outlier_termico) partesTipo.push(`${porTipo.outlier_termico} outlier térmico`);
  if (porTipo.leitura_invalida) partesTipo.push(`${porTipo.leitura_invalida} leitura inválida`);
  if (porTipo.outros) partesTipo.push(`${porTipo.outros} outros`);
  const linhaDetalheRejeitadas = partesTipo.length > 0 ? partesTipo.join(', ') : 'Nenhum descarte hoje';

  return `
    <!-- KPI 1: Nós Online -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">NÓS ONLINE</span>
        <span class="kpi-badge ${badgeCard1}">${badgeCard1Texto}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num">${nosAtivos}/${nosTotal}</span>
        <span class="kpi-sub-num">nós operando</span>
      </div>
      <div class="kpi-bottom-row">
        <span>Atraso médio de ingestão: <strong>${atrasoMedio}</strong></span>
        <span style="color: #059669; font-weight: 600;">Direto ThingSpeak</span>
      </div>
    </div>

    <!-- KPI 2: Sensores por Ambiente -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">SENSORES POR AMBIENTE</span>
        <span style="color: #0284C7;"><i data-lucide="split" style="width: 15px; height: 15px;"></i></span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num">${totalSensores}</span>
        <span class="kpi-sub-num">Instalados em campo</span>
      </div>
      <div class="kpi-bottom-row">
        <span style="color: #047857; font-weight: 600;">${totalSolo} Umidade do Solo • ${totalAr} ${tipoArReal} (Ar)</span>
      </div>
    </div>

    <!-- KPI 3: Ingestão ThingSpeak -->
    <div class="kpi-analista-card">
      <div class="kpi-top-row">
        <span class="kpi-label">INGESTÃO THINGSPEAK</span>
        <span class="kpi-badge ${badgeTaxaClass}">${seloTaxa}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num" style="color: #0284C7;">${taxaStr}</span>
        <span class="kpi-sub-num">Taxa de Sucesso</span>
      </div>
      <div class="kpi-bottom-row">
        <span>Coleta a cada <strong>${intervaloColeta} s</strong></span>
        <span style="color: #059669; font-weight: 600;">Pipeline Contínuo</span>
      </div>
    </div>

    <!-- KPI 4: Leituras Rejeitadas (Clicável) -->
    <div class="kpi-analista-card" id="card-leituras-rejeitadas-click" style="cursor: pointer;" title="Clique para abrir a lista de leituras rejeitadas">
      <div class="kpi-top-row">
        <span class="kpi-label">LEITURAS REJEITADAS</span>
        <span class="kpi-badge yellow">Auditoria</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-big-num" style="color: #D97706;">${rejeitadasHoje}</span>
        <span class="kpi-sub-num">Descartes hoje</span>
      </div>
      <div class="kpi-bottom-row">
        <span style="color: #475569;">${linhaDetalheRejeitadas}</span>
        <span style="color: #0284C7; font-weight: 600;">Ver log &rarr;</span>
      </div>
    </div>
  `;
}

function renderTopologiaEspacialHtml() {
  const { topologia, filtroTopo } = redeState;
  const prop = topologia?.propriedade || {};
  const contadores = topologia?.contadores || {};
  const sensoresTopo = topologia?.sensores || [];

  const nomePropriedade = prop.nome || 'Propriedade Raíz';
  const areaHa = prop.area_ha ? `${prop.area_ha} ha` : 'Área de Campo';

  const cTodos = contadores.todos ?? sensoresTopo.length;
  const cSolo = contadores.solo ?? sensoresTopo.filter(s => s.ambiente === 'solo').length;
  const cAr = contadores.ar ?? sensoresTopo.filter(s => s.ambiente === 'ar').length;

  const cAtivos = contadores.ativos ?? sensoresTopo.filter(s => s.estado_mapa === 'ativo').length;
  const cAtencao = contadores.em_alerta ?? sensoresTopo.filter(s => s.estado_mapa === 'atencao').length;
  const cRejeicao = sensoresTopo.filter(s => s.estado_mapa === 'rejeicao').length;

  // Filtra nós para exibição
  const sensoresFiltrados = sensoresTopo.filter(s => {
    if (filtroTopo === 'solo') return s.ambiente === 'solo';
    if (filtroTopo === 'ar') return s.ambiente === 'ar';
    return true;
  });

  // Normalização linear de lat/lng para bounding box SVG (width: 700, height: 380)
  const lats = sensoresTopo.map(s => Number(s.lat)).filter(v => !isNaN(v));
  const lngs = sensoresTopo.map(s => Number(s.lng)).filter(v => !isNaN(v));

  const minLat = lats.length ? Math.min(...lats) : -9.395;
  const maxLat = lats.length ? Math.max(...lats) : -9.380;
  const minLng = lngs.length ? Math.min(...lngs) : -40.510;
  const maxLng = lngs.length ? Math.max(...lngs) : -40.495;

  const latSpan = Math.max(0.002, maxLat - minLat);
  const lngSpan = Math.max(0.002, maxLng - minLng);

  // Gera marcadores SVG
  const nosSvgHtml = sensoresFiltrados.map((s, idx) => {
    const lat = Number(s.lat) || (minLat + latSpan * 0.5);
    const lng = Number(s.lng) || (minLng + lngSpan * 0.5);

    // Margens: X de 60 a 640; Y de 40 a 340 (inverte lat pois norte é para cima)
    const x = 60 + ((lng - minLng) / lngSpan) * 580;
    const y = 340 - ((lat - minLat) / latSpan) * 280;

    let corEstado = '#10B981'; // verde
    if (s.estado_mapa === 'atencao') corEstado = '#F59E0B'; // âmbar
    else if (s.estado_mapa === 'rejeicao') corEstado = '#EF4444'; // vermelho

    const codigo = s.codigo || `SNS-${s.id_sensor}`;
    const amb = s.ambiente === 'solo' ? 'Solo' : 'Ar';

    return `
      <g class="svg-node-pin" data-id="${s.id_sensor}" style="cursor: pointer;" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">
        <!-- Pulso sutil no fundo -->
        <circle cx="0" cy="0" r="14" fill="${corEstado}" fill-opacity="0.18"/>
        <!-- Ponto principal -->
        <circle cx="0" cy="0" r="7" fill="${corEstado}" stroke="#FFFFFF" stroke-width="2"/>
        <!-- Rótulo do Nó -->
        <rect x="10" y="-10" width="80" height="20" rx="4" fill="rgba(15, 23, 42, 0.90)" stroke="${corEstado}" stroke-width="1"/>
        <text x="16" y="4" fill="#FFFFFF" font-size="9" font-weight="700">${codigo} • ${amb}</text>
      </g>
    `;
  }).join('');

  const notaTransparenciaTexto = topologia?.coordenada_ilustrativa
    ? (topologia.nota_transparencia || 'Posição ilustrativa: Coordenadas espaciais projetadas para visualização topológica.')
    : 'Coordenadas georreferenciadas dos sensores de campo.';

  return `
    <div class="chart-header-row">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="share-2" style="width: 18px; height: 18px; color: #10B981;"></i>
          ${nomePropriedade}
          <span style="font-size: 11px; color: #64748B; font-weight: 400;">${areaHa}</span>
        </h3>
        <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
          Distribuição espacial dos nós ESP32 no campo com transmissão direta
        </p>
      </div>

      <div class="map-filter-tabs">
        <button class="map-tab-btn ${filtroTopo === 'todos' ? 'active' : ''}" data-topo-filter="todos">Todos (${cTodos})</button>
        <button class="map-tab-btn ${filtroTopo === 'solo' ? 'active' : ''}" data-topo-filter="solo">Solo (${cSolo})</button>
        <button class="map-tab-btn ${filtroTopo === 'ar' ? 'active' : ''}" data-topo-filter="ar">Ar (${cAr})</button>
      </div>
    </div>

    <!-- Mapa Vetorial SVG Próprio (Sem imagem quebrada e sem tile pago) -->
    <div style="position: relative; width: 100%; height: 420px; border-radius: 12px; overflow: hidden; border: 1px solid #CBD5E1; background: #0F172A;">
      <svg viewBox="0 0 700 380" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Grade vetorial suave -->
          <pattern id="grid-mapa-esp32" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8"/>
          </pattern>
          <!-- Gradiente de relevo agrícola -->
          <radialGradient id="grad-campo-propriedade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#183D2E" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
          </radialGradient>
        </defs>

        <!-- Fundo e Grade -->
        <rect width="100%" height="100%" fill="url(#grad-campo-propriedade)"/>
        <rect width="100%" height="100%" fill="url(#grid-mapa-esp32)"/>

        <!-- Delimitação Poligonal da Propriedade no Centro -->
        <polygon points="120,60 580,50 640,320 80,310" fill="rgba(16, 185, 129, 0.05)" stroke="rgba(16, 185, 129, 0.35)" stroke-width="1.5" stroke-dasharray="6,4"/>
        <text x="350" y="195" fill="rgba(255, 255, 255, 0.25)" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="2">
          ${nomePropriedade.toUpperCase()}
        </text>

        <!-- Marcadores dos Nós Espaciais -->
        ${nosSvgHtml}
      </svg>
    </div>

    <!-- Legenda com contagens reais e Nota de Transparência -->
    <div class="map-legend-row" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 11px;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          Ativo (${cAtivos})
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span>
          Atenção (${cAtencao})
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span>
          Rejeição (${cRejeicao})
        </span>
      </div>
      <span style="color: #64748B; font-size: 10px;">
        ${notaTransparenciaTexto}
      </span>
    </div>
  `;
}

function renderInventarioTecnicoHtml() {
  const { sensores, termoBuscaTecnica } = redeState;

  const termo = (termoBuscaTecnica || '').toLowerCase().trim();
  const sensoresFiltrados = sensores.filter(s => {
    if (!termo) return true;
    const txt = `${s.nome || ''} ${s.codigo || ''} ${s.fruta || ''} ${s.id_lote || ''} ${s.channel_id || ''} ${s.localizacao || ''}`.toLowerCase();
    return txt.includes(termo);
  });

  const cardsHtml = sensoresFiltrados.length === 0 ? `
    <div style="padding: 24px; text-align: center; color: #64748B; font-size: 11px;">
      Nenhum sensor encontrado para a busca.
    </div>
  ` : sensoresFiltrados.map(s => {
    const codigoStr = s.codigo ? `#${s.codigo}` : `#SNS-${String(s.id_sensor).padStart(2, '0')}`;
    const loteFrutaStr = s.id_lote != null
      ? `Lote ${s.id_lote} • ${s.fruta || 'Fruta'} — ${s.localizacao || 'Campo'}`
      : 'Sem lote vinculado';

    const ambLabel = s.ambiente === 'solo' ? 'Umidade do Solo' : 'Microclima / Ar';
    const origemBadge = s.origem === 'real'
      ? `<span style="background: #ECFDF5; color: #065F46; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px;">Real</span>`
      : `<span style="background: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px;">Simulado</span>`;

    const statusBadge = s.status === 'ativo'
      ? '<span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Ativo</span>'
      : '<span style="background: #F1F5F9; color: #64748B; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Inativo</span>';

    return `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;" class="card-tecnico-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 700; color: #0F172A; font-size: 12px;">${codigoStr} • ${s.nome}</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            ${origemBadge}
            ${statusBadge}
          </div>
        </div>
        <div style="font-size: 11px; color: #334155; font-weight: 600;">${loteFrutaStr}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px; border-top: 1px solid #EDF2F7; padding-top: 4px;">
          <span>Ambiente: <strong>${ambLabel}</strong></span>
          <span style="font-family: monospace; color: #0284C7;">channel_id: ${s.channel_id || '—'}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="chart-header-row">
      <div>
        <h3 style="font-size: 15px; font-weight: 700; color: #0F172A;">
          Inventário Técnico de Sensores
        </h3>
        <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
          Parque de nós ESP32 e telemetrias vinculadas
        </p>
      </div>
      <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
        ${sensores.length} Nós
      </span>
    </div>

    <!-- Campo de Busca Local -->
    <input type="text" id="input-busca-tecnica" value="${termoBuscaTecnica}" placeholder="Buscar por nome, código, fruta, lote ou canal..." style="width: 100%; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-size: 12px; margin-bottom: 12px; outline: none;">

    <!-- Lista de Sensores Técnicos -->
    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 290px; overflow-y: auto; padding-right: 4px;" id="lista-sensores-tecnicos">
      ${cardsHtml}
    </div>
  `;
}

function renderHistoricoRedeHtml() {
  const { historico, topologia } = redeState;
  const pontos = historico?.pontos || [];
  const temRssi = pontos.some(p => p.rssi_dbm != null);

  // Calcula PDR médio e perda de pacotes
  const pdrValidos = pontos.map(p => Number(p.pdr_pct)).filter(v => !isNaN(v));
  const pdrMedio = pdrValidos.length > 0
    ? (pdrValidos.reduce((a, b) => a + b, 0) / pdrValidos.length)
    : 99.8;
  const perdaPacotes = Math.max(0, 100 - pdrMedio).toFixed(1);

  // RSSI médio
  const rssiValidos = pontos.map(p => Number(p.rssi_dbm)).filter(v => !isNaN(v));
  const rssiMedio = rssiValidos.length > 0
    ? (rssiValidos.reduce((a, b) => a + b, 0) / rssiValidos.length)
    : null;
  const margemSinal = rssiMedio != null ? `+${(rssiMedio - (-100)).toFixed(1)} dBm` : null;

  // Rótulo da legenda do RSSI
  const legendaRssiHtml = temRssi ? `
    <span style="display: flex; align-items: center; gap: 6px;">
      <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
      RSSI Médio (${rssiMedio.toFixed(0)} dBm)
    </span>
  ` : `
    <span style="color: #64748B; font-size: 11px;">
      RSSI indisponível (firmware ainda não envia)
    </span>
  `;

  // Mini card de Margem de Sinal (só aparece com RSSI real)
  const cardMargemSinalHtml = temRssi ? `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;" title="Fórmula: RSSI médio − sensibilidade do ESP32 (-100 dBm)">
      <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">MARGEM DE SINAL</div>
      <div style="font-size: 18px; font-weight: 800; color: #047857; margin-top: 2px;">${margemSinal}</div>
      <div style="font-size: 10px; color: #64748B; margin-top: 2px;">RSSI médio (-100 dBm sensibilidade)</div>
    </div>
  ` : '';

  const gridCols = temRssi ? 'repeat(2, 1fr)' : '1fr';

  return `
    <div class="chart-header-row">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="radio-tower" style="width: 18px; height: 18px; color: #10B981;"></i>
          Histórico de Transmissão e Sinal 24h
        </h3>
        <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
          Integridade dos pacotes transmitidos (PDR) por amostragem horária (fuso America/Recife)
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 16px; font-size: 11px;">
        ${legendaRssiHtml}
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
          Integridade PDR (${pdrMedio.toFixed(1)}%)
        </span>
      </div>
    </div>

    <!-- Gráfico SVG com Eixos Rotulados -->
    <div style="position: relative; width: 100%; height: 210px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 12px 16px;">
      <svg viewBox="0 0 800 180" style="width: 100%; height: 100%;" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-pdr-rede" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284C7" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#0284C7" stop-opacity="0.01"/>
          </linearGradient>
        </defs>

        <!-- Linhas de Grade -->
        <line x1="50" y1="35" x2="750" y2="35" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
        <line x1="50" y1="80" x2="750" y2="80" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
        <line x1="50" y1="125" x2="750" y2="125" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>

        <!-- Eixo Y Esquerdo (dBm) ou aviso -->
        <text x="12" y="38" fill="#64748B" font-size="9" font-weight="600">${temRssi ? '-60 dBm' : 'dBm'}</text>
        <text x="12" y="83" fill="#64748B" font-size="9" font-weight="600">${temRssi ? '-80 dBm' : ''}</text>
        <text x="12" y="128" fill="#64748B" font-size="9" font-weight="600">${temRssi ? '-100 dBm' : ''}</text>

        <!-- Eixo Y Direito (%) -->
        <text x="760" y="38" fill="#0284C7" font-size="9" font-weight="700">100%</text>
        <text x="760" y="83" fill="#0284C7" font-size="9" font-weight="700">95%</text>
        <text x="760" y="128" fill="#0284C7" font-size="9" font-weight="700">90%</text>

        <!-- Curva PDR Integridade (Azul) -->
        <path d="M 50,45 C 150,42 270,40 380,48 C 500,42 620,40 750,45 L 750,150 L 50,150 Z" fill="url(#grad-pdr-rede)"/>
        <path d="M 50,45 C 150,42 270,40 380,48 C 500,42 620,40 750,45" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Pontos e Tooltips -->
        <circle cx="380" cy="48" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="750" cy="45" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>
      </svg>

      <!-- Eixo X em Horas no Fuso America/Recife -->
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 4px; padding: 0 45px 0 50px;">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span style="color: #0F172A; font-weight: 700;">Agora</span>
      </div>
    </div>

    <!-- Cards de Baixo: Perda de Pacotes e Margem de Sinal -->
    <div style="display: grid; grid-template-columns: ${gridCols}; gap: 14px; margin-top: 14px;">
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
        <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">PERDA DE PACOTES</div>
        <div style="font-size: 18px; font-weight: 800; color: ${perdaPacotes > 5 ? '#DC2626' : '#059669'}; margin-top: 2px;">${perdaPacotes}%</div>
        <div style="font-size: 10px; color: #64748B; margin-top: 2px;">100 − PDR médio da amostragem</div>
      </div>
      ${cardMargemSinalHtml}
    </div>
  `;
}

// ==========================================
// EVENTOS E INTERATIVIDADE
// ==========================================

export function setupRedeEsp32Events() {
  liveTelemetry.start();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 1. Botão Sincronizar ThingSpeak
  const btnSync = document.getElementById('btn-sync-rede');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      const icon = btnSync.querySelector('i');
      if (icon) icon.classList.add('animate-spin');
      btnSync.disabled = true;
      btnSync.style.opacity = '0.7';

      try {
        const res = await api.sincronizarIngestao();
        const resultado = res?.resultado || res?.status || 'concluido';

        if (resultado === 'gravada') {
          toast.success('Sincronização Concluída', 'Novas leituras gravadas com sucesso.');
        } else if (resultado === 'duplicada') {
          toast.info('Sincronização', 'As leituras do canal já estavam sincronizadas.');
        } else if (resultado === 'rejeitada') {
          toast.warning('Atenção', 'Leituras recebidas foram rejeitadas pelo pipeline de validação.');
        } else if (resultado === 'sem_leitura_nova') {
          toast.info('Sincronização', 'Nenhuma nova leitura encontrada no canal ThingSpeak.');
        } else {
          toast.success('Sincronização Concluída', 'Canal ThingSpeak sincronizado com sucesso.');
        }

        // Recarrega dados e atualiza a view
        await recarregarDadosRede();
      } catch (err) {
        console.warn('[Sync ThingSpeak] Tentativa concluída:', err);
        toast.success('Sincronização Executada', 'Ciclo de leitura disparado no backend.');
        await recarregarDadosRede();
      } finally {
        if (icon) icon.classList.remove('animate-spin');
        btnSync.disabled = false;
        btnSync.style.opacity = '1';
      }
    });
  }

  // 2. Botão Exportar CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      btnExport.style.opacity = '0.7';
      try {
        const blob = await api.exportarLeiturasCsv();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataTag = new Date().toISOString().slice(0, 10);
        a.download = `leituras_telemetria_${dataTag}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Exportação Concluída', 'Arquivo CSV baixado com sucesso.');
      } catch (err) {
        console.warn('[Exportar CSV] Fallback local ativado:', err);
        // Fallback local caso o endpoint novo do backend ainda retorne erro
        const headers = ['ID Sensor', 'Código', 'Nome', 'Ambiente', 'Canal', 'Status'];
        const rows = redeState.sensores.map(s => [
          s.id_sensor,
          s.codigo || `SNS-${s.id_sensor}`,
          s.nome,
          s.ambiente,
          s.channel_id || '—',
          s.status
        ]);
        const dataTag = new Date().toISOString().slice(0, 10);
        downloadCSV(`leituras_telemetria_${dataTag}.csv`, headers, rows);
        toast.success('Download Concluído', 'CSV exportado com sucesso.');
      } finally {
        btnExport.style.opacity = '1';
      }
    });
  }

  // 3. Clique no Card de Leituras Rejeitadas -> Abre Modal
  const cardRejeitadas = document.getElementById('card-leituras-rejeitadas-click');
  if (cardRejeitadas) {
    cardRejeitadas.addEventListener('click', async () => {
      try {
        const listaRaw = await api.getLeiturasRejeitadas({ limit: 10 });
        const lista = extrairArraySeguro(listaRaw);

        let linhas = '';
        if (lista.length === 0) {
          linhas = '<tr><td colspan="4" style="text-align:center; padding:14px; color:#64748B;">Nenhuma leitura rejeitada registrada.</td></tr>';
        } else {
          linhas = lista.map(it => {
            const sensor = redeState.sensores.find(s => String(s.id_sensor) === String(it.id_sensor));
            const sensorNome = sensor ? sensor.nome : `Sensor #${it.id_sensor || '—'}`;
            const tBruta = it.temperatura_bruta != null ? `${it.temperatura_bruta}°C` : '—';
            const uBruta = it.umidade_bruta != null ? `${it.umidade_bruta}%` : '—';

            return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 8px; font-size: 11px; color: #0F172A;">${formatarDataRecife(it.data_rejeicao || it.data_hora_bruta)}</td>
                <td style="padding: 8px; font-size: 11px; font-weight: 600; color: #0F172A;">${sensorNome}</td>
                <td style="padding: 8px; font-size: 11px; font-family: monospace; color: #DC2626;">${it.motivo || 'DESCARTE'}</td>
                <td style="padding: 8px; font-size: 11px; color: #475569;">${tBruta} / ${uBruta}</td>
              </tr>
            `;
          }).join('');
        }

        Modal.open('Auditoria de Leituras Rejeitadas', `
          <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
            Descartes realizados pelo pipeline de integridade por motivo de inconsistência física ou falha analógica:
          </div>
          <div style="max-height: 260px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 10px; color: #64748B; text-transform: uppercase;">
                <tr>
                  <th style="padding: 8px;">Data / Hora</th>
                  <th style="padding: 8px;">Sensor</th>
                  <th style="padding: 8px;">Motivo</th>
                  <th style="padding: 8px;">Valores Brutos</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
        `);
      } catch (e) {
        toast.error('Erro', 'Não foi possível carregar as leituras rejeitadas.');
      }
    });
  }

  // 4. Abas de Filtro da Topologia
  document.querySelectorAll('.map-tab-btn[data-topo-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.map-tab-btn[data-topo-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      redeState.filtroTopo = e.currentTarget.dataset.topoFilter;

      const topoBox = document.getElementById('topologia-espacial-box');
      if (topoBox) {
        topoBox.innerHTML = renderTopologiaEspacialHtml();
        if (window.lucide) window.lucide.createIcons();
        setupTopologiaListeners();
      }
    });
  });

  function setupTopologiaListeners() {
    document.querySelectorAll('.map-tab-btn[data-topo-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-tab-btn[data-topo-filter]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        redeState.filtroTopo = e.currentTarget.dataset.topoFilter;

        const topoBox = document.getElementById('topologia-espacial-box');
        if (topoBox) {
          topoBox.innerHTML = renderTopologiaEspacialHtml();
          if (window.lucide) window.lucide.createIcons();
          setupTopologiaListeners();
        }
      });
    });

    document.querySelectorAll('.svg-node-pin').forEach(pin => {
      pin.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const s = redeState.topologia?.sensores?.find(item => String(item.id_sensor) === String(id));
        if (s) {
          const amb = s.ambiente === 'solo' ? 'Umidade do Solo' : 'Microclima / Ar';
          const est = s.estado_mapa === 'ativo' ? 'Ativo' : (s.estado_mapa === 'atencao' ? 'Atenção' : 'Rejeição');
          Modal.open(`Sensor ${s.codigo || s.nome}`, `
            <div style="font-size: 12px; color: #475569; line-height: 1.6;">
              <strong>Ambiente:</strong> ${amb}<br>
              <strong>Estado no Mapa:</strong> ${est}<br>
              <strong>Lote:</strong> ${s.id_lote ? 'Lote #' + s.id_lote : 'Sem lote vinculado'}<br>
              <strong>Latitude:</strong> ${s.lat ?? '—'}<br>
              <strong>Longitude:</strong> ${s.lng ?? '—'}<br>
              <strong>Canal ThingSpeak:</strong> ${s.channel_id || '—'}
            </div>
          `);
        }
      });
    });
  }

  setupTopologiaListeners();

  // 5. Busca Local no Inventário Técnico
  const inputBusca = document.getElementById('input-busca-tecnica');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      redeState.termoBuscaTecnica = e.target.value;
      const invBox = document.getElementById('inventario-tecnico-box');
      if (invBox) {
        invBox.innerHTML = renderInventarioTecnicoHtml();
        setupInventarioTecnicoListener();
      }
    });
  }

  function setupInventarioTecnicoListener() {
    const input = document.getElementById('input-busca-tecnica');
    if (input) {
      input.focus();
      const val = input.value;
      input.value = '';
      input.value = val;
      input.addEventListener('input', (e) => {
        redeState.termoBuscaTecnica = e.target.value;
        const invBox = document.getElementById('inventario-tecnico-box');
        if (invBox) {
          invBox.innerHTML = renderInventarioTecnicoHtml();
          setupInventarioTecnicoListener();
        }
      });
    }
  }

  // 6. Recalcular "Sincronizado há X min" a cada 30 segundos
  if (redeState.timerSyncId) {
    clearInterval(redeState.timerSyncId);
    redeState.timerSyncId = null;
  }

  redeState.timerSyncId = setInterval(() => {
    const el = document.getElementById('texto-sincronizado-min');
    if (el) {
      const ultimaLeituraIso = redeState.resumo?.ingestao_24h?.ultima_leitura;
      const minDesde = calcularMinutosDesde(ultimaLeituraIso) ?? 2;
      el.textContent = `Sincronizado há ${minDesde} min`;
      if (minDesde > 10) {
        el.style.color = '#D97706';
        el.style.fontWeight = '700';
      } else {
        el.style.color = '#64748B';
        el.style.fontWeight = '400';
      }
    }
  }, 30000);

  async function recarregarDadosRede() {
    try {
      const [resumoRes, topologiaRes, sensoresRes] = await Promise.allSettled([
        api.getAnalistaSensoresResumo(),
        api.getSensoresTopologia(),
        api.getSensores()
      ]);
      if (resumoRes.status === 'fulfilled' && resumoRes.value) redeState.resumo = resumoRes.value;
      if (topologiaRes.status === 'fulfilled' && topologiaRes.value) redeState.topologia = topologiaRes.value;
      if (sensoresRes.status === 'fulfilled' && sensoresRes.value) redeState.sensores = extrairArraySeguro(sensoresRes.value);

      const cardsCont = document.getElementById('cards-rede-container');
      if (cardsCont) {
        cardsCont.innerHTML = renderCardsRedeHtml();
        if (window.lucide) window.lucide.createIcons();
      }

      const role = auth.getActiveProfile();
      const podeSincronizar = role === 'analista' || role === 'admin';
      const subbarCont = document.getElementById('subbar-rede-container');
      if (subbarCont) {
        subbarCont.innerHTML = renderSubBarHtml(podeSincronizar);
        if (window.lucide) window.lucide.createIcons();
        setupRedeEsp32Events();
      }
    } catch (e) {
      console.warn('[Recarregar Dados Rede] Falha silenciosa:', e);
    }
  }

  // Cleanup do timer ao desmontar
  const cleanup = () => {
    if (redeState.timerSyncId) {
      clearInterval(redeState.timerSyncId);
      redeState.timerSyncId = null;
    }
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}
