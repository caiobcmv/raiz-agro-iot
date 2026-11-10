/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO, SESSÃO MULTI-PERFIL E PREFERÊNCIAS PERSISTIDAS NO BANCO
 * Suporta 3 perfis dinâmicos vinculados ao PostgreSQL:
 * 1. Gestora de Operações: Maria Clara (id_usuario: 1)
 * 2. Analista IoT & Telemetria: Luiz Felipe (id_usuario: 2)
 * 3. Administradora da Plataforma: Lorena Lira (id_usuario: 3)
 */

import { api } from './api.js';
import { toast } from './components/toast.js';

export const USUARIOS = {
  'lorena.lira@raizagro.agr.br': {
    id_usuario: 3,
    nome: 'Lorena Lira',
    email: 'lorena.lira@raizagro.agr.br',
    perfil: 'Administradora da Plataforma',
    profile: 'admin'
  },
  'maria.clara@raizagro.agr.br': {
    id_usuario: 1,
    nome: 'Maria Clara',
    email: 'maria.clara@raizagro.agr.br',
    perfil: 'Gestora de Operações',
    profile: 'gestor'
  },
  'luiz.felipe@raizagro.agr.br': {
    id_usuario: 2,
    nome: 'Luiz Felipe',
    email: 'luiz.felipe@raizagro.agr.br',
    perfil: 'Analista IoT & Telemetria',
    profile: 'analista'
  }
};

export const EMAILS_AUTORIZADOS = Object.keys(USUARIOS);

const AVATAR_PALETTES = {
  emerald: { bg: '#D1FAE5', border: '#10B981', color: '#065F46' },
  forest:  { bg: '#DCFCE7', border: '#86EFAC', color: '#166534' },
  sky:     { bg: '#E0F2FE', border: '#0284C7', color: '#0369A1' },
  amber:   { bg: '#FEF3C7', border: '#F59E0B', color: '#92400E' },
  purple:  { bg: '#EDE9FE', border: '#8B5CF6', color: '#5B21B6' },
  rose:    { bg: '#FFE4E6', border: '#F43F5E', color: '#9F1239' }
};

class AuthState {
  constructor() {
    this.user = this.loadUser();
    this.activeProfile = this.getActiveProfile();
    this.preferences = this.loadLocalPreferences();
    this.applyVisualPreferences();
  }

  loadUser() {
    try {
      const data = localStorage.getItem('user_data');
      if (data && data !== 'undefined' && data !== 'null') {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.email) {
          const email = String(parsed.email).trim().toLowerCase();
          if (USUARIOS[email]) {
            return {
              ...USUARIOS[email],
              ...parsed,
              email
            };
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar usuário da sessão:', e);
    }
    return null;
  }

  loadLocalPreferences() {
    const uid = this.user?.id_usuario;
    if (!uid) return {};
    try {
      const raw = localStorage.getItem(`raiz_prefs_user_${uid}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  getActiveProfile() {
    if (!this.user) {
      this.user = this.loadUser();
    }
    if (this.user && this.user.email) {
      const email = String(this.user.email).trim().toLowerCase();
      if (USUARIOS[email]) {
        return USUARIOS[email].profile;
      }
    }
    return null;
  }

  async startSession(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const usuario = USUARIOS[cleanEmail];
    if (!usuario) {
      return false;
    }

    this.user = { ...usuario };
    this.activeProfile = usuario.profile;

    try {
      localStorage.setItem('user_data', JSON.stringify(this.user));
      localStorage.setItem('ACTIVE_PROFILE', this.activeProfile);
    } catch (e) {
      console.warn('Erro ao salvar sessão no localStorage:', e);
    }

    // Carrega preferências salvas no banco de dados vinculadas ao ID do usuário
    await this.syncPreferencesFromDB();

    window.dispatchEvent(new CustomEvent('profile-changed', {
      detail: { profile: this.activeProfile, user: this.user, preferences: this.preferences }
    }));
    return true;
  }

  async syncPreferencesFromDB() {
    if (!this.user || !this.user.id_usuario) return null;
    try {
      const prefs = await api.getPreferenciasUsuario(this.user.id_usuario);
      if (prefs) {
        this.preferences = prefs;
        if (prefs.nome) this.user.nome = prefs.nome;
        if (prefs.cargo) this.user.cargo = prefs.cargo;
        localStorage.setItem('user_data', JSON.stringify(this.user));
        this.applyVisualPreferences();
        this.refreshHeaderAndSidebarDOM();
        return prefs;
      }
    } catch (e) {
      console.warn('Falha ao sincronizar preferências do banco:', e);
    }
    return null;
  }

  async savePreferencesToDB(payload) {
    if (!this.user || !this.user.id_usuario) {
      throw new Error('Usuário não autenticado.');
    }
    const mergedPayload = {
      nome: payload.nome ?? this.preferences?.nome ?? this.user.nome,
      cargo: payload.cargo ?? this.preferences?.cargo ?? this.getProfileData().cargo,
      bio: payload.bio ?? this.preferences?.bio ?? '',
      telefone: payload.telefone ?? this.preferences?.telefone ?? '',
      avatar_iniciais: payload.avatar_iniciais ?? this.preferences?.avatar_iniciais ?? this.getProfileData().iniciais,
      avatar_cor: payload.avatar_cor ?? this.preferences?.avatar_cor ?? 'emerald',
      avatar_url: payload.avatar_url ?? this.preferences?.avatar_url ?? '',
      tema: payload.tema ?? this.preferences?.tema ?? 'claro',
      efeitos_visuais: payload.efeitos_visuais ?? this.preferences?.efeitos_visuais ?? true,
      atualizacao_tempo_real: payload.atualizacao_tempo_real ?? this.preferences?.atualizacao_tempo_real ?? true,
      idioma: payload.idioma ?? this.preferences?.idioma ?? 'pt-BR',
      fuso_horario: payload.fuso_horario ?? this.preferences?.fuso_horario ?? 'America/Recife',
      moeda: payload.moeda ?? this.preferences?.moeda ?? 'BRL',
      notificacoes_json: payload.notificacoes_json ?? this.preferences?.notificacoes_json ?? {},
      propriedade_json: payload.propriedade_json ?? this.preferences?.propriedade_json ?? {},
      preferencias_extras: payload.preferencias_extras ?? this.preferences?.preferencias_extras ?? {}
    };

    const saved = await api.salvarPreferenciasUsuario(this.user.id_usuario, mergedPayload);
    this.preferences = saved;
    if (saved.nome) this.user.nome = saved.nome;
    if (saved.cargo) this.user.cargo = saved.cargo;
    localStorage.setItem('user_data', JSON.stringify(this.user));

    this.applyVisualPreferences();
    this.refreshHeaderAndSidebarDOM();

    window.dispatchEvent(new CustomEvent('preferences-updated', {
      detail: { preferences: this.preferences, profile: this.getProfileData() }
    }));

    return saved;
  }

  applyVisualPreferences() {
    if (typeof document === 'undefined') return;
    const prefs = this.preferences || this.loadLocalPreferences() || {};
    const tema = prefs.tema || 'claro';
    const efeitos = prefs.efeitos_visuais !== false;
    const tempoReal = prefs.atualizacao_tempo_real !== false;

    document.documentElement.setAttribute('data-theme', tema);
    document.documentElement.setAttribute('data-visual-effects', efeitos ? 'on' : 'off');
    document.documentElement.setAttribute('data-realtime', tempoReal ? 'on' : 'off');
  }

  refreshHeaderAndSidebarDOM() {
    if (typeof document === 'undefined') return;
    const profile = this.getProfileData();
    const headerPill = document.getElementById('user-profile-header-pill');
    if (headerPill) {
      const avatarEl = headerPill.querySelector('.avatar-initials-pill');
      const nameEl = headerPill.querySelector('.profile-name');
      const roleEl = headerPill.querySelector('.profile-role');
      if (avatarEl) {
        avatarEl.textContent = profile.iniciais;
        avatarEl.style.background = profile.avatarBg;
        avatarEl.style.borderColor = profile.avatarBorder;
        avatarEl.style.color = profile.avatarColor;
      }
      if (nameEl) nameEl.textContent = profile.nome;
      if (roleEl) roleEl.textContent = profile.cargo;
    }

    const sidebarFarmName = document.querySelector('.sidebar .farm-name');
    const sidebarFarmSub = document.querySelector('.sidebar .farm-sub');
    if (sidebarFarmName) sidebarFarmName.textContent = profile.farm;
    if (sidebarFarmSub) sidebarFarmSub.textContent = profile.farmSub;
  }

  getPreferences() {
    if (!this.preferences || Object.keys(this.preferences).length === 0) {
      this.preferences = this.loadLocalPreferences();
    }
    return this.preferences || {};
  }

  getProfileData() {
    const current = this.getActiveProfile();
    const prefs = this.getPreferences();
    const propJson = prefs.propriedade_json || {};

    let base;
    if (current === 'admin') {
      base = {
        id: 'admin',
        id_usuario: 3,
        nome: 'Lorena Lira',
        sobrenome: 'Lira',
        cargo: 'Administradora',
        tituloCompleto: 'Administradora da Plataforma',
        iniciais: 'LL',
        email: 'lorena.lira@raizagro.agr.br',
        paletteKey: 'forest',
        avatarBg: '#DCFCE7',
        avatarBorder: '#86EFAC',
        avatarColor: '#166534',
        gatewayPill: 'LoRa Gateway',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04',
        bio: 'Responsável pela governança de usuários, regras agronômicas e auditoria criptográfica.'
      };
    } else if (current === 'analista') {
      base = {
        id: 'analista',
        id_usuario: 2,
        nome: 'Luiz Felipe',
        sobrenome: 'Almeida',
        cargo: 'Analista',
        tituloCompleto: 'Analista IoT & Telemetria',
        iniciais: 'LF',
        email: 'luiz.felipe@raizagro.agr.br',
        paletteKey: 'sky',
        avatarBg: '#E0F2FE',
        avatarBorder: '#0284C7',
        avatarColor: '#0369A1',
        gatewayPill: 'LoRa Gateway',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04',
        bio: 'Especialista em telemetria LoRaWAN, calibração de nós ESP32 e análise preditiva.'
      };
    } else {
      base = {
        id: 'gestor',
        id_usuario: 1,
        nome: 'Maria Clara',
        sobrenome: 'Souza',
        cargo: 'Gestora Técnica',
        tituloCompleto: 'Gestora de Operações',
        iniciais: 'MC',
        email: 'maria.clara@raizagro.agr.br',
        paletteKey: 'emerald',
        avatarBg: '#D1FAE5',
        avatarBorder: '#10B981',
        avatarColor: '#065F46',
        gatewayPill: 'ESP32',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04',
        bio: 'Gestão operacional de colheita, irrigação de precisão e logística de cadeia fria.'
      };
    }

    const chosenPaletteKey = prefs.avatar_cor && AVATAR_PALETTES[prefs.avatar_cor] ? prefs.avatar_cor : base.paletteKey;
    const palette = AVATAR_PALETTES[chosenPaletteKey] || AVATAR_PALETTES.emerald;

    return {
      ...base,
      nome: prefs.nome || base.nome,
      cargo: prefs.cargo || base.cargo,
      iniciais: (prefs.avatar_iniciais || base.iniciais).toUpperCase().slice(0, 3),
      bio: prefs.bio !== undefined && prefs.bio !== null && prefs.bio !== '' ? prefs.bio : base.bio,
      telefone: prefs.telefone || '(87) 99842-1104',
      paletteKey: chosenPaletteKey,
      avatarBg: palette.bg,
      avatarBorder: palette.border,
      avatarColor: palette.color,
      farm: propJson.farmName || base.farm,
      farmSub: propJson.farmSub || base.farmSub,
      tema: prefs.tema || 'claro',
      efeitos_visuais: prefs.efeitos_visuais !== false,
      atualizacao_tempo_real: prefs.atualizacao_tempo_real !== false,
      moeda: prefs.moeda || 'BRL',
      idioma: prefs.idioma || 'pt-BR',
      fuso_horario: prefs.fuso_horario || 'America/Recife'
    };
  }

  isAuthenticated() {
    if (!this.user) {
      this.user = this.loadUser();
    }
    if (!this.user || !this.user.email) {
      return false;
    }
    const cleanEmail = String(this.user.email).trim().toLowerCase();
    if (!USUARIOS[cleanEmail]) {
      return false;
    }
    const token = api.getToken() || localStorage.getItem('access_token');
    return Boolean(token);
  }

  getUser() {
    return this.user;
  }

  setUser(userData) {
    this.user = userData;
    if (userData) {
      try {
        localStorage.setItem('user_data', JSON.stringify(userData));
      } catch (e) {
        console.warn('Erro ao salvar user_data no localStorage:', e);
      }
    } else {
      localStorage.removeItem('user_data');
    }
  }

  logout() {
    api.clearTokens();
    this.user = null;
    this.activeProfile = null;
    this.preferences = {};
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('ACTIVE_PROFILE');
    localStorage.removeItem('pending_login_email');
    document.documentElement.setAttribute('data-theme', 'claro');
    toast.info('Sessão encerrada', 'Você saiu com segurança do sistema.');
    window.location.hash = '#/login';
  }
}

export const auth = new AuthState();
