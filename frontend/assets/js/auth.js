/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO E SESSÃO MULTI-PERFIL
 * Suporta 3 perfis dinâmicos:
 * 1. Analista IoT: Luiz Felipe (Telemetria, ESP32, MESH, Modelos Preditivos)
 * 2. Gestora Operações: Maria Clara (Visão Executiva, Talhões, Cadeia Fria, Produtividade)
 * 3. Administrador Geral: Carlos Silva (Governança RBAC, Lotes & Safra, Auditoria, Políticas Globais)
 */

import { api } from './api.js';
import { toast } from './components/toast.js';

class AuthState {
  constructor() {
    this.user = this.loadUser();
    this.activeProfile = this.loadActiveProfile();
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

    const currentProfile = this.getActiveProfile();
    let defaultUser;

    if (currentProfile === 'admin') {
      defaultUser = {
        id_usuario: 3,
        nome: 'Carlos Silva',
        email: 'carlos.silva@raizagro.agr.br',
        perfil: 'Administrador da Plataforma'
      };
    } else if (currentProfile === 'analista') {
      defaultUser = {
        id_usuario: 2,
        nome: 'Luiz Felipe',
        email: 'luiz.felipe@raizagro.agr.br',
        perfil: 'Analista IoT & Telemetria'
      };
    } else {
      defaultUser = {
        id_usuario: 1,
        nome: 'Maria Clara',
        email: 'maria.clara@raizagro.agr.br',
        perfil: 'Gestora de Operações'
      };
    }

    try {
      localStorage.setItem('user_data', JSON.stringify(defaultUser));
      if (!localStorage.getItem('access_token')) {
        localStorage.setItem('access_token', 'demo_token_' + currentProfile);
      }
    } catch (e) { }

    return defaultUser;
  }

  loadActiveProfile() {
    return localStorage.getItem('ACTIVE_PROFILE') || 'admin';
  }

  getActiveProfile() {
    return this.activeProfile || 'admin';
  }

  setActiveProfile(profile) {
    if (profile === 'admin' || profile === 'gestor' || profile === 'analista') {
      this.activeProfile = profile;
    } else {
      this.activeProfile = 'admin';
    }
    localStorage.setItem('ACTIVE_PROFILE', this.activeProfile);

    // Atualiza dados do usuário correspondente
    if (this.activeProfile === 'admin') {
      this.setUser({
        id_usuario: 3,
        nome: 'Carlos Silva',
        email: 'carlos.silva@raizagro.agr.br',
        perfil: 'Administrador da Plataforma'
      });
    } else if (this.activeProfile === 'analista') {
      this.setUser({
        id_usuario: 2,
        nome: 'Luiz Felipe',
        email: 'luiz.felipe@raizagro.agr.br',
        perfil: 'Analista IoT & Telemetria'
      });
    } else {
      this.setUser({
        id_usuario: 1,
        nome: 'Maria Clara',
        email: 'maria.clara@raizagro.agr.br',
        perfil: 'Gestora de Operações'
      });
    }

    window.dispatchEvent(new CustomEvent('profile-changed', { detail: { profile: this.activeProfile } }));
  }

  toggleProfile() {
    const current = this.getActiveProfile();
    let next = 'admin';
    if (current === 'analista') next = 'gestor';
    else if (current === 'gestor') next = 'admin';
    else next = 'analista';
    this.setActiveProfile(next);
    return next;
  }

  getProfileData() {
    const current = this.getActiveProfile();

    if (current === 'admin') {
      return {
        id: 'admin',
        nome: 'Carlos Silva',
        sobrenome: 'Silva',
        cargo: 'Administrador',
        tituloCompleto: 'Administrador da Plataforma',
        iniciais: 'CS',
        email: 'carlos.silva@raizagro.agr.br',
        avatarBg: '#E2E8F0',
        avatarBorder: '#0F172A',
        avatarColor: '#0F172A',
        gatewayPill: 'LoRaWAN + 4G',
        gatewayStatus: 'Online',
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
