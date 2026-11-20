/**
 * COMPONENTE TOPBAR HEADER - FIEL AO FIGMA + RESPONSIVO (320px+) E TEMPO REAL
 * Suporta dinamicamente perfis: Administradora (Lorena Lira), Analista (Luiz Felipe) e Gestora (Maria Clara)
 */

import { auth } from '../auth.js';

const PAGE_META_ADMIN = {
  '#/dashboard':           { h2: 'Visão Geral do Sistema',                     sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/usuarios':            { h2: 'Gerenciamento de Usuários',                  sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/lotes':               { h2: 'Lotes e Safra',                              sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/sensores':            { h2: 'Sensores e Telemetria de Campo',             sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/relatorios':          { h2: 'Relatórios e Documentos Oficiais',           sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/regras-agronomicas':  { h2: 'Regras Agronômicas e Limiares Fisiológicos', sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/auditoria':           { h2: 'Auditoria e Logs do Sistema v4.2',           sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/configuracoes':       { h2: 'Configurações e Meu Perfil',                 sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' }
};

const PAGE_META_GESTOR = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/leituras':      { h2: 'Histórico Safra',                 sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas e Incidentes', sub: 'Monitoramento em tempo real de microclima, estresse hídrico no campo e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações e Meu Perfil',      sub: 'Gerencie seu perfil, tema, dados da propriedade, padrões de qualidade e notificações.' },
};

const PAGE_META_ANALISTA = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/sensores':      { h2: 'Sensores e Telemetria de Campo <span class="badge-header-inline">ThingSpeak IoT: Sync a cada 5m • Tabela leitura_climatica</span>', sub: '' },
  '#/rede-esp32':    { h2: 'Rede ESP32 e Topologia',          sub: 'Distribuição espacial dos nós ESP32, telemetria DHT11 e sensores de umidade do solo.' },
  '#/leituras':      { h2: 'Histórico Safra',                 sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas e Incidentes', sub: 'Monitoramento em tempo real de desvios térmicos, estresse hídrico e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações e Meu Perfil',      sub: 'Gerencie seu perfil, tema, dados da propriedade, padrões de qualidade e notificações.' },
};

export function renderHeader(title) {
  const hash = window.location.hash || '#/dashboard';
  const profileRole = auth.getActiveProfile();
  const isAdmin = profileRole === 'admin';
  const isAnalista = profileRole === 'analista';
  const profile = auth.getProfileData();

  let metaDict = PAGE_META_GESTOR;
  if (isAdmin) metaDict = PAGE_META_ADMIN;
  else if (isAnalista) metaDict = PAGE_META_ANALISTA;

  const meta = metaDict[hash] || { h2: title || 'Visão Geral do Sistema', sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' };

  const isDashboard = hash === '#/dashboard';
  const isResumido = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
  const isLeiturasGestor = !isAnalista && hash === '#/leituras';
  const dataFormatada = isLeiturasGestor ? 'Safra 2025/2026' : '22 de setembro de 2026';

  return `
    <header class="topbar-header">
      <div class="header-left-group" style="display:flex; align-items:center; gap:12px; min-width:0;">
        <!-- Botão Menu Mobile (visível em <= 860px) -->
        <button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir menu de navegação" title="Menu">
          <i data-lucide="menu" style="width:20px; height:20px;"></i>
        </button>

        <div class="header-title-wrap" style="min-width:0;">
          ${isDashboard ? `
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <h2 style="margin:0;">${meta.h2}</h2>
            <div class="view-mode-toggle ${!isResumido ? 'detalhado' : ''}" id="toggle-dashboard-mode" title="Alternar entre modo Resumido e Detalhado">
              <div class="toggle-switch-track">
                <div class="toggle-switch-thumb"></div>
              </div>
              <span class="toggle-label" id="toggle-label-text">${isResumido ? 'Resumido' : 'Detalhado'}</span>
            </div>
          </div>
          ${meta.sub ? `<p style="margin:4px 0 0 0;">${meta.sub}</p>` : ''}
          ` : `
          <h2>${meta.h2}</h2>
          ${meta.sub ? `<p>${meta.sub}</p>` : ''}
          `}
        </div>
      </div>

      <div class="header-right-controls">
        <!-- Indicador de Atualização em Tempo Real (oculto no Dashboard e Admin para fidelidade 100% ao Figma) -->
        ${!isAdmin && !isDashboard ? `
        <button type="button" class="live-sync-pill" id="header-live-sync-pill" title="Clique para sincronizar dados em tempo real agora">
          <span class="live-sync-dot"></span>
          <span class="live-sync-text" id="header-live-sync-text">Tempo Real</span>
        </button>
        ` : ''}

        <!-- Seletor de Data -->
        <button type="button" class="date-selector-btn" id="header-date-selector" title="Selecionar período operacional">
          <i data-lucide="calendar" style="width: 15px; height: 15px; color: #71807A;"></i>
          <span id="header-date-label">${dataFormatada}</span>
          <i data-lucide="chevron-down" style="width: 13px; height: 13px; color: #71807A;"></i>
        </button>

        <!-- Notificações com Badge Laranja (#F5A623) -->
        <a href="#/alertas" class="header-bell-btn" title="Ver Alertas Ativos">
          <i data-lucide="bell" style="width: 18px; height: 18px; color: #71807A;"></i>
          <span class="header-bell-badge" id="header-bell-count">2</span>
        </a>

        <!-- Perfil Header: exibe dados sincronizados do banco e leva ao perfil em Configurações -->
        <a href="#/configuracoes" class="user-profile-header-pill" id="user-profile-header-pill" title="Editar perfil e preferências (${profile.tituloCompleto})" style="display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;">
          <div class="avatar-initials-pill" style="width: 32px; height: 32px; border-radius: 50%; background:${profile.avatarBg}; border:1.5px solid ${profile.avatarBorder}; color:${profile.avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; transition: all 0.25s ease;">
            ${profile.iniciais}
          </div>
          <div class="profile-name-role" style="display: flex; flex-direction: column; text-align: left;">
            <span class="profile-name" style="font-size: 12px; font-weight: 700; color: var(--text-dark, #0F172A); line-height: 1.1;">${profile.nome}</span>
            <span class="profile-role" style="font-size: 10px; color: #64748B;">${profile.cargo}</span>
          </div>
          <i data-lucide="chevron-down" style="width: 12px; height: 12px; color: #71807A; margin-left: 2px;"></i>
        </a>
      </div>
    </header>
  `;
}
