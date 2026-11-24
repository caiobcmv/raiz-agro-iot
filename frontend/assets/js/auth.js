/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO E SESSÃO MULTI-PERFIL (100% REAL - POSTGRESQL)
 * Sem listas de usuários hardcoded; o perfil e dados do usuário vêm estritamente de /auth/me.
 */

import { api } from './api.js';
import { toast } from './components/toast.js';

export const AVATAR_PALETTES = {
  esmeralda: { bg: '#D1FAE5', border: '#10B981', color: '#065F46', name: 'Esmeralda' },
  floresta:  { bg: '#DCFCE7', border: '#22C55E', color: '#14532D', name: 'Floresta' },
  azul:      { bg: '#DBEAFE', border: '#3B82F6', color: '#1E3A8A', name: 'Azul Céu' },
  ambar:     { bg: '#FEF3C7', border: '#F59E0B', color: '#78350F', name: 'Âmbar' },
  violeta:   { bg: '#EDE9FE', border: '#8B5CF6', color: '#4C1D95', name: 'Violeta' },
  rosa:      { bg: '#FCE7F3', border: '#EC4899', color: '#831843', name: 'Rosa' },
  emerald:   { bg: '#D1FAE5', border: '#10B981', color: '#065F46', name: 'Esmeralda' },
  forest:    { bg: '#DCFCE7', border: '#22C55E', color: '#14532D', name: 'Floresta' },
  sky:       { bg: '#DBEAFE', border: '#3B82F6', color: '#1E3A8A', name: 'Azul Céu' },
  amber:     { bg: '#FEF3C7', border: '#F59E0B', color: '#78350F', name: 'Âmbar' },
  violet:    { bg: '#EDE9FE', border: '#8B5CF6', color: '#4C1D95', name: 'Violeta' },
  pink:      { bg: '#FCE7F3', border: '#EC4899', color: '#831843', name: 'Rosa' }
};

function resolverChavePerfil(perfilStr) {
  const p = String(perfilStr || '').toLowerCase();
  if (p.includes('admin')) return 'admin';
  if (p.includes('analista')) return 'analista';
  return 'gestor';
}

function extrairIniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'US';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

class AuthState {
  constructor() {
    this.user = this.loadUser();
    this.activeProfile = this.getActiveProfile();
    this.preferences = this.loadLocalPreferences();
    this._pending2FA = null;
    this.applyVisualPreferences();
  }

  // ==========================================
  // ESTADO TEMPORÁRIO DE 2FA (APENAS EM MEMÓRIA)
  // ==========================================
  setPending2FA(data) {
    if (!data) {
      this._pending2FA = null;
      return;
    }
    this._pending2FA = {
      token_temporario: data.token_temporario,
      metodo: data.metodo || 'email',
      expira_em_min: data.expira_em_min || 10,
      email_mascarado: data.email_mascarado || '',
      email: data.email || ''
    };
  }

  getPending2FA() {
    return this._pending2FA || null;
  }

  clearPending2FA() {
    this._pending2FA = null;
  }

  saveAvatarTheme(colorKey) {
    const active = this.getActiveProfile() || 'gestor';
    const palette = AVATAR_PALETTES[colorKey] || AVATAR_PALETTES.esmeralda;
    localStorage.setItem('USER_AVATAR_KEY', colorKey);
    localStorage.setItem('user_avatar_key_' + active, colorKey);
    localStorage.setItem('USER_AVATAR_THEME', JSON.stringify(palette));

    document.querySelectorAll('.avatar-initials-pill').forEach(el => {
      el.style.background = palette.bg;
      el.style.borderColor = palette.border;
      el.style.color = palette.color;
    });
    const avatarDisplay = document.getElementById('profile-avatar-display');
    if (avatarDisplay) {
      avatarDisplay.style.background = palette.bg;
      avatarDisplay.style.borderColor = palette.border;
      avatarDisplay.style.color = palette.color;
    }

    window.dispatchEvent(new CustomEvent('avatar-color-changed', { detail: { colorKey, palette } }));
    return palette;
  }

  loadUser() {
    try {
      const data = localStorage.getItem('user_data');
      if (data && data !== 'undefined' && data !== 'null') {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && (parsed.email || parsed.id_usuario)) {
          return parsed;
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
    if (this.user) {
      return resolverChavePerfil(this.user.perfil || this.user.profile);
    }
    return null;
  }

  async startSession(userObj = null) {
    let usuario = userObj && typeof userObj === 'object' && (userObj.id_usuario || userObj.perfil) ? userObj : null;
    if (!usuario && api.getToken()) {
      try {
        usuario = await api.getMe();
      } catch (err) {
        console.warn('Não foi possível obter dados frescos de /auth/me:', err);
      }
    }
    if (!usuario) {
      usuario = this.loadUser();
    }
    if (!usuario) {
      return false;
    }

    const profileKey = resolverChavePerfil(usuario.perfil || usuario.profile);
    this.user = { ...usuario, profile: profileKey };
    this.activeProfile = profileKey;

    try {
      localStorage.setItem('user_data', JSON.stringify(this.user));
      localStorage.setItem('ACTIVE_PROFILE', this.activeProfile);
    } catch (e) {
      console.warn('Erro ao salvar sessão no localStorage:', e);
    }

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
      if (prefs && typeof prefs === 'object') {
        this.preferences = Array.isArray(prefs) ? { canais: prefs } : prefs;
        this.applyVisualPreferences();
        this.refreshHeaderAndSidebarDOM();
        return this.preferences;
      }
    } catch (e) {
      console.warn('Falha ao sincronizar preferências do banco:', e.message);
    }
    return null;
  }

  async savePreferencesToDB(payload) {
    if (!this.user || !this.user.id_usuario) {
      throw new Error('Usuário não autenticado.');
    }
    const saved = await api.salvarPreferenciasUsuario(this.user.id_usuario, payload);
    this.preferences = saved || payload;
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
    if (sidebarFarmName && profile.farm) sidebarFarmName.textContent = profile.farm;
    if (sidebarFarmSub && profile.farmSub) sidebarFarmSub.textContent = profile.farmSub;
  }

  getPreferences() {
    if (!this.preferences || Object.keys(this.preferences).length === 0) {
      this.preferences = this.loadLocalPreferences();
    }
    return this.preferences || {};
  }

  getProfileData() {
    const user = this.user || this.loadUser() || {};
    const current = this.getActiveProfile() || 'gestor';
    const prefs = this.getPreferences();
    const propJson = prefs.propriedade_json || {};

    const defaultPaletteKey = current === 'admin' ? 'forest' : (current === 'analista' ? 'sky' : 'emerald');
    const localAvatarKey = localStorage.getItem('user_avatar_key_' + current) || localStorage.getItem('USER_AVATAR_KEY');
    const chosenPaletteKey = (localAvatarKey && AVATAR_PALETTES[localAvatarKey])
      ? localAvatarKey
      : (prefs.avatar_cor && AVATAR_PALETTES[prefs.avatar_cor] ? prefs.avatar_cor : defaultPaletteKey);
    const palette = AVATAR_PALETTES[chosenPaletteKey] || AVATAR_PALETTES.emerald;

    const nome = prefs.nome || user.nome || 'Usuário';
    const cargo = prefs.cargo || user.perfil || (current === 'admin' ? 'Administrador' : current === 'analista' ? 'Analista de Dados' : 'Produtor/Exportador');

    return {
      id: current,
      id_usuario: user.id_usuario || null,
      nome,
      cargo,
      tituloCompleto: user.perfil || cargo,
      iniciais: (prefs.avatar_iniciais || extrairIniciais(nome)).toUpperCase().slice(0, 3),
      email: user.email || '',
      bio: prefs.bio || '',
      telefone: prefs.telefone || '',
      paletteKey: chosenPaletteKey,
      avatarKey: chosenPaletteKey,
      avatarBg: palette.bg,
      avatarBorder: palette.border,
      avatarColor: palette.color,
      farm: propJson.farmName || '',
      farmSub: propJson.farmSub || '',
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
    const token = api.getToken() || localStorage.getItem('access_token');
    return Boolean(this.user && token);
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-logout'));
    }
    api.clearTokens();
    this.user = null;
    this.activeProfile = null;
    this.preferences = {};
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    document.documentElement.setAttribute('data-theme', 'claro');
    toast.info('Sessão encerrada', 'Você saiu com segurança do sistema.');
    window.location.hash = '#/login';
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }
}

export const auth = new AuthState();
