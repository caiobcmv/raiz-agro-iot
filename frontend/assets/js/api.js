/**
 * RAIZ AGRO IOT - CLIENTE API CENTRALIZADO
 * Conecta com o backend FastAPI (https://raiz-agro-iot.onrender.com) e possui fallback resiliente
 * para modo demonstração caso o banco ou backend estejam temporariamente offline.
 */

import { USUARIOS } from './auth.js';

const API_BASE_URL = localStorage.getItem('API_URL') || 'https://raiz-agro-iot.onrender.com';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.isBackendOnline = null;
  }

  // Obter token JWT
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

  // Verifica conectividade com o backend FastAPI
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

  // Wrapper genérico para requisições com autenticação Bearer e Timeout resiliente para produção
  async request(endpoint, options = {}) {
    // Se já foi detectado que o backend está offline, retorna erro imediato para disparar mock sem delay
    if (this.isBackendOnline === false && !endpoint.startsWith('/auth/') && !endpoint.startsWith('/preferencias/')) {
      throw new Error('Backend offline (Modo Demonstração Ativo)');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Timeout de 15000ms para suportar conexões de nuvem e cold-start (Render + Neon PostgreSQL)
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
        // Token expirado
        console.warn('Sessão expirada ou não autorizada');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro no servidor' }));
        throw new Error(errorData.detail || `Erro HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      // Se deu timeout, erro de CORS ou erro de rede, trata graciosamente para não travar a interface
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
        this.isBackendOnline = false;
        if (endpoint.startsWith('/preferencias/')) {
          console.warn(`[API] Fallback resiliente para ${endpoint}:`, error.message);
          if (endpoint.includes('/safras')) return { safras: [], talhoes: [] };
          if (endpoint.includes('/alertas')) return { alertas: [], resumo: {} };
          if (endpoint.includes('/usuario/')) return { id_usuario: 1, nome: 'Maria Clara', cargo: 'Gestora Técnica' };
          return {};
        }
        throw new Error('Falha de conexão com o servidor backend. Verifique sua internet ou tente novamente.');
      }
      throw error;
    }
  }

  // ==========================================
  // AUTENTICAÇÃO E 2FA (MFA)
  // ==========================================
  async login(email, senha) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!USUARIOS[cleanEmail]) {
      throw new Error('E-mail não autorizado. Apenas usuários cadastrados podem acessar o sistema.');
    }
    this.currentLoginEmail = cleanEmail;
    localStorage.setItem('pending_login_email', cleanEmail);

    try {
      return await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, senha })
      });
    } catch (err) {
      // Fallback em caso de backend offline para teste visual imediato
      if (err.message.includes('Failed to fetch') || !this.isBackendOnline) {
        console.info('Simulando resposta de Login via Demo Mode');
        return {
          requer_2fa: true,
          metodo: 'email',
          email_mascarado: cleanEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
          expira_em_min: 10,
          token_temporario: 'demo_token_2fa_' + Date.now()
        };
      }
      throw err;
    }
  }

  async verify2FA(token_temporario, codigo) {
    try {
      return await this.request('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token_temporario, codigo })
      });
    } catch (err) {
      if (err.message.includes('Failed to fetch') || !this.isBackendOnline) {
        // Aceita qualquer código de 6 dígitos no modo demonstração
        if (codigo && codigo.length === 6) {
          const email = this.currentLoginEmail || sessionStorage.getItem('mfa_email') || localStorage.getItem('pending_login_email') || '';
          const usuario = USUARIOS[email];
          if (!usuario) {
            throw new Error('E-mail não autorizado para autenticação.');
          }
          const demoSession = {
            access_token: 'demo_jwt_token_' + usuario.profile,
            refresh_token: 'demo_refresh_' + usuario.profile,
            token_type: 'bearer',
            expires_in: 3600,
            usuario: {
              id_usuario: usuario.id_usuario,
              nome: usuario.nome,
              email: usuario.email,
              perfil: usuario.perfil
            }
          };
          this.setTokens(demoSession.access_token, demoSession.refresh_token);
          localStorage.setItem('user_data', JSON.stringify(demoSession.usuario));
          return demoSession;
        } else {
          throw new Error('Código de 6 dígitos inválido');
        }
      }
      throw err;
    }
  }

  async resend2FA(token_temporario) {
    try {
      return await this.request('/auth/2fa/reenviar', {
        method: 'POST',
        body: JSON.stringify({ token_temporario })
      });
    } catch (err) {
      return { email_mascarado: 'g***@frutas.agro.br', expira_em_min: 10 };
    }
  }

  // ==========================================
  // DASHBOARD RESUMO
  // ==========================================
  async getDashboardResumo() {
    try {
      return await this.request('/dashboard/resumo');
    } catch (err) {
      // Mock realista baseado exatamente no seed.sql e na lógica de vw_lote_saude
      return {
        lotes_monitorados: {
          com_sensor_ativo: 5,
          total: 5,
          percentual: 100
        },
        sensores: {
          ativos: 8,
          total: 10,
          reais: 1, // ESP32 DHT11 ThingSpeak
          simulados: 7
        },
        alertas: {
          abertos: 2,
          reativos: 1,
          preditivos: 1,
          maior_nivel: 'Atenção'
        },
        condicao_geral: {
          nivel: 'boa',
          rotulo: 'Boa',
          lotes_avaliados: 5,
          lotes_criticos: 0,
          lotes_atencao: 1,
          lotes_saudaveis: 4
        },
        resumo_condicoes: {
          janela_horas: 24,
          pct_na_faixa: 98.4,
          leituras_avaliadas: 1420,
          n_leituras_ar: 720,
          temperatura_ar_media: 11.8,
          umidade_ar_media: 92,
          vpd_medio_kpa: 0.84
        },
        fluxo_lotes: {
          total_cadastrados: 12,
          etapas: [
            { status: 'Em produção', qtd: 4 },
            { status: 'Pronto para colheita', qtd: 2 },
            { status: 'Colhido', qtd: 1 },
            { status: 'Em transporte', qtd: 3 },
            { status: 'Armazenado', qtd: 2 },
            { status: 'Finalizado', qtd: 8 }
          ]
        }
      };
    }
  }

  // ==========================================
  // SENSORES IOT
  // ==========================================
  async getSensores() {
    try {
      return await this.request('/sensores');
    } catch (err) {
      return [
        {
          id_sensor: 1,
          nome: 'DHT11 ESP32-C3',
          tipo_sensor: 'DHT11',
          localizacao: 'Câmara Fria 01 - Bancada A',
          channel_id: 3500765,
          status: 'ativo',
          id_lote: 1,
          ambiente: 'ar',
          ultima_leitura: new Date().toISOString(),
          temperatura: 11.4,
          umidade: 92.5,
          origem: 'thingspeak'
        },
        {
          id_sensor: 2,
          nome: 'Sensor Solo Umidade B1',
          tipo_sensor: 'Capacitivo V2',
          localizacao: 'Talhão Manga Tommy - Setor Sul',
          channel_id: null,
          status: 'ativo',
          id_lote: 2,
          ambiente: 'solo',
          ultima_leitura: new Date().toISOString(),
          temperatura: 24.1,
          umidade: 68.0,
          origem: 'simulador'
        },
        {
          id_sensor: 3,
          nome: 'Termohigro Container Reefer 40',
          tipo_sensor: 'Sensirion SHT31',
          localizacao: 'Caminhão Scania Placa RZ-2026',
          channel_id: null,
          status: 'ativo',
          id_lote: 3,
          ambiente: 'ar',
          ultima_leitura: new Date().toISOString(),
          temperatura: 12.1,
          umidade: 91.2,
          origem: 'simulador'
        },
        {
          id_sensor: 4,
          nome: 'Câmara Fria Uva - Silo 2',
          tipo_sensor: 'PT100 + DHT22',
          localizacao: 'Galpão Packing House Petrolina',
          channel_id: null,
          status: 'ativo',
          id_lote: 4,
          ambiente: 'ar',
          ultima_leitura: new Date().toISOString(),
          temperatura: 0.8,
          umidade: 94.0,
          origem: 'simulador'
        }
      ];
    }
  }

  async createSensor(sensorData) {
    try {
      return await this.request('/sensores', {
        method: 'POST',
        body: JSON.stringify(sensorData)
      });
    } catch (err) {
      return { id_sensor: Math.floor(Math.random() * 1000) + 10, ...sensorData };
    }
  }

  // ==========================================
  // LEITURAS CLIMÁTICAS & VPD
  // ==========================================
  async getLeituras(limit = 50) {
    try {
      return await this.request(`/sensor_leituras/resumo-geral?limit=${limit}`);
    } catch (err) {
      const now = Date.now();
      const mock = [];
      for (let i = 0; i < 24; i++) {
        const time = new Date(now - i * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        mock.push({
          hora: time,
          temperatura: Number((11.2 + Math.sin(i / 3) * 0.9).toFixed(1)),
          umidade: Number((92 + Math.cos(i / 2) * 2.5).toFixed(1)),
          vpd: Number((0.82 + Math.sin(i / 4) * 0.05).toFixed(2)),
          sensor_nome: 'DHT11 ESP32-C3',
          origem: 'thingspeak'
        });
      }
      return mock.reverse();
    }
  }

  // ==========================================
  // LOTES DE PRODUÇÃO
  // ==========================================
  async getLotes() {
    try {
      return await this.request('/lotes');
    } catch (err) {
      return [
        {
          id_lote: 1,
          fruta: 'Manga',
          quantidade: 1000,
          unidade: 'kg',
          status: 'Armazenado',
          etapa: 'armazenamento',
          destino: 'Porto de Pecém - CE (Exportação Rotterdam)',
          data_colheita: '2026-10-28',
          selo: 'Saudável'
        },
        {
          id_lote: 2,
          fruta: 'Manga',
          quantidade: 3500,
          unidade: 'kg',
          status: 'Em produção',
          etapa: 'campo',
          destino: 'Mercado Interno (SP)',
          data_colheita: null,
          selo: 'Saudável'
        },
        {
          id_lote: 3,
          fruta: 'Melão',
          quantidade: 2200,
          unidade: 'kg',
          status: 'Em transporte',
          etapa: 'transporte',
          destino: 'Porto de Suape - PE',
          data_colheita: '2026-10-31',
          selo: 'Atenção'
        },
        {
          id_lote: 4,
          fruta: 'Uva',
          quantidade: 1500,
          unidade: 'caixa',
          status: 'Armazenado',
          etapa: 'armazenamento',
          destino: 'Porto de Salvador - BA',
          data_colheita: '2026-10-29',
          selo: 'Saudável'
        }
      ];
    }
  }

  async createLote(data) {
    try {
      return await this.request('/lotes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (err) {
      return { id_lote: Math.floor(Math.random() * 500) + 10, ...data };
    }
  }

  // ==========================================
  // LOGÍSTICA & VIAGENS REFRIGERADAS
  // ==========================================
  async getViagens() {
    try {
      return await this.request('/viagens');
    } catch (err) {
      return [
        {
          id_viagem: 101,
          status_viagem: 'Em trânsito',
          saida: '2026-11-02T06:00:00Z',
          chegada_prevista: '2026-11-02T19:30:00Z',
          id_lote: 3,
          quantidade: 2200,
          unidade: 'kg',
          destino_lote: 'Exportação',
          porto_nome: 'Suape',
          porto_uf: 'PE',
          porto_lat: -8.3900,
          porto_lng: -34.9600,
          origem_nome: 'Fazenda Vale Frutas (Petrolina - PE)',
          origem_lat: -9.3891,
          origem_lng: -40.5027,
          distancia_km: 742,
          caminhao_temp: 11.8,
          risco_valor: 1450.00,
          nivel_risco: 'baixo',
          risco_probabilidade: 0.12
        },
        {
          id_viagem: 102,
          status_viagem: 'Programada',
          saida: '2026-11-03T05:00:00Z',
          chegada_prevista: '2026-11-03T21:00:00Z',
          id_lote: 1,
          quantidade: 1000,
          unidade: 'kg',
          destino_lote: 'Exportação',
          porto_nome: 'Pecém',
          porto_uf: 'CE',
          porto_lat: -3.5400,
          porto_lng: -38.8000,
          origem_nome: 'Packing House Central (Juazeiro - BA)',
          origem_lat: -9.4167,
          origem_lng: -40.5000,
          distancia_km: 810,
          caminhao_temp: 11.2,
          risco_valor: 820.00,
          nivel_risco: 'baixo',
          risco_probabilidade: 0.08
        }
      ];
    }
  }

  // ==========================================
  // ALERTAS REATIVOS E PREDITIVOS
  // ==========================================
  async getAlertas() {
    try {
      return await this.request('/alertas');
    } catch (err) {
      return [
        {
          id_alerta: 1,
          tipo_alerta: 'Temperatura Elevada',
          descricao: 'Container Reefer 40 registrou 13.8°C (limite máx: 13.0°C para Manga)',
          nivel: 'alto',
          status: 'aberto',
          data_hora: new Date(Date.now() - 35 * 60000).toISOString(),
          id_sensor: 3,
          id_lote: 3
        },
        {
          id_alerta: 2,
          tipo_alerta: 'Previsão Térmica na Rota',
          descricao: 'Onda de calor prevista na BR-232 nas próximas 4h (elevação de 3.2°C externa)',
          nivel: 'médio',
          status: 'aberto',
          data_hora: new Date(Date.now() - 90 * 60000).toISOString(),
          id_sensor: null,
          id_lote: 3
        },
        {
          id_alerta: 3,
          tipo_alerta: 'Umidade Abaixo da Faixa',
          descricao: 'Sensor Solo Umidade B1 registrou umidade 58% (recomendado mínimo: 65%)',
          nivel: 'baixo',
          status: 'resolvido',
          data_hora: new Date(Date.now() - 360 * 60000).toISOString(),
          id_sensor: 2,
          id_lote: 2
        }
      ];
    }
  }

  async resolveAlerta(id) {
    try {
      return await this.request(`/alertas/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolvido' })
      });
    } catch (err) {
      return { success: true, id_alerta: id, status: 'resolvido' };
    }
  }

  // ==========================================
  // CLIMA / OPEN-METEO
  // ==========================================
  async getClimaAtual() {
    try {
      return await this.request('/clima/atual');
    } catch (err) {
      return {
        temperatura: 29.4,
        umidade: 54,
        vento_kmh: 18.2,
        probabilidade_chuva: 10,
        condicao: 'Ensolarado',
        cidade: 'Petrolina - PE',
        atualizado_em: new Date().toISOString()
      };
    }
  }

  // ==========================================
  // CONFIGURAÇÕES DE PARÂMETROS / FAIXAS IDEAIS
  // ==========================================
  async getConfigParametros() {
    try {
      return await this.request('/config_parametros');
    } catch (err) {
      return [
        {
          id_config: 1,
          fruta: 'Manga',
          etapa: 'armazenamento',
          temp_min: 10.0,
          temp_max: 13.0,
          umidade_min: 90.0,
          umidade_max: 95.0,
          fonte: 'UC Davis / National Mango Board'
        },
        {
          id_config: 2,
          fruta: 'Uva',
          etapa: 'armazenamento',
          temp_min: -0.5,
          temp_max: 2.0,
          umidade_min: 90.0,
          umidade_max: 95.0,
          fonte: 'UC Davis Postharvest'
        },
        {
          id_config: 3,
          fruta: 'Melão',
          etapa: 'armazenamento',
          temp_min: 10.0,
          temp_max: 12.0,
          umidade_min: 85.0,
          umidade_max: 95.0,
          fonte: 'Embrapa / SciELO'
        }
      ];
    }
  }

  // ==========================================
  // PERSISTÊNCIA DE PERFIL E PREFERÊNCIAS (POSTGRESQL)
  // ==========================================
  async getPreferenciasUsuario(idUsuario) {
    const storageKey = `raiz_prefs_user_${idUsuario}`;
    try {
      const data = await this.request(`/preferencias/usuario/${idUsuario}`);
      if (data && typeof data === 'object') {
        localStorage.setItem(storageKey, JSON.stringify(data));
        return { ...data, _origem: 'database' };
      }
    } catch (err) {
      console.warn(`Usando cache local de preferências para usuário ${idUsuario}:`, err.message);
    }

    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return { ...JSON.parse(cached), _origem: 'cache_local' };
      }
    } catch (e) {
      // ignora erro de parse
    }
    return null;
  }

  async salvarPreferenciasUsuario(idUsuario, payload) {
    const storageKey = `raiz_prefs_user_${idUsuario}`;
    const saved = await this.request(`/preferencias/usuario/${idUsuario}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (saved && typeof saved === 'object') {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    }
    return { ...saved, _origem: 'database' };
  }

  // ==========================================
  // HISTÓRICO DE SAFRA & TALHÕES (POSTGRESQL)
  // ==========================================
  async getHistoricoSafras() {
    try {
      const res = await this.request(`/preferencias/safras?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (res && Array.isArray(res.safras) && res.safras.length > 0) {
        localStorage.setItem('LOCAL_SAFRAS_CACHE', JSON.stringify(res));
        return res;
      }
    } catch (err) {
      console.warn('Sincronização de safras em background:', err.message);
    }

    const salvo = localStorage.getItem('LOCAL_SAFRAS_CACHE');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (parsed && Array.isArray(parsed.safras) && parsed.safras.length > 0) return parsed;
      } catch (e) {}
    }
    return {
      safras: [
        {
          id_safra: 1,
          ciclo: '2025/2026',
          cultura: 'Uva Vitória & Manga Palmer',
          area_ha: 42.5,
          produtividade_ton_ha: 30.2,
          volume_total_ton: 1284.5,
          consumo_agua_m3_ha: 3420,
          brix_medio: 19.4,
          taxa_exportacao_pct: 96.2,
          status: 'Em Andamento',
          destinacao_export_pct: 78,
          destinacao_interno_pct: 16,
          destinacao_industria_pct: 6
        },
        {
          id_safra: 2,
          ciclo: '2024/2025',
          cultura: 'Uva Vitória (Seedless)',
          area_ha: 40.0,
          produtividade_ton_ha: 26.5,
          volume_total_ton: 1060.0,
          consumo_agua_m3_ha: 3760,
          brix_medio: 18.2,
          taxa_exportacao_pct: 89.4,
          status: 'Concluída',
          destinacao_export_pct: 72,
          destinacao_interno_pct: 20,
          destinacao_industria_pct: 8
        },
        {
          id_safra: 3,
          ciclo: '2023/2024',
          cultura: 'Manga Tommy & Uva Crimson',
          area_ha: 38.0,
          produtividade_ton_ha: 24.8,
          volume_total_ton: 942.4,
          consumo_agua_m3_ha: 4120,
          brix_medio: 17.5,
          taxa_exportacao_pct: 82.0,
          status: 'Concluída',
          destinacao_export_pct: 65,
          destinacao_interno_pct: 25,
          destinacao_industria_pct: 10
        }
      ],
      talhoes: [
        {
          id_talhao: 1,
          codigo: 'Talhão A1',
          variedade: 'Uva Vitória (Seedless)',
          porta_enxerto: 'IAC 572',
          ciclo: '2025/2026',
          area_ha: 12.0,
          volume_ton: 388.8,
          produtividade_ton_ha: 32.4,
          brix_medio: 19.8,
          calibres_mm: '21 - 24 mm',
          status: 'Colhido • Exportado'
        },
        {
          id_talhao: 2,
          codigo: 'Talhão A2',
          variedade: 'Uva Vitória (Seedless)',
          porta_enxerto: 'IAC 766',
          ciclo: '2025/2026',
          area_ha: 10.5,
          volume_ton: 323.4,
          produtividade_ton_ha: 30.8,
          brix_medio: 19.2,
          calibres_mm: '20 - 22 mm',
          status: 'Colhido • Exportado'
        },
        {
          id_talhao: 3,
          codigo: 'Talhão B1',
          variedade: 'Manga Palmer',
          porta_enxerto: 'Espada',
          ciclo: '2025/2026',
          area_ha: 11.0,
          volume_ton: 319.0,
          produtividade_ton_ha: 29.0,
          brix_medio: 16.5,
          calibres_mm: '420 - 480 g',
          status: 'Em Trânsito • Pecém'
        },
        {
          id_talhao: 4,
          codigo: 'Talhão B2',
          variedade: 'Uva Thompson Seedless',
          porta_enxerto: 'SO4',
          ciclo: '2025/2026',
          area_ha: 9.0,
          volume_ton: 253.3,
          produtividade_ton_ha: 28.1,
          brix_medio: 18.6,
          calibres_mm: '18 - 20 mm',
          status: 'Em Colheita (85%)'
        }
      ],
      safra_ativa: {
        id_safra: 1,
        ciclo: '2025/2026',
        cultura: 'Uva Vitória & Manga Palmer',
        area_ha: 42.5,
        produtividade_ton_ha: 30.2,
        volume_total_ton: 1284.5,
        consumo_agua_m3_ha: 3420,
        brix_medio: 19.4,
        taxa_exportacao_pct: 96.2,
        status: 'Em Andamento',
        destinacao_export_pct: 78,
        destinacao_interno_pct: 16,
        destinacao_industria_pct: 6
      }
    };
  }

  async criarSafra(payload) {
    return await this.request('/preferencias/safras', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async atualizarSafra(idSafra, payload) {
    return await this.request(`/preferencias/safras/${idSafra}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async atualizarTalhao(idTalhao, payload) {
    return await this.request(`/preferencias/talhoes/${idTalhao}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // ==========================================
  // ESTADO DOS ALERTAS OPERACIONAIS (POSTGRESQL)
  // ==========================================
  async getEstadoAlertas() {
    try {
      const res = await this.request(`/preferencias/alertas?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (res && Array.isArray(res.alertas)) {
        localStorage.setItem('LOCAL_ALERTAS_CACHE', JSON.stringify(res.alertas));
        return res;
      }
    } catch (err) {
      console.warn('Sincronização de alertas em background:', err.message);
    }

    const salvo = localStorage.getItem('LOCAL_ALERTAS_CACHE');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) return { alertas: parsed, offline: true };
      } catch (e) {}
    }
    return {
      alertas: [
        { codigo_alerta: 'P1-REEFER-EXP-2026-08', status: 'pendente', prioridade: 'P1' },
        { codigo_alerta: 'P2-SOLO-TALHAO-A1', status: 'pendente', prioridade: 'P2' },
        { codigo_alerta: 'PRED-VPD-SETOR-04', status: 'pendente', prioridade: 'IA' },
        { codigo_alerta: 'ALT-2026-001', status: 'pendente', prioridade: 'P1' },
        { codigo_alerta: 'ALT-2026-002', status: 'pendente', prioridade: 'P2' },
        { codigo_alerta: 'ALT-2026-003', status: 'pendente', prioridade: 'P3' }
      ],
      resumo: {
        total_pendentes: 6,
        total_atendidos: 0,
        gestora_ativos: 3,
        gestora_criticos: 1,
        gestora_moderados: 2,
        analista_ativos: 3
      },
      offline: true
    };
  }

  async atualizarStatusAlerta(codigoAlerta, payload) {
    try {
      const res = await this.request(`/preferencias/alertas/${encodeURIComponent(codigoAlerta)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      // Sincroniza cache local
      const salvo = localStorage.getItem('LOCAL_ALERTAS_CACHE');
      if (salvo) {
        try {
          let lista = JSON.parse(salvo);
          const idx = lista.findIndex(a => a.codigo_alerta === codigoAlerta);
          if (idx >= 0 && res?.alerta) {
            lista[idx] = res.alerta;
            localStorage.setItem('LOCAL_ALERTAS_CACHE', JSON.stringify(lista));
          }
        } catch (e) {}
      }
      return res;
    } catch (err) {
      // Grava no cache local para resiliência imediata
      const salvo = localStorage.getItem('LOCAL_ALERTAS_CACHE');
      let lista = salvo ? JSON.parse(salvo) : [];
      const idx = lista.findIndex(a => a.codigo_alerta === codigoAlerta);
      const fakeAlerta = { codigo_alerta: codigoAlerta, status: payload.status, acao_tomada: payload.acao_tomada || '' };
      if (idx >= 0) lista[idx] = { ...lista[idx], ...payload };
      else lista.push(fakeAlerta);
      localStorage.setItem('LOCAL_ALERTAS_CACHE', JSON.stringify(lista));
      return { alerta: fakeAlerta, offline: true };
    }
  }

  async reconhecerTodosAlertas(perfil = '', reset = false) {
    const qs = `?perfil=${encodeURIComponent(perfil)}&reset=${Boolean(reset)}`;
    return await this.request(`/preferencias/alertas/reconhecer-todos${qs}`, {
      method: 'POST'
    });
  }

  // ==========================================
  // DADOS DE TELEMETRIA E GRÁFICOS (POSTGRESQL)
  // ==========================================
  async getDadosGraficos() {
    try {
      const res = await this.request(`/preferencias/graficos?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (res) {
        localStorage.setItem('LOCAL_GRAFICOS_CACHE', JSON.stringify(res));
      }
      return res;
    } catch (err) {
      const salvo = localStorage.getItem('LOCAL_GRAFICOS_CACHE');
      if (salvo) {
        try {
          return JSON.parse(salvo);
        } catch (e) {}
      }
      return null;
    }
  }

  async salvarDadosGraficos(payload) {
    return await this.request('/preferencias/graficos', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
}

export const api = new ApiService();

