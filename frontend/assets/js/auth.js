/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO E SESSÃO
 * O perfil é estritamente definido pela conta autenticada:
 * - maria.clara@raizagro.agr.br: Gestora de Operações (perfil 'gestor')
 * - luiz.felipe@raizagro.agr.br: Analista IoT & Telemetria (perfil 'analista')
 * A troca de perfil só é permitida mediante logout e novo login.
 */

import { api } from './api.js';
import { toast } from './components/toast.js';

export const AVATAR_PALETTES = {
  esmeralda: { bg: '#D1FAE5', border: '#10B981', color: '#065F46', name: 'Esmeralda' },
  floresta:  { bg: '#DCFCE7', border: '#22C55E', color: '#14532D', name: 'Floresta' },
  azul:      { bg: '#DBEAFE', border: '#3B82F6', color: '#1E3A8A', name: 'Azul Céu' },
  ambar:     { bg: '#FEF3C7', border: '#F59E0B', color: '#78350F', name: 'Âmbar' },
  violeta:   { bg: '#EDE9FE', border: '#8B5CF6', color: '#4C1D95', name: 'Violeta' },
  rosa:      { bg: '#FCE7F3', border: '#EC4899', color: '#831843', name: 'Rosa' }
};

class AuthState {
  constructor() {
    this.user = this.loadUser();
    this.activeProfile = this.loadActiveProfile();
  }

  saveAvatarTheme(colorKey) {
    const active = this.getActiveProfile();
    const profileId = active === 'analista' ? 'analista' : 'gestor';
    const palette = AVATAR_PALETTES[colorKey] || AVATAR_PALETTES.esmeralda;
    localStorage.setItem('USER_AVATAR_KEY', colorKey);
    localStorage.setItem('user_avatar_key_' + profileId, colorKey);
    localStorage.setItem('user_avatar_key_gestor', colorKey);
    localStorage.setItem('user_avatar_key_analista', colorKey);
    localStorage.setItem('USER_AVATAR_THEME', JSON.stringify(palette));
    
    // Atualização imediata no DOM em tempo real
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
        if (parsed && typeof parsed === 'object' && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar usuário da sessão:', e);
    }
    return null;
  }

  loadActiveProfile() {
    if (this.user) {
      if (this.user.email === 'luiz.felipe@raizagro.agr.br') return 'analista';
      if (this.user.email === 'maria.clara@raizagro.agr.br') return 'gestor';
    }
    const stored = localStorage.getItem('ACTIVE_PROFILE');
    if (stored === 'analista' || stored === 'gestor') {
      return stored;
    }
    return null;
  }

  getActiveProfile() {
    if (this.user) {
      if (this.user.email === 'luiz.felipe@raizagro.agr.br') return 'analista';
      if (this.user.email === 'maria.clara@raizagro.agr.br') return 'gestor';
    }
    const stored = localStorage.getItem('ACTIVE_PROFILE');
    if (stored === 'analista' || stored === 'gestor') return stored;
    return 'gestor';
  }

  setActiveProfile(profile) {
    this.activeProfile = profile === 'analista' ? 'analista' : 'gestor';
    localStorage.setItem('ACTIVE_PROFILE', this.activeProfile);
    window.dispatchEvent(new CustomEvent('profile-changed', { detail: { profile: this.activeProfile } }));
  }

  getProfileData() {
    const isAnalista = this.getActiveProfile() === 'analista';
    const profile = isAnalista ? {
      id: 'analista',
      nome: 'Luiz Felipe',
      sobrenome: 'Almeida',
      cargo: 'Analista',
      tituloCompleto: 'Analista IoT & Telemetria',
      iniciais: 'LF',
      email: 'luiz.felipe@raizagro.agr.br',
      avatarBg: '#E0F2FE',
      avatarBorder: '#0284C7',
      avatarColor: '#0369A1',
      avatarKey: 'azul',
      gatewayPill: 'LoRa Gateway',
      gatewayStatus: 'Conectado',
      farm: 'Vale das Uvas',
      farmSub: 'Petrolina - Setor 04'
    } : {
      id: 'gestor',
      nome: 'Maria Clara',
      sobrenome: 'Souza',
      cargo: 'Gestora Técnica',
      tituloCompleto: 'Gestora de Operações',
      iniciais: 'MC',
      email: 'maria.clara@raizagro.agr.br',
      avatarBg: '#D1FAE5',
      avatarBorder: '#10B981',
      avatarColor: '#065F46',
      avatarKey: 'esmeralda',
      gatewayPill: 'ESP32',
      gatewayStatus: 'Conectado',
      farm: 'Vale das Uvas',
      farmSub: 'Petrolina - Setor 04'
    };

    const savedKey = localStorage.getItem('user_avatar_key_' + profile.id) || localStorage.getItem('USER_AVATAR_KEY');
    if (savedKey && AVATAR_PALETTES[savedKey]) {
      const p = AVATAR_PALETTES[savedKey];
      profile.avatarKey = savedKey;
      profile.avatarBg = p.bg;
      profile.avatarBorder = p.border;
      profile.avatarColor = p.color;
    }
    return profile;
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
      localStorage.setItem('user_data', JSON.stringify(userData));
      if (userData.email === 'luiz.felipe@raizagro.agr.br') {
        this.setActiveProfile('analista');
      } else if (userData.email === 'maria.clara@raizagro.agr.br') {
        this.setActiveProfile('gestor');
      }
    } else {
      localStorage.removeItem('user_data');
    }
  }

  logout() {
    api.clearTokens();
    this.user = null;
    this.activeProfile = null;
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('ACTIVE_PROFILE');
    localStorage.removeItem('pending_login_email');
    toast.info('Sessão encerrada', 'Você saiu com segurança do sistema.');
    window.location.hash = '#/login';
  }
}

export const auth = new AuthState();
