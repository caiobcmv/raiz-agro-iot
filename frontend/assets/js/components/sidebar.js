/**
 * COMPONENTE SIDEBAR DE NAVEGAÇÃO - FIEL AO FIGMA (#183D2E)
 * Suporte dinâmico aos 3 perfis:
 * 1. Administrador (Carlos Silva): 8 itens de menu
 * 2. Analista (Luiz Felipe): 6 itens de menu
 * 3. Gestora (Maria Clara): 4 itens de menu
 */

import { auth } from '../auth.js';

export function renderSidebar(currentPath) {
  const profileRole = auth.getActiveProfile();
  const isAdmin = profileRole === 'admin';
  const isAnalista = profileRole === 'analista';
  const profile = auth.getProfileData();

  return `
    <aside class="sidebar">
      <!-- Logo RAIZ com imagem nítida sobre fundo escuro -->
      <div class="sidebar-brand-container">
        <a href="#/dashboard" style="display: block; text-decoration: none;">
          <img src="assets/images/logo-raiz.png" width="105" height="105" alt="RAIZ" style="object-fit: contain; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));">
        </a>
      </div>

      <!-- Menu Principal Dinâmico Conforme o Perfil -->
      <nav class="sidebar-nav-container">
        <a href="#/dashboard" class="sidebar-menu-item ${currentPath === '#/dashboard' ? 'active' : ''}">
          <i data-lucide="layout-grid"></i>
          <span>Visão geral</span>
        </a>

        ${isAdmin ? `
        <a href="#/usuarios" class="sidebar-menu-item ${currentPath === '#/usuarios' ? 'active' : ''}">
          <i data-lucide="users"></i>
          <span>Usuários</span>
        </a>

        <a href="#/lotes" class="sidebar-menu-item ${currentPath === '#/lotes' ? 'active' : ''}">
          <i data-lucide="layers"></i>
          <span>Lotes e safra</span>
        </a>

        <a href="#/sensores" class="sidebar-menu-item ${currentPath === '#/sensores' ? 'active' : ''}">
          <i data-lucide="radio"></i>
          <span>Sensores</span>
        </a>

        <a href="#/relatorios" class="sidebar-menu-item ${currentPath === '#/relatorios' ? 'active' : ''}">
          <i data-lucide="bar-chart-3"></i>
          <span>Relatórios</span>
        </a>

        <a href="#/regras-agronomicas" class="sidebar-menu-item ${currentPath === '#/regras-agronomicas' ? 'active' : ''}">
          <i data-lucide="shield-alert"></i>
          <span>Regras Agronômicas</span>
        </a>

        <a href="#/auditoria" class="sidebar-menu-item ${currentPath === '#/auditoria' ? 'active' : ''}">
          <i data-lucide="shield-check"></i>
          <span>Auditoria &amp; Logs</span>
        </a>

        <a href="#/configuracoes" class="sidebar-menu-item ${currentPath === '#/configuracoes' ? 'active' : ''}">
          <i data-lucide="settings"></i>
          <span>Configurações</span>
        </a>
        ` : (isAnalista ? `
        <a href="#/sensores" class="sidebar-menu-item ${currentPath === '#/sensores' ? 'active' : ''}">
          <i data-lucide="radio"></i>
          <span>Sensores</span>
        </a>

        <a href="#/rede-esp32" class="sidebar-menu-item ${currentPath === '#/rede-esp32' ? 'active' : ''}">
          <i data-lucide="share-2"></i>
          <span>Rede ESP32</span>
        </a>

        <a href="#/leituras" class="sidebar-menu-item ${currentPath === '#/leituras' ? 'active' : ''}">
          <i data-lucide="file-text"></i>
          <span>Histórico Safra</span>
        </a>

        <a href="#/alertas" class="sidebar-menu-item ${currentPath === '#/alertas' ? 'active' : ''}">
          <i data-lucide="alert-triangle"></i>
          <span>Alertas</span>
        </a>

        <a href="#/configuracoes" class="sidebar-menu-item ${currentPath === '#/configuracoes' ? 'active' : ''}">
          <i data-lucide="settings"></i>
          <span>Configurações</span>
        </a>
        ` : `
        <a href="#/leituras" class="sidebar-menu-item ${currentPath === '#/leituras' ? 'active' : ''}">
          <i data-lucide="file-text"></i>
          <span>Histórico Safra</span>
        </a>

        <a href="#/alertas" class="sidebar-menu-item ${currentPath === '#/alertas' ? 'active' : ''}">
          <i data-lucide="alert-triangle"></i>
          <span>Alertas</span>
        </a>

        <a href="#/configuracoes" class="sidebar-menu-item ${currentPath === '#/configuracoes' ? 'active' : ''}">
          <i data-lucide="settings"></i>
          <span>Configurações</span>
        </a>
        `)}
      </nav>

      <!-- Bottom Profile & Connectivity (Figma: Vale das Uvas / Petrolina - Setor 04) -->
      <div class="sidebar-bottom-profile">
        <div class="bottom-profile-card">
          <div class="profile-avatar-vu">VU</div>
          <div class="profile-info-text">
            <div class="farm-name">Vale das Uvas</div>
            <div class="farm-sub">Petrolina - Setor 04</div>
          </div>
          <button id="logout-btn" style="margin-left: auto; color: #94A3B8; background: none; border: none; cursor: pointer; padding: 4px;" title="Sair do Sistema">
            <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
          </button>
        </div>

        <div class="gateway-status-pill">
          <span style="display: flex; align-items: center; gap: 6px; color: #1E293B; font-weight: 600; font-size: 11px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.7);"></span>
            ${profile.gatewayPill}
          </span>
          <span style="color: #64748B; font-size: 11px; font-weight: 500;">${profile.gatewayStatus}</span>
        </div>
      </div>
    </aside>
  `;
}
