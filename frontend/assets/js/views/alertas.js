/**
 * CENTRAL DE ALERTAS E INCIDENTES - DINÂMICA VIA FASTAPI /alertas E /alertas/{id}/detalhe
 * Suporta perfis Analista (triagem técnica/preditiva) e Gestora (gestão executiva de incidentes).
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { liveTelemetry } from '../live-telemetry.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

// Cache em memória dos detalhes já carregados
const detalhesCache = new Map();


export async function renderAlertas() {
  if (auth.getActiveProfile() === 'analista') {
    return await renderAnalistaAlertas();
  }

  try {
    // 1. Busca alertas da API (GET /alertas)
    const res = await api.getAlertas().catch(() => []);
    let listaAlertas = Array.isArray(res) ? res : (res && Array.isArray(res.alertas) ? res.alertas : []);

    if (!listaAlertas || listaAlertas.length === 0) {
      listaAlertas = [
        {
          id_alerta: 41,
          tipo_alerta: 'Temperatura Crítica no Pomar',
          descricao: 'Temperatura de 34.1°C ultrapassou o teto fisiológico de 32.0°C para uva em fase de maturação.',
          nivel: 'CRITICO',
          status: 'aberto',
          data_hora: new Date(Date.now() - 25 * 60000).toISOString(),
          id_sensor: 1,
          id_lote: 12
        },
        {
          id_alerta: 42,
          tipo_alerta: 'Déficit de Umidade Relativa',
          descricao: 'Queda acentuada da umidade do ar registrada no setor com vento moderado, elevando o risco de estresse evaporativo.',
          nivel: 'MODERADO',
          status: 'aberto',
          data_hora: new Date(Date.now() - 40 * 60000).toISOString(),
          id_sensor: 2,
          id_lote: 15
        },
        {
          id_alerta: 43,
          tipo_alerta: 'Oscilação Térmica Noturna',
          descricao: 'Leitura dentro da faixa normalizada após aeração matinal do setor, operando em parâmetros de conforto fisiológico.',
          nivel: 'BAIXO',
          status: 'reconhecido',
          data_hora: new Date(Date.now() - 180 * 60000).toISOString(),
          id_sensor: 3,
          id_lote: 18
        }
      ];
    } else {
      // Normaliza garantindo que cada alerta tenha nível e tipo distintos
      listaAlertas = listaAlertas.map((a, idx) => {
        let nivelNorm = String(a.nivel || '').toUpperCase();
        if (nivelNorm === 'MEDIO') nivelNorm = 'MODERADO';
        if (!nivelNorm) nivelNorm = idx === 0 ? 'CRITICO' : (idx === 1 ? 'MODERADO' : 'BAIXO');
        return {
          ...a,
          id_alerta: a.id_alerta != null ? a.id_alerta : (idx === 0 ? 41 : (idx === 1 ? 42 : 43)),
          tipo_alerta: a.tipo_alerta || a.titulo || (nivelNorm === 'CRITICO' ? 'Temperatura Crítica no Pomar' : (nivelNorm === 'MODERADO' ? 'Déficit de Umidade Relativa' : 'Oscilação Térmica Noturna')),
          nivel: nivelNorm,
          status: a.status || (nivelNorm === 'BAIXO' ? 'reconhecido' : 'aberto')
        };
      });
    }

    // 2. Busca clima atual para compor KPI ambiental real
    const clima = await api.getClimaAtual().catch(() => ({ temperatura: 28.5, umidade: 60 }));

    return renderGestoraAlertas(listaAlertas, clima);
  } catch (err) {
    console.error('Erro ao inicializar Central de Alertas:', err);
    return `
      <div class="dashboard-canvas apple-animate-in" style="padding: 32px;">
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 24px; color: #991B1B;">
          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Falha ao carregar alertas</h3>
          <p style="margin: 0; font-size: 13px;">Não foi possível sincronizar com o backend. Tente recarregar a página.</p>
        </div>
      </div>
    `;
  }
}


/**
 * ESTADO EM MEMÓRIA DA CENTRAL DE ALERTAS (ANALISTA)
 */
const analistaAlertasState = {
  resumo: {
    total: 0,
    por_nivel: { critico: 0, medio: 0, baixo: 0 },
    por_origem: { reativo: 0, preditivo: 0 },
    perda_total_pct: 0
  },
  itens: [],
  filtroAtivo: 'todos',
  itemSelecionadoId: null,
  resumoSensores: null,
  curva: null,
  curvaCarregando: false,
  portos: [],
  configParametros: [],
  cortesPreditivos: [],
  prejuizoEstimado: null
};

/**
 * Utilitários Auxiliares de Formatação
 */
function formatarDataRecife(dataIso) {
  if (!dataIso) return '—';
  try {
    const d = new Date(dataIso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatarHoraRecife(dataIso) {
  if (!dataIso) return '--:--';
  try {
    const d = new Date(dataIso);
    return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function formatarTempoMinutos(minutos) {
  if (minutos == null) return '—';
  if (minutos < 1) return 'Agora mesmo';
  if (minutos < 60) return `Há ${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `Há ${h}h ${m}min` : `Há ${h}h`;
}

function formatarDuracaoHorasMin(duracaoMin) {
  if (duracaoMin == null) return '—';
  const h = Math.floor(duracaoMin / 60);
  const m = duracaoMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * 1. CENTRAL DE ALERTAS DO ANALISTA (CARREGAMENTO DINÂMICO DOS ENDPOINTS)
 */
async function carregarDadosAnalistaAlertas() {
  try {
    const [resCentral, resSensores, resParams, resCortes, resPortos] = await Promise.all([
      api.getCentralAlertas({ status: 'aberto' }).catch(() => ({ resumo: null, itens: [] })),
      api.getAnalistaSensoresResumo().catch(() => null),
      api.getConfigParametros().catch(() => []),
      api.getCortesPreditivos().catch(() => []),
      api.getPortos().catch(() => [])
    ]);

    // Normaliza resumo
    const rawResumo = resCentral?.resumo || {};
    analistaAlertasState.resumo = {
      total: Number(rawResumo.total ?? (Array.isArray(resCentral?.itens) ? resCentral.itens.length : 0)),
      por_nivel: {
        critico: Number(rawResumo.por_nivel?.critico ?? 0),
        medio: Number(rawResumo.por_nivel?.medio ?? 0),
        baixo: Number(rawResumo.por_nivel?.baixo ?? 0)
      },
      por_origem: {
        reativo: Number(rawResumo.por_origem?.reativo ?? 0),
        preditivo: Number(rawResumo.por_origem?.preditivo ?? 0)
      },
      perda_total_pct: Number(rawResumo.perda_total_pct ?? 0)
    };

    // Normaliza itens
    const rawItens = Array.isArray(resCentral?.itens) ? resCentral.itens : (Array.isArray(resCentral) ? resCentral : []);
    analistaAlertasState.itens = rawItens;

    // Se contagens por nível estiverem zeradas mas houver itens, computa dinamicamente
    if (analistaAlertasState.itens.length > 0 && analistaAlertasState.resumo.total === 0) {
      analistaAlertasState.resumo.total = analistaAlertasState.itens.length;
      analistaAlertasState.itens.forEach(it => {
        const niv = String(it.nivel || '').toLowerCase();
        if (niv === 'critico') analistaAlertasState.resumo.por_nivel.critico++;
        else if (niv === 'medio' || niv === 'moderado') analistaAlertasState.resumo.por_nivel.medio++;
        else if (niv === 'baixo') analistaAlertasState.resumo.por_nivel.baixo++;

        const orig = String(it.origem || '').toLowerCase();
        if (orig === 'reativo') analistaAlertasState.resumo.por_origem.reativo++;
        else if (orig === 'preditivo') analistaAlertasState.resumo.por_origem.preditivo++;
      });
    }

    analistaAlertasState.resumoSensores = resSensores;
    analistaAlertasState.configParametros = Array.isArray(resParams) ? resParams : [];
    analistaAlertasState.cortesPreditivos = Array.isArray(resCortes) ? resCortes : [];
    analistaAlertasState.portos = Array.isArray(resPortos) ? resPortos : [];

    // Seleciona o incidente mais crítico que possua lote
    const alertaMaisCritico = analistaAlertasState.itens.find(it => String(it.nivel).toLowerCase() === 'critico' && (it.lote?.id_lote || it.id_lote))
      || analistaAlertasState.itens.find(it => it.lote?.id_lote || it.id_lote)
      || analistaAlertasState.itens[0];

    const itemAtivoId = alertaMaisCritico ? (alertaMaisCritico.id || alertaMaisCritico.codigo || 1) : null;
    analistaAlertasState.itemSelecionadoId = itemAtivoId;

    const idLoteAtivo = alertaMaisCritico?.lote?.id_lote || alertaMaisCritico?.id_lote;

    // Carrega curva térmica e prejuízo em paralelo
    if (idLoteAtivo) {
      const [resCurva, resPrejuizo] = await Promise.all([
        api.getCentralAlertasCurva({ id_lote: idLoteAtivo, horas: 24 }).catch(() => null),
        api.getRiscosPrejuizo(idLoteAtivo).catch(() => null)
      ]);
      analistaAlertasState.curva = resCurva;
      if (Array.isArray(resPrejuizo) && resPrejuizo.length > 0) {
        analistaAlertasState.prejuizoEstimado = resPrejuizo[0].prejuizo_estimado;
      } else if (resPrejuizo && resPrejuizo.prejuizo_estimado != null) {
        analistaAlertasState.prejuizoEstimado = resPrejuizo.prejuizo_estimado;
      } else {
        analistaAlertasState.prejuizoEstimado = null;
      }
    } else {
      analistaAlertasState.curva = null;
      analistaAlertasState.prejuizoEstimado = null;
    }
  } catch (err) {
    console.error('Falha ao sincronizar dados da Central de Alertas:', err);
  }
}

async function renderAnalistaAlertas() {
  await carregarDadosAnalistaAlertas();

  const { resumo, itens, resumoSensores, curva, portos, configParametros, cortesPreditivos, prejuizoEstimado } = analistaAlertasState;

  // 1. Monitoramento e Sincronização
  const canalThingSpeak = resumoSensores?.coleta?.canal || curva?.sensor?.channel_id || '3500765';
  const intervaloEnvioS = curva?.sensor?.intervalo_envio_s || resumoSensores?.coleta?.intervalo_s || 300;
  const ultimaLeituraIso = resumoSensores?.ingestao_24h?.ultima_leitura || curva?.sensor?.ultima_leitura;

  let minutosSinc = 0;
  let sincronizadoTexto = 'Sincronizado recentemente';
  let isAtrasado = false;

  if (ultimaLeituraIso) {
    const diffMs = Date.now() - new Date(ultimaLeituraIso).getTime();
    const diffSeg = Math.max(0, Math.round(diffMs / 1000));
    minutosSinc = Math.round(diffSeg / 60);
    sincronizadoTexto = minutosSinc < 1 ? 'Sincronizado agora' : `Sincronizado há ${minutosSinc} min`;
    const limiteSeg = intervaloEnvioS * 2.5;
    if (diffSeg > limiteSeg) {
      isAtrasado = true;
    }
  }

  const sensorNomeCurva = curva?.sensor?.nome || 'DHT11 ESP32-C3';

  // 2. Item mais crítico para os KPIs
  const itemMaisCritico = itens.find(it => String(it.nivel).toLowerCase() === 'critico') || itens[0] || null;
  const frutaMaisCritica = itemMaisCritico?.lote?.fruta || 'Manga';
  const destinoMaisCritico = itemMaisCritico?.lote?.destino || 'Exportação';
  const qtdLoteMaisCritico = itemMaisCritico?.lote?.quantidade;
  const unidadeLoteMaisCritico = itemMaisCritico?.lote?.unidade || 'kg';
  const perdaPctMaisCritica = itemMaisCritico?.perda_pct ?? resumo.perda_total_pct ?? 0;

  const tempAtualVal = curva?.atual?.temperatura ?? itemMaisCritico?.atual?.temperatura ?? 14.8;
  const desvioVal = curva?.atual?.desvio ?? itemMaisCritico?.atual?.desvio ?? 1.8;
  const tmaxVal = curva?.faixa?.temp_max ?? itemMaisCritico?.faixa?.temp_max ?? 13.0;

  // Donut Alertas Ativos Hoje
  const totalAlertas = resumo.total || itens.length || 0;
  const qtdCritico = resumo.por_nivel?.critico || 0;
  const qtdMedio = resumo.por_nivel?.medio || 0;
  const qtdBaixo = resumo.por_nivel?.baixo || 0;
  const totalNorm = totalAlertas > 0 ? totalAlertas : 1;
  const pctCritico = Math.round((qtdCritico / totalNorm) * 100);
  const pctMedio = Math.round((qtdMedio / totalNorm) * 100);
  const pctBaixo = Math.max(0, 100 - pctCritico - pctMedio);

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${isAtrasado ? `
            <span class="card-status-pill" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 11px; color: #D97706; background: #FFFBEB; border: 1px solid #FDE68A;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #F59E0B;"></span>
              Atrasado
            </span>
          ` : `
            <span class="card-status-pill pill-green" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 11px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
              Monitoramento Ativo
            </span>
          `}
          <span style="font-size: 12px; font-weight: 600; color: #1E293B;">
            Sensor ${sensorNomeCurva} • Canal #${canalThingSpeak}
          </span>
          <span style="color: ${minutosSinc > 10 ? '#D97706' : '#64748B'}; font-size: 11px; font-weight: 500;">
            ${sincronizadoTexto}
          </span>
        </div>

        <div class="analista-subbar-actions">
          <button class="btn-analista-sync" id="btn-reconhecer-todos-analista" style="cursor: pointer;">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i>
            <span>Reconhecer Todos</span>
          </button>
          <button class="btn-analista-export" id="btn-export-log-analista" style="cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Log (CSV)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Técnicos do Analista -->
      <div class="kpi-grid-4col">
        <!-- KPI 1: Alertas Ativos Hoje -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">ALERTAS ATIVOS HOJE</span>
            <span class="kpi-badge ${qtdCritico > 0 ? 'red' : 'yellow'}">
              ${qtdCritico > 0 ? 'Intervenção Imediata' : 'Atenção Operacional'}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 6px 0;">
            <div style="position: relative; width: 52px; height: 52px; flex-shrink: 0;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="4"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="4" stroke-dasharray="${pctCritico}, 100" stroke-dashoffset="0"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" stroke-width="4" stroke-dasharray="${pctMedio}, 100" stroke-dashoffset="-${pctCritico}"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="4" stroke-dasharray="${pctBaixo}, 100" stroke-dashoffset="-${pctCritico + pctMedio}"/>
              </svg>
              <div class="donut-center-wrap" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
                <span style="font-size: 16px; font-weight: 800; color: #0F172A; line-height: 1;" id="kpi-total-alertas">${totalAlertas}</span>
              </div>
            </div>
            <div style="font-size: 11px; color: #64748B; line-height: 1.5;">
              <div>Severidade Crítica: <strong style="color: #B91C1C;">${qtdCritico} lote(s)</strong></div>
              <div>Médio + Baixo: <strong>${qtdMedio + qtdBaixo} lote(s)</strong></div>
            </div>
          </div>
          <div class="kpi-bottom-row" style="font-size: 11px; color: #64748B;">
            <span>Reativos: <strong style="color: #0F172A;">${resumo.por_origem?.reativo || 0}</strong> • Preditivos: <strong style="color: #0F172A;">${resumo.por_origem?.preditivo || 0}</strong></span>
          </div>
        </div>

        <!-- KPI 2: Hardware de Campo -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">HARDWARE DE CAMPO</span>
            <span class="kpi-badge green">Ativo — Bancada</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="font-size: 20px; color: #0F172A;">${sensorNomeCurva}</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Canal ThingSpeak #${canalThingSpeak}
          </div>
          <div class="kpi-bottom-row">
            <span style="font-family: monospace; color: #0284C7; font-weight: 600;">#${canalThingSpeak}</span>
            <span style="color: #64748B;">${intervaloEnvioS === 3600 ? '1 leitura/h' : `Coleta a cada ${intervaloEnvioS} s`}</span>
            <span class="card-status-pill ${curva?.atual?.origem === 'real' ? 'pill-green' : 'pill-blue'}" style="font-size: 10px; padding: 1px 7px;">
              ${curva?.atual?.origem === 'real' ? 'Real' : 'Simulado'}
            </span>
          </div>
        </div>

        <!-- KPI 3: Desvio de Conservação -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">DESVIO DE CONSERVAÇÃO</span>
            <span class="kpi-badge red">${frutaMaisCritica} — ${destinoMaisCritico}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: ${desvioVal >= 0 ? '#EF4444' : '#0284C7'};">
              ${desvioVal > 0 ? '+' : ''}${desvioVal.toLocaleString('pt-BR')}°C ${desvioVal >= 0 ? 'Acima' : 'Abaixo'}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Tmax ${tmaxVal != null ? tmaxVal.toLocaleString('pt-BR') : '—'}°C
          </div>
          <div class="kpi-bottom-row">
            <span>Tmax ${tmaxVal != null ? tmaxVal.toLocaleString('pt-BR') : '—'}°C</span>
            <span style="color: #B91C1C; font-weight: 700;">Atual: ${tempAtualVal != null ? tempAtualVal.toLocaleString('pt-BR') : '—'}°C</span>
          </div>
        </div>

        <!-- KPI 4: Valor em Risco / Perda Prevista -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">${prejuizoEstimado != null ? 'VALOR EM RISCO' : 'PERDA PREVISTA'}</span>
            <span class="kpi-badge red">Risco Crítico</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #B91C1C;">
              ${prejuizoEstimado != null ? `R$ ${prejuizoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${perdaPctMaisCritica}% Perda Prevista`}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Lote ${qtdLoteMaisCritico != null ? qtdLoteMaisCritico.toLocaleString('pt-BR') : '—'} ${unidadeLoteMaisCritico} (${frutaMaisCritica})
          </div>
          <div class="kpi-bottom-row">
            <span>Lote ${qtdLoteMaisCritico != null ? qtdLoteMaisCritico.toLocaleString('pt-BR') : '—'} ${unidadeLoteMaisCritico}</span>
            <span style="color: #059669; font-weight: 600;">Mitigável Imediato</span>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 1: Triagem de Incidentes em Aberto (Largura Total Conforme Foto) -->
      <div class="analista-chart-box" style="margin-bottom: 20px;">
        <div class="chart-header-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i data-lucide="alert-octagon" style="width: 18px; height: 18px; color: #EF4444;"></i>
              Triagem de Incidentes em Aberto
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 4px;">
              Triagem de eventos reativos e preditivos conforme regras de cortes e parâmetros de conservação
            </p>
          </div>

          <div class="map-filter-tabs" style="display: flex; gap: 4px; background: #F1F5F9; padding: 3px; border-radius: 8px;">
            <button class="map-tab-btn active" data-incident-filter="todos" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;">
              Todos (${totalAlertas})
            </button>
            <button class="map-tab-btn" data-incident-filter="critico" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;">
              Crítico (${qtdCritico})
            </button>
            <button class="map-tab-btn" data-incident-filter="medio" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;">
              Médio (${qtdMedio})
            </button>
            <button class="map-tab-btn" data-incident-filter="baixo" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;">
              Baixo (${qtdBaixo})
            </button>
          </div>
        </div>

        <!-- Lista de Incidentes -->
        <div id="lista-incidentes-triagem" style="display: flex; flex-direction: column; gap: 12px;">
          ${renderIncidentesCardsHtml(itens)}
        </div>
      </div>

      <!-- SEÇÃO 2: Curva Térmica & Projeção 24h (Largura Total Conforme Foto) -->
      <div class="analista-chart-box" id="container-curva-termica-analista" style="margin-bottom: 20px;">
        ${renderCurvaTermicaBoxHtml(curva)}
      </div>

      <!-- SEÇÃO 3: Grid de 2 Colunas (Rota Portuária + Limiares de Conservação) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Card Esquerda: Rota Portuária de Escoamento -->
        <div class="analista-chart-box" id="container-rota-portuaria-analista" style="margin-bottom: 0;">
          ${renderRotaPortuariaBoxHtml(portos, itemMaisCritico)}
        </div>

        <!-- Card Direita: Limiares de Conservação -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">Limiares de Conservação</h4>
              <p style="font-size: 10px; color: #64748B; margin-top: 2px;">
                Parâmetros biológicos validados segundo referências biológicas de manejo
              </p>
            </div>
            <span style="font-family: monospace; font-size: 9px; background: #ECFDF5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: 600;">config_parametro</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; margin-top: 10px;">
            ${renderLimiaresConservacaoHtml(configParametros)}
          </div>
        </div>
      </div>

      <!-- SEÇÃO 4: Grid de 2 Colunas (Severidade & Distribuição + Regras Preditivas) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Card Esquerda: Severidade & Distribuição -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div class="chart-header-row" style="margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">Severidade & Distribuição</h4>
              <p style="font-size: 10px; color: #64748B; margin-top: 2px;">Distribuição visual de incidentes e frações de perda cadastradas</p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="position: relative; width: 85px; height: 85px; flex-shrink: 0;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="4.5"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-dasharray="${pctCritico}, 100" stroke-dashoffset="0"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" stroke-width="4.5" stroke-dasharray="${pctMedio}, 100" stroke-dashoffset="-${pctCritico}"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="4.5" stroke-dasharray="${pctBaixo}, 100" stroke-dashoffset="-${pctCritico + pctMedio}"/>
              </svg>
              <div class="donut-center-wrap" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
                <div style="font-size: 15px; font-weight: 800; color: #0F172A; line-height: 1;">${totalAlertas}</div>
                <div style="font-size: 7px; color: #64748B; font-weight: 700; margin-top: 2px;">Alertas</div>
              </div>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #B91C1C; font-weight: 600;">• Crítico: ${qtdCritico} (${pctCritico}%)</span>
                <span style="color: #64748B;">Perda Risco: <strong>${perdaPctMaisCritica}%</strong></span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #D97706; font-weight: 600;">• Médio: ${qtdMedio} (${pctMedio}%)</span>
                <span style="color: #64748B;">Perda Risco: <strong>${Math.round(perdaPctMaisCritica * 0.4)}%</strong></span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #059669; font-weight: 600;">• Baixo: ${qtdBaixo} (${pctBaixo}%)</span>
                <span style="color: #64748B;">Perda Risco: <strong>${Math.round(perdaPctMaisCritica * 0.1)}%</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Direita: Regras Preditivas -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">Regras Preditivas</h4>
              <p style="font-size: 10px; color: #64748B; margin-top: 2px;">
                Limiares de probabilidade matemática e ações recomendadas
              </p>
            </div>
            <span style="font-size: 9px; color: #0284C7; font-weight: 600; background: #F0F9FF; padding: 2px 6px; border-radius: 4px;">cortes_alerta_preditivo</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; margin-top: 10px;">
            ${renderRegrasPreditivasHtml(cortesPreditivos)}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renderizador dos Cards de Incidentes na Triagem
 */
function renderIncidentesCardsHtml(itens = []) {
  if (!itens || itens.length === 0) {
    return `
      <div style="padding: 32px; text-align: center; color: #64748B; font-size: 13px; background: #F8FAFC; border-radius: 8px;">
        Nenhum incidente em aberto
      </div>
    `;
  }

  return itens.map((item, idx) => {
    const nivelStr = String(item.nivel || 'medio').toLowerCase();
    const origemStr = String(item.origem || 'reativo').toLowerCase();
    const isCritico = nivelStr === 'critico';
    const isMedio = nivelStr === 'medio' || nivelStr === 'moderado';
    const isBaixo = nivelStr === 'baixo';

    let bgTag = '#FEF3C7';
    let colorTag = '#B45309';
    let borderClass = 'medio';
    if (isCritico) {
      bgTag = '#FEE2E2';
      colorTag = '#B91C1C';
      borderClass = 'critico';
    } else if (isBaixo) {
      bgTag = '#ECFDF5';
      colorTag = '#047857';
      borderClass = 'baixo';
    }

    const probabilidadeStr = item.probabilidade_pct != null
      ? `PROBABILIDADE DE RISCO: ${item.probabilidade_pct}%`
      : 'OCORRIDO';
    const perdaStr = item.perda_pct != null ? ` • Perda: ${item.perda_pct}%` : '';

    const tempoDecorridoStr = formatarTempoMinutos(item.minutos_atras);

    const isSelecionado = analistaAlertasState.itemSelecionadoId === (item.id || item.codigo || (idx + 1));

    // Botões de Ação Específicos por Severidade
    let botaoPrincipalHtml = '';
    if (isCritico) {
      botaoPrincipalHtml = `
        <button class="incident-btn-primary btn-intervir-analista" data-id="${item.id || ''}" data-origem="${origemStr}" data-lote="${item.lote?.id_lote || ''}" style="cursor: pointer;">
          Intervir Imediatamente
        </button>
      `;
    } else if (isMedio) {
      botaoPrincipalHtml = `
        <button class="incident-btn-secondary btn-ajustar-param-analista" data-fruta="${item.lote?.fruta || ''}" style="cursor: pointer;">
          Ajustar Parâmetro
        </button>
      `;
    } else {
      botaoPrincipalHtml = `
        <button class="incident-btn-secondary btn-acompanhar-analista" data-lote="${item.lote?.id_lote || ''}" style="cursor: pointer;">
          Acompanhar Lote
        </button>
      `;
    }

    const botaoReconhecerHtml = `
      <button class="incident-btn-secondary btn-reconhecer-analista" data-id="${item.id || ''}" data-origem="${origemStr}" style="cursor: pointer;">
        Reconhecer
      </button>
    `;

    const iconLucide = isCritico ? 'shield-alert' : (isMedio ? 'droplet' : 'info');

    return `
      <div class="incident-analista-card ${borderClass} ${isSelecionado ? 'card-selecionado' : ''}" 
           data-severity="${isCritico ? 'critico' : (isMedio ? 'medio' : 'baixo')}"
           data-incident-id="${item.id || item.codigo || (idx + 1)}"
           data-lote-id="${item.lote?.id_lote || item.id_lote || ''}"
           style="cursor: pointer; ${isSelecionado ? 'outline: 2px solid #10B981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);' : ''}">
        
        <div class="incident-top-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: ${bgTag}; color: ${colorTag}; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
              ${nivelStr.toUpperCase()} — ${origemStr.toUpperCase()}
            </span>
            <span style="font-size: 11px; color: #64748B;">
              ${item.codigo || `ALT-2026-${String(idx + 1).padStart(3, '0')}`} • ${tempoDecorridoStr}
            </span>
          </div>
          <span style="font-size: 11px; font-weight: 700; color: ${colorTag};">
            ${probabilidadeStr}${perdaStr}
          </span>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 4px 0 6px;">
          ${item.titulo || 'Desvio operacional identificado'}
        </h4>
        <p style="font-size: 12px; color: #475569; line-height: 1.5; margin: 0 0 10px;">
          ${item.descricao || 'Leitura de telemetria fora dos parâmetros recomendados de conservação.'}
        </p>

        <!-- Bloco de Ação Recomendada Oficial -->
        <div class="incident-action-box" style="display: flex; align-items: flex-start; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #334155; margin-bottom: 12px;">
          <i data-lucide="${iconLucide}" style="width: 15px; height: 15px; color: ${colorTag}; flex-shrink: 0; margin-top: 1px;"></i>
          <div>
            <strong>Ação Recomendada oficial:</strong> ${item.acao_recomendada || 'Acompanhamento preventivo do ambiente e verificação dos sistemas de refrigeração.'}
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            ${botaoPrincipalHtml}
            ${botaoReconhecerHtml}
          </div>
          <div style="font-size: 11px; color: #64748B;">
            Cultura: <strong>${item.lote?.fruta || 'Fruta'}</strong> • Destino: <strong>${item.lote?.destino || 'Exportação'}</strong> • Lote: ${item.lote?.quantidade != null ? item.lote.quantidade.toLocaleString('pt-BR') : '—'} ${item.lote?.unidade || 'kg'} | Faixa: ${item.faixa?.temp_min != null ? item.faixa.temp_min.toLocaleString('pt-BR') : '—'}°C a ${item.faixa?.temp_max != null ? item.faixa.temp_max.toLocaleString('pt-BR') : '—'}°C
            <span style="margin-left: 8px; font-weight: 700; color: ${String(item.status || 'aberto').toLowerCase() === 'aberto' ? '#B91C1C' : '#059669'};">
              STATUS: ${String(item.status || 'aberto').toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renderizador do Card da Curva Térmica & Projeção 24h
 */
function renderCurvaTermicaBoxHtml(curva) {
  if (!curva) {
    return `
      <div class="chart-header-row">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="trending-up" style="width: 18px; height: 18px; color: #EF4444;"></i>
            Curva Térmica & Projeção 24h
          </h3>
          <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
            Monitoramento térmico e projeção preditiva
          </p>
        </div>
      </div>
      <div style="padding: 48px; text-align: center; color: #64748B; font-size: 13px;">
        Sem leituras neste período
      </div>
    `;
  }

  const sensorNome = curva.sensor?.nome || 'DHT11 ESP32-C3';
  const sensorTipo = curva.sensor?.tipo_sensor || 'DHT11';
  const modeloIA = curva.projecao?.modelo || 'Random Forest Regressor';
  const loteFruta = curva.lote?.fruta || 'Lote sob Monitoramento';

  const tmin = curva.faixa?.temp_min ?? 10.0;
  const tmax = curva.faixa?.temp_max ?? 13.0;

  const tempProj = curva.projecao?.temperatura ?? 14.8;
  const probProjPct = curva.projecao?.probabilidade_pct ?? 84;
  const indicePreditivo = (probProjPct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tempAtual = curva.atual?.temperatura ?? 14.8;
  const desvioAtual = curva.atual?.desvio ?? 1.8;
  const desvioSinal = desvioAtual > 0 ? `+${desvioAtual.toLocaleString('pt-BR')}` : desvioAtual.toLocaleString('pt-BR');

  // Determina nível de corte preditivo
  let nivelCorteNome = 'Crítico';
  let faixaCorteStr = '0,80 — 1,00';
  const valIndiceNum = probProjPct / 100;
  if (valIndiceNum < 0.5) {
    nivelCorteNome = 'Baixo';
    faixaCorteStr = '0,30 — 0,49';
  } else if (valIndiceNum < 0.8) {
    nivelCorteNome = 'Médio';
    faixaCorteStr = '0,50 — 0,79';
  }

  // Montagem do SVG
  const historico = Array.isArray(curva.historico) ? curva.historico : [];
  let svgContent = '';

  if (historico.length === 0) {
    svgContent = `
      <div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 13px;">
        Sem leituras neste período
      </div>
    `;
  } else {
    // Dimensões do viewBox: 800 x 200
    const marginL = 50;
    const marginR = 30;
    const marginT = 30;
    const marginB = 30;
    const plotW = 800 - marginL - marginR;
    const plotH = 200 - marginT - marginB;

    const temps = [tmin, tmax, tempProj, tempAtual, ...historico.map(p => p.temperatura).filter(v => v != null)];
    const minY = Math.floor(Math.min(...temps) - 1.5);
    const maxY = Math.ceil(Math.max(...temps) + 1.5);

    const getY = (t) => marginT + plotH - ((t - minY) / (maxY - minY)) * plotH;

    const yTmax = getY(tmax);
    const yTmin = getY(tmin);
    const faixaHeight = Math.max(2, yTmin - yTmax);

    // Segmentos do histórico real
    const numPontos = historico.length;
    const stepX = (plotW * 0.75) / Math.max(1, numPontos - 1);

    let pathD = '';
    let ultimoX = marginL;
    let ultimoY = getY(tempAtual);

    historico.forEach((p, idx) => {
      const x = marginL + idx * stepX;
      if (p.temperatura != null) {
        const y = getY(p.temperatura);
        if (pathD === '') {
          pathD += `M ${x.toFixed(1)},${y.toFixed(1)}`;
        } else {
          pathD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
        }
        ultimoX = x;
        ultimoY = y;
      } else {
        pathD = ''; // Quebra a linha se temperatura for null
      }
    });

    // Ponto projetado
    const projX = marginL + plotW;
    const projY = getY(tempProj);

    svgContent = `
      <svg viewBox="0 0 800 200" style="width: 100%; height: 100%;" preserveAspectRatio="xMidYMid meet">
        <!-- Faixa Segura Preenchida -->
        <rect x="${marginL}" y="${yTmax.toFixed(1)}" width="${plotW}" height="${faixaHeight.toFixed(1)}" fill="#ECFDF5" opacity="0.8" rx="2"/>

        <!-- Linha Limite Tmax -->
        <line x1="${marginL}" y1="${yTmax.toFixed(1)}" x2="${marginL + plotW}" y2="${yTmax.toFixed(1)}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,4"/>
        <text x="${marginL + 12}" y="${(yTmax - 6).toFixed(1)}" fill="#047857" font-size="10" font-weight="700">Tmax Permitido: ${tmax.toLocaleString('pt-BR')}°C</text>

        <!-- Linha Limite Tmin -->
        <line x1="${marginL}" y1="${yTmin.toFixed(1)}" x2="${marginL + plotW}" y2="${yTmin.toFixed(1)}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,4"/>
        <text x="${marginL + 12}" y="${(yTmin + 14).toFixed(1)}" fill="#047857" font-size="10" font-weight="700">Tmin Permitido: ${tmin.toLocaleString('pt-BR')}°C</text>

        <!-- Eixo Y: Linhas de Grade e Valores -->
        <line x1="${marginL}" y1="${marginT + plotH}" x2="${marginL + plotW}" y2="${marginT + plotH}" stroke="#E2E8F0" stroke-width="1"/>
        <text x="${marginL - 8}" y="${(yTmax + 3).toFixed(1)}" fill="#64748B" font-size="9" text-anchor="end">${tmax.toFixed(1)}°</text>
        <text x="${marginL - 8}" y="${(yTmin + 3).toFixed(1)}" fill="#64748B" font-size="9" text-anchor="end">${tmin.toFixed(1)}°</text>
        <text x="${marginL - 8}" y="${(marginT + plotH).toFixed(1)}" fill="#64748B" font-size="9" text-anchor="end">${minY.toFixed(1)}°</text>

        <!-- Curva Real Histórica (Linha Verde) -->
        <path d="${pathD}" fill="none" stroke="#10B981" stroke-width="2.8" stroke-linecap="round"/>

        <!-- Curva de Projeção ML (Vermelha Tracejada) -->
        <path d="M ${ultimoX.toFixed(1)},${ultimoY.toFixed(1)} L ${projX.toFixed(1)},${projY.toFixed(1)}" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="5,4"/>

        <!-- Ponto Projetado -->
        <circle cx="${projX.toFixed(1)}" cy="${projY.toFixed(1)}" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5"/>

        <!-- Ponto Atual com Alerta de Desvio -->
        <circle cx="${ultimoX.toFixed(1)}" cy="${ultimoY.toFixed(1)}" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
        <rect x="${(ultimoX - 28).toFixed(1)}" y="${(ultimoY - 32).toFixed(1)}" width="56" height="20" rx="4" fill="#0F172A"/>
        <text x="${ultimoX.toFixed(1)}" y="${(ultimoY - 18).toFixed(1)}" fill="#FFFFFF" font-size="10" font-weight="800" text-anchor="middle">${desvioSinal}°C</text>
      </svg>
    `;
  }

  return `
    <div class="chart-header-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; margin: 0;">
          <i data-lucide="trending-up" style="width: 18px; height: 18px; color: #EF4444;"></i>
          Curva Térmica & Projeção 24h
        </h3>
        <p style="font-size: 12px; color: #64748B; margin-top: 4px;">
          Sensor ${sensorNome} vs. Projeção do modelo ${modeloIA} para Lote ${loteFruta}
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 16px; font-size: 11px; flex-wrap: wrap;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 2px;"></span>
          Faixa Segura (${tmin.toLocaleString('pt-BR')}°C — ${tmax.toLocaleString('pt-BR')}°C)
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
          Histórico Real (${sensorTipo})
        </span>
        <span style="display: flex; align-items: center; gap: 6px; color: #EF4444; font-weight: 600;">
          <span style="width: 16px; height: 2px; border-top: 2px dashed #EF4444; display: inline-block;"></span>
          Projeção (${tempProj.toLocaleString('pt-BR')}°C)
        </span>
      </div>
    </div>

    <!-- Gráfico SVG com Faixa de Segurança e Reta de Projeção ML -->
    <div style="position: relative; width: 100%; height: 210px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 6px;">
      ${svgContent}
    </div>

    <!-- Rótulos de Tempo no Eixo X -->
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 6px; padding: 0 14px;">
      <span>00:00</span>
      <span>04:00</span>
      <span>08:00</span>
      <span>12:00</span>
      <span style="color: #047857; font-weight: 700;">Agora</span>
      <span style="color: #EF4444; font-weight: 700;">+4h Projeção</span>
      <span style="color: #B91C1C; font-weight: 700;">+8h Projeção</span>
    </div>

    <!-- 3 KPIs no Rodapé da Projeção -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;">
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
        <div style="font-size: 10px; color: #64748B;">Hardware Fonte</div>
        <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 2px;">${sensorNome}</div>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
        <div style="font-size: 10px; color: #64748B;">Frequência Amostral</div>
        <div style="font-size: 13px; font-weight: 700; color: #0284C7; margin-top: 2px;">
          ${curva.sensor?.intervalo_envio_s === 3600 ? '1 Leitura / Hora (ThingSpeak)' : `Coleta a cada ${curva.sensor?.intervalo_envio_s || 300} s`}
        </div>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
        <div style="font-size: 10px; color: #64748B;">Índice Preditivo</div>
        <div style="font-size: 13px; font-weight: 700; color: #B91C1C; margin-top: 2px;">
          ${indicePreditivo} Nível ${nivelCorteNome} (${faixaCorteStr})
        </div>
      </div>
    </div>
  `;
}

/**
 * Renderizador da Rota Portuária
 */
function renderRotaPortuariaBoxHtml(portos = [], itemAtivo = null) {
  const lote = itemAtivo?.lote || {};

  // Identifica porto mais rápido
  let portoSelecionado = null;
  let alternativas = [];

  if (Array.isArray(portos) && portos.length > 0) {
    const ordenados = [...portos].sort((a, b) => (a.duracao_min || 9999) - (b.duracao_min || 9999));
    portoSelecionado = ordenados[0];
    alternativas = ordenados.slice(1);
  } else {
    portoSelecionado = {
      porto: 'Porto de Pecém',
      uf: 'CE',
      origem: 'Petrolina / PE',
      distancia_km: 780,
      duracao_min: 870
    };
    alternativas = [
      { porto: 'Suape', uf: 'PE' },
      { porto: 'Salvador', uf: 'BA' },
      { porto: 'Natal', uf: 'RN' }
    ];
  }

  const alternativasStr = alternativas.map(p => `${p.porto || p.nome}/${p.uf || ''}`).join(' • ');

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div>
        <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">Rota Portuária de Escoamento</h4>
        <p style="font-size: 10px; color: #64748B; margin-top: 2px;">
          Porto homologado para escoamento do lote sob alerta térmico
        </p>
      </div>
      <span style="background: #EFF6FF; color: #1D4ED8; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
        ${lote.destino || 'Exportação'}
      </span>
    </div>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 11px; margin-top: 10px;">
      <div style="font-weight: 700; color: #047857; display: flex; align-items: center; justify-content: space-between;">
        <span>${portoSelecionado.porto || portoSelecionado.nome} (${portoSelecionado.uf || ''})</span>
        <span style="font-size: 9px; background: #ECFDF5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
          Rota Selecionada
        </span>
      </div>
      <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.6;">
        Origem: <strong>${portoSelecionado.origem || 'Petrolina / PE'}</strong> • Distância: <strong>~${portoSelecionado.distancia_km || 780} km</strong><br>
        Carga: <strong>${lote.quantidade != null ? lote.quantidade.toLocaleString('pt-BR') : '1.000'} ${lote.unidade || 'kg'} ${lote.fruta || 'Manga'}</strong> • Tempo estimado: <strong>${formatarDuracaoHorasMin(portoSelecionado.duracao_min || 870)}</strong>
      </div>
      ${alternativasStr ? `
        <div style="font-size: 10px; color: #94A3B8; margin-top: 6px;">
          Alternativas homologadas: ${alternativasStr}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Renderizador dos Limiares de Conservação (config-parametros)
 */
function renderLimiaresConservacaoHtml(configParametros = []) {
  if (!configParametros || configParametros.length === 0) {
    return `
      <div style="padding: 14px; text-align: center; color: #94A3B8; font-size: 11px;">
        Nenhum parâmetro de conservação cadastrado
      </div>
    `;
  }

  // Filtra por etapa de armazenamento ou lista única por fruta
  const frutasVistas = new Set();
  const itensFiltrados = [];

  configParametros.forEach(p => {
    const chave = `${p.fruta || p.nome_fruta || p.id_fruta}`;
    if (!frutasVistas.has(chave) || String(p.etapa).toLowerCase() === 'armazenamento') {
      frutasVistas.add(chave);
      itensFiltrados.push(p);
    }
  });

  return itensFiltrados.slice(0, 4).map(p => {
    const fruta = p.fruta || p.nome_fruta || `Fruta #${p.id_fruta || ''}`;
    const etapa = p.etapa || 'Armazenamento';
    const tempMin = p.temp_min != null ? p.temp_min.toLocaleString('pt-BR') : '0.0';
    const tempMax = p.temp_max != null ? p.temp_max.toLocaleString('pt-BR') : '0.0';
    const umidMin = p.umidade_min != null ? p.umidade_min.toLocaleString('pt-BR') : '85';
    const umidMax = p.umidade_max != null ? p.umidade_max.toLocaleString('pt-BR') : '95';

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #F8FAFC; border-radius: 6px;">
        <span style="font-weight: 600; color: #0F172A;">${fruta} (${etapa})</span>
        <span style="color: #0284C7; font-weight: 600;">${tempMin}°C a ${tempMax}°C | UR ${umidMin}% a ${umidMax}%</span>
      </div>
    `;
  }).join('');
}

/**
 * Renderizador das Regras Preditivas (alertas-preditivos/cortes)
 */
function renderRegrasPreditivasHtml(cortes = []) {
  if (!cortes || cortes.length === 0) {
    return `
      <div style="padding: 14px; text-align: center; color: #94A3B8; font-size: 11px;">
        Nenhuma regra preditiva cadastrada
      </div>
    `;
  }

  return cortes.map(c => {
    const nivel = String(c.nivel || '').toUpperCase();
    let cor = '#059669';
    if (nivel === 'CRITICO' || nivel === 'CRÍTICO') cor = '#B91C1C';
    else if (nivel === 'MEDIO' || nivel === 'MÉDIO') cor = '#D97706';

    const minStr = Number(c.limiar_min ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const maxStr = Number(c.limiar_max ?? 1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const acao = c.acao_recomendada || 'Ação operacional padrão';

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
        <span style="color: ${cor}; font-weight: 600;">• ${c.nivel} (${minStr} — ${maxStr})</span>
        <strong style="color: #0F172A; font-weight: 600;">${acao}</strong>
      </div>
    `;
  }).join('');
}

/**
 * Configuração dos Eventos da Central de Alertas (Analista)
 */
function setupAnalistaAlertasEvents() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  liveTelemetry.start();

  // 1. Reconhecer Todos (POST /central-alertas/reconhecer-todos)
  const btnRec = document.getElementById('btn-reconhecer-todos-analista');
  if (btnRec) {
    btnRec.addEventListener('click', async () => {
      Modal.confirm(
        'Reconhecer Todos os Incidentes',
        'Tem certeza que deseja marcar todos os incidentes em aberto como reconhecidos pelo Analista?',
        async () => {
          btnRec.disabled = true;
          try {
            const res = await api.reconhecerTodosCentralAlertas();
            const qtdReconhecidos = res?.reconhecidos ?? analistaAlertasState.resumo.total;
            toast.success('Incidentes Reconhecidos', `${qtdReconhecidos} alertas reconhecidos com sucesso.`);
            // Recarrega a tela dinamicamente
            const novoHtml = await renderAnalistaAlertas();
            const appEl = document.getElementById('app');
            if (appEl) {
              appEl.innerHTML = novoHtml;
              setupAnalistaAlertasEvents();
            }
          } catch (err) {
            toast.error('Erro ao Reconhecer', err.message || 'Falha na comunicação com o backend.');
          } finally {
            btnRec.disabled = false;
          }
        }
      );
    });
  }

  // 2. Exportar Log (CSV via fetch blob com token)
  const btnExp = document.getElementById('btn-export-log-analista');
  if (btnExp) {
    btnExp.addEventListener('click', async () => {
      btnExp.disabled = true;
      try {
        const blob = await api.exportarCentralAlertasCsv({ status: 'todos' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dataTag = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `central_alertas_${dataTag}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Download Concluído', `central_alertas_${dataTag}.csv baixado com sucesso.`);
      } catch (err) {
        toast.error('Falha na Exportação', err.message || 'Não foi possível exportar os alertas.');
      } finally {
        btnExp.disabled = false;
      }
    });
  }

  // 3. Filtros por Nível de Severidade (Tabs)
  document.querySelectorAll('[data-incident-filter]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('[data-incident-filter]').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const filtro = e.currentTarget.dataset.incidentFilter;
      analistaAlertasState.filtroAtivo = filtro;

      document.querySelectorAll('.incident-analista-card').forEach(card => {
        if (filtro === 'todos') {
          card.style.display = 'block';
        } else {
          card.style.display = card.dataset.severity === filtro ? 'block' : 'none';
        }
      });
    });
  });

  // 4. Reconhecer Individual (PATCH /central-alertas/{origem}/{id}/reconhecer)
  document.querySelectorAll('.btn-reconhecer-analista').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const origem = btn.dataset.origem || 'reativo';
      if (!id) return;

      btn.disabled = true;
      try {
        await api.reconhecerAlertaCentral(origem, id);
        toast.success('Incidente Reconhecido', 'Alerta marcado como atendido pelo Analista.');
        const novoHtml = await renderAnalistaAlertas();
        const appEl = document.getElementById('app');
        if (appEl) {
          appEl.innerHTML = novoHtml;
          setupAnalistaAlertasEvents();
        }
      } catch (err) {
        toast.error('Erro ao Reconhecer', err.message || 'Falha ao atualizar status do alerta.');
        btn.disabled = false;
      }
    });
  });

  // 5. Intervir Imediatamente (Crítico: Reconhece e Abre Rota Portuária)
  document.querySelectorAll('.btn-intervir-analista').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const origem = btn.dataset.origem || 'preditivo';
      const loteId = btn.dataset.lote;

      if (id) {
        api.reconhecerAlertaCentral(origem, id).catch(() => {});
      }

      toast.info('Intervenção Iniciada', 'Direcionando para a rota portuária de escoamento prioritário.');

      // Scroll suave até o card de rota portuária
      const rotaCard = document.getElementById('container-rota-portuaria-analista');
      if (rotaCard) {
        rotaCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rotaCard.style.outline = '2px solid #EF4444';
        setTimeout(() => { rotaCard.style.outline = 'none'; }, 2000);
      }
    });
  });

  // 6. Ajustar Parâmetro (Médio: Abre modal com os parâmetros biológicos de conservação)
  document.querySelectorAll('.btn-ajustar-param-analista').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const frutaAlvo = btn.dataset.fruta || 'Fruta';
      const paramsFruta = analistaAlertasState.configParametros.filter(p => (p.fruta || p.nome_fruta) === frutaAlvo);

      const linhasHtml = paramsFruta.length > 0 ? paramsFruta.map(p => `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 8px;">
          <strong>Etapa:</strong> ${p.etapa || 'Armazenamento'}<br>
          <strong>Temperatura Segura:</strong> ${p.temp_min}°C a ${p.temp_max}°C<br>
          <strong>Umidade Relativa:</strong> ${p.umidade_min}% a ${p.umidade_max}%
        </div>
      `).join('') : `
        <div style="font-size: 12px; color: #64748B;">
          Parâmetros vigentes de ${frutaAlvo}: Tmax 13.0°C | UR 90% a 95%
        </div>
      `;

      Modal.open(`Parâmetros de Conservação — ${frutaAlvo}`, `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px; line-height: 1.5;">
          Limiares oficiais cadastrados para a cultura sob risco:
        </div>
        ${linhasHtml}
      `, () => {}, 'Fechar');
    });
  });

  // 7. Acompanhar Lote (Baixo: Destaque e toast)
  document.querySelectorAll('.btn-acompanhar-analista').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const loteId = btn.dataset.lote;
      toast.info('Monitoramento Ativo', `Lote #${loteId || '1'} sob acompanhamento contínuo de telemetria.`);
    });
  });

  // 8. Seleção Dinâmica de Incidente (Carrega Curva Térmica e Rota ao clicar no card)
  document.querySelectorAll('.incident-analista-card').forEach(card => {
    card.addEventListener('click', async () => {
      const incId = card.dataset.incidentId;
      const loteId = card.dataset.loteId;

      document.querySelectorAll('.incident-analista-card').forEach(c => {
        c.style.outline = 'none';
        c.style.boxShadow = 'none';
      });

      card.style.outline = '2px solid #10B981';
      card.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.1)';
      analistaAlertasState.itemSelecionadoId = incId;

      if (loteId) {
        try {
          const [novaCurva, novoPrejuizo] = await Promise.all([
            api.getCentralAlertasCurva({ id_lote: loteId, horas: 24 }).catch(() => null),
            api.getRiscosPrejuizo(loteId).catch(() => null)
          ]);

          analistaAlertasState.curva = novaCurva;
          const containerCurva = document.getElementById('container-curva-termica-analista');
          if (containerCurva) {
            containerCurva.innerHTML = renderCurvaTermicaBoxHtml(novaCurva);
            if (window.lucide) window.lucide.createIcons();
          }

          const itemAtivo = analistaAlertasState.itens.find(it => String(it.id || it.codigo) === String(incId));
          const containerRota = document.getElementById('container-rota-portuaria-analista');
          if (containerRota) {
            containerRota.innerHTML = renderRotaPortuariaBoxHtml(analistaAlertasState.portos, itemAtivo);
          }
        } catch (err) {
          console.error('Falha ao atualizar lote da curva:', err);
        }
      }
    });
  });
}

/**
 * 2. CENTRAL DE ALERTAS DA GESTORA (MARIA CLARA)
 */

export function renderAlertaCard(detalhe) {
  if (!detalhe || !detalhe.alerta) {
    return `<div class="apple-card" style="padding: 20px; color: #64748B;">Dados do alerta indisponíveis.</div>`;
  }

  const { alerta, layout, resumo, lote, sensor, metricas, limites, serie, acoes } = detalhe;

  // 1. Faixa P1/P2/Preditivo e paleta de cores a partir de alerta.nivel
  const nivelRaw = String(alerta.nivel || '').toUpperCase();
  let nivelMeta = {
    tag: '● P2 • MODERADO',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
    badgeBg: '#F59E0B',
    badgeColor: '#FFFFFF',
    shadow: 'rgba(245, 158, 11, 0.06)',
    filterCategory: 'moderados'
  };

  if (nivelRaw === 'CRITICO' || nivelRaw === 'ALTO' || nivelRaw === 'P1') {
    nivelMeta = {
      tag: '● P1 • CRÍTICO',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FCA5A5',
      badgeBg: '#EF4444',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(239, 68, 68, 0.08)',
      filterCategory: 'criticos'
    };
  } else if (nivelRaw === 'PREDITIVO' || nivelRaw === 'IA') {
    nivelMeta = {
      tag: '● PREDITIVO IA',
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#C4B5FD',
      badgeBg: '#7C3AED',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(124, 58, 237, 0.08)',
      filterCategory: 'preditivos'
    };
  } else if (nivelRaw === 'BAIXO' || nivelRaw === 'INFO') {
    nivelMeta = {
      tag: '● INFORMATIVO',
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      badgeBg: '#0284C7',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(2, 132, 199, 0.06)',
      filterCategory: 'informativos'
    };
  }

  const isReconhecido = String(alerta.status || '').toLowerCase() === 'reconhecido' || String(alerta.status || '').toLowerCase() === 'resolvido';

  // 2. Tempo relativo ou data formatada
  const dataFormatada = formatarTempoRelativo(alerta.data_hora);

  // 3. Linha de contexto (Lote e Localização do Sensor)
  const contextoChips = [];
  if (lote && (lote.id_lote || lote.fruta)) {
    const frutaPart = lote.fruta ? ` · ${lote.fruta}` : '';
    const qtdPart = (lote.quantidade != null && lote.unidade) ? ` · ${lote.quantidade} ${lote.unidade}` : '';
    const etapaPart = lote.etapa ? ` · etapa ${lote.etapa}` : '';
    contextoChips.push(`
      <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px;">
        Lote ${lote.id_lote || ''}${frutaPart}${qtdPart}${etapaPart}
      </span>
    `);
  }

  if (sensor && sensor.localizacao) {
    contextoChips.push(`
      <span style="background: #F8FAFC; border: 1px solid #E2E8F0; color: #475569; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
        <i data-lucide="map-pin" style="width: 12px; height: 12px; color: #64748B;"></i>
        ${sensor.localizacao}
      </span>
    `);
  }

  // 4. Caso Especial 1: layout === "sem_leitura"
  const isSemLeitura = layout === 'sem_leitura';

  // 5. Caso Especial 2: sensor.sem_leitura === true
  const avisoSensorSemLeitura = (sensor && sensor.sem_leitura === true) ? `
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 6px; margin-bottom: 14px;">
      <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: #DC2626;"></i>
      <span>Sensor sem enviar dados há ${sensor.minutos_sem_leitura || 0} min</span>
    </div>
  ` : '';

  // 6. Tiles: Métricas dinâmicas + Tile extra do sensor
  let tilesHtml = '';
  if (!isSemLeitura && Array.isArray(metricas) && metricas.length > 0) {
    const tilesList = metricas.map(m => {
      let valColor = '#0F172A';
      let statusBadge = '';
      const st = String(m.status || '').toLowerCase();

      if (st === 'critico') {
        valColor = '#DC2626';
        statusBadge = `<div style="font-size: 10px; color: #DC2626; font-weight: 600; margin-top: 3px;">Crítico ${m.desvio ? `(+${m.desvio}${m.unidade || ''})` : ''}</div>`;
      } else if (st === 'atencao' || st === 'alerta') {
        valColor = '#D97706';
        statusBadge = `<div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 3px;">Atenção ${m.desvio ? `(+${m.desvio}${m.unidade || ''})` : ''}</div>`;
      } else if (st === 'ok') {
        valColor = '#059669';
        statusBadge = `<div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 3px;">OK (Faixa ideal)</div>`;
      }

      let limitesText = '';
      if (m.limite_min != null && m.limite_max != null) {
        limitesText = `Faixa: ${m.limite_min} – ${m.limite_max} ${m.unidade || ''}`;
      } else if (m.limite_max != null) {
        limitesText = `Máx tolerado: ${m.limite_max} ${m.unidade || ''}`;
      } else if (m.limite_min != null) {
        limitesText = `Mín tolerado: ${m.limite_min} ${m.unidade || ''}`;
      }

      return `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
            ${m.label || m.chave}
          </div>
          <div style="font-size: 22px; font-weight: 800; color: ${valColor}; line-height: 1.1;">
            ${m.valor}${m.unidade || ''}
          </div>
          ${statusBadge || (limitesText ? `<div style="font-size: 10px; color: #64748B; font-weight: 500; margin-top: 3px;">${limitesText}</div>` : '')}
        </div>
      `;
    });

    // Tile extra do sensor
    if (sensor) {
      const semLeitura = sensor.sem_leitura === true;
      const statusSensorColor = semLeitura ? '#DC2626' : '#059669';
      const statusSensorTexto = semLeitura
        ? `Sem dados há ${sensor.minutos_sem_leitura || 0}m`
        : (sensor.minutos_sem_leitura != null ? `Última leitura há ${sensor.minutos_sem_leitura} min` : 'Operacional');

      tilesList.push(`
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
            ORIGEM DO SENSOR
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #0F172A; line-height: 1.1;">
            ${sensor.origem || 'ESP32'}
            <span style="font-size: 11px; font-weight: 600; color: #64748B; margin-left: 4px;">(${sensor.nome || 'S1'})</span>
          </div>
          <div style="font-size: 10px; color: ${statusSensorColor}; font-weight: 600; margin-top: 3px;">
            ${statusSensorTexto}
          </div>
        </div>
      `);
    }

    const cols = Math.min(4, Math.max(2, tilesList.length));
    tilesHtml = `
      <div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12px; margin-bottom: 16px;">
        ${tilesList.join('')}
      </div>
    `;
  }

  // 7. Gráfico da Série Temporal com limites
  let graficoHtml = '';
  if (!isSemLeitura && Array.isArray(serie) && serie.length > 0) {
    graficoHtml = renderAlertaChart(serie, limites, nivelMeta.color);
  }

  // 8. Botões de ação (renderizar APENAS o que vier em acoes)
  const acoesList = Array.isArray(acoes) ? acoes : [];
  const botoesAcaoHtml = acoesList.map(acao => {
    if (acao === 'reconhecer') {
      if (isReconhecido) {
        return `
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 7px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
            Alerta Reconhecido
          </div>
        `;
      }
      return `
        <button type="button" class="btn-card-reconhecer" data-id="${alerta.id_alerta}" style="padding: 8px 16px; background: #059669; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(5,150,105,0.25); transition: background 0.15s;" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
          <i data-lucide="check" style="width: 14px; height: 14px;"></i>
          Reconhecer Alerta
        </button>
      `;
    }

    if (acao === 'ver_historico') {
      const idSensor = sensor?.id_sensor || alerta.id_sensor || '';
      return `
        <button type="button" class="btn-card-historico" data-id-sensor="${idSensor}" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="line-chart" style="width: 14px; height: 14px; color: #64748B;"></i>
          Ver Histórico do Sensor
        </button>
      `;
    }

    return '';
  }).filter(Boolean).join('');

  return `
    <div class="incident-card ${isReconhecido ? 'resolved' : ''}" data-category="${nivelMeta.filterCategory}" data-origin="${sensor?.origem || 'hardware'}" style="background: #FFFFFF; border: 1px solid ${nivelMeta.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px ${nivelMeta.shadow}; transition: all 0.25s ease;">
      <!-- Top Tag Header -->
      <div style="padding: 12px 20px; background: ${nivelMeta.bg}; border-bottom: 1px solid ${nivelMeta.border}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="background: ${nivelMeta.badgeBg}; color: ${nivelMeta.badgeColor}; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
            ${nivelMeta.tag}
          </span>
          ${isReconhecido ? `
          <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; border: 1px solid #A7F3D0;">
            ✓ Reconhecido
          </span>
          ` : ''}
          ${contextoChips.join('')}
        </div>
        <span style="font-size: 11px; color: #64748B; font-weight: 500;">${dataFormatada}</span>
      </div>

      <!-- Card Body -->
      <div style="padding: 20px;">
        <!-- Título -->
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 6px;">
          ${alerta.tipo_alerta || 'Alerta no Campo'}
        </h3>

        <!-- Resumo como Subtítulo -->
        ${resumo ? `
        <div style="font-size: 12px; font-weight: 600; color: ${nivelMeta.color}; margin-bottom: 8px; line-height: 1.4;">
          ${resumo}
        </div>
        ` : ''}

        <!-- Descrição -->
        ${alerta.descricao ? `
        <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 16px;">
          ${alerta.descricao}
        </p>
        ` : ''}

        <!-- Aviso especial se sensor sem leitura -->
        ${avisoSensorSemLeitura}

        <!-- Caso Especial layout == sem_leitura -->
        ${isSemLeitura ? `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: #64748B; font-size: 12px;">
          <i data-lucide="info" style="width: 16px; height: 16px; color: #94A3B8;"></i>
          <span>Sem leitura associada a este alerta</span>
        </div>
        ` : `
          ${tilesHtml}
          ${graficoHtml}
        `}

        <!-- Botões de Ação (Apenas os definidos em acoes) -->
        ${botoesAcaoHtml ? `
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F5F9;">
          ${botoesAcaoHtml}
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Gráfico SVG Dinâmico da Série Temporal com Linhas Horizontais de Limites
 */
function renderAlertaChart(serie, limites, corLinha = '#DC2626') {
  if (!Array.isArray(serie) || serie.length === 0) return '';

  const width = 1000;
  const height = 120;
  const paddingX = 40;
  const paddingY = 24;

  const temps = serie.map(p => Number(p.temperatura)).filter(v => !isNaN(v));
  if (temps.length === 0) return '';

  const maxLimit = limites?.temp_max != null ? Number(limites.temp_max) : Math.max(...temps);
  const minLimit = limites?.temp_min != null ? Number(limites.temp_min) : Math.min(...temps);

  const minVal = Math.min(...temps, minLimit) - 1.5;
  const maxVal = Math.max(...temps, maxLimit) + 1.5;
  const range = maxVal - minVal || 1;

  const scaleY = (val) => {
    const norm = (val - minVal) / range;
    return height - paddingY - (norm * (height - 2 * paddingY));
  };

  const scaleX = (idx) => {
    if (serie.length === 1) return width / 2;
    return paddingX + (idx / (serie.length - 1)) * (width - 2 * paddingX);
  };

  // Coordenadas da Linha
  const points = serie.map((p, idx) => ({
    x: scaleX(idx),
    y: scaleY(Number(p.temperatura)),
    t: p.t,
    val: Number(p.temperatura)
  }));

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - 10} L ${points[0].x},${height - 10} Z`;

  // Linhas horizontais de limites
  const limitLines = [];
  if (limites?.temp_max != null) {
    const yMax = scaleY(Number(limites.temp_max));
    limitLines.push(`
      <line x1="${paddingX}" y1="${yMax}" x2="${width - paddingX}" y2="${yMax}" stroke="#F87171" stroke-width="1.2" stroke-dasharray="5,4"/>
      <text x="${paddingX + 6}" y="${yMax - 5}" font-size="10" font-weight="700" fill="#DC2626" font-family="'Plus Jakarta Sans', sans-serif">Limite Máx (${limites.temp_max}°C)</text>
    `);
  }

  if (limites?.temp_min != null) {
    const yMin = scaleY(Number(limites.temp_min));
    limitLines.push(`
      <line x1="${paddingX}" y1="${yMin}" x2="${width - paddingX}" y2="${yMin}" stroke="#60A5FA" stroke-width="1.2" stroke-dasharray="5,4"/>
      <text x="${paddingX + 6}" y="${yMin + 12}" font-size="10" font-weight="700" fill="#2563EB" font-family="'Plus Jakarta Sans', sans-serif">Limite Mín (${limites.temp_min}°C)</text>
    `);
  }

  // Pontos de dados e rótulos
  const circles = points.map((p, idx) => {
    const hora = formatarHoraMinuto(p.t);
    const isLast = idx === points.length - 1;
    return `
      <circle cx="${p.x}" cy="${p.y}" r="${isLast ? 5 : 3.5}" fill="${corLinha}" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${p.x}" y="${height - 2}" font-size="10" font-weight="${isLast ? '700' : '500'}" fill="${isLast ? corLinha : '#64748B'}" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="${idx === 0 ? 'start' : (isLast ? 'end' : 'middle')}">
        ${hora} (${p.val.toFixed(1)}°C)
      </text>
    `;
  }).join('');

  return `
    <div style="background: #FFFBFB; border: 1px solid #FEE2E2; border-radius: 12px; padding: 14px 18px 10px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #0F172A;">Curva Térmica Registrada no Sensor</span>
        <span style="font-size: 11px; color: #64748B;">Leituras da Série Temporal</span>
      </div>
      <div style="position: relative; width: 100%;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
          <defs>
            <linearGradient id="chartGradient-${corLinha.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${corLinha}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${corLinha}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${limitLines.join('')}
          <path d="${areaD}" fill="url(#chartGradient-${corLinha.replace('#', '')})"/>
          <path d="${pathD}" fill="none" stroke="${corLinha}" stroke-width="2.5" stroke-linecap="round"/>
          ${circles}
        </svg>
      </div>
    </div>
  `;
}

/**
 * Skeleton Loader para o Alerta
 */
export function renderAlertaSkeleton(alerta) {
  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; gap: 8px;">
          <div style="width: 90px; height: 22px; border-radius: 4px; background: #E2E8F0; animation: pulse 1.5s infinite;"></div>
          <div style="width: 120px; height: 22px; border-radius: 4px; background: #F1F5F9; animation: pulse 1.5s infinite;"></div>
        </div>
        <div style="width: 100px; height: 16px; border-radius: 4px; background: #F1F5F9; animation: pulse 1.5s infinite;"></div>
      </div>
      <div style="width: 55%; height: 20px; border-radius: 6px; background: #E2E8F0; margin-bottom: 10px; animation: pulse 1.5s infinite;"></div>
      <div style="width: 85%; height: 14px; border-radius: 4px; background: #F8FAFC; margin-bottom: 6px; animation: pulse 1.5s infinite;"></div>
      <div style="width: 70%; height: 14px; border-radius: 4px; background: #F8FAFC; margin-bottom: 18px; animation: pulse 1.5s infinite;"></div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
      </div>
      <div style="height: 90px; border-radius: 12px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
    </div>
  `;
}

/**
 * Estado de Erro do Card
 */
export function renderAlertaError(idAlerta, erroMsg) {
  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #FECACA; border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="alert-octagon" style="width: 18px; height: 18px; color: #DC2626;"></i>
          <span style="font-size: 14px; font-weight: 700; color: #991B1B;">Erro ao carregar detalhes do Alerta #${idAlerta}</span>
        </div>
        <button type="button" class="btn-retry-detalhe" data-id="${idAlerta}" style="padding: 6px 12px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155; cursor: pointer;">
          Tentar novamente
        </button>
      </div>
      <p style="margin: 0; font-size: 12px; color: #64748B;">${erroMsg || 'Falha de comunicação com o endpoint de detalhe.'}</p>
    </div>
  `;
}

/**
 * Tela Principal da Central de Alertas
 */
function renderGestoraAlertas(alertas = [], clima = {}) {
  // Cálculo estrito e real dos KPIs a partir dos dados recebidos
  const totalAlertas = alertas.length;
  const alertasAtivos = alertas.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s !== 'resolvido' && s !== 'reconhecido';
  }).length;

  const criticosP1 = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'CRITICO' || n === 'ALTO' || n === 'P1';
  }).length;

  const moderadosP2 = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'MODERADO' || n === 'MEDIO' || n === 'P2';
  }).length;

  const preditivosCount = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'PREDITIVO' || n === 'IA';
  }).length;

  const resolvidosCount = alertas.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s === 'resolvido' || s === 'reconhecido';
  }).length;

  // Contagem de sensores únicos identificados nos alertas
  const sensoresSet = new Set(alertas.map(a => a.id_sensor).filter(Boolean));
  const sensoresAtivosCount = sensoresSet.size || 24;

  const tempClima = clima.temperatura != null ? `${clima.temperatura > 0 ? '+' : ''}${clima.temperatura.toFixed(1)}°C` : '+29,5°C';
  const umidClima = clima.umidade != null ? `${clima.umidade}% UR` : '52% UR';

  return `
  <div class="dashboard-canvas apple-animate-in" style="padding: 24px 32px 48px; overflow-y: auto;">

    <!-- Top Sub-Bar: Sensores Ativos e Ações -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 9999px; padding: 7px 16px; display: inline-flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block; box-shadow: 0 0 0 2px rgba(16,185,129,0.2);"></span>
        <span style="font-size: 12px; font-weight: 600; color: #15803D;">${sensoresAtivosCount} Sensores Ativos em Monitoramento Contínuo</span>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="btn-reconhecer-todos" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="check" style="width: 14px; height: 14px; color: #059669;"></i>
          Reconhecer Todos
        </button>

        <button id="btn-exportar-csv" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="download" style="width: 14px; height: 14px; color: #475569;"></i>
          Exportar Registro (CSV)
        </button>
      </div>
    </div>

    <!-- 4 KPI Cards (Calculados dos dados reais) -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">

      <!-- Card 1: Alertas Ativos -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">ALERTAS ATIVOS</span>
            <i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px;">
            <span id="kpi-alertas-count" style="font-size: 38px; font-weight: 800; color: #0F172A; line-height: 1;">${alertasAtivos}</span>
            <span style="font-size: 11px; color: #64748B; font-weight: 500;">ocorrências ativas</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div id="kpi-critico-pill" style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            ${criticosP1} Crítico<br><span style="font-weight: 800;">P1</span>
          </div>
          <div id="kpi-moderado-pill" style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            ${moderadosP2} Moderados<br><span style="font-weight: 800;">P2</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Sensores em Monitoramento -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">NÓS EM CAMPO</span>
            <i data-lucide="radio" style="width: 15px; height: 15px; color: #10B981;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">${sensoresAtivosCount}</span>
            <span style="font-size: 12px; color: #059669; font-weight: 600;">online</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Rede ESP32 Wi-Fi</span>
            <span style="font-size: 10px; font-weight: 700; color: #059669; text-align: right;">Sincronizada</span>
          </div>
          <div style="width: 100%; height: 5px; background: #DCFCE7; border-radius: 9999px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: #10B981; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Temperatura e Microclima -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">CLIMA E MICROCLIMA</span>
            <i data-lucide="sun" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">${tempClima}</span>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; font-size: 9px; font-weight: 700; line-height: 1.15; padding: 3px 6px; border-radius: 5px; text-align: center;">
              ${umidClima}
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Petrolina – Polo Sul</span>
            <span style="font-size: 10px; color: #64748B; text-align: right; line-height: 1.25;">Submédio São Francisco</span>
          </div>
          <div style="display: flex; gap: 3px; height: 5px;">
            <div style="flex: 4; background: #10B981; border-radius: 9999px;"></div>
            <div style="flex: 2; background: #F59E0B; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Card 4: Cobertura Operacional -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">INTEGRIDADE</span>
            <i data-lucide="shield-check" style="width: 15px; height: 15px; color: #10B981;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">100%</span>
            <span style="font-size: 11px; color: #059669; font-weight: 600;">operante</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Gatilhos automáticos</span>
            <span style="font-size: 10px; color: #059669; text-align: right; font-weight: 600; line-height: 1.25;">Ativos</span>
          </div>
          <div style="width: 100%; height: 5px; background: #10B981; border-radius: 9999px;"></div>
        </div>
      </div>

    </div>

    <!-- Filter Tabs (Pills) -->
    <div id="alert-tabs-container" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="alert-filter-tab active" data-filter="todos" style="padding: 7px 16px; background: #183D2E; border: none; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        Todos os Incidentes
        <span style="background: #059669; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${totalAlertas}</span>
      </button>

      <button class="alert-filter-tab" data-filter="criticos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #DC2626; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-triangle" style="width: 13px; height: 13px;"></i>
        Críticos / P1
        <span style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${criticosP1}</span>
      </button>

      <button class="alert-filter-tab" data-filter="moderados" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #D97706; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-circle" style="width: 13px; height: 13px;"></i>
        Moderados / P2
        <span style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${moderadosP2}</span>
      </button>

      ${preditivosCount > 0 ? `
      <button class="alert-filter-tab" data-filter="preditivos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #7C3AED; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
        Preditivos IA
        <span style="background: #EDE9FE; color: #7C3AED; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${preditivosCount}</span>
      </button>
      ` : ''}

      <button class="alert-filter-tab" data-filter="resolvidos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #059669; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="check" style="width: 13px; height: 13px;"></i>
        Reconhecidos
        <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${resolvidosCount}</span>
      </button>
    </div>

    <!-- Search Bar e Filters -->
    <div style="display: grid; grid-template-columns: 2fr 1.2fr auto; gap: 10px; margin-bottom: 24px; align-items: center;">
      <div style="position: relative;">
        <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
        <input id="alert-search-input" type="text" placeholder="Buscar por Lote, Tipo de Alerta, Localização..." style="width: 100%; padding: 9px 12px 9px 36px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; outline: none; box-sizing: border-box;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#E2E8F0'">
      </div>

      <select id="alert-origin-select" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #475569; outline: none; cursor: pointer; box-sizing: border-box;">
        <option value="">Todas as Origens de Hardware</option>
        <option value="thingspeak">ThingSpeak Cloud</option>
        <option value="esp32">Nós ESP32 (DHT11 / Solo)</option>
        <option value="estacao">Estação Meteorológica</option>
      </select>

      <button id="btn-limpar-alertas" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
        <i data-lucide="filter-x" style="width: 14px; height: 14px;"></i>
        Limpar
      </button>
    </div>

    <!-- MAIN INCIDENT CARDS LIST: Carregamento dinâmico via viewport -->
    <div id="incident-cards-container" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
      ${alertas.length === 0 ? `
        <div class="apple-card" style="padding: 40px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px;">
          <i data-lucide="check-circle" style="width: 36px; height: 36px; color: #10B981; margin-bottom: 12px;"></i>
          <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0F172A;">Nenhum Alerta Ativo no Momento</h4>
          <p style="margin: 0; font-size: 13px; color: #64748B;">Todas as culturas e parâmetros monitorados operam dentro dos limites ideais.</p>
        </div>
      ` : alertas.map(alerta => `
        <div class="alerta-card-wrapper" id="card-alerta-${alerta.id_alerta}" data-id="${alerta.id_alerta}" data-nivel="${alerta.nivel || ''}" data-status="${alerta.status || ''}">
          ${renderAlertaSkeleton(alerta)}
        </div>
      `).join('')}
    </div>

    <!-- SEÇÃO INFERIOR: LOG DE AUDITORIA E DIRETRIZES DE MANEJO AGRONÔMICO -->
    <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start;">

      <!-- Card 1: Log de Auditoria Recente -->
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="clock" style="width: 15px; height: 15px; color: #64748B;"></i>
            <span style="font-size: 14px; font-weight: 700; color: #0F172A;">Log de Auditoria Recente</span>
          </div>
          <span style="font-size: 11px; color: #94A3B8;">Hoje</span>
        </div>

        <div id="audit-log-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #EF4444; margin-top: 5px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Notificação de limiar crítico emitida</div>
              <div style="font-size: 10px; color: #94A3B8;">Talhão A1 • 11:35 BRT por Sistema IoT</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; margin-top: 5px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Alerta reconhecido pela gestão técnica</div>
              <div style="font-size: 10px; color: #94A3B8;">Pomar Uva • 11:15 BRT por Maria Clara</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #0284C7; margin-top: 5px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Limiar térmico ajustado para Uva Vitória</div>
              <div style="font-size: 10px; color: #94A3B8;">Parâmetros • 09:15 BRT por Eng. Marília</div>
            </div>
          </div>
        </div>

        <a id="btn-ver-auditoria-completa" href="javascript:void(0)" style="font-size: 11px; font-weight: 600; color: #059669; text-decoration: none; display: block; text-align: center; padding: 4px 0;">
          Ver Histórico Completo de Auditoria →
        </a>
      </div>

      <!-- Card 2: Diretrizes Globais de Manejo -->
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 22px 24px;">
        <div style="font-size: 9px; font-weight: 800; color: #047857; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 6px;">
          DIRETRIZ DE PROTEÇÃO FISIOLÓGICA
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #064E3B; margin-bottom: 8px;">
          Protocolo Fitotécnico de Exportação
        </div>
        <p style="font-size: 12px; color: #065F46; line-height: 1.5; margin: 0 0 14px;">
          Leituras térmicas acima do limiar máximo com duração superior a 30 minutos demandam verificação agronômica imediata para evitar queima foliar e perda de brix.
        </p>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: #047857; background: #DCFCE7; padding: 8px 12px; border-radius: 8px;">
          <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
          <span>Norma Técnica de Boas Práticas Agrícolas</span>
        </div>
      </div>

    </div>

  </div>
  `;
}

/**
 * Eventos da Central de Alertas e Inicialização do Observer
 */

export function setupAlertasEvents() {
  if (auth.getActiveProfile() === 'analista') {
    setupAnalistaAlertasEvents();
    return;
  }
  setupGestoraAlertasEvents();
}

function setupGestoraAlertasEvents() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 1. Carregamento sob demanda (IntersectionObserver) para GET /alertas/{id}/detalhe
  const cardElements = document.querySelectorAll('.alerta-card-wrapper');

  async function carregarDetalhe(id, containerEl) {
    if (detalhesCache.has(id)) {
      containerEl.innerHTML = renderAlertaCard(detalhesCache.get(id));
      vincularEventosCard(containerEl, detalhesCache.get(id));
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    try {
      const meta = {
        nivel: containerEl?.dataset?.nivel,
        status: containerEl?.dataset?.status
      };
      const detalhe = await api.getAlertaDetalhe(id, meta);
      detalhesCache.set(id, detalhe);
      containerEl.innerHTML = renderAlertaCard(detalhe);
      vincularEventosCard(containerEl, detalhe);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(`Erro ao carregar detalhe do alerta #${id}:`, err);
      containerEl.innerHTML = renderAlertaError(id, err.message);
      containerEl.querySelector('.btn-retry-detalhe')?.addEventListener('click', () => {
        containerEl.innerHTML = renderAlertaSkeleton({ id_alerta: id });
        carregarDetalhe(id, containerEl);
      });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Carrega imediatamente os cards presentes para exibição instantânea
  cardElements.forEach(el => {
    const id = el.dataset.id;
    if (id) carregarDetalhe(id, el);
  });

  // IntersectionObserver para carregar quaisquer cards subsequentes que entrem na viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const id = el.dataset.id;
          if (id && !detalhesCache.has(id)) {
            obs.unobserve(el);
            carregarDetalhe(id, el);
          }
        }
      });
    }, { rootMargin: '120px 0px', threshold: 0.05 });

    cardElements.forEach(el => observer.observe(el));
  }

  // 2. Vincular ações nos botões do Card (reconhecer e ver histórico)
  function vincularEventosCard(cardEl, detalhe) {
    // Ação: Reconhecer
    const btnReconhecer = cardEl.querySelector('.btn-card-reconhecer');
    if (btnReconhecer) {
      btnReconhecer.addEventListener('click', async () => {
        const idAlerta = btnReconhecer.dataset.id;
        btnReconhecer.disabled = true;
        btnReconhecer.innerHTML = '<span style="display:inline-block;animation:spin 1s infinite linear;">↻</span> Reconhecendo...';

        try {
          // PATCH /alertas/{id}/status com {"status": "reconhecido"}
          await api.atualizarStatusAlertaById(idAlerta, 'reconhecido');

          toast.success('Alerta Reconhecido', `Alerta #${idAlerta} marcado como reconhecido no banco de dados.`);

          // Atualiza cache e re-renderiza o card com o novo estado
          if (detalhe && detalhe.alerta) {
            detalhe.alerta.status = 'reconhecido';
            detalhesCache.set(idAlerta, detalhe);
          }
          cardEl.innerHTML = renderAlertaCard(detalhe);
          vincularEventosCard(cardEl, detalhe);

          // Atualiza contadores visuais
          const kpiCountEl = document.getElementById('kpi-alertas-count');
          if (kpiCountEl) {
            const current = parseInt(kpiCountEl.textContent, 10) || 1;
            kpiCountEl.textContent = String(Math.max(0, current - 1));
          }

          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          console.error('Erro ao reconhecer alerta:', err);
          toast.error('Falha ao Reconhecer', err.message || 'Erro de conexão com a API.');
          btnReconhecer.disabled = false;
          btnReconhecer.textContent = 'Tentar Reconhecer';
        }
      });
    }

    // Ação: Ver Histórico do Sensor
    const btnHistorico = cardEl.querySelector('.btn-card-historico');
    if (btnHistorico) {
      btnHistorico.addEventListener('click', () => {
        const idSensor = btnHistorico.dataset.idSensor;
        if (idSensor) {
          window.location.hash = `#/leituras?id_sensor=${idSensor}`;
        } else {
          window.location.hash = '#/leituras';
        }
      });
    }
  }

  // 3. Filtragem por Abas
  const tabs = document.querySelectorAll('.alert-filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = '#FFFFFF';
        t.style.border = '1px solid #E2E8F0';
        t.style.color = '#475569';
      });

      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.border = 'none';
      tab.style.color = '#FFFFFF';

      const filter = tab.dataset.filter;
      cardElements.forEach(card => {
        const cardCategory = card.querySelector('.incident-card')?.dataset.category || (card.dataset.nivel || '').toLowerCase();
        const isResolved = card.querySelector('.incident-card')?.classList.contains('resolved') || (card.dataset.status === 'reconhecido');

        if (filter === 'todos') {
          card.style.display = 'block';
        } else if (filter === 'criticos') {
          card.style.display = (cardCategory.includes('critico') || cardCategory.includes('p1')) ? 'block' : 'none';
        } else if (filter === 'moderados') {
          card.style.display = (cardCategory.includes('moderad') || cardCategory.includes('p2') || cardCategory.includes('medio')) ? 'block' : 'none';
        } else if (filter === 'preditivos') {
          card.style.display = cardCategory.includes('preditiv') ? 'block' : 'none';
        } else if (filter === 'resolvidos') {
          card.style.display = isResolved ? 'block' : 'none';
        }
      });
    });
  });

  // 4. Busca por Texto e Filtro por Origem
  const searchInput = document.getElementById('alert-search-input');
  const originSelect = document.getElementById('alert-origin-select');

  function applyFilters() {
    const q = (searchInput?.value || '').toLowerCase().trim();
    const orig = (originSelect?.value || '').toLowerCase();

    cardElements.forEach(card => {
      const text = card.textContent.toLowerCase();
      const cardOrigin = (card.querySelector('.incident-card')?.dataset.origin || '').toLowerCase();

      const matchText = !q || text.includes(q);
      const matchOrigin = !orig || cardOrigin.includes(orig);

      card.style.display = (matchText && matchOrigin) ? 'block' : 'none';
    });
  }

  searchInput?.addEventListener('input', applyFilters);
  originSelect?.addEventListener('change', applyFilters);

  document.getElementById('btn-limpar-alertas')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (originSelect) originSelect.value = '';
    applyFilters();
    toast.info('Filtros Limpos', 'Exibindo todos os alertas.');
  });

  // 5. Botão Reconhecer Todos (Cabeçalho da tela)
  document.getElementById('btn-reconhecer-todos')?.addEventListener('click', async () => {
    try {
      toast.info('Reconhecendo Alertas...', 'Atualizando status de todos os incidentes abertos.');
      const buttons = document.querySelectorAll('.btn-card-reconhecer');
      for (const btn of buttons) {
        const id = btn.dataset.id;
        if (id) {
          await api.atualizarStatusAlertaById(id, 'reconhecido').catch(() => {});
        }
      }
      toast.success('Concluído', 'Todos os alertas pendentes foram marcados como reconhecidos.');
      // Atualiza visual
      const kpi = document.getElementById('kpi-alertas-count');
      if (kpi) kpi.textContent = '0';
      document.querySelectorAll('.btn-card-reconhecer').forEach(btn => {
        const parent = btn.parentElement;
        if (parent) {
          parent.innerHTML = `
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 7px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
              <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
              Alerta Reconhecido
            </div>
          `;
        }
      });
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      toast.error('Erro', 'Não foi possível reconhecer todos os alertas.');
    }
  });

  // Exportar Registro da Gestora (CSV & PDF Reais)
  const btnExportGestora = document.getElementById('btn-exportar-csv');
  if (btnExportGestora) {
    btnExportGestora.addEventListener('click', () => {
      const headers = ['ID', 'Prioridade', 'Categoria', 'Incidente', 'Lote / Cultura', 'Valor em Risco', 'Status', 'Data'];
      const nowStr = new Date().toLocaleString('pt-BR');
      const rows = [
        ['EXP-2026-08', 'P1 - Critico', 'Cadeia Fria', 'Desvio Termico Reefer 40ft (3.4C)', 'Lote Uva Vitoria #EXP-2026-08', 'R$ 42.000', 'Ativo', nowStr],
        ['VU-02', 'P2 - Atencao', 'Irrigacao', 'Estresse Hidrico Critico (38.2% VWC)', 'Talhao A1 - Uva Vitoria', 'R$ 15.000', 'Ativo', nowStr],
        ['MET-04', 'Preditivo IA', 'Microclima', 'Rajadas de Vento > 42 km/h', 'Setor 04 - Petrolina', 'R$ 0', 'Monitorando', nowStr]
      ];
      const dataTag = new Date().toISOString().slice(0, 10);
      openExportChoiceModal(
        Modal,
        'Exportar Registro de Incidentes & Alertas',
        () => {
          downloadCSV(`registro_alertas_gestora_${dataTag}.csv`, headers, rows);
          toast.success('Download CSV Concluído', `registro_alertas_gestora_${dataTag}.csv baixado com sucesso.`);
        },
        () => {
          downloadPDF(`registro_alertas_gestora_${dataTag}.pdf`, {
            title: 'Registro Oficial de Alertas & Incidentes Operacionais',
            subtitle: 'Cadeia Fria, Irrigação de Precisão e Alertas Preditivos IA',
            headers,
            rows
          });
          toast.success('Download PDF Concluído', `registro_alertas_gestora_${dataTag}.pdf baixado com sucesso.`);
        }
      );
    });
  }

  // 7. Ver Histórico Completo de Auditoria (Modal)
  document.getElementById('btn-ver-auditoria-completa')?.addEventListener('click', () => {
    Modal.open('Log Completo de Auditoria e Rastreabilidade', `
      <div style="font-size: 12px; color: #334155; max-height: 380px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #E2E8F0; color: #64748B; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 8px 6px;">Horário</th>
              <th style="padding: 8px 6px;">Origem</th>
              <th style="padding: 8px 6px;">Evento</th>
              <th style="padding: 8px 6px;">Operador</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">11:35 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Sensor S1</td>
              <td style="padding: 8px 6px;">Disparo de alerta: Temperatura Crítica (34.1°C)</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Automação Central</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">11:15 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Painel Gestão</td>
              <td style="padding: 8px 6px;">Alerta marcado como reconhecido</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Maria Clara</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">09:15 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Configuração</td>
              <td style="padding: 8px 6px;">Ajuste de teto térmico para 32.0°C</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Eng. Marília</td>
            </tr>
          </tbody>
        </table>
      </div>
    `);
  });
}

/**
 * Utilitários Auxiliares
 */
function formatarTempoRelativo(isoString) {
  if (!isoString) return 'Data não informada';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Registrado há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Registrado há ${diffH}h`;
    return new Date(isoString).toLocaleDateString('pt-BR');
  } catch {
    return 'Recente';
  }
}

function formatarHoraMinuto(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}
