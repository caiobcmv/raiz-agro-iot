/**
 * RAIZ AGRO IOT - CLIENTE API CENTRALIZADO (100% REAL - FASTAPI + POSTGRESQL)
 * Todas as requisições utilizam o backend real com autenticação JWT Bearer.
 * Zero mocks, zero dados sintéticos e zero fallbacks de demonstração.
 */

const API_BASE_URL = localStorage.getItem('API_URL') || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.isBackendOnline = null;
    this.currentLoginEmail = null;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  setTokens(access_token, refresh_token) {
    if (access_token) localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('pending_login_email');
    this.currentLoginEmail = null;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('Nenhum refresh token disponível');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = new Error(`Falha ao renovar token (${res.status})`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      if (data && data.access_token) {
        this.setTokens(data.access_token, data.refresh_token || refreshToken);
        return data.access_token;
      }
      throw new Error('Resposta de refresh inválida');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getDashboardStreamTicket() {
    let token = this.getToken();
    if (!token) {
      const err = new Error('Usuário não autenticado');
      err.status = 401;
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let res = await fetch(`${this.baseUrl}/dashboard/stream/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (res.status === 401) {
        try {
          const novoToken = await this.refreshToken();
          if (novoToken) {
            token = novoToken;
            res = await fetch(`${this.baseUrl}/dashboard/stream/ticket`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              signal: controller.signal
            });
          }
        } catch (refreshErr) {
          this.clearTokens();
          if (window.location.hash !== '#/login') {
            window.location.hash = '#/login';
          }
          const authErr = new Error('Sessão expirada. Faça login novamente.');
          authErr.status = 401;
          throw authErr;
        }
      }

      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        const err = new Error('Acesso não autorizado para o stream');
        err.status = res.status;
        throw err;
      }

      if (res.status === 503) {
        const err = new Error('Capacidade máxima de conexões atingida (503)');
        err.status = 503;
        throw err;
      }

      if (!res.ok) {
        const err = new Error(`Erro ao solicitar ticket SSE (${res.status})`);
        err.status = res.status;
        throw err;
      }

      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isBackendOnline = res.ok;
      return res.ok;
    } catch (e) {
      this.isBackendOnline = false;
      return false;
    }
  }

  async request(endpoint, options = {}, _retried = false) {
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        cache: 'no-store',
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.isBackendOnline = true;

      if (response.status === 401) {
        // Se não é rota de login/2FA e ainda não tentou refresh, tenta renovar o token uma vez
        const isPublicAuth = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/2fa') || endpoint.startsWith('/auth/refresh');
        if (!isPublicAuth && !_retried && localStorage.getItem('refresh_token')) {
          try {
            await this.refreshToken();
            return await this.request(endpoint, options, true);
          } catch (_) {
            // refresh falhou -> segue para limpeza controlada
          }
        }

        if (!isPublicAuth) {
          this.clearTokens();
          window.dispatchEvent(new CustomEvent('auth-logout'));
          if (window.location.hash !== '#/login' && !window.location.hash.startsWith('#/primeiro-acesso')) {
            window.location.hash = '#/login';
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Erro HTTP ${response.status}` }));
        const rawDetail = errorData.detail || errorData.mensagem || errorData.message;
        const detailMsg = typeof rawDetail === 'string'
          ? rawDetail
          : (Array.isArray(rawDetail)
            ? rawDetail.map(d => (d && d.msg) || JSON.stringify(d)).join('; ')
            : (rawDetail && typeof rawDetail === 'object' && rawDetail.mensagem)
              ? rawDetail.mensagem
              : (rawDetail ? JSON.stringify(rawDetail) : `Erro HTTP ${response.status}`));
        const err = new Error(detailMsg || `Erro HTTP ${response.status}`);
        err.status = response.status;
        err.detail = errorData.detail;
        throw err;
      }

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const timeoutErr = new Error('Tempo limite de conexão com o servidor excedido.');
        timeoutErr.isNetworkError = true;
        throw timeoutErr;
      }
      throw error;
    }
  }

  // ==========================================
  // AUTENTICAÇÃO E 2FA (MFA)
  // ==========================================
  async getMe() {
    return await this.request('/auth/me');
  }

  async login(email, senha) {
    const cleanEmail = (email || '').trim().toLowerCase();
    this.currentLoginEmail = cleanEmail;
    localStorage.setItem('pending_login_email', cleanEmail);

    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, senha })
    });

    if (response && response.access_token) {
      this.setTokens(response.access_token, response.refresh_token);
      const usr = response.usuario || await this.getMe();
      if (usr) {
        localStorage.setItem('user_data', JSON.stringify(usr));
      }
      return { ...response, usuario: usr };
    }

    return response;
  }

  async verify2FA(token_temporario, codigo) {
    const cleanCodigo = String(codigo || '').trim();
    const res = await this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token_temporario, codigo: cleanCodigo })
    });

    if (res && res.access_token) {
      this.setTokens(res.access_token, res.refresh_token);
      const usr = res.usuario || await this.getMe();
      if (usr) {
        localStorage.setItem('user_data', JSON.stringify(usr));
      }
      return { ...res, usuario: usr };
    }

    throw new Error('Resposta inválida do servidor na verificação 2FA');
  }

  async resend2FA(token_temporario) {
    return await this.request('/auth/2fa/reenviar', {
      method: 'POST',
      body: JSON.stringify({ token_temporario })
    });
  }

  // ==========================================
  // DASHBOARD RESUMO
  // ==========================================
  async getDashboardResumo() {
    return await this.request('/dashboard/resumo');
  }

  // ==========================================
  // RECOMENDAÇÃO DE IRRIGAÇÃO
  // ==========================================
  async getPrevisoesIrrigacao() {
    const res = await this.request('/previsoes/irrigacao');
    return Array.isArray(res) ? res : [];
  }

  // ==========================================
  // SENSORES IOT
  // ==========================================
  async getSensores(params = {}) {
    const qs = new URLSearchParams();
    if (params.ambiente) qs.append('ambiente', params.ambiente);
    if (params.status) qs.append('status', params.status);
    const q = qs.toString();
    return await this.request(`/sensores${q ? '?' + q : ''}`);
  }

  async createSensor(sensorData) {
    return await this.request('/sensores', {
      method: 'POST',
      body: JSON.stringify(sensorData)
    });
  }

  async getSensor(id) {
    return await this.request(`/sensores/${encodeURIComponent(id)}`);
  }

  // ==========================================
  // CATÁLOGO, SAFRAS E PROPRIEDADES
  // ==========================================
  async getCatalogoSafras() {
    const res = await this.request('/safras');
    return Array.isArray(res) ? res : (res?.safras || []);
  }

  async getCatalogoPropriedades() {
    const res = await this.request('/propriedades');
    return Array.isArray(res) ? res : (res?.propriedades || (res ? [res] : []));
  }

  async getClassificacaoResumo(idLote = null) {
    const qs = idLote != null ? `?id_lote=${encodeURIComponent(idLote)}` : '';
    return await this.request(`/classificacao/resumo${qs}`);
  }

  async getSensorLeituras(idSensor, periodo = '7d') {
    return await this.request(`/sensores/${encodeURIComponent(idSensor)}/leituras?periodo=${encodeURIComponent(periodo)}`);
  }

  async getUltimaLeitura(idSensor = null) {
    const qs = idSensor != null ? `?id_sensor=${encodeURIComponent(idSensor)}` : '';
    return await this.request(`/leituras/ultima${qs}`);
  }

  async getLeituras(limit = 50) {
    return await this.request(`/leituras?limit=${encodeURIComponent(limit)}`);
  }

  // ==========================================
  // LOTES DE PRODUÇÃO
  // ==========================================
  async getLotes() {
    return await this.request('/lotes');
  }

  async createLote(data) {
    return await this.request('/lotes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // LOGÍSTICA E VIAGENS REFRIGERADAS
  // ==========================================
  async getViagens() {
    return await this.request('/viagens');
  }

  // ==========================================
  // ALERTAS REATIVOS E PREDITIVOS
  // ==========================================
  async getAlertas() {
    return await this.request('/alertas');
  }

  async resolveAlerta(id) {
    return await this.request(`/alertas/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolvido' })
    });
  }

  async getAlertaDetalhe(id) {
    return await this.request(`/alertas/${encodeURIComponent(id)}/detalhe`);
  }

  async atualizarStatusAlertaById(id, status = 'reconhecido') {
    return await this.request(`/alertas/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ==========================================
  // CLIMA / PREVISÃO
  // ==========================================
  async getClimaAtual() {
    return await this.request('/clima/previsao');
  }

  // ==========================================
  // CONFIGURAÇÕES DE PARÂMETROS / FAIXAS IDEAIS
  // ==========================================
  async getConfigParametros() {
    return await this.request('/config-parametros');
  }

  // ==========================================
  // USUÁRIOS E PREFERÊNCIAS
  // ==========================================
  async getUsuarios() {
    return await this.request('/usuarios');
  }

  async getPreferenciasUsuario(idUsuario) {
    return await this.request(`/notificacoes/preferencias`);
  }

  async salvarPreferenciasUsuario(idUsuario, payload) {
    const canal = payload?.canal || 'email';
    return await this.request(`/notificacoes/preferencias/${encodeURIComponent(canal)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // ==========================================
  // HISTÓRICO DE SAFRA E DADOS DE GRÁFICOS
  // ==========================================
  async getHistoricoSafras() {
    return await this.request('/safras');
  }

  async getEstadoAlertas() {
    return await this.request('/alertas');
  }

  async atualizarStatusAlerta(idAlerta, payload) {
    return await this.request(`/alertas/${encodeURIComponent(idAlerta)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async reconhecerTodosAlertas() {
    return await this.request('/alertas/reconhecer-todos', {
      method: 'POST'
    });
  }

  async getDadosGraficos() {
    return await this.request('/dashboard/resumo');
  }

  // ==========================================
  // PERFIL ANALISTA - SENSORES, TOPOLOGIA E ALERTAS PREDITIVOS
  // ==========================================
  async getAnalistaSensoresResumo() {
    return await this.request('/analista/sensores/resumo');
  }

  async getSensoresTopologia() {
    return await this.request('/sensores/topologia');
  }

  async getLeiturasRejeitadas(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.id_sensor != null) searchParams.append('id_sensor', params.id_sensor);
    if (params.motivo) searchParams.append('motivo', params.motivo);
    if (params.inicio) searchParams.append('inicio', params.inicio);
    if (params.fim) searchParams.append('fim', params.fim);
    if (params.limit != null) searchParams.append('limit', params.limit);
    if (params.offset != null) searchParams.append('offset', params.offset);
    const qs = searchParams.toString();
    return await this.request(`/leituras-rejeitadas${qs ? '?' + qs : ''}`);
  }

  async getAlertasPreditivos(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.nivel) searchParams.append('nivel', params.nivel);
    if (params.id_lote != null) searchParams.append('id_lote', params.id_lote);
    if (params.id_sensor != null) searchParams.append('id_sensor', params.id_sensor);
    if (params.limit != null) searchParams.append('limit', params.limit);
    if (params.skip != null) searchParams.append('skip', params.skip);
    const qs = searchParams.toString();
    return await this.request(`/alertas-preditivos${qs ? '?' + qs : ''}`);
  }

  async getCortesPreditivos() {
    return await this.request('/alertas-preditivos/cortes');
  }

  async putCortePreditivo(nivel, { limiar_min, limiar_max, acao_recomendada }) {
    return await this.request(`/alertas-preditivos/cortes/${encodeURIComponent(nivel)}`, {
      method: 'PUT',
      body: JSON.stringify({ limiar_min, limiar_max, acao_recomendada })
    });
  }

  async sincronizarIngestao() {
    return await this.request('/ingestao/sincronizar', {
      method: 'POST'
    });
  }

  async exportarLeiturasCsv({ id_sensor, inicio, fim } = {}) {
    const params = new URLSearchParams();
    if (id_sensor != null) params.append('id_sensor', id_sensor);
    if (inicio) params.append('inicio', inicio);
    if (fim) params.append('fim', fim);
    const qs = params.toString();
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/leituras/exportar.csv${qs ? '?' + qs : ''}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) {
      throw new Error(`Falha ao exportar CSV (${res.status})`);
    }
    return await res.blob();
  }

  async getRedeHistorico(periodo = '24h') {
    return await this.request(`/rede/historico?periodo=${encodeURIComponent(periodo)}`);
  }

  // ==========================================
  // CENTRAL DE ALERTAS E INCIDENTES
  // ==========================================
  async getCentralAlertas({ status = 'aberto' } = {}) {
    return await this.request(`/central-alertas?status=${encodeURIComponent(status)}`);
  }

  async getCentralAlertasCurva({ id_lote, horas = 24 } = {}) {
    const qs = new URLSearchParams();
    if (id_lote != null) qs.append('id_lote', id_lote);
    if (horas != null) qs.append('horas', horas);
    return await this.request(`/central-alertas/curva?${qs.toString()}`);
  }

  async reconhecerTodosCentralAlertas() {
    return await this.request('/central-alertas/reconhecer-todos', {
      method: 'POST'
    });
  }

  async reconhecerAlertaCentral(origem, id) {
    return await this.request(`/central-alertas/${encodeURIComponent(origem)}/${encodeURIComponent(id)}/reconhecer`, {
      method: 'PATCH'
    });
  }

  async exportarCentralAlertasCsv({ status = 'todos' } = {}) {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/central-alertas/exportar.csv?status=${encodeURIComponent(status)}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) {
      throw new Error(`Falha ao exportar CSV (${res.status})`);
    }
    return await res.blob();
  }

  async getPortos() {
    return await this.request('/portos');
  }

  async getRiscosPrejuizo(idLote = null) {
    const qs = idLote != null ? `?id_lote=${encodeURIComponent(idLote)}` : '';
    return await this.request(`/riscos/prejuizo${qs}`);
  }

  // ==========================================
  // CALIBRAÇÃO E PARÂMETROS IOT
  // ==========================================
  async getCalibracaoResumo() {
    return await this.request('/calibracao/resumo');
  }

  async salvarLimiarCalibracao(idConfig, dados) {
    return await this.request(`/calibracao/limiares/${encodeURIComponent(idConfig)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async salvarCortesPreditivos(cortes) {
    return await this.request('/calibracao/cortes', {
      method: 'PUT',
      body: JSON.stringify(cortes)
    });
  }

  async recalcularCalibracao() {
    return await this.request('/calibracao/recalcular', {
      method: 'POST'
    });
  }

  async atualizarSensorCalibracao(idSensor, dados) {
    return await this.request(`/calibracao/sensores/${encodeURIComponent(idSensor)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }
}

export const api = new ApiService();
