/**
 * SERVIÇO DE SINCRONIZAÇÃO EM TEMPO REAL FRONTEND <-> BACKEND (SSE REAL)
 * Conecta exclusivamente via dashboardStream (SSE autenticado por ticket único).
 * Zero simulação local e zero sobrescrita de tabelas/KPIs com dados estáticos.
 */

import { dashboardStream } from './dashboard-stream.js';

class LiveTelemetryService {
  constructor() {
    this.unsubscribeStream = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initSSE();
  }

  stop() {
    this.isRunning = false;
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
      this.unsubscribeStream = null;
    }
  }

  initSSE() {
    if (this.unsubscribeStream) {
      this.unsubscribeStream();
      this.unsubscribeStream = null;
    }

    this.unsubscribeStream = dashboardStream.subscribe((payload) => {
      this.applyLiveReading(payload);
    });

    dashboardStream.start();
  }

  applyLiveReading(data) {
    if (!data) return;

    if (data.temperatura != null && !Number.isNaN(Number(data.temperatura))) {
      const tempNum = Number(data.temperatura).toFixed(1);
      document.querySelectorAll('[data-kpi="temp-ar"], [data-live="temp-ar"], #kpi-temp-ar, .live-temp-val').forEach(el => {
        el.textContent = `${tempNum}°C`;
        this._pulseElement(el);
      });
      document.querySelectorAll('[data-live="resumido-temp"]').forEach(el => {
        el.textContent = `${Math.round(Number(data.temperatura))}°C`;
        this._pulseElement(el);
      });
    }

    const umidRaw = data.umidade ?? data.umidade_ar;
    if (umidRaw != null && !Number.isNaN(Number(umidRaw))) {
      const umidNum = Math.round(Number(umidRaw));
      document.querySelectorAll('[data-kpi="umid-ar"], [data-live="umid-ar"], #kpi-umid-ar, .live-umid-val').forEach(el => {
        el.textContent = `${umidNum}%`;
        this._pulseElement(el);
      });
      document.querySelectorAll('.progress-bar-umid').forEach(bar => {
        bar.style.width = `${umidNum}%`;
      });
    }

    if (data.umidade_solo != null && !Number.isNaN(Number(data.umidade_solo))) {
      const soloNum = Number(data.umidade_solo).toFixed(1);
      document.querySelectorAll('[data-kpi="umid-solo"], [data-live="umid-solo"], #kpi-umid-solo, .live-solo-val').forEach(el => {
        el.textContent = `${soloNum}%`;
        this._pulseElement(el);
      });
    }
  }

  _pulseElement(el) {
    if (!el) return;
    el.classList.remove('live-pulse-breath');
    void el.offsetWidth;
    el.classList.add('live-pulse-breath');
  }
}

export const liveTelemetry = new LiveTelemetryService();
