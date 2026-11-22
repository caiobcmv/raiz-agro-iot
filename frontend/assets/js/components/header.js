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
  '#/calibracao':          { h2: 'Calibração & Parâmetros IoT',                sub: 'Ajuste de limiares agronômicos, sanitização de leituras, cortes preditivos e calibração de nós ESP32.' },
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
  '#/calibracao':    { h2: 'Calibração & Parâmetros IoT',     sub: 'Ajuste de limiares agronômicos, sanitização de leituras, cortes preditivos e calibração de nós ESP32.' },
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

  const meta = { ...(metaDict[hash] || { h2: title || 'Visão Geral do Sistema', sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' }) };

  const isDashboard = hash === '#/dashboard';
  const isGestoraDashboard = isDashboard && !isAdmin && !isAnalista;
  const isResumido = localStorage.getItem('DASHBOARD_MODE') !== 'detalhado';
  if (isGestoraDashboard && !isResumido) {
    meta.sub = 'Acompanhe a safra, planeje a colheita e priorize as ações do dia.';
  }
  const dataFormatada = '22 de setembro de 2026';

  return `
    <header class="topbar-header">
      <div class="header-left-group" style="display:flex; align-items:center; gap:12px; min-width:0;">
        <!-- Botão Menu Mobile (visível em <= 860px) -->
        <button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir menu de navegação" title="Menu">
          <i data-lucide="menu" style="width:20px; height:20px;"></i>
        </button>

        <div class="header-title-wrap" style="min-width:0;">
          ${isGestoraDashboard ? `
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

      <div class="header-right-controls" style="display: flex; align-items: center; gap: 14px; flex-shrink: 0;">
        <!-- Indicador de Atualização em Tempo Real (exclusivo para perfil Analista fora do Dashboard) -->
        ${isAnalista && !isDashboard ? `
        <button type="button" class="live-sync-pill" id="header-live-sync-pill" title="Clique para sincronizar dados em tempo real agora">
          <span class="live-sync-dot"></span>
          <span class="live-sync-text" id="header-live-sync-text">Tempo Real</span>
        </button>
        ` : ''}

        <!-- Seletor de Data -->
        <button type="button" class="date-selector-btn" id="header-date-selector" title="Selecionar período operacional" style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 7px 16px; border-radius: 9999px; font-size: 13px; font-weight: 500; color: #173A31; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.03); cursor: pointer; flex-shrink: 0;">
          <i data-lucide="calendar" style="width: 15px; height: 15px; color: #71807A; flex-shrink: 0;"></i>
          <span id="header-date-label" style="white-space: nowrap;">${dataFormatada}</span>
          <i data-lucide="chevron-down" style="width: 13px; height: 13px; color: #71807A; flex-shrink: 0;"></i>
        </button>

        <!-- Notificações com Badge Laranja (#F5A623) -->
        <a href="#/alertas" class="header-bell-btn" title="Ver Alertas Ativos" style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #F8FAFC; border: 1px solid #E2E8F0; text-decoration: none; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <i data-lucide="bell" style="width: 18px; height: 18px; color: #71807A;"></i>
          <span class="header-bell-badge" id="header-bell-count" style="position: absolute; top: -2px; right: -2px; width: 17px; height: 17px; background: #F5A623; border: 2px solid #FFFFFF; border-radius: 50%; color: #FFFFFF; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; line-height: 1;">2</span>
        </a>

        <!-- Perfil Header: exibe dados sincronizados do banco e leva ao perfil em Configurações -->
        <a href="#/configuracoes" class="user-profile-header-pill" id="user-profile-header-pill" title="Editar perfil e preferências (${profile.tituloCompleto})" style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 4px 14px 4px 5px; border-radius: 9999px; cursor: pointer; text-decoration: none; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div class="avatar-initials-pill" style="width: 32px; height: 32px; border-radius: 50%; background:${profile.avatarBg}; border:1.5px solid ${profile.avatarBorder}; color:${profile.avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; transition: all 0.25s ease;">
            ${profile.iniciais}
          </div>
          <div class="profile-name-role" style="display: flex; flex-direction: column; text-align: left; min-width: 0;">
            <span class="profile-name" style="font-size: 13px; font-weight: 700; color: var(--text-dark, #0F172A); white-space: nowrap; line-height: 1.15;">${profile.nome}</span>
            <span class="profile-role" style="font-size: 10.5px; color: #64748B; white-space: nowrap; line-height: 1.15; margin-top: 1px;">${profile.cargo}</span>
          </div>
          <i data-lucide="chevron-down" style="width: 12px; height: 12px; color: #71807A; margin-left: 2px; flex-shrink: 0;"></i>
        </a>
      </div>
    </header>
  `;
}
