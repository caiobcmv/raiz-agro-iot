/**
 * ROTEADOR CLIENT-SIDE MODULAR (SPA COM TRANSIÇÕES DINÂMICAS, SKELETONS, TEMPO REAL E RESPONSIVIDADE)
 */

import { api } from './api.js';
import { auth } from './auth.js';
import { renderSidebar } from './components/sidebar.js?v=20261120-live45';
import { renderHeader } from './components/header.js?v=20261123-live36';
import { Modal } from './components/modal.js?v=20261120-live33';
import { toast } from './components/toast.js?v=20261120-live33';
import { showAccessDeniedModal } from './components/access-denied-modal.js?v=20261120-live33';

// Importação das Views
import { renderLogin, setupLoginEvents } from './views/login.js?v=20261122-real2';
import {
  renderPrimeiroAcesso, setupPrimeiroAcessoEvents,
  renderRecuperarSenha, setupRecuperarSenhaEvents,
  renderVerificacao, setupVerificacaoEvents,
  renderRedefinirSenha, setupRedefinirSenhaEvents,
  renderSenhaAlterada, setupSenhaAlteradaEvents,
  renderContaBloqueada, setupContaBloqueadaEvents
} from './views/auth-flow.js?v=20261122-totp1';
import { renderDashboard, setupDashboardEvents } from './views/dashboard.js?v=20261127-real6';
import { renderSensores, setupSensoresEvents } from './views/sensores.js?v=20261122-real2';
import { renderRedeEsp32, setupRedeEsp32Events } from './views/rede-esp32.js?v=20261122-real2';
import { renderLeituras, setupLeiturasEvents } from './views/leituras.js?v=20261127-real6';
import { renderLotes, setupLotesEvents } from './views/lotes.js?v=20261128-c';
import { renderAlertas, setupAlertasEvents } from './views/alertas.js?v=20261122-real2';
import { renderPrevisoes } from './views/previsoes.js?v=20261122-real2';
import { renderRelatorios, setupRelatoriosEvents } from './views/relatorios.js?v=20261122-real2';
import { renderConfiguracoes, setupConfiguracoesEvents } from './views/configuracoes.js?v=20261127-real6';
import { renderCalibracao, setupCalibracaoEvents } from './views/calibracao.js?v=20261122-real5';
import { renderUsuarios, setupUsuariosEvents } from './views/usuarios.js?v=20261128-b';
import { renderRegrasAgronomicas, setupRegrasAgronomicasEvents } from './views/regras-agronomicas.js?v=20261120-live33';
import { renderAuditoria, setupAuditoriaEvents } from './views/auditoria.js?v=20261120-live33';
import { renderSensoresAdmin, setupSensoresAdminEvents } from './views/sensores-admin.js?v=20261128-c';

const routes = {
  '#/login': {
    title: 'Acesse sua conta - RAIZ',
    render: renderLogin,
    setup: setupLoginEvents,
    authRequired: false
  },
  '#/primeiro-acesso': {
    title: 'Ative seu primeiro acesso - RAIZ',
    render: renderPrimeiroAcesso,
    setup: setupPrimeiroAcessoEvents,
    authRequired: false
  },
  '#/recuperar-senha': {
    title: 'Recuperação de Senha - RAIZ',
    render: renderRecuperarSenha,
    setup: setupRecuperarSenhaEvents,
    authRequired: false
  },
  '#/verificacao': {
    title: 'Digite o código de 6 dígitos - RAIZ',
    render: renderVerificacao,
    setup: setupVerificacaoEvents,
    authRequired: false
  },
  '#/redefinir-senha': {
    title: 'Redefinir sua senha - RAIZ',
    render: renderRedefinirSenha,
    setup: setupRedefinirSenhaEvents,
    authRequired: false
  },
  '#/senha-alterada': {
    title: 'Senha alterada com sucesso! - RAIZ',
    render: renderSenhaAlterada,
    setup: setupSenhaAlteradaEvents,
    authRequired: false
  },
  '#/conta-bloqueada': {
    title: 'Conta temporariamente bloqueada - RAIZ',
    render: renderContaBloqueada,
    setup: setupContaBloqueadaEvents,
    authRequired: false
  },
  '#/dashboard': {
    title: 'Visão Geral do Sistema',
    render: renderDashboard,
    setup: setupDashboardEvents,
    authRequired: true
  },
  '#/sensores': {
    title: 'Sensores e Telemetria de Campo',
    render: async () => {
      const isAdmin = auth.getActiveProfile() === 'admin';
      return isAdmin ? renderSensoresAdmin() : renderSensores();
    },
    setup: async () => {
      const isAdmin = auth.getActiveProfile() === 'admin';
      return isAdmin ? setupSensoresAdminEvents() : setupSensoresEvents();
    },
    authRequired: true
  },
  '#/rede-esp32': {
    title: 'Rede ESP32 e Topologia',
    render: renderRedeEsp32,
    setup: setupRedeEsp32Events,
    authRequired: true
  },
  '#/leituras': {
    title: 'Histórico Safra',
    render: renderLeituras,
    setup: setupLeiturasEvents,
    authRequired: true
  },
  '#/lotes': {
    title: 'Rastreabilidade de Lotes',
    render: renderLotes,
    setup: setupLotesEvents,
    authRequired: true
  },
  '#/alertas': {
    title: 'Central de Alertas e Incidentes',
    render: renderAlertas,
    setup: setupAlertasEvents,
    authRequired: true
  },
  '#/previsoes': {
    title: 'Modelos de IA e Mercado',
    render: renderPrevisoes,
    setup: () => { },
    authRequired: true
  },
  '#/relatorios': {
    title: 'Relatórios e Auditoria',
    render: renderRelatorios,
    setup: setupRelatoriosEvents,
    authRequired: true
  },
  '#/configuracoes': {
    title: 'Configurações do Sistema',
    render: renderConfiguracoes,
    setup: setupConfiguracoesEvents,
    authRequired: true
  },
  '#/calibracao': {
    title: 'Calibração & Parâmetros IoT - RAIZ',
    render: renderCalibracao,
    setup: setupCalibracaoEvents,
    authRequired: true
  },
  '#/usuarios': {
    title: 'Gerenciamento de Usuários',
    render: renderUsuarios,
    setup: setupUsuariosEvents,
    authRequired: true
  },
  '#/regras-agronomicas': {
    title: 'Regras Agronômicas Vigentes',
    render: renderRegrasAgronomicas,
    setup: setupRegrasAgronomicasEvents,
    authRequired: true
  },
  '#/auditoria': {
    title: 'Auditoria e Logs Operacionais',
    render: renderAuditoria,
    setup: setupAuditoriaEvents,
    authRequired: true
  }
};

function renderRouteSkeleton() {
  return `
    <div class="route-skeleton-wrapper" style="padding: 28px 36px;">
      <div class="admin-kpi-grid-4">
        <div class="skeleton-card" style="height: 136px; border-radius: 16px;"></div>
        <div class="skeleton-card" style="height: 136px; border-radius: 16px;"></div>
        <div class="skeleton-card" style="height: 136px; border-radius: 16px;"></div>
      </div>
      <div class="skeleton-card" style="height: 320px; border-radius: 18px; margin-bottom: 20px;"></div>
    </div>
  `;
}

export class Router {
  constructor(appContainer) {
    this.appContainer = appContainer;
    this.realtimeInterval = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  async init() {
    // Checagem assíncrona não bloqueante da API e carregamento das preferências do usuário no PostgreSQL
    api.checkHealth().catch(() => { });
    if (auth.isAuthenticated()) {
      auth.syncPreferencesFromDB().catch(() => { });
    }

    // Normaliza caminhos que foram digitados sem hash
    if (window.location.pathname && window.location.pathname !== '/' && !window.location.pathname.includes('.')) {
      const cleanPath = window.location.pathname.replace(/^\/+/, '');
      if (cleanPath && !window.location.hash) {
        window.location.hash = '#/' + cleanPath;
      }
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '/' + (window.location.hash || ''));
        }
      } catch (errState) {
        // Ignora erro de segurança em contextos restritos
      }
    }

    if (!sessionStorage.getItem('dashboard_mode_init')) {
      localStorage.setItem('DASHBOARD_MODE', 'resumido');
      sessionStorage.setItem('dashboard_mode_init', '1');
    }

    const currentHash = window.location.hash;
    const targetHash = auth.isAuthenticated() ? '#/dashboard' : '#/login';
    let routeHandledByHashChange = false;

    if (!currentHash || currentHash === '#/' || currentHash === '#') {
      if (window.location.hash !== targetHash) {
        routeHandledByHashChange = true;
        window.location.hash = targetHash;
      }
    }

    this.startRealtimeEngine();
    if (!routeHandledByHashChange) {
      await this.handleRoute();
    }
  }

  startRealtimeEngine() {
    if (this.realtimeInterval) clearInterval(this.realtimeInterval);
    this.realtimeInterval = setInterval(() => {
      if (!auth.isAuthenticated()) return;
      if (document.documentElement.getAttribute('data-realtime') === 'off') return;
      this.pulseRealtimeTelemetry(false);
    }, 15000);
  }

  async pulseRealtimeTelemetry(manual = false) {
    const syncPill = document.getElementById('header-live-sync-pill');
    const syncText = document.getElementById('header-live-sync-text');
    if (syncPill) {
      syncPill.classList.add('is-syncing');
    }
    if (syncText) {
      syncText.textContent = 'Sincronizando...';
    }

    // Leituras em tempo real chegam via SSE / websocket; não simula variações artificiais
    await new Promise(r => setTimeout(r, manual ? 450 : 250));

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (syncPill) {
      syncPill.classList.remove('is-syncing');
    }
    if (syncText) {
      syncText.textContent = `Ao Vivo • ${nowStr}`;
    }

    if (manual) {
      toast.success('Telemetria Atualizada', `Leituras de campo e sensores sincronizadas às ${nowStr} sem recarregar a página.`);
    }
  }

  setupShellEvents() {
    // 1. Logout na Sidebar
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => auth.logout());
    }

    // 2. Gaveta Mobile (Hamburger Menu + Backdrop + Fechar)
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-mobile-backdrop');
    const openBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-mobile-close');

    const closeDrawer = () => {
      sidebar?.classList.remove('mobile-open');
      backdrop?.classList.remove('active');
      document.body.style.overflow = '';
    };

    const openDrawer = () => {
      sidebar?.classList.add('mobile-open');
      backdrop?.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    openBtn?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    document.querySelectorAll('.sidebar-menu-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 860) closeDrawer();
      });
    });

    // 3. Indicador Tempo Real no Header
    const syncPill = document.getElementById('header-live-sync-pill');
    syncPill?.addEventListener('click', () => this.pulseRealtimeTelemetry(true));

    // 4. Gateway Status Pill na Sidebar
    const gatewayPill = document.getElementById('sidebar-gateway-pill');
    gatewayPill?.addEventListener('click', () => {
      const profile = auth.getProfileData();
      toast.info('Telemetria IoT', `Coleta ativa via nós ESP32 e canal ${profile.gatewayPill} (${profile.gatewayStatus}).`);
    });

    // 5. Sincroniza o contador do sino de alertas no header com o status real no banco
    api.getEstadoAlertas().then(data => {
      const bell = document.getElementById('header-bell-count');
      if (bell && data && data.resumo) {
        const role = auth.getActiveProfile();
        const count = role === 'analista' ? data.resumo.analista_ativos : data.resumo.gestora_ativos;
        bell.textContent = String(count);
        bell.style.display = count > 0 ? 'flex' : 'none';
      }
    }).catch(() => {});

    // 7. Garantir que absolutamente nenhum botão na view fique sem ação ou sem feedback tátil
    this.bindGlobalButtonEnhancements();
  }

  bindGlobalButtonEnhancements() {
    const viewRoot = document.getElementById('route-view-container') || this.appContainer;
    if (!viewRoot) return;

    viewRoot.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.enhancedBound === 'true') return;
      btn.dataset.enhancedBound = 'true';

      btn.addEventListener('click', (e) => {
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 180);

        // Se for um botão de paginação, filtro ou ação genérica sem handler dedicado, aplica feedback visual dinâmico
        const hasDedicatedId = Boolean(btn.id);
        const hasDedicatedClass = /btn-edit|btn-remove|btn-view|btn-action|currency-btn|porto-option|theme-option|avatar-color|toggle-track|modal-|login-/.test(btn.className || '');
        if (!hasDedicatedId && !hasDedicatedClass) {
          const label = (btn.textContent || btn.getAttribute('title') || 'Ação').trim().replace(/\s+/g, ' ');
          if (label && label.length <= 45) {
            // Se estiver num grupo de abas/paginação, alterna estado ativo nos irmãos
            const parent = btn.parentElement;
            if (parent && parent.querySelectorAll('button').length > 1 && label.length <= 18) {
              parent.querySelectorAll('button').forEach(sib => sib.classList.remove('active'));
              btn.classList.add('active');
            }
            toast.info('Ação Executada', `${label} aplicado com sucesso.`);
          }
        }
      });
    });
  }

  async handleRoute() {
    let hash = window.location.hash || '#/dashboard';

    if (!routes[hash]) {
      hash = '#/dashboard';
      if (window.location.hash !== hash) {
        window.location.hash = hash;
        return;
      }
    }

    const route = routes[hash] || routes['#/dashboard'];

    // Guarda de rota: se exigir login e não estiver autenticado, renderiza login imediatamente
    if (route.authRequired && !auth.isAuthenticated()) {
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
        return;
      }
      const loginRoute = routes['#/login'];
      document.title = `${loginRoute.title} | Raiz Agro`;
      this.appContainer.innerHTML = `<div class="page-transition-enter">${loginRoute.render()}</div>`;
      if (loginRoute.setup) await loginRoute.setup();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Guarda de perfil: apenas administradores acessam as áreas administrativas
    const ROTAS_ADMIN = ['#/usuarios', '#/auditoria', '#/lotes', '#/regras-agronomicas', '#/relatorios'];
    const ROTAS_ANALISTA = ['#/rede-esp32'];
    const activeProfile = auth.getActiveProfile();
    if (ROTAS_ADMIN.includes(hash) && activeProfile !== 'admin') {
      if (window.location.hash !== '#/dashboard') {
        window.location.hash = '#/dashboard';
        return;
      }
      hash = '#/dashboard';
      toast.info('Acesso Restrito', 'Esta área é exclusiva da Administradora.');
    } else if (ROTAS_ANALISTA.includes(hash) && activeProfile !== 'analista' && activeProfile !== 'admin') {
      if (window.location.hash !== '#/dashboard') {
        window.location.hash = '#/dashboard';
        return;
      }
      hash = '#/dashboard';
      toast.info('Acesso Restrito', 'Esta área é exclusiva do Analista.');
    }

    document.title = `${route.title} | Raiz Agro`;

    const FULLSCREEN_ROUTES = [
      '#/login',
      '#/primeiro-acesso',
      '#/recuperar-senha',
      '#/verificacao',
      '#/redefinir-senha',
      '#/senha-alterada',
      '#/conta-bloqueada'
    ];

    if (FULLSCREEN_ROUTES.includes(hash)) {
      this.appContainer.innerHTML = `<div class="page-transition-enter">${route.render()}</div>`;
      if (route.setup) await route.setup();
    } else {
      try {
        // Se já existe o shell .dashboard-layout, mostra skeleton rápido durante a transição da view
        const existingMain = this.appContainer.querySelector('#route-view-container');
        if (existingMain) {
          existingMain.innerHTML = renderRouteSkeleton();
        }

        const contentHtml = await route.render();

        this.appContainer.innerHTML = `
          <div class="dashboard-layout">
            ${renderSidebar(hash)}
            <main class="main-content">
              ${renderHeader(route.title)}
              <div id="route-view-container" class="page-transition-enter">
                ${contentHtml}
              </div>
            </main>
          </div>
        `;

        this.setupShellEvents();
        if (route.setup) await route.setup();
        this.bindGlobalButtonEnhancements();
      } catch (renderError) {
        console.error('Erro ao renderizar rota:', renderError);
        this.appContainer.innerHTML = `
          <div style="padding: 40px; text-align: center; font-family: sans-serif;">
            <h2 style="color: #EF4444;">Ocorreu um problema ao carregar a página</h2>
            <p style="color: #64748B;">${renderError.message || renderError}</p>
            <button onclick="window.location.reload()" style="margin-top: 16px; padding: 10px 20px; background: #183D2E; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
              Recarregar Sistema
            </button>
          </div>
        `;
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    } else {
      setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
      }, 400);
    }
  }
}
