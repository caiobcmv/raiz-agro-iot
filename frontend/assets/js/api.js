/**
 * RAIZ AGRO IOT - CLIENTE API CENTRALIZADO (100% REAL - FASTAPI + POSTGRESQL)
 * Todas as requisições utilizam o backend real com autenticação JWT Bearer.
 * Zero mocks, zero dados sintéticos e zero fallbacks de demonstração.
 */

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = localStorage.getItem('API_URL') || (isLocal ? 'http://localhost:8000' : 'https://iot-backend-3h7l.onrender.com');


class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.isBackendOnline = null;
    this.currentLoginEmail = null;
    this._refreshPromise = null;
    this._refreshBlocked = false;
    this._getCache = new Map();
    this._cacheableGetPaths = new Map([
      ['/safras', 30000],
      ['/propriedades', 30000],
      ['/frutas', 30000],
      ['/variedades', 30000],
      ['/portos', 30000],
      ['/dashboard/resumo', 15000],
      ['/sensores', 15000],
      ['/lotes', 15000],
      ['/clima/previsao', 30000],
      ['/alertas/estado', 15000],
      ['/dados-mercado', 30000],
      ['/previsoes/janela-colheita', 30000]
    ]);
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  setTokens(access_token, refresh_token) {
    if (access_token) localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    this._refreshBlocked = false;
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('pending_login_email');
    this.currentLoginEmail = null;
    this._refreshPromise = null;
    this._refreshBlocked = false;
    this._getCache.clear();
  }

  async refreshToken() {
    if (this._refreshBlocked) {
      const err = new Error('Renovação de sessão indisponível. Faça login novamente.');
      err.status = 403;
      throw err;
    }
    if (this._refreshPromise) {
      return await this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refresh_token');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            this._refreshBlocked = true;
          }
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
      } finally {
        this._refreshPromise = null;
      }
    })();

    return await this._refreshPromise;
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
          const authErr = new Error('Stream de telemetria indisponível no momento.');
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
    const { timeoutMs = 15000, skipCache = false, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const basePath = endpoint.split('?')[0];
    const cacheTtlMs = (method === 'GET' && !skipCache) ? (this._cacheableGetPaths.get(basePath) || 0) : 0;
    const isCacheableGet = cacheTtlMs > 0;

    if (method !== 'GET') {
      this._getCache.clear();
    } else if (isCacheableGet) {
      const cached = this._getCache.get(endpoint);
      if (cached && (Date.now() - cached.ts) < cacheTtlMs) {
        return typeof structuredClone === 'function'
          ? structuredClone(cached.data)
          : JSON.parse(JSON.stringify(cached.data));
      }
    }

    const headers = {
      ...(fetchOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(fetchOptions.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        cache: 'no-store',
        credentials: 'include',
        ...fetchOptions,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.isBackendOnline = true;

      if (response.status === 401) {
        // Se não é rota de login/2FA e ainda não tentou refresh, tenta renovar o token silenciosamente
        const isPublicAuth = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/2fa') || endpoint.startsWith('/auth/refresh');
        if (!isPublicAuth && !_retried && !this._refreshBlocked) {
          try {
            await this.refreshToken();
            return await this.request(endpoint, options, true);
          } catch (_) {
            // refresh falhou
          }
        }

        // Apenas desconecta e redireciona ao login se a rota principal de autenticação (/auth/me) falhar com 401 e refresh já falhou
        if (endpoint === '/auth/me' && _retried) {
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
        const jsonData = await response.json();
        if (isCacheableGet) {
          this._getCache.set(endpoint, {
            ts: Date.now(),
            data: typeof structuredClone === 'function'
              ? structuredClone(jsonData)
              : JSON.parse(JSON.stringify(jsonData))
          });
        }
        return jsonData;
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
  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {})
      });
    } catch (_) {
      // Logout local continua mesmo se a rede falhar
    }
  }

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
  // AUTENTICAÇÃO EM DOIS FATORES - TOTP (APP AUTENTICADOR)
  // ==========================================
  async getTotpStatus() {
    return await this.request('/auth/2fa/totp/status');
  }

  async iniciarTotp() {
    return await this.request('/auth/2fa/totp/iniciar', {
      method: 'POST'
    });
  }

  async confirmarTotp(codigo) {
    const cleanCodigo = String(codigo || '').trim();
    return await this.request('/auth/2fa/totp/confirmar', {
      method: 'POST',
      body: JSON.stringify({ codigo: cleanCodigo })
    });
  }

  async regenerarCodigosTotp(codigo) {
    const cleanCodigo = String(codigo || '').trim();
    return await this.request('/auth/2fa/totp/recuperacao/regenerar', {
      method: 'POST',
      body: JSON.stringify({ codigo: cleanCodigo })
    });
  }

  async desativarTotp(senha, codigo) {
    const cleanCodigo = String(codigo || '').trim();
    return await this.request('/auth/2fa/totp/desativar', {
      method: 'POST',
      body: JSON.stringify({ senha, codigo: cleanCodigo })
    });
  }

  async get2FAPreferencia() {
    return await this.request('/auth/2fa/preferencia');
  }

  async salvar2FAPreferencia(emailAtivo) {
    return await this.request('/auth/2fa/preferencia', {
      method: 'PUT',
      body: JSON.stringify({ email_ativo: Boolean(emailAtivo) })
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

  async atualizarPropriedade(idPropriedade, dados) {
    return await this.request(`/propriedades/${encodeURIComponent(idPropriedade)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async atualizarPadraoVariedade(idVariedade, dados) {
    return await this.request(`/variedades/${encodeURIComponent(idVariedade)}/padrao`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
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
    return await this.request('/lotes?limit=1000');
  }

  async createLote(data) {
    return await this.request('/lotes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // PARECERES AGRONÔMICOS (IA)
  // ==========================================
  async getPareceres(idLote) {
    return await this.request(`/pareceres?id_lote=${encodeURIComponent(idLote)}`);
  }

  async getUltimoParecerLote(idLote) {
    return await this.request(`/pareceres/lote/${encodeURIComponent(idLote)}/ultimo`);
  }

  async gerarParecer({ id_lote, tipo = 'agronomico', dias = 30, forcar = false }) {
    return await this.request('/pareceres/gerar', {
      method: 'POST',
      body: JSON.stringify({ id_lote, tipo, dias, forcar }),
      timeoutMs: 60000
    });
  }

  async getParecerIA(idLote) {
    return await this.request(`/ia/parecer?id_lote=${encodeURIComponent(idLote)}`, {
      timeoutMs: 60000
    });
  }

  async assinarParecer(idParecer, dadosAssinatura) {
    return await this.request(`/pareceres/${encodeURIComponent(idParecer)}/assinar`, {
      method: 'POST',
      body: JSON.stringify(dadosAssinatura)
    });
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
    // FIX: retorna null em erros de servidor (502/503) em vez de relançar;
    // a UI do dashboard já trata clima=null exibindo '—' nos widgets de clima.
    try {
      return await this.request('/clima/previsao');
    } catch (err) {
      if (err.status >= 500 || err.isNetworkError) {
        console.warn('Clima indisponível (', err.status || 'rede', ') — widgets exibirão "—".');
        return null;
      }
      throw err;
    }
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
    return await this.request('/preferencias/graficos');
  }

  async getSeries24h() {
    return await this.request('/sensores/series-24h');
  }

  async salvarDadosGraficos(payload) {
    return await this.request('/preferencias/graficos', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
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

  async getAnalistaAlertasResumo() {
    return await this.request('/analista/alertas/resumo');
  }

  async getPerdasRisco() {
    return await this.request('/perdas-risco');
  }

  async getEstatisticasLeituras(params = {}) {
    const qs = new URLSearchParams();
    if (params.id_sensor != null) qs.append('id_sensor', params.id_sensor);
    if (params.inicio) qs.append('inicio', params.inicio);
    if (params.fim) qs.append('fim', params.fim);
    const s = qs.toString();
    return await this.request(`/leituras/estatisticas${s ? '?' + s : ''}`);
  }

  async getSaidasFaixa(params = {}) {
    const qs = new URLSearchParams();
    if (params.agrupamento) qs.append('agrupamento', params.agrupamento);
    if (params.id_lote != null) qs.append('id_lote', params.id_lote);
    if (params.id_sensor != null) qs.append('id_sensor', params.id_sensor);
    const s = qs.toString();
    return await this.request(`/relatorios/saidas-faixa${s ? '?' + s : ''}`);
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

  // ==========================================
  // GESTÃO ADMINISTRATIVA E USUÁRIOS
  // ==========================================
  async criarUsuario(dados) {
    return await this.request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async editarUsuario(idUsuario, dados) {
    return await this.request(`/usuarios/${idUsuario}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async atualizarUsuario(idUsuario, dados) {
    return await this.editarUsuario(idUsuario, dados);
  }

  async desativarUsuario(idUsuario) {
    return await this.request(`/usuarios/${idUsuario}`, {
      method: 'DELETE'
    });
  }

  async reenviarAtivacao(idOrEmail) {
    const isId = idOrEmail != null && !String(idOrEmail).includes('@') && /^\d+$/.test(String(idOrEmail));
    if (!isId) {
      throw new Error('Reenvio de ativação requer o ID do usuário.');
    }
    return await this.request(`/usuarios/${idOrEmail}/reenviar-ativacao`, {
      method: 'POST'
    });
  }

  async getAuditoria(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.id_usuario != null) searchParams.append('id_usuario', params.id_usuario);
    if (params.acao) searchParams.append('acao', params.acao);
    if (params.resultado) searchParams.append('resultado', params.resultado);
    if (params.inicio) searchParams.append('inicio', params.inicio);
    if (params.fim) searchParams.append('fim', params.fim);
    if (params.limit != null) searchParams.append('limit', params.limit);
    if (params.offset != null) searchParams.append('offset', params.offset);
    const qs = searchParams.toString();
    return await this.request(`/auditoria${qs ? '?' + qs : ''}`);
  }

  async postConfigParametro(dados) {
    return await this.request('/config-parametros', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async updateConfigParametro(idConfig, dados) {
    return await this.request(`/config-parametros/${idConfig}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async updateCortePreditivo(nivel, dados) {
    return await this.request(`/alertas-preditivos/cortes/${encodeURIComponent(nivel)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async criarSensor(dados) {
    return await this.request('/sensores', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async updateSensor(idSensor, dados) {
    return await this.request(`/sensores/${encodeURIComponent(idSensor)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async desativarSensor(idSensor) {
    return await this.request(`/sensores/${encodeURIComponent(idSensor)}`, {
      method: 'DELETE'
    });
  }

  async updateLote(idLote, dados) {
    return await this.request(`/lotes/${encodeURIComponent(idLote)}`, {
      method: 'PATCH',
      body: JSON.stringify(dados)
    });
  }
}

export const api = new ApiService();
