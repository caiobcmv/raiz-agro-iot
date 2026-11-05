/**
 * GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO E SESSÃO MULTI-PERFIL
 * Suporta:
 * 1. Perfil Analista: Luiz Felipe (IoT, ESP32, Topologia, Telemetria LoRa, ML Preditivo)
 * 2. Perfil Gestora: Maria Clara (Visão Executiva, Talhões, Cadeia Fria, Produtividade)
 */

import { api } from './api.js';
import { toast } from './components/toast.js';

class AuthState {
  constructor() {
    this.activeProfile = this.loadActiveProfile();
    this.user = this.loadUser();
  }

  loadUser() {
    try {
      const data = localStorage.getItem('user_data');
      if (data && data !== 'undefined' && data !== 'null') {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Recuperando sessão padrão...');
    }

    // Usuário padrão inicial caso ainda não haja sessão salva
    const isAnalista = this.getActiveProfile() === 'analista';
    const defaultUser = isAnalista ? {
      id_usuario: 2,
      nome: 'Luiz Felipe',
      email: 'luiz.felipe@raizagro.agr.br',
      perfil: 'Analista IoT & Telemetria'
    } : {
      id_usuario: 1,
      nome: 'Maria Clara',
      email: 'maria.clara@raizagro.agr.br',
      perfil: 'Gestora de Operações'
    };

    try {
      localStorage.setItem('user_data', JSON.stringify(defaultUser));
      if (!localStorage.getItem('access_token')) {
        localStorage.setItem('access_token', 'demo_token_' + (isAnalista ? 'analista' : 'gestor'));
      }
    } catch (e) { }

    return defaultUser;
  }

  loadActiveProfile() {
    // Garante que o usuário abra no novo perfil Analista solicitado
    if (!localStorage.getItem('PERFIL_ANALISTA_V2')) {
      localStorage.setItem('ACTIVE_PROFILE', 'analista');
      localStorage.setItem('PERFIL_ANALISTA_V2', 'true');
      return 'analista';
    }
    return localStorage.getItem('ACTIVE_PROFILE') || 'analista';
  }

  getActiveProfile() {
    return this.activeProfile || 'analista';
  }

  setActiveProfile(profile) {
    this.activeProfile = profile === 'gestor' ? 'gestor' : 'analista';
    localStorage.setItem('ACTIVE_PROFILE', this.activeProfile);

    // Atualiza dados do usuário correspondente
    if (this.activeProfile === 'analista') {
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
    const next = this.getActiveProfile() === 'analista' ? 'gestor' : 'analista';
    this.setActiveProfile(next);
    return next;
  }

  getProfileData() {
    const isAnalista = this.getActiveProfile() === 'analista';
    if (isAnalista) {
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
        cargo: 'Gestora',
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
    return !!this.user;
  }

  getUser() {
    return this.user || {
      nome: this.getProfileData().nome,
      email: this.getProfileData().email,
      perfil: this.getProfileData().tituloCompleto
    };
  }

  setUser(userData) {
    this.user = userData;
    localStorage.setItem('user_data', JSON.stringify(userData));
  }

  logout() {
    api.clearTokens();
    this.user = null;
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    toast.info('Sessão encerrada', 'Você saiu com segurança do sistema.');
    window.location.hash = '#/login';
  }
}

export const auth = new AuthState();
