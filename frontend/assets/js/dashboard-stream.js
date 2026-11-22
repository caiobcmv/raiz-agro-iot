/**
 * SERVIÇO CENTRALIZADO DE TELEMETRIA EM TEMPO REAL VIA SSE COM TICKET DE USO ÚNICO
 * Endpoint backend: POST /dashboard/stream/ticket -> GET /dashboard/stream?ticket=<ticket>
 *
 * Gerencia:
 * 1. Obtenção de ticket de uso único com Bearer JWT mais recente (e refresh automático em 401).
 * 2. Conexão EventSource autenticada por ticket (NUNCA expõe o JWT na URL).
 * 3. Reconexão resiliente: em caso de erro, fecha o EventSource imediatamente para evitar loop de 401
 *    com ticket gasto, aplica backoff exponencial (3s a 30s) e solicita um ticket novo.
 * 4. Limite de 50 conexões (HTTP 503): aviso amigável na UI e nova tentativa em 10s.
 * 5. Limpeza estrita (StrictMode & SPA): garante conexão única, encerra no logout, na troca de rota e no unmount.
 */

import { api } from './api.js';
import { auth } from './auth.js';

class DashboardStreamService {
  constructor() {
    this.eventSource = null;
    this.reconnectTimer = null;
    this.status = 'desconectado'; // 'desconectado' | 'conectando' | 'conectado' | 'reconectando' | 'servidor_cheio'
    this.tentativaReconexao = 0;
    this.isStopped = true;
    this.isConnecting = false;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.lastPayload = null;

    // Escuta limpeza automática em eventos globais do ciclo de vida
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.stop());
      window.addEventListener('auth-logout', () => this.stop());
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '';
        const isDashboard = hash === '' || hash === '#/' || hash === '#/dashboard';
        if (!isDashboard) {
          this.stop();
        }
      });
    }
  }

  /**
   * Inscreve um callback para receber leituras do stream SSE
   * @param {Function} callback (data: { temperatura, umidade, origem, timestamp, sensor }) => void
   * @returns {Function} Função de cancelamento da inscrição
   */
  subscribe(callback) {
    this.listeners.add(callback);
    if (this.lastPayload) {
      try { callback(this.lastPayload); } catch (e) {}
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Inscreve um callback para ser notificado sobre mudanças no estado da conexão
   * @param {Function} callback (status: string, extraInfo: any) => void
   * @returns {Function} Função de cancelamento
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    try { callback(this.status, null); } catch (e) {}
    return () => this.statusListeners.delete(callback);
  }

  _setStatus(novoStatus, extraInfo = null) {
    this.status = novoStatus;
    this._atualizarIndicadoresDOM(novoStatus, extraInfo);
    this.statusListeners.forEach(cb => {
      try { cb(novoStatus, extraInfo); } catch (e) {}
    });
  }

  _atualizarIndicadoresDOM(status, extraInfo) {
    if (typeof document === 'undefined') return;

    const avisos = document.querySelectorAll('.sse-aviso-reconectando, #sse-aviso-reconectando, #sse-aviso-reconectando-detalhado');
    avisos.forEach(el => {
      if (status === 'conectado') {
        el.style.display = 'none';
      } else if (status === 'conectando') {
        el.style.display = 'inline-flex';
        el.textContent = 'Conectando...';
        el.style.color = '#0284C7';
        el.style.background = '#F0F9FF';
        el.style.borderColor = '#BAE6FD';
      } else if (status === 'reconectando') {
        el.style.display = 'inline-flex';
        el.textContent = extraInfo?.mensagem || 'Reconectando...';
        el.style.color = '#D97706';
        el.style.background = '#FFFBEB';
        el.style.borderColor = '#FDE68A';
      } else if (status === 'servidor_cheio') {
        el.style.display = 'inline-flex';
        el.textContent = extraInfo?.mensagem || 'Servidor com capacidade máxima de conexões atingida. Reconectando em 10s...';
        el.style.color = '#DC2626';
        el.style.background = '#FEF2F2';
        el.style.borderColor = '#FECACA';
      } else {
        el.style.display = 'none';
      }
    });
  }

  /**
   * Inicia o fluxo de obtenção de ticket e conexão com o SSE
   */
  async start() {
    // Critério: Deslogado, o front não tenta abrir o stream
    if (!auth.isAuthenticated()) {
      this.stop();
      return;
    }

    this.isStopped = false;

    // Se já estiver conectado ou em processo de conexão ativa, não abre duplicado (StrictMode seguro)
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this._conectar();
  }

  async _conectar() {
    if (this.isStopped) return;
    if (this.isConnecting) return;

    // Garante que qualquer conexão anterior seja fechada antes de abrir nova
    if (this.eventSource) {
      try {
        this.eventSource.onopen = null;
        this.eventSource.onmessage = null;
        this.eventSource.onerror = null;
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }

    this.isConnecting = true;
    this._setStatus(this.tentativaReconexao > 0 ? 'reconectando' : 'conectando');

    let ticketData = null;
    try {
      ticketData = await api.getDashboardStreamTicket();
    } catch (err) {
      this.isConnecting = false;
      if (this.isStopped) return;

      console.warn('[SSE] Falha na obtenção do ticket temporário:', err.message);

      // 401/403: token inválido e refresh falhou -> logout
      if (err.status === 401 || err.status === 403) {
        console.error('[SSE] Sessão inválida ou não autorizada. Encerrando sessão do usuário.');
        auth.logout();
        return;
      }

      // 503: Servidor cheio (> 50 conexões simultâneas)
      if (err.status === 503) {
        console.warn('[SSE] Limite de 50 conexões atingido no backend (503). Nova tentativa em 10 segundos.');
        this._setStatus('servidor_cheio', {
          mensagem: 'Servidor com capacidade máxima de conexões atingida. Reconectando em 10s...'
        });
        this._agendarReconexao(10000);
        return;
      }

      // Outro erro de rede ou backend reiniciando: aplica backoff exponencial (3s a 30s)
      this._agendarBackoffReconexao();
      return;
    }

    this.isConnecting = false;
    if (this.isStopped) return;

    const ticket = ticketData?.ticket;
    if (!ticket) {
      console.warn('[SSE] Backend respondeu 200 mas sem campo ticket válido.');
      this._agendarBackoffReconexao();
      return;
    }

    // A URL base vem dinamicamente da configuração do projeto (api.baseUrl)
    // NUNCA coloca o JWT na URL, apenas o ticket de uso único!
    const sseUrl = `${api.baseUrl}/dashboard/stream?ticket=${encodeURIComponent(ticket)}`;

    try {
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      es.onopen = () => {
        if (this.isStopped) {
          try { es.close(); } catch (e) {}
          return;
        }
        console.log('[SSE] Conexão em tempo real estabelecida com sucesso.');
        this.tentativaReconexao = 0;
        this._setStatus('conectado');
      };

      es.onmessage = (event) => {
        if (this.isStopped) return;
        try {
          const payload = JSON.parse(event.data);
          this.lastPayload = payload;
          this.listeners.forEach(cb => {
            try { cb(payload); } catch (e) { console.error('[SSE] Erro no listener:', e); }
          });
        } catch (parseErr) {
          console.warn('[SSE] Erro ao decodificar payload JSON do SSE:', parseErr);
        }
      };

      es.onerror = () => {
        // ESSENCIAL: O EventSource nativo reconectaria automaticamente com a MESMA URL (ticket já gasto).
        // Isso causaria 401 em loop contínuo. Fechamos imediatamente a conexão!
        console.warn('[SSE] Conexão SSE interrompida ou encerrada pelo servidor. Fechando EventSource para evitar loop de 401...');
        try {
          es.onopen = null;
          es.onmessage = null;
          es.onerror = null;
          es.close();
        } catch (e) {}
        this.eventSource = null;

        if (this.isStopped) return;

        this._setStatus('reconectando');
        this._agendarBackoffReconexao();
      };
    } catch (instantiateErr) {
      console.error('[SSE] Falha ao instanciar EventSource:', instantiateErr);
      this._agendarBackoffReconexao();
    }
  }

  _agendarBackoffReconexao() {
    if (this.isStopped) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.tentativaReconexao++;
    // Backoff crescente: 3s inicial, depois dobra até no máximo 30s
    const delays = [3000, 6000, 12000, 24000, 30000];
    const delay = delays[Math.min(this.tentativaReconexao - 1, delays.length - 1)];

    console.log(`[SSE] Próxima tentativa de reconexão com ticket novo em ${delay / 1000}s (tentativa #${this.tentativaReconexao})...`);
    this._setStatus('reconectando', { delayMs: delay, tentativa: this.tentativaReconexao });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._conectar();
    }, delay);
  }

  _agendarReconexao(delayMs) {
    if (this.isStopped) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._conectar();
    }, delayMs);
  }

  /**
   * Encerra a conexão SSE e cancela qualquer tentativa de reconexão pendente
   */
  stop() {
    this.isStopped = true;
    this.isConnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      try {
        this.eventSource.onopen = null;
        this.eventSource.onmessage = null;
        this.eventSource.onerror = null;
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }

    this._setStatus('desconectado');
  }
}

export const dashboardStream = new DashboardStreamService();
