/**
 * ROTEADOR CLIENT-SIDE MODULAR (SPA COM ROTAS ORGANIZADAS E MULTI-PERFIL)
 */

import { api } from './api.js';
import { auth } from './auth.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { Modal } from './components/modal.js';
import { toast } from './components/toast.js';

// Importação das Views
import { renderLogin, setupLoginEvents } from './views/login.js';
import {
  renderPrimeiroAcesso, setupPrimeiroAcessoEvents,
  renderRecuperarSenha, setupRecuperarSenhaEvents,
  renderVerificacao, setupVerificacaoEvents
} from './views/auth-flow.js';
import { renderDashboard, setupDashboardEvents } from './views/dashboard.js';
import { renderSensores, setupSensoresEvents } from './views/sensores.js';
import { renderRedeEsp32, setupRedeEsp32Events } from './views/rede-esp32.js';
import { renderLeituras, setupLeiturasEvents } from './views/leituras.js';
import { renderLotes, setupLotesEvents } from './views/lotes.js';
import { renderViagens, setupViagensEvents } from './views/viagens.js';
import { renderAlertas, setupAlertasEvents } from './views/alertas.js?v=20261104-5';
import { renderPrevisoes } from './views/previsoes.js';
import { renderRelatorios, setupRelatoriosEvents } from './views/relatorios.js';
import { renderConfiguracoes, setupConfiguracoesEvents } from './views/configuracoes.js';
import { renderUsuarios, setupUsuariosEvents } from './views/usuarios.js';
import { renderRegrasAgronomicas, setupRegrasAgronomicasEvents } from './views/regras-agronomicas.js';
import { renderAuditoria, setupAuditoriaEvents } from './views/auditoria.js';
import { renderSensoresAdmin, setupSensoresAdminEvents } from './views/sensores-admin.js';

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
  '#/dashboard': {
    title: 'Visão Geral do Sistema',
    render: renderDashboard,
    setup: setupDashboardEvents,
    authRequired: true
  },
  '#/sensores': {
    title: 'Sensores & Telemetria de Campo',
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
    title: 'Rede ESP32 & Topologia',
    render: renderRedeEsp32,
    setup: setupRedeEsp32Events,
    authRequired: true
  },
  '#/leituras': {
    title: 'Histórico Safra & Correlação',
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
  '#/viagens': {
    title: 'Logística de Exportação',
    render: renderViagens,
    setup: setupViagensEvents,
    authRequired: true
  },
  '#/alertas': {
    title: 'Central de Alertas & Incidentes',
    render: renderAlertas,
    setup: setupAlertasEvents,
    authRequired: true
  },
  '#/previsoes': {
    title: 'Modelos de IA & Mercado',
    render: renderPrevisoes,
    setup: () => { },
    authRequired: true
  },
  '#/relatorios': {
    title: 'Relatórios & Auditoria',
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
    title: 'Auditoria & Logs Operacionais',
    render: renderAuditoria,
    setup: setupAuditoriaEvents,
    authRequired: true
  }
};

export class Router {
  constructor(appContainer) {
    this.appContainer = appContainer;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  async init() {
    // Checagem assíncrona não bloqueante
    api.checkHealth().catch(() => {});

    // Normaliza caminhos que foram digitados sem hash (ex: /dashboard ou //dashboard)
    if (window.location.pathname && window.location.pathname !== '/' && !window.location.pathname.includes('.')) {
      const cleanPath = window.location.pathname.replace(/^\/+/, '');
      if (cleanPath && !window.location.hash) {
        window.location.hash = '#/' + cleanPath;
      }
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '/' + (window.location.hash || '#/dashboard'));
        }
      } catch (errState) {
        // Ignora erro de segurança em contextos restritos
      }
    }

    // Se não tiver rota ou for raiz, vai direto pro Dashboard
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '') {
      window.location.hash = '#/dashboard';
    }

    // Renderiza IMEDIATAMENTE sem depender de evento hashchange
    await this.handleRoute();
  }

  async handleRoute() {
    let hash = window.location.hash || '#/dashboard';

    // Rota desconhecida → vai para dashboard
    if (!routes[hash]) {
      hash = '#/dashboard';
      window.location.hash = hash;
    }

    const route = routes[hash] || routes['#/dashboard'];

    // Guarda de rota: se exigir login e não estiver autenticado, renderiza login imediatamente
    if (route.authRequired && !auth.isAuthenticated()) {
      window.location.hash = '#/login';
      const loginRoute = routes['#/login'];
      document.title = `${loginRoute.title} | Raiz Agro`;
      this.appContainer.innerHTML = loginRoute.render();
      if (loginRoute.setup) await loginRoute.setup();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Guarda de perfil: rotas exclusivas de admin só podem ser acessadas pelo perfil admin
    const ROTAS_ADMIN = ['#/usuarios', '#/auditoria', '#/lotes', '#/regras-agronomicas'];
    const ROTAS_ANALISTA = ['#/rede-esp32', '#/leituras'];
    const activeProfile = auth.getActiveProfile();
    if (ROTAS_ADMIN.includes(hash) && activeProfile !== 'admin') {
      hash = '#/dashboard';
      window.location.hash = hash;
      toast.info('Acesso Restrito', 'Esta área é exclusiva da Administradora.');
    } else if (ROTAS_ANALISTA.includes(hash) && activeProfile !== 'analista' && activeProfile !== 'admin') {
      hash = '#/dashboard';
      window.location.hash = hash;
      toast.info('Acesso Restrito', 'Esta área é exclusiva do Analista.');
    }

    document.title = `${route.title} | Raiz Agro`;

    const FULLSCREEN_ROUTES = ['#/login', '#/primeiro-acesso', '#/recuperar-senha', '#/verificacao'];

    if (FULLSCREEN_ROUTES.includes(hash)) {
      // Telas de autenticação em tela cheia com visual do Figma
      this.appContainer.innerHTML = route.render();
      if (route.setup) await route.setup();
    } else {
      // Telas do sistema envolvidas pelo layout de dashboard (Sidebar + Header)
      try {
        const contentHtml = await route.render();

        this.appContainer.innerHTML = `
          <div class="dashboard-layout">
            ${renderSidebar(hash)}
            <main class="main-content">
              ${renderHeader(route.title)}
              ${contentHtml}
            </main>
          </div>
        `;

        // Evento de logout na Sidebar
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => auth.logout());
        }

        // Interatividade no Seletor de Data do Header
        const dateSelectorBtn = document.getElementById('header-date-selector');
        if (dateSelectorBtn) {
          dateSelectorBtn.style.cursor = 'pointer';
          dateSelectorBtn.addEventListener('click', () => {
            toast.info('Ciclo Safra 2026', 'Data base de operação: 22 de setembro de 2026 (Semana 38).');
          });
        }

        // Avatar do header é apenas informativo — sem interação de troca de perfil
        // Para mudar de perfil, use o botão Sair e faça login com outro e-mail.

        if (route.setup) await route.setup();
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

    // Inicializa ícones do Lucide (imediato + tentativa caso script externo ainda esteja finalizando)
    if (window.lucide) {
      window.lucide.createIcons();
    } else {
      setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
      }, 400);
    }
  }
}
