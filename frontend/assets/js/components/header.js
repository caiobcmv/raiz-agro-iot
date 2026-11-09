/**
 * COMPONENTE TOPBAR HEADER - FIEL AO FIGMA
 * Suporta dinamicamente perfis: Administrador (Carlos Silva), Analista (Luiz Felipe) e Gestora (Maria Clara)
 */

import { auth } from '../auth.js';

const PAGE_META_ADMIN = {
  '#/dashboard':           { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/usuarios':            { h2: 'Gerenciamento de Usuários',       sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/lotes':               { h2: 'Lotes e Safra',                   sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/sensores':            { h2: 'Sensores & Telemetria de Campo',  sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/relatorios':          { h2: 'Relatórios & Documentos Oficiais', sub: 'Gerencie os usuários cadastrados, perfis de acesso e permissões na plataforma.' },
  '#/regras-agronomicas':  { h2: 'Regras Agronômicas Vigentes',     sub: 'Definição de limiares bioclimáticos, faixas ótimas por cultura e gatilhos de acionamento.' },
  '#/auditoria':           { h2: 'Auditoria & Logs Operacionais',   sub: 'Trilha de auditoria criptográfica, integridade cadastral e registros forenses de conformidade.' },
  '#/configuracoes':       { h2: 'Configurações do Sistema',        sub: 'Parâmetros globais da infraestrutura, chaves de API, ThingSpeak e políticas de governança.' }
};

const PAGE_META_GESTOR = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Monitoramento em tempo real dos talhões, culturas e condições agrometeorológicas.' },
  '#/leituras':      { h2: 'Histórico Safra',                 sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas & Incidentes <span style="display:inline-block;width:7px;height:7px;background:#10B981;border-radius:2px;margin-left:6px;vertical-align:middle;"></span>', sub: 'Monitoramento em tempo real de desvios térmicos em contêineres reefer, estresse hídrico no campo e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações do Sistema',        sub: 'Gerencie dados da propriedade, padrões de qualidade, cadeia fria e notificações.' },
};

const PAGE_META_ANALISTA = {
  '#/dashboard':     { h2: 'Visão Geral do Sistema',          sub: 'Gerencie preferências da fazenda, parâmetros de sensores, notificações e acessos.' },
  '#/sensores':      { h2: 'Sensores & Telemetria de Campo <span class="badge-header-inline">ThingSpeak IoT: Sync a cada 5m • Tabela leitura_climatica</span>', sub: '' },
  '#/rede-esp32':    { h2: 'Rede ESP32 & Topologia',          sub: 'Distribuição espacial dos nós LoRaWAN, enlaces de radiofrequência e telemetria US915.' },
  '#/leituras':      { h2: 'Histórico Safra & Correlação',    sub: 'Registro histórico de colheitas, rendimento por talhão e correlação com dados agroclimáticos.' },
  '#/alertas':       { h2: 'Central de Alertas & Incidentes', sub: 'Monitoramento em tempo real de desvios térmicos, estresse hídrico e gatilhos automatizados.' },
  '#/configuracoes': { h2: 'Configurações do Sistema',        sub: 'Gerencie dados da propriedade, parâmetros de sensores, regras preditivas e limites biológicos.' },
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
      <div class="header-title-wrap">
        <h2>${meta.h2}</h2>
        ${meta.sub ? `<p>${meta.sub}</p>` : ''}
      </div>

      <div class="header-right-controls">
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
        <div class="date-selector-btn" id="header-date-selector">
          <i data-lucide="calendar" style="width: 15px; height: 15px; color: #71807A;"></i>
          <span>${dataFormatada}</span>
          <i data-lucide="chevron-down" style="width: 13px; height: 13px; color: #71807A;"></i>
        </div>

        <!-- Notificações com Badge Laranja (#F5A623) -->
        <a href="#/alertas" class="header-bell-btn" title="Ver Alertas Ativos">
          <i data-lucide="bell" style="width: 18px; height: 18px; color: #71807A;"></i>
          <span class="header-bell-badge">2</span>
        </a>

        <!-- Perfil Header: Alternável entre Maria Clara, Luiz Felipe e Lorena Lira -->
        <div class="user-profile-header-pill" id="user-profile-header-pill" title="Clique para alternar perfil de acesso" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <div class="avatar-initials-pill" style="width: 32px; height: 32px; border-radius: 50%; background:${profile.avatarBg}; border:1.5px solid ${profile.avatarBorder}; color:${profile.avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">
            ${profile.iniciais}
          </div>
          <div class="profile-name-role" style="display: flex; flex-direction: column; text-align: left;">
            <span class="profile-name" style="font-size: 12px; font-weight: 700; color: #0F172A; line-height: 1.1;">${profile.nome}</span>
            <span class="profile-role" style="font-size: 10px; color: #64748B;">${profile.cargo}</span>
          </div>
          <i data-lucide="chevron-down" style="width: 14px; height: 14px; color: #64748B; margin-left: 2px;"></i>
        </div>
      </div>
    </header>
  `;
}
