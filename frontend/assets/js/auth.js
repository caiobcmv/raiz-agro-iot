/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO E SESSÃO MULTI-PERFIL
 * Suporta 3 perfis dinâmicos:
 * 1. Analista IoT & Telemetria: Luiz Felipe
 * 2. Gestora de Operações: Maria Clara
 * 3. Administradora da Plataforma: Lorena Lira
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

class AuthState {
  constructor() {
    this.user = this.loadUser();
    this.activeProfile = this.getActiveProfile();
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

  startSession(email) {
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

    window.dispatchEvent(new CustomEvent('profile-changed', {
      detail: { profile: this.activeProfile, user: this.user }
    }));
    return true;
  }

  getProfileData() {
    const current = this.getActiveProfile();

    if (current === 'admin') {
      return {
        id: 'admin',
        nome: 'Lorena Lira',
        sobrenome: 'Lira',
        cargo: 'Administradora',
        tituloCompleto: 'Administradora da Plataforma',
        iniciais: 'LL',
        email: 'lorena.lira@raizagro.agr.br',
        avatarBg: '#DCFCE7',
        avatarBorder: '#86EFAC',
        avatarColor: '#166534',
        gatewayPill: 'LoRa Gateway',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04'
      };
    } else if (current === 'analista') {
      return {
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
        gatewayPill: 'LoRa Gateway',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04'
      };
    } else {
      return {
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
        gatewayPill: 'ESP32',
        gatewayStatus: 'Conectado',
        farm: 'Vale das Uvas',
        farmSub: 'Petrolina - Setor 04'
      };
    }
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
