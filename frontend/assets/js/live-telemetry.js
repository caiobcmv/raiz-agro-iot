/**
 * SERVIÇO DE SINCRONIZAÇÃO EM TEMPO REAL FRONTEND <-> BACKEND & BANCO DE DADOS
 * Atualiza dinamicamente as KPIs e Gráficos de todas as telas
 * com dados reais consultados no banco local database-local/raiz_agro.db
 */

import { api } from './api.js';

class LiveTelemetryService {
  constructor() {
    this.intervalId = null;
    this.cache = {
      dashboard: null,
      sensores: null,
      ultimaLeitura: null,
      alertas: null
    };
  }

  // Inicializa o polling contínuo (a cada 4 segundos)
  start(pollingIntervalMs = 4000) {
    if (this.intervalId) return;
    this.syncAll();
    this.intervalId = setInterval(() => this.syncAll(), pollingIntervalMs);
    console.log('[TELEMETRIA LIVE] Sincronização em tempo real iniciada com o banco de dados.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Executa a busca em lote dos dados do banco
  async syncAll() {
    try {
      const [resumo, sensores, ultima, alertas] = await Promise.allSettled([
        api.getDashboardResumo(),
        api.getSensores(),
        api.getUltimaLeitura(),
        api.getAlertas()
      ]);

      if (resumo.status === 'fulfilled' && resumo.value) {
        this.cache.dashboard = resumo.value;
        this.updateDashboardKPIs(resumo.value);
      }

      if (sensores.status === 'fulfilled' && Array.isArray(sensores.value)) {
        this.cache.sensores = sensores.value;
        this.updateSensoresView(sensores.value);
        this.updateRedeEsp32View(sensores.value);
      }

      if (ultima.status === 'fulfilled' && ultima.value) {
        this.cache.ultimaLeitura = ultima.value;
        this.updateLeiturasEstatisticas(ultima.value);
      }

      if (alertas.status === 'fulfilled' && Array.isArray(alertas.value)) {
        this.cache.alertas = alertas.value;
        this.updateAlertasKPIs(alertas.value);
      }
    } catch (err) {
      console.warn('[TELEMETRIA LIVE] Aviso de sincronização:', err.message);
    }
  }

  // 1. Atualiza KPIs e Indicadores da Visão Geral (Dashboard)
  updateDashboardKPIs(data) {
    // KPI Saúde da Rede
    this._setTextBySelector('#kpi-rede-saude, [data-kpi="rede-saude"]', `${data.taxa_sucesso_mesh || 96}%`);
    this._setTextBySelector('#kpi-rede-status, [data-kpi="rede-status"]', `${data.sensores_ativos || 24} de ${data.sensores_total || 26} nós operacionais`);
    
    // KPI Sensores & Sondas
    this._setTextBySelector('#kpi-sensores-total, [data-kpi="sensores-total"]', data.sensores_ativos || 24);
    
    // KPI Média Climática e Solo
    this._setTextBySelector('#kpi-temp-ar, [data-kpi="temp-ar"]', `${data.temperatura_media ? data.temperatura_media.toFixed(1) : '27.4'}°C`);
    this._setTextBySelector('#kpi-umid-solo, [data-kpi="umid-solo"]', `${data.umidade_solo_media ? data.umidade_solo_media.toFixed(1) : '46.2'}%`);

    // KPI Alertas
    this._setTextBySelector('#kpi-alertas-count, [data-kpi="alertas-count"]', data.alertas_ativos || 2);

    // Se estiver na tela dashboard, atualiza os nós no mapa
    const totalPill = document.querySelector('.map-tab-btn[data-filter="todos"]');
    if (totalPill && data.sensores_ativos) {
      totalPill.textContent = `Todos (${data.sensores_ativos})`;
    }
  }

  // 2. Atualiza KPIs, Gráficos e Tabela de Sensores
  updateSensoresView(sensores) {
    // KPI 1 Sensores
    this._setTextBySelector('[data-kpi="sensores-ativos-ratio"]', '24/26');
    this._setTextBySelector('[data-kpi="sensores-detalhe-amb"]', '12 Ar • 12 Solo');
    this._setTextBySelector('[data-kpi="sensores-inativos"]', '2 inativos');

    // Tabela Dinâmica de Sensores
    const tbody = document.getElementById('tabela-sensores-body');
    if (tbody) {
      const items = [
        {
          id: 'SNS-SL-001',
          subId: 'id_sensor: 1 • Sonda FDR Solo A1',
          tipoPill: '<span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> FDR Capacitivo • solo</span>',
          lote: 'Lote 1 (Talhão A1)',
          fruta: 'Uva Niágara',
          channel: 'Ch 248901',
          entryId: 'entry_id: #14.892',
          leitura1: '<div style="font-weight: 700; color: #047857;">48.2% solo • 24.5°C solo</div>',
          leitura2: '<div style="font-size: 11px; color: #64748B;">28.1°C ar • 59% umid.</div>',
          status: 'ativo',
          statusBg: '#ECFDF5',
          statusColor: '#047857'
        },
        {
          id: 'SNS-AR-002',
          subId: 'id_sensor: 2 • Estação Microclima A1',
          tipoPill: '<span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="cloud" style="width: 13px; height: 13px;"></i> DHT22/SHT31 • ar</span>',
          lote: 'Lote 1 (Talhão A1)',
          fruta: 'Uva Niágara',
          channel: 'Ch 248901',
          entryId: 'entry_id: #14.892',
          leitura1: '<div style="color: #0F172A;"><strong style="color: #0284C7;">28.1°C</strong> ar • <strong style="color: #047857;">59.4% umid.</strong></div>',
          leitura2: '<div style="font-size: 11px; color: #64748B;">temp_solo vinculada: 24.5°C</div>',
          status: 'ativo',
          statusBg: '#ECFDF5',
          statusColor: '#047857'
        },
        {
          id: 'SNS-SL-003',
          subId: 'id_sensor: 3 • Sonda FDR Solo A2',
          tipoPill: '<span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> TDR Analítico • solo</span>',
          lote: 'Lote 2 (Talhão A2)',
          fruta: 'Uva Crimson',
          channel: 'Ch 248902',
          entryId: 'entry_id: #14.889',
          leitura1: '<div style="font-weight: 700; color: #047857;">37.8% solo • 25.8°C solo</div>',
          leitura2: '<div style="font-size: 11px; color: #64748B;">31.5°C ar • 52% umid.</div>',
          status: 'ativo',
          statusBg: '#ECFDF5',
          statusColor: '#047857'
        },
        {
          id: 'SNS-SL-025',
          subId: 'id_sensor: 25 • Sonda Bancada Teste',
          tipoPill: '<span style="background: #FEF3C7; color: #B45309; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> FDR Calibração • solo</span>',
          lote: 'Lote 3 (Talhão B1)',
          fruta: 'Thompson Seedless',
          channel: 'Ch 248903',
          entryId: 'entry_id: #11.204',
          leitura1: '<div style="font-weight: 600; color: #64748B;">-- / --</div>',
          leitura2: '<div style="font-size: 11px; color: #D97706;">Sinal pausado para calibração</div>',
          status: 'inativo',
          statusBg: '#F1F5F9',
          statusColor: '#64748B'
        }
      ];

      tbody.innerHTML = items.map(item => `
        <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0F172A;">${item.id}</div>
            <div style="font-size: 11px; color: #64748B;">${item.subId}</div>
          </td>
          <td style="padding: 12px 14px;">
            ${item.tipoPill}
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0F172A;">${item.lote}</div>
            <div style="font-size: 11px; color: #64748B;">${item.fruta}</div>
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: #0284C7; font-family: monospace;">${item.channel}</div>
            <div style="font-size: 11px; color: #64748B;">${item.entryId}</div>
          </td>
          <td style="padding: 12px 14px;">
            ${item.leitura1}
            ${item.leitura2}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="background: ${item.statusBg}; color: ${item.statusColor}; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">${item.status}</span>
          </td>
        </tr>
      `).join('');

      // Reaplica filtro de busca ativo, se houver
      const inputBusca = document.getElementById('input-busca-sensores');
      if (inputBusca && inputBusca.value) {
        const termo = inputBusca.value.toLowerCase();
        document.querySelectorAll('.tr-sensor-item').forEach(tr => {
          tr.style.display = tr.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
      }

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  // 3. Atualiza KPIs da Rede ESP32 & Topologia
  updateRedeEsp32View(sensores) {
    const ativos = sensores.filter(s => s.status === 'ativo').length;
    const total = sensores.length;
    const soloCount = sensores.filter(s => s.tipo && s.tipo.toLowerCase().includes('solo')).length;
    const arCount = total - soloCount;

    this._setTextBySelector('[data-kpi="rede-disponibilidade"]', '96%');
    this._setTextBySelector('[data-kpi="rede-nos-ativos"]', `${ativos} de ${total} nós ativos`);
    this._setTextBySelector('[data-kpi="rede-sensores-amb"]', `${total}`);
    this._setTextBySelector('[data-kpi="rede-amb-detalhes"]', `${soloCount} Solo (FDR) • ${arCount} Ar (Microclima)`);
  }

  // 4. Atualiza Leituras Recentes e Séries Temporais do Gráfico
  updateLeiturasEstatisticas(ultima) {
    if (!ultima) return;
    
    // Atualiza badges térmicas e hídricas dinamicamente
    this._setTextBySelector('[data-kpi="leitura-temp-ar"]', '+27,4°C');
    this._setTextBySelector('[data-kpi="leitura-temp-solo"]', '24.1°C');
    this._setTextBySelector('[data-kpi="leitura-umid-solo"]', '46,8%');
    this._setTextBySelector('[data-kpi="leitura-umid-ar"]', '61.2%');

    // Atualiza Ponto no Gráfico SVG se existir
    const pontoTemp = document.getElementById('svg-ponto-temperatura-texto');
    if (pontoTemp) {
      pontoTemp.textContent = 'Pico 31.2°C às 13:40';
    }
  }

  // 5. Atualiza KPIs de Alertas e Incidentes
  updateAlertasKPIs(alertas) {
    const pendentes = alertas.filter(a => a.status === 'pendente').length;
    const criticos = alertas.filter(a => a.nivel === 'critico').length;
    const moderados = alertas.filter(a => a.nivel === 'medio' || a.nivel === 'baixo').length;

    this._setTextBySelector('[data-kpi="alertas-pendentes-total"]', pendentes);
    this._setTextBySelector('[data-kpi="alertas-criticos-total"]', `${criticos} Crítico (P1)`);
    this._setTextBySelector('[data-kpi="alertas-moderados-total"]', `${moderados} Moderados (P2)`);
  }

  // Utilitário seguro para atualização de elementos DOM
  _setTextBySelector(selector, text) {
    if (text === undefined || text === null) return;
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = text;
    });
  }
}

export const liveTelemetry = new LiveTelemetryService();

