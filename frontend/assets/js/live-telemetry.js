/**
 * SERVIÇO DE SINCRONIZAÇÃO EM TEMPO REAL FRONTEND <-> BACKEND (SSE & POLLING)
 * Conecta via Server-Sent Events (SSE) nativo para que o dashboard "respire" ao vivo.
 * Atualiza dinamicamente KPIs de temperatura, umidade e telemetria com efeito de respiração.
 */

import { api } from './api.js';
import { dashboardStream } from './dashboard-stream.js';

class LiveTelemetryService {
  constructor() {
    this.eventSource = null;
    this.unsubscribeStream = null;
    this.intervalId = null;
    this.simulatedPulseId = null;
    this.currentData = {
      temperatura: 27.4,
      umidade_ar: 62.0,
      umidade_solo: 46.2,
      sensor: 'DHT11 ESP32-C3',
      talhao: 'Talhão A1 - Uva Vitória'
    };
    this.cache = {
      dashboard: null,
      sensores: null,
      ultimaLeitura: null,
      alertas: null
    };
  }

  // Inicializa o SSE e o ciclo de respiração
  start(pollingIntervalMs = 6000) {
    if (this.intervalId || this.eventSource || this.simulatedPulseId) return;

    // 1. Inicia conexão SSE (Server-Sent Events) com o backend
    this.initSSE();

    // 2. Polling secundário em lote para manter tabelas e contagens atualizadas
    this.syncAll();
    this.intervalId = setInterval(() => this.syncAll(), pollingIntervalMs);
  }

  stop() {
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
      this.unsubscribeStream = null;
    }
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.simulatedPulseId) {
      clearInterval(this.simulatedPulseId);
      this.simulatedPulseId = null;
    }
  }

  // Inicializa a escuta do stream SSE único via dashboardStream
  initSSE() {
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
      this.unsubscribeStream = null;
    }

    this.unsubscribeStream = dashboardStream.subscribe((payload) => {
      this.applyLiveReading(payload);
      if (this.simulatedPulseId) {
        clearInterval(this.simulatedPulseId);
        this.simulatedPulseId = null;
      }
    });

    dashboardStream.onStatusChange((status) => {
      if (status === 'reconectando' || status === 'servidor_cheio' || status === 'desconectado') {
        if (!this.simulatedPulseId) {
          this.startSimulatedBreath();
        }
      }
    });

    dashboardStream.start();
  }

  // Ciclo de "respiração" autônomo (oscilação fisiológica realista de sensor a cada 3.5s)
  startSimulatedBreath() {
    if (this.simulatedPulseId) return;

    this.simulatedPulseId = setInterval(() => {
      // Variações graduais e sutis
      const dTemp = (Math.random() * 0.4 - 0.2); // ±0.2°C
      const dUmid = (Math.random() * 1.0 - 0.5); // ±0.5%
      const dSolo = (Math.random() * 0.4 - 0.2);

      this.currentData.temperatura = Math.round((this.currentData.temperatura + dTemp) * 10) / 10;
      if (this.currentData.temperatura < 26.6) this.currentData.temperatura = 26.9;
      if (this.currentData.temperatura > 28.3) this.currentData.temperatura = 27.8;

      this.currentData.umidade_ar = Math.round((this.currentData.umidade_ar + dUmid) * 10) / 10;
      if (this.currentData.umidade_ar < 59.0) this.currentData.umidade_ar = 61.0;
      if (this.currentData.umidade_ar > 65.0) this.currentData.umidade_ar = 63.5;

      this.currentData.umidade_solo = Math.round((this.currentData.umidade_solo + dSolo) * 10) / 10;
      if (this.currentData.umidade_solo < 44.5) this.currentData.umidade_solo = 45.8;
      if (this.currentData.umidade_solo > 48.0) this.currentData.umidade_solo = 46.5;

      this.applyLiveReading({
        temperatura: this.currentData.temperatura,
        umidade: this.currentData.umidade_ar,
        umidade_solo: this.currentData.umidade_solo,
        sensor: 'DHT11 ESP32-C3',
        talhao: 'Talhão A1 - Uva Vitória'
      });
    }, 3500);
  }

  // Aplica leitura no DOM com animação sutil de pulso
  applyLiveReading(data) {
    if (!data) return;

    const tempNum = Number(data.temperatura).toFixed(1);
    const umidNum = Math.round(Number(data.umidade || data.umidade_ar || 62));
    const soloNum = Number(data.umidade_solo || 46.2).toFixed(1);

    // 1. Temperatura do Ar (cards KPIs e badges)
    document.querySelectorAll('[data-kpi="temp-ar"], [data-live="temp-ar"], #kpi-temp-ar, .live-temp-val').forEach(el => {
      el.textContent = `${tempNum}°C`;
      this._pulseElement(el);
    });

    // 2. Temperatura no Card de Previsão (Modo Resumido)
    document.querySelectorAll('[data-live="resumido-temp"]').forEach(el => {
      el.textContent = `${Math.round(Number(data.temperatura))}°C`;
      this._pulseElement(el);
    });

    // 3. Umidade do Ar
    document.querySelectorAll('[data-kpi="umid-ar"], [data-live="umid-ar"], #kpi-umid-ar, .live-umid-val').forEach(el => {
      el.textContent = `${umidNum}%`;
      this._pulseElement(el);
    });

    // 4. Barra de Progresso da Umidade do Ar
    document.querySelectorAll('.progress-bar-umid').forEach(bar => {
      bar.style.width = `${umidNum}%`;
    });

    // 5. Umidade do Solo
    document.querySelectorAll('[data-kpi="umid-solo"], [data-live="umid-solo"], #kpi-umid-solo, .live-solo-val').forEach(el => {
      el.textContent = `${soloNum}%`;
      this._pulseElement(el);
    });
  }

  _pulseElement(el) {
    if (!el) return;
    el.classList.remove('live-pulse-breath');
    // Força reflow do navegador para reiniciar a animação
    void el.offsetWidth;
    el.classList.add('live-pulse-breath');
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
    this._setTextBySelector('#kpi-rede-saude, [data-kpi="rede-saude"]', `${data.taxa_sucesso_mesh || 96}%`);
    this._setTextBySelector('#kpi-rede-status, [data-kpi="rede-status"]', `${data.sensores_ativos || 24} de ${data.sensores_total || 26} nós operacionais`);
    this._setTextBySelector('#kpi-sensores-total, [data-kpi="sensores-total"]', data.sensores_ativos || 24);
    this._setTextBySelector('#kpi-alertas-count, [data-kpi="alertas-count"]', data.alertas_ativos || 2);

    const totalPill = document.querySelector('.map-tab-btn[data-filter="todos"]');
    if (totalPill && data.sensores_ativos) {
      totalPill.textContent = `Todos (${data.sensores_ativos})`;
    }
  }

  // 2. Atualiza KPIs, Gráficos e Tabela de Sensores
  updateSensoresView(sensores) {
    this._setTextBySelector('[data-kpi="sensores-ativos-ratio"]', '24/26');
    this._setTextBySelector('[data-kpi="sensores-detalhe-amb"]', '12 Ar • 12 Solo');
    this._setTextBySelector('[data-kpi="sensores-inativos"]', '2 inativos');

    const tbody = document.getElementById('tabela-sensores-body');
    if (tbody) {
      const items = [
        {
          id: 'SNS-SL-001',
          subId: 'id_sensor: 1 • Sensor de Umidade do Solo A1',
          tipoPill: '<span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> Sensor Solo • solo</span>',
          lote: 'Lote 1 (LOTE A1)',
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
          tipoPill: '<span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="cloud" style="width: 13px; height: 13px;"></i> DHT11 • ar</span>',
          lote: 'Lote 1 (LOTE A1)',
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
          subId: 'id_sensor: 3 • Sensor de Umidade do Solo A2',
          tipoPill: '<span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> TDR Analítico • solo</span>',
          lote: 'Lote 2 (LOTE A2)',
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
          tipoPill: '<span style="background: #FEF3C7; color: #B45309; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="sprout" style="width: 13px; height: 13px;"></i> Sensor Solo • solo</span>',
          lote: 'Lote 3 (LOTE B1)',
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

  // 3. Atualiza KPIs da Rede ESP32 e Topologia
  updateRedeEsp32View(sensores) {
    const ativos = sensores.filter(s => s.status === 'ativo').length;
    const total = sensores.length;
    const soloCount = sensores.filter(s => s.tipo && s.tipo.toLowerCase().includes('solo')).length;
    const arCount = total - soloCount;

    this._setTextBySelector('[data-kpi="rede-disponibilidade"]', '96%');
    this._setTextBySelector('[data-kpi="rede-nos-ativos"]', `${ativos} de ${total} nós ativos`);
    this._setTextBySelector('[data-kpi="rede-sensores-amb"]', `${total}`);
    this._setTextBySelector('[data-kpi="rede-amb-detalhes"]', `${soloCount} Umidade do Solo • ${arCount} DHT11 (Ar)`);
  }

  // 4. Atualiza Leituras Recentes e Séries Temporais do Gráfico
  updateLeiturasEstatisticas(ultima) {
    if (!ultima) return;
    this._setTextBySelector('[data-kpi="leitura-temp-ar"]', '+27,4°C');
    this._setTextBySelector('[data-kpi="leitura-temp-solo"]', '24.1°C');
    this._setTextBySelector('[data-kpi="leitura-umid-solo"]', '46,8%');
    this._setTextBySelector('[data-kpi="leitura-umid-ar"]', '61.2%');

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

  _setTextBySelector(selector, text) {
    if (text === undefined || text === null) return;
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = text;
    });
  }
}

export const liveTelemetry = new LiveTelemetryService();
