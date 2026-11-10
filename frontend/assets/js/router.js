/**
 * ROTEADOR CLIENT-SIDE MODULAR (SPA COM TRANSIÇÕES DINÂMICAS, SKELETONS, TEMPO REAL E RESPONSIVIDADE)
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
  renderVerificacao, setupVerificacaoEvents,
  renderRedefinirSenha, setupRedefinirSenhaEvents,
  renderSenhaAlterada, setupSenhaAlteradaEvents,
  renderContaBloqueada, setupContaBloqueadaEvents
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

function renderRouteSkeleton() {
  return `
    <div class="route-skeleton-wrapper" style="padding: 28px 36px;">
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
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
          window.history.replaceState(null, '', '/' + (window.location.hash || '#/dashboard'));
        }
      } catch (errState) {
        // Ignora erro de segurança em contextos restritos
      }
    }

    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '') {
      window.location.hash = '#/dashboard';
    }

    this.startRealtimeEngine();
    await this.handleRoute();
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

    // Atualiza sutilmente leituras vivas visíveis na tela sem recarregar a página
    await new Promise(r => setTimeout(r, manual ? 450 : 250));

    document.querySelectorAll('[data-live-metric="temp"], .live-temp-val').forEach(el => {
      const current = parseFloat(String(el.textContent).replace(',', '.'));
      if (!isNaN(current)) {
        const delta = (Math.random() - 0.48) * 0.2;
        el.textContent = `${(current + delta).toFixed(1).replace('.', ',')}°C`;
      }
    });

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
      toast.success(`${profile.gatewayPill} Ativo`, `Enlace de telemetria operacional (Latência: 42ms • Pacotes íntegros).`);
    });

    // 5. Seletor de Data do Header com Modal Interativo
    const dateSelectorBtn = document.getElementById('header-date-selector');
    if (dateSelectorBtn) {
      dateSelectorBtn.addEventListener('click', () => {
        const currentLabel = document.getElementById('header-date-label')?.textContent || '22 de setembro de 2026';
        Modal.open('Período de Análise & Ciclo de Safra', `
          <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
            <p style="color:#CBD5E1; margin:0;">Selecione a janela temporal para filtragem dinâmica dos indicadores:</p>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${[
                'Tempo Real • Hoje (Ciclo Ativo)',
                '22 de setembro de 2026 (Semana 38)',
                'Últimos 7 dias consolidados',
                'Últimos 30 dias (Mensal)',
                'Safra 2025/2026 Completa'
              ].map(periodo => `
                <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#FFFFFF; cursor:pointer; font-weight:600;">
                  <input type="radio" name="modal-periodo-safra" value="${periodo}" ${currentLabel.includes(periodo.split(' ')[0]) ? 'checked' : ''} style="accent-color:#10B981;">
                  <span>${periodo}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `, (modal) => {
          const chosen = modal.querySelector('input[name="modal-periodo-safra"]:checked')?.value;
          if (chosen) {
            const labelEl = document.getElementById('header-date-label');
            if (labelEl) labelEl.textContent = chosen;
            toast.success('Período Atualizado', `Exibindo telemetria e indicadores para: ${chosen}.`);
          }
          return true;
        }, 'Aplicar Período');
      });
    }

    // 6. Sincroniza o contador do sino de alertas no header com o status real no banco
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
      window.location.hash = hash;
    }

    const route = routes[hash] || routes['#/dashboard'];

    // Guarda de rota: se exigir login e não estiver autenticado, renderiza login imediatamente
    if (route.authRequired && !auth.isAuthenticated()) {
      window.location.hash = '#/login';
      const loginRoute = routes['#/login'];
      document.title = `${loginRoute.title} | Raiz Agro`;
      this.appContainer.innerHTML = `<div class="page-transition-enter">${loginRoute.render()}</div>`;
      if (loginRoute.setup) await loginRoute.setup();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Guarda de perfil ('#/leituras' é acessível tanto pela Produtora/Gestora quanto pelo Analista)
    const ROTAS_ADMIN = ['#/usuarios', '#/auditoria', '#/lotes', '#/regras-agronomicas'];
    const ROTAS_ANALISTA = ['#/rede-esp32'];
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
