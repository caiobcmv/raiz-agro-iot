/**
 * COMPONENTE TOPBAR HEADER - FIEL AO FIGMA + RESPONSIVO (320px+) E TEMPO REAL
 * Suporta dinamicamente perfis: Administradora (Lorena Lira), Analista (Luiz Felipe) e Gestora (Maria Clara)
 */

import { auth } from '../auth.js';

const PAGE_META_ADMIN = {
  '#/dashboard':           { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/usuarios':            { h2: 'Gerenciamento de Usuários',       sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/lotes':               { h2: 'Lotes e Safra',                   sub: 'Gerencie os lotes cadastrados, rastreabilidade e status de safra na plataforma.' },
  '#/sensores':            { h2: 'Sensores & Telemetria de Campo',  sub: 'Gerencie os nós IoT cadastrados, calibração e status operacional em campo.' },
  '#/relatorios':          { h2: 'Relatórios & Documentos Oficiais', sub: 'Gere laudos auditáveis, dossiês fitossanitários e exportações oficiais.' },
  '#/regras-agronomicas':  { h2: 'Regras Agronômicas Vigentes',     sub: 'Definição de limiares bioclimáticos, faixas ótimas por cultura e gatilhos de acionamento.' },
  '#/auditoria':           { h2: 'Auditoria & Logs Operacionais',   sub: 'Trilha de auditoria criptográfica, integridade cadastral e registros forenses de conformidade.' },
  '#/configuracoes':       { h2: 'Configurações & Meu Perfil',      sub: 'Personalize seu perfil, tema, efeitos visuais e parâmetros sincronizados no banco de dados.' }
};

const PAGE_META_GESTOR = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Monitoramento em tempo real dos talhões, culturas e condições agrometeorológicas.' },
  '#/leituras':      { h2: 'Histórico Safra',                 sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas & Incidentes <span style="display:inline-block;width:7px;height:7px;background:#10B981;border-radius:2px;margin-left:6px;vertical-align:middle;"></span>', sub: 'Monitoramento em tempo real de desvios térmicos em contêineres reefer, estresse hídrico no campo e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações & Meu Perfil',      sub: 'Gerencie seu perfil, tema, dados da propriedade, padrões de qualidade, cadeia fria e notificações.' },
};

const PAGE_META_ANALISTA = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/sensores':      { h2: 'Sensores & Telemetria de Campo <span class="badge-header-inline">ThingSpeak IoT: Sync a cada 5m • Tabela leitura_climatica</span>', sub: '' },
  '#/rede-esp32':    { h2: 'Rede ESP32 & Topologia',          sub: 'Distribuição espacial dos nós LoRaWAN, enlaces de radiofrequência e telemetria US915.' },
  '#/leituras':      { h2: 'Histórico Safra & Correlação',    sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas & Incidentes', sub: 'Monitoramento em tempo real de desvios térmicos, estresse hídrico e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações & Meu Perfil',      sub: 'Gerencie seu perfil, tema, parâmetros de sensores, regras preditivas e limites biológicos.' },
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
          <h2>${meta.h2}</h2>
          ${meta.sub ? `<p>${meta.sub}</p>` : ''}
        </div>
      </div>

      <div class="header-right-controls">
        <!-- Indicador de Atualização em Tempo Real -->
        <button type="button" class="live-sync-pill" id="header-live-sync-pill" title="Clique para sincronizar dados em tempo real agora">
          <span class="live-sync-dot"></span>
          <span class="live-sync-text" id="header-live-sync-text">Tempo Real</span>
        </button>

        <!-- Toggle Resumido vs Detalhado (só no dashboard da Gestora) -->
        ${isDashboard && !isAnalista && !isAdmin ? `
        <div class="view-mode-toggle ${!isResumido ? 'detalhado' : ''}" id="toggle-dashboard-mode" title="Alternar entre modo Resumido e Detalhado">
          <div class="toggle-switch-track">
            <div class="toggle-switch-thumb"></div>
          </div>
          <span class="toggle-label" id="toggle-label-text">${isResumido ? 'Resumido' : 'Detalhado'}</span>
        </div>
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
        </a>
      </div>
    </header>
  `;
}
