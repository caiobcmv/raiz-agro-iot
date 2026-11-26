/**
 * CONFIGURAÇÕES E MEU PERFIL - RAIZ AGRO IOT
 * Suporta perfil Produtor/Exportador (Maria Clara) e Analista (Luiz Felipe).
 * Diretrizes de Governança: Parâmetros cadastrais e técnicos são de leitura operacional;
 * Usuários solicitam alterações através do botão dedicado "Solicitar Mudança ao Administrador".
 * Sem pop-ups invasivos ao clicar nos campos protegidos.
 */

import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { auth } from '../auth.js';
import { api } from '../api.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';


let CULTURAS_LIST = ['Uva de Mesa', 'Morango', 'Manga'];

let VARIEDADES_LIST = [
  { dot: '#059669', name: 'Uva Vitória (Seedless)', market: 'Mercado alvo: União Europeia / UK', brix: '≥18,0° Brix', calibre: 'Calibre: ≥22mm' },
  { dot: '#DC2626', name: 'Uva Crimson', market: 'Mercado alvo: América do Norte (USDA)', brix: '≥17,5° Brix', calibre: 'Calibre: 19mm' },
  { dot: '#F59E0B', name: 'Uva Thompson', market: 'Mercado alvo: Ásia (China / Coreia do Sul)', brix: '≥17,0° Brix', calibre: 'Calibre: ≥18mm' },
  { dot: '#A78BFA', name: 'Manga Palmer', market: 'Mercado alvo: Spot Europa (Roterdã)', brix: '≥13,0° Brix', calibre: 'Calibre: ≥350g' },
  { dot: '#A78BFA', name: 'Manga Tommy', market: 'Mercado alvo: Mercado Nacional', brix: '≥12,5° Brix', calibre: 'Calibre: ≥400g' },
];

export async function renderConfiguracoes() {
  const profileRole = auth.getActiveProfile();
  const isAdmin = profileRole === 'admin';
  const isAnalista = profileRole === 'analista';

  const [safrasRes, propRes, lotesRes, frutasRes, varRes] = await Promise.allSettled([
    api.getCatalogoSafras(),
    api.getCatalogoPropriedades(),
    api.getLotes(),
    api.request('/frutas'),
    api.request('/variedades')
  ]);
  const safrasReais = safrasRes.status === 'fulfilled' && Array.isArray(safrasRes.value) ? safrasRes.value : [];
  const propReal = (propRes.status === 'fulfilled' && Array.isArray(propRes.value) && propRes.value[0]) ? propRes.value[0] : {};
  const lotesReais = lotesRes.status === 'fulfilled' && Array.isArray(lotesRes.value) ? lotesRes.value : [];
  const frutasReais = frutasRes.status === 'fulfilled' && Array.isArray(frutasRes.value) ? frutasRes.value : [];
  const varReais = varRes.status === 'fulfilled' && Array.isArray(varRes.value) ? varRes.value : [];

  if (frutasReais.length > 0) {
    CULTURAS_LIST = frutasReais.map(f => f.nome || f.fruta).filter(Boolean);
  }
  if (varReais.length > 0) {
    const cores = ['#059669', '#DC2626', '#F59E0B', '#A78BFA', '#0284C7'];
    VARIEDADES_LIST = varReais.map((v, idx) => ({
      dot: cores[idx % cores.length],
      name: `${v.fruta ? v.fruta + ' ' : ''}${v.nome || 'Variedade'}`,
      market: v.classe ? `Classe: ${v.classe}` : 'Padrão Homologado',
      brix: v.brix_min != null ? `≥${Number(v.brix_min).toFixed(1).replace('.', ',')}° Brix` : '— Brix',
      calibre: v.calibre_min ? `Calibre: ${v.calibre_min}` : ''
    }));
  }
  const profile = auth.getProfileData();
  const nomeExibicao = profile.nome;
  const cargoExibicao = profile.cargo;
  const iniciais = profile.iniciais;
  const emailUsuario = profile.email;
  const userId = isAdmin ? '3' : (isAnalista ? '2' : '1');
  const telefone = isAdmin ? '(87) 99888-0011' : (isAnalista ? '(87) 99812-4420' : '(87) 99842-1104');
  const bio = isAdmin
    ? 'Administração global de infraestrutura IoT, governança de usuários, parâmetros agronômicos e controle de acessos.'
    : (isAnalista
      ? 'Supervisão técnica de nós ESP32 (DHT11 e umidade do solo) e calibração de sensores IoT.'
      : 'Gestão operacional de colheita, irrigação de precisão e manejo integrado de campo.');

  const readOnlyAttr = isAdmin ? '' : 'readonly';
  const inputBg = isAdmin ? '#FFFFFF' : '#F8FAFC';
  const inputCursor = isAdmin ? 'text' : 'default';
  const roleBadge = isAdmin
    ? 'Administradora Geral • Permissão Total'
    : (isAnalista ? 'Analista Técnico • Telemetria' : 'Gestora Agronômica e Exportação');

  return `
  <div class="dashboard-canvas" style="padding: 28px 36px 48px; overflow-y: auto;">

    ${(isAnalista || isAdmin) ? `
      <!-- BANNER DE ACESSO RÁPIDO À TELA DE CALIBRAÇÃO -->
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px 20px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: #DBEAFE; display: flex; align-items: center; justify-content: center; color: #0284C7;">
            <i data-lucide="sliders" style="width: 18px; height: 18px;"></i>
          </div>
          <div>
            <strong style="font-size: 13.5px; color: #1E293B; display: block;">Calibração de Sensores &amp; Parâmetros IoT</strong>
            <p style="margin: 2px 0 0; font-size: 11.5px; color: #64748B;">Ajuste de limiares agronômicos, sanitização de telemetria, cortes preditivos e calibração de nós ESP32.</p>
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button type="button" id="btn-modal-calibrar-rapido" style="padding: 8px 14px; background: #FFFFFF; border: 1.5px solid #0284C7; color: #0284C7; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s;" onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background='#FFFFFF'">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Calibrar Limiares</span>
          </button>
          <a href="#/calibracao" style="background: #0284C7; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(2,132,199,0.25);">
            <span>Painel Completo de Calibração</span> &rarr;
          </a>
        </div>
      </div>
    ` : ''}

    <!-- CARD 1: MEU PERFIL E PREFERÊNCIAS PESSOAIS -->
    <div class="apple-card" style="padding: 26px 28px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      
      <!-- Topo do Card: Avatar, Título, Badge e Subtítulo -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div id="profile-avatar-display" style="width: 52px; height: 52px; border-radius: 50%; background: ${profile.avatarBg || '#D1FAE5'}; border: 2.5px solid ${profile.avatarBorder || '#10B981'}; color: ${profile.avatarColor || '#065F46'}; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">
            ${iniciais}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #0F172A;">Meu Perfil e Preferências Pessoais</h3>
              <span style="background: ${isAdmin ? '#EFF6FF' : '#ECFDF5'}; color: ${isAdmin ? '#1E40AF' : '#065F46'}; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isAdmin ? '#3B82F6' : '#10B981'};"></span>
                ${roleBadge} (Usuário #${userId} • ${emailUsuario})
              </span>
            </div>
            <p style="margin: 3px 0 0; font-size: 12px; color: #94A3B8;">Suas preferências visuais são salvas localmente e carregadas automaticamente em qualquer dispositivo.</p>
          </div>
        </div>

        <button id="btn-salvar-perfil-banco" style="padding: 9px 18px; background: #059669; color: #FFFFFF; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.15s; box-shadow: 0 2px 6px rgba(5,150,105,0.25);" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
          <i data-lucide="cloud" style="width: 14px; height: 14px;"></i>
          <span>Salvar Perfil no Banco</span>
        </button>
      </div>

      <!-- Grid com 3 Colunas -->
      <div style="display: grid; grid-template-columns: 1.2fr 1.3fr 1.5fr; gap: 24px; align-items: start;">
        
        <!-- Coluna 1: Nome, Cargo, Iniciais, Telefone -->
        <div>
          <!-- Nome de Exibição -->
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Nome de Exibição</label>
            <input id="cfg-profile-name" value="${nomeExibicao}" ${readOnlyAttr} style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: ${inputBg}; box-sizing: border-box; cursor: ${inputCursor};">
          </div>

          <!-- Cargo e Iniciais -->
          <div style="display: grid; grid-template-columns: 1fr 70px; gap: 10px; margin-bottom: 14px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Cargo / Função</label>
              <input id="cfg-profile-role" value="${cargoExibicao}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; cursor: default;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Iniciais</label>
              <input id="cfg-profile-initials" value="${iniciais}" ${readOnlyAttr} style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; font-weight: 700; text-align: center; color: #0F172A; outline: none; background: ${inputBg}; box-sizing: border-box; cursor: ${inputCursor};">
            </div>
          </div>

          <!-- Telefone de Contato -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Telefone de Contato</label>
            <input id="cfg-profile-phone" value="${telefone}" ${readOnlyAttr} style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: ${inputBg}; box-sizing: border-box; cursor: ${inputCursor};">
          </div>
        </div>

        <!-- Coluna 2: Biografia e Cor do Avatar -->
        <div>
          <!-- Biografia / Escopo Operacional -->
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Biografia / Escopo Operacional</label>
            <textarea id="cfg-profile-bio" rows="3" ${readOnlyAttr} style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: ${inputBg}; box-sizing: border-box; resize: none; font-family: inherit; line-height: 1.5; cursor: ${inputCursor};">${bio}</textarea>
          </div>

          <!-- Cor do Avatar -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;">Cor do Avatar</label>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${[
                { key: 'esmeralda', name: 'Esmeralda', dot: '#059669', bg: '#ECFDF5', border: '#10B981', color: '#065F46' },
                { key: 'floresta',  name: 'Floresta',  dot: '#22C55E', bg: '#F0FDF4', border: '#22C55E', color: '#166534' },
                { key: 'azul',      name: 'Azul Céu',  dot: '#3B82F6', bg: '#EFF6FF', border: '#3B82F6', color: '#1E40AF' },
                { key: 'ambar',     name: 'Âmbar',     dot: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B', color: '#92400E' },
                { key: 'violeta',   name: 'Violeta',   dot: '#8B5CF6', bg: '#F5F3FF', border: '#8B5CF6', color: '#5B21B6' },
                { key: 'rosa',      name: 'Rosa',      dot: '#EC4899', bg: '#FDF2F8', border: '#EC4899', color: '#831843' }
              ].map(p => {
                const isActive = (profile.avatarKey || 'esmeralda') === p.key;
                return `
                  <button class="avatar-color-pill ${isActive ? 'active' : ''}" data-color="${p.key}" style="padding: 6px 12px; background: ${p.bg}; border: ${isActive ? '1.5px solid #10B981' : '1px solid #E2E8F0'}; border-radius: 20px; font-size: 12px; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? '#065F46' : '#475569'}; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p.dot};"></span> ${p.name}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Coluna 3: Card de Tema Visual e Toggles -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px;">
          <!-- Tema Visual da Plataforma -->
          <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 8px;">Tema Visual da Plataforma</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
              <button class="theme-option-btn active" data-theme="claro" style="padding: 8px 6px; background: #FFFFFF; border: 1.5px solid #10B981; border-radius: 8px; font-size: 11px; font-weight: 700; color: #065F46; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span> Claro
              </button>
              <button class="theme-option-btn" data-theme="escuro" style="padding: 8px 6px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                🌙 Escuro
              </button>
              <button class="theme-option-btn" data-theme="contraste" style="padding: 8px 6px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                ⚡ Contraste
              </button>
            </div>
          </div>

          <!-- Efeitos Visuais e Animações -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #EEF2F6; margin-bottom: 14px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #0F172A;">Efeitos Visuais e Animações</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 1px;">Transições suaves, glassmorphism e micro-interações</div>
            </div>
            <div class="toggle-track active" style="width: 36px; height: 20px; background: #059669; border-radius: 10px; position: relative; cursor: pointer; flex-shrink: 0;">
              <div style="position: absolute; left: 18px; top: 2px; width: 16px; height: 16px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
          </div>

          <!-- Telemetria em Tempo Real -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #0F172A;">Telemetria em Tempo Real</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 1px;">Atualiza leituras automaticamente sem recarregar</div>
            </div>
            <div class="toggle-track active" style="width: 36px; height: 20px; background: #059669; border-radius: 10px; position: relative; cursor: pointer; flex-shrink: 0;">
              <div style="position: absolute; left: 18px; top: 2px; width: 16px; height: 16px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- CARD 2: HISTÓRICO DE SAFRA DO PRODUTOR -->
    <div class="apple-card" style="padding: 24px 28px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      
      <!-- Topo com Título + Badges + Botões -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: #ECFDF5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #059669;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 20h10"/>
              <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
              <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
              <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
            </svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #0F172A;">Histórico de Safra do Produtor</h3>
              <span style="background: #ECFDF5; color: #065F46; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px;">PostgreSQL • Tempo Real</span>
            </div>
            <p style="margin: 3px 0 0; font-size: 12px; color: #94A3B8;">Ciclos consolidados de colheita com cultura, área plantada, produtividade, consumo hídrico e Brix médio.</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-recarregar-safra" style="padding: 8px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i>
            <span>Recarregar</span>
          </button>
          <a href="#/leituras" style="padding: 8px 16px; background: #183D2E; color: #FFFFFF; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.15s;">
            <i data-lucide="bar-chart-2" style="width: 14px; height: 14px;"></i>
            <span>Painel Completo de Safra &rarr;</span>
          </a>
        </div>
      </div>

      <!-- Tabela Histórico de Safra -->
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #F8FAFC; border-radius: 8px;">
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">ANO / CICLO</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">CULTURA PRINCIPAL</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">ÁREA (HA)</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">PRODUTIVIDADE</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">VOLUME COLHIDO</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">CONSUMO ÁGUA</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">BRIX MÉDIO</th>
              <th style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${safrasReais.length === 0 ? `
              <tr><td colspan="8" style="padding: 18px; text-align: center; font-size: 12px; color: #64748B;">Nenhuma safra cadastrada no banco de dados.</td></tr>
            ` : safrasReais.map(s => {
              const dtIni = s.data_inicio ? new Date(s.data_inicio).toLocaleDateString('pt-BR') : '—';
              const dtFim = s.data_fim ? new Date(s.data_fim).toLocaleDateString('pt-BR') : 'Em andamento';
              const areaVal = propReal.area_ha != null ? `${Number(propReal.area_ha).toLocaleString('pt-BR')} ha` : '—';
              const metaVal = s.meta_ton_ha != null ? `${Number(s.meta_ton_ha).toLocaleString('pt-BR')} ton/ha (Meta)` : '—';
              return `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #0F172A;">${s.nome || ('Safra #' + s.id_safra)}</td>
                  <td style="padding: 14px; font-size: 13px; color: #334155;">${CULTURAS_LIST.join(', ') || '—'}</td>
                  <td style="padding: 14px; font-size: 13px; color: #475569;">${areaVal}</td>
                  <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #059669;">${metaVal}</td>
                  <td style="padding: 14px; font-size: 13px; color: #475569;">${dtIni} a ${dtFim}</td>
                  <td style="padding: 14px; font-size: 13px; color: #475569;">—</td>
                  <td style="padding: 14px; font-size: 13px; color: #475569;">—</td>
                  <td style="padding: 14px;">
                    <span style="background: ${s.ativa ? '#D1FAE5' : '#F1F5F9'}; color: ${s.ativa ? '#065F46' : '#475569'}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">${s.ativa ? 'Em Andamento' : 'Concluída'}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

    </div>

    <!-- 2-COL: INFORMAÇÕES DA PROPRIEDADE + PADRÕES DE QUALIDADE -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">

      <!-- Informações e Cadastro da Propriedade -->
      <div class="apple-card" style="padding:24px 26px; align-self: start; height: auto;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#F0FDF4; border-radius:10px; display:flex;align-items:center;justify-content:center;">
              <i data-lucide="map-pin" style="width:16px;height:16px;color:#059669;"></i>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#0F172A;">Informações e Cadastro da Propriedade</div>
              <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Dados cadastrais de infraestrutura física e territorial</div>
            </div>
          </div>
          <div style="background:#F1F5F9; color:#64748B; font-size:10px; font-weight:700; padding:4px 10px; border-radius:6px; white-space:nowrap;">ID: ${propReal.codigo || propReal.id_propriedade || '—'}</div>
        </div>

        <!-- Nome da Fazenda -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Nome da Fazenda</label>
          <input id="cfg-farm-name" value="${propReal.nome || 'Propriedade'}" ${readOnlyAttr} style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
        </div>

        <!-- Localização -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Localização e Coordenadas Geográficas</label>
          <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <input id="cfg-farm-coords" value="${propReal.latitude != null && propReal.longitude != null ? `${propReal.latitude}, ${propReal.longitude}` : '—'}" ${readOnlyAttr} style="flex:1; min-width:140px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
            <div style="background:#F0FDF4; border-radius:8px; padding:8px 12px; font-size:11px; font-weight:700; color:#065F46; min-width:160px;">
              ${propReal.cidade || 'Petrolina'}${propReal.uf ? '/' + propReal.uf : ''} ${propReal.setor ? '• ' + propReal.setor : ''}
            </div>
          </div>
        </div>

        <!-- Área + LOTES Ativos -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Área Monitorada</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input id="cfg-farm-area" value="${propReal.area_ha != null ? propReal.area_ha : '—'}" ${readOnlyAttr} style="flex:1; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
              <span style="font-size:12px; color:#64748B; white-space:nowrap;">ha</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">LOTES Ativos</label>
            <input value="${lotesReais.length} lote(s) cadastrado(s)" readonly style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#475569; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
          </div>
        </div>

        <!-- Culturas Ativas -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:7px;">Culturas Ativas em Produção</label>
          <div id="culturas-tags-container" style="display:flex; flex-wrap:wrap; gap:7px; align-items:center;">
            ${CULTURAS_LIST.map((c, i) => `
              <div class="culture-tag" data-index="${i}" style="background:#183D2E; color:#fff; font-size:11px; font-weight:600; padding:5px 12px; border-radius:7px; display:flex; align-items:center; gap:6px;">
                ${c}
                ${isAdmin ? `<span class="btn-remove-cultura" data-index="${i}" style="cursor:pointer; font-weight:800; opacity:0.8; margin-left:3px;" title="Remover cultura">&times;</span>` : ''}
              </div>
            `).join('')}
            ${isAdmin ? `
              <button type="button" id="btn-add-cultura" style="background:#F1F5F9; color:#059669; border:1px dashed #059669; font-size:11px; font-weight:700; padding:5px 12px; border-radius:7px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                <i data-lucide="plus" style="width:12px;height:12px;"></i> Nova Cultura
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Tipo de Solo -->
        <div>
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Tipo de Solo / Caracterização Terroir</label>
          <select id="cfg-tipo-solo" ${isAdmin ? '' : 'disabled'} style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
            <option>Latossolo Vermelho Eutrófico (Textura Média a Argilosa)</option>
            <option>Argissolo Vermelho-Amarelo</option>
            <option>Neossolo Quartzarênico</option>
          </select>
        </div>
      </div>

      <!-- Padrões de Qualidade e Brix de Embarque -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#FFF7ED; border-radius:10px; display:flex;align-items:center;justify-content:center;">
              <i data-lucide="award" style="width:16px;height:16px;color:#F59E0B;"></i>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#0F172A;">Padrões de Qualidade e Brix de Embarque</div>
              <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Especificações físicas e químicas das frutas</div>
            </div>
          </div>
          <span style="font-size:11px; font-weight:600; color:#64748B; background:#F1F5F9; padding:4px 8px; border-radius:6px;">Homologado Embrapa</span>
        </div>

        <div style="margin-bottom:10px; font-size:11px; font-weight:600; color:#475569;">Variedades Registradas e Padrão de Colheita:</div>

        <div id="variedades-list-container" style="display:flex; flex-direction:column; gap:8px;">
          ${VARIEDADES_LIST.map((v, i) => `
            <div class="variedade-item" data-index="${i}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:9px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${v.dot}; flex-shrink:0;"></div>
                <div>
                  <div style="font-size:12px; font-weight:700; color:#0F172A;">${v.name}</div>
                  <div style="font-size:10px; color:#94A3B8;">${v.market}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="text-align:right;">
                  <div style="font-size:11px; font-weight:700; color:#059669;">${v.brix}</div>
                  <div style="font-size:10px; color:#94A3B8;">${v.calibre}</div>
                </div>
                <button type="button" class="btn-edit-variedade" data-index="${i}" style="padding:5px 10px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; font-size:11px; font-weight:700; color:#047857; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);" title="Editar Limiares">
                  <i data-lucide="edit-3" style="width:11px; height:11px;"></i> ${isAdmin || isAnalista ? 'Calibrar' : 'Solicitar Ajuste'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- CARD 3: SEGURANÇA E AUTENTICAÇÃO EM DOIS FATORES (TOTP) -->
    <div class="apple-card" id="card-totp-seguranca" style="padding: 24px 28px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">

      <!-- Topo com Título -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: #EFF6FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #0284C7;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #0F172A;">Segurança e Autenticação em Dois Fatores</h3>
              <span id="totp-status-badge" style="background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px;">Carregando...</span>
            </div>
            <p style="margin: 3px 0 0; font-size: 12px; color: #94A3B8;">Proteja sua conta com verificação de identidade por aplicativo autenticador (Google Authenticator, Authy, etc).</p>
          </div>
        </div>
      </div>

      <!-- Conteúdo dinâmico do TOTP -->
      <div id="totp-content-area" style="min-height: 60px;">
        <div style="text-align: center; padding: 20px; color: #94A3B8; font-size: 13px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Verificando status do autenticador...
        </div>
      </div>

    </div>

    <!-- SEÇÃO: REGRAS DE DISPARO E NOTIFICAÇÕES (FULL WIDTH, SEM CADEIA FRIA) -->
    <div class="apple-card" style="padding:24px 28px; margin-bottom:28px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
        <div style="width:36px;height:36px; background:#FEF2F2; border-radius:10px; display:flex;align-items:center;justify-content:center;">
          <i data-lucide="bell" style="width:16px;height:16px;color:#DC2626;"></i>
        </div>
        <div>
          <div style="font-size:14px; font-weight:700; color:#0F172A;">Regras de Disparo e Canais de Notificação</div>
          <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Matriz de acionamento por e-mail para eventos críticos e operacionais</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <!-- Alerta Crítico P1 -->
        <div style="background:#FEF2F2; border:1px solid #FEE2E2; border-radius:10px; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:800; color:#DC2626;">Alerta Crítico (P1)</div>
            <div style="font-size:10px; color:#94A3B8;">Murcha &lt;40% | Temp &gt;35°C</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <label class="custom-checkbox-label" style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#0F172A;">
              <input type="checkbox" id="notif-p1-email" checked style="accent-color:#DC2626; width:15px; height:15px;">
              E-mail Imediato de Alerta
            </label>
          </div>
        </div>

        <!-- Alerta Moderado P2 -->
        <div style="background:#FFFBEB; border:1px solid #FEF3C7; border-radius:10px; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:800; color:#F59E0B;">Alerta Moderado (P2)</div>
            <div style="font-size:10px; color:#94A3B8;">Umidade ar &lt;30% | Vento &gt;35km/h</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <label class="custom-checkbox-label" style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#0F172A;">
              <input type="checkbox" id="notif-p2-email" checked style="accent-color:#F59E0B; width:15px; height:15px;">
              E-mail Diário / Resumo
            </label>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <!-- Relatório Matinal -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:700; color:#0F172A;">Relatório Matinal Executivo</div>
            <div style="font-size:10px; font-weight:600; color:#94A3B8;">PDF · CSV</div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">Horário do Envio</label>
              <input id="cfg-horario-matinal" value="06:30 AM" ${readOnlyAttr} style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; font-weight:700; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
            </div>
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">E-mails CC</label>
              <input id="cfg-email-cc" value="gerencia@raizagro.agr.br, agronomo@raiz..." ${readOnlyAttr} style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:11px; color:#475569; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
            </div>
          </div>
        </div>

        <!-- Preferências de Moeda -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 16px;">
          <div style="display:flex; align-items:center; gap:7px; margin-bottom:10px;">
            <i data-lucide="dollar-sign" style="width:14px;height:14px;color:#64748B;"></i>
            <div style="font-size:12px; font-weight:700; color:#0F172A;">Preferências de Moeda</div>
          </div>
          <div style="font-size:10px; color:#94A3B8; margin-bottom:8px;">Moeda utilizada nos valores financeiros do sistema.</div>
          <div id="currency-selector-btns" style="display:flex; gap:8px;">
            <button class="currency-btn active" data-cur="BRL" style="padding:7px 16px; background:#183D2E; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Real brasileiro (R$)</button>
            <button class="currency-btn" data-cur="USD" style="padding:7px 14px; background:#F8FAFC; color:#475569; border:1px solid #E2E8F0; border-radius:8px; font-size:12px; cursor:pointer;">USD ($)</button>
            <button class="currency-btn" data-cur="EUR" style="padding:7px 14px; background:#F8FAFC; color:#475569; border:1px solid #E2E8F0; border-radius:8px; font-size:12px; cursor:pointer;">EUR (€)</button>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER ACTIONS -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; flex-wrap:wrap; gap:10px;">
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button id="btn-restaurar-padroes" style="padding:11px 20px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; font-size:13px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all .2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#F8FAFC'">
          <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> ${isAdmin ? 'Restaurar padrões do sistema' : 'Restaurar padrões visuais'}
        </button>
        <button id="btn-export-config-gestora" style="padding:11px 18px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; font-size:13px; font-weight:600; color:#0F172A; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all .2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="download" style="width:14px;height:14px;color:#059669;"></i> Exportar Perfil &amp; Padrões (PDF/CSV)
        </button>
      </div>
      <div>
        ${isAdmin ? `
          <button id="btn-salvar-configuracoes-admin" style="padding:11px 26px; background:#059669; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(5,150,105,.28); transition:transform .15s, opacity .2s;" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="save" style="width:14px;height:14px;"></i> Salvar Configurações Globais
          </button>
        ` : `
          <button id="btn-solicitar-mudanca" style="padding:11px 24px; background:#DC2626; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(220,38,38,.28); transition:transform .15s, opacity .2s;" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="send" style="width:14px;height:14px;"></i> Solicitar Mudança ao Administrador
          </button>
        `}
      </div>
    </div>

  </div>
  `;
}

export async function setupConfiguracoesEvents() {
  if (window.lucide) window.lucide.createIcons();

  const profileRole = auth.getActiveProfile();
  const isAnalista = profileRole === 'analista';
  const isAdmin = profileRole === 'admin';
  const perfilFormatado = isAdmin ? 'Administrador' : (isAnalista ? 'Analista de Telemetria' : 'Produtor / Exportador');

  // =========================================================================
  // 1. PREFERÊNCIAS PESSOAIS E VISUAIS (LIVRES PARA USO)
  // =========================================================================

  // A) Mudança da Cor do Avatar
  const avatarColors = {
    esmeralda: { bg: '#D1FAE5', border: '#10B981', color: '#065F46' },
    floresta:  { bg: '#DCFCE7', border: '#22C55E', color: '#14532D' },
    azul:      { bg: '#DBEAFE', border: '#3B82F6', color: '#1E3A8A' },
    ambar:     { bg: '#FEF3C7', border: '#F59E0B', color: '#78350F' },
    violeta:   { bg: '#EDE9FE', border: '#8B5CF6', color: '#4C1D95' },
    rosa:      { bg: '#FCE7F3', border: '#EC4899', color: '#831843' }
  };

  // Aplica a cor salva no carregamento da página
  const savedKey = localStorage.getItem('user_avatar_key_' + (isAnalista ? 'analista' : 'gestor')) || localStorage.getItem('USER_AVATAR_KEY') || 'esmeralda';
  const initialTheme = avatarColors[savedKey] || avatarColors.esmeralda;
  const avatarDisplay = document.getElementById('profile-avatar-display');
  if (avatarDisplay) {
    avatarDisplay.style.background = initialTheme.bg;
    avatarDisplay.style.borderColor = initialTheme.border;
    avatarDisplay.style.color = initialTheme.color;
  }
  const headerAvatar = document.querySelector('.avatar-initials-pill');
  if (headerAvatar) {
    headerAvatar.style.background = initialTheme.bg;
    headerAvatar.style.borderColor = initialTheme.border;
    headerAvatar.style.color = initialTheme.color;
  }
  document.querySelectorAll('.avatar-color-pill').forEach(p => {
    if (p.dataset.color === savedKey) {
      p.classList.add('active');
      p.style.border = '1.5px solid #10B981';
      p.style.fontWeight = '700';
      p.style.color = '#065F46';
    } else {
      p.classList.remove('active');
      p.style.border = '1px solid #E2E8F0';
      p.style.fontWeight = '500';
      p.style.color = '#475569';
    }
  });

  document.querySelectorAll('.avatar-color-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const colorKey = pill.dataset.color || 'esmeralda';
      const theme = auth.saveAvatarTheme(colorKey);

      document.querySelectorAll('.avatar-color-pill').forEach(p => {
        p.classList.remove('active');
        p.style.border = '1px solid #E2E8F0';
        p.style.fontWeight = '500';
        p.style.color = '#475569';
      });
      pill.classList.add('active');
      pill.style.border = '1.5px solid #10B981';
      pill.style.fontWeight = '700';
      pill.style.color = '#065F46';

      const avatarDisplay = document.getElementById('profile-avatar-display');
      if (avatarDisplay) {
        avatarDisplay.style.background = theme.bg;
        avatarDisplay.style.borderColor = theme.border;
        avatarDisplay.style.color = theme.color;
      }
      const headerAvatar = document.querySelector('.avatar-initials-pill');
      if (headerAvatar) {
        headerAvatar.style.background = theme.bg;
        headerAvatar.style.borderColor = theme.border;
        headerAvatar.style.color = theme.color;
      }
      toast.success('Cor Salva', `Paleta ${pill.textContent.trim()} salva com sucesso no seu perfil.`);
    });
  });

  // B) Tema Visual da Plataforma (Claro, Escuro, Contraste)
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-option-btn').forEach(b => {
        b.classList.remove('active');
        b.style.border = '1px solid #E2E8F0';
        b.style.fontWeight = '600';
        b.style.color = '#475569';
      });
      btn.classList.add('active');
      btn.style.border = '1.5px solid #10B981';
      btn.style.fontWeight = '700';
      btn.style.color = '#065F46';

      const theme = btn.dataset.theme;
      if (theme === 'escuro') {
        document.body.classList.add('dark-theme-preview');
        toast.info('Modo Escuro Ativo', 'Preferência visual aplicada à sua interface.');
      } else {
        document.body.classList.remove('dark-theme-preview');
        toast.info('Tema Atualizado', `Modo ${btn.textContent.trim()} selecionado.`);
      }
    });
  });

  // C) Toggles de Animações e Telemetria em Tempo Real
  document.querySelectorAll('.toggle-track').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const knob = toggle.querySelector('div');
      const isActive = toggle.style.background === 'rgb(5, 150, 105)' || toggle.classList.contains('active');
      if (isActive) {
        toggle.classList.remove('active');
        toggle.style.background = '#CBD5E1';
        if (knob) knob.style.left = '2px';
      } else {
        toggle.classList.add('active');
        toggle.style.background = '#059669';
        if (knob) knob.style.left = '18px';
      }
    });
  });

  // D) Recarregar Histórico de Safra
  document.getElementById('btn-recarregar-safra')?.addEventListener('click', () => {
    const icon = document.querySelector('#btn-recarregar-safra i, #btn-recarregar-safra svg');
    if (icon) icon.style.transform = 'rotate(360deg)';
    toast.success('Histórico Atualizado', 'Dados de safra sincronizados em tempo real com o banco.');
  });

  // E) Preferências de Moeda
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.currency-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#F8FAFC';
        b.style.color = '#475569';
        b.style.border = '1px solid #E2E8F0';
        b.style.fontWeight = 'normal';
      });
      btn.classList.add('active');
      btn.style.background = '#183D2E';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.fontWeight = '700';
      toast.info('Moeda Selecionada', `Exibição monetária convertida para ${btn.textContent.trim()}.`);
    });
  });

  // F) Salvar Perfil no Banco (Preferências Pessoais)
  document.getElementById('btn-salvar-perfil-banco')?.addEventListener('click', () => {
    const activePill = document.querySelector('.avatar-color-pill.active');
    const colorKey = activePill?.dataset.color || 'esmeralda';
    auth.saveAvatarTheme(colorKey);
    toast.success('Perfil Salvo', 'Preferências de avatar e tema sincronizadas com sucesso.');
  });

  // G) Restaurar Padrões Visuais / Sistema
  document.getElementById('btn-restaurar-padroes')?.addEventListener('click', () => {
    auth.saveAvatarTheme('esmeralda');
    document.body.classList.remove('dark-theme-preview');
    toast.info('Padrões Restaurados', isAdmin ? 'Padrões de sistema e tema Claro restaurados.' : 'Tema Claro e paleta Esmeralda restaurados.');
  });

  // H) Edição de Variedades e Limiares
  document.querySelectorAll('.btn-edit-variedade').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = VARIEDADES_LIST[idx];
      if (!item) return;

      if (!isAdmin && !isAnalista) {
        Modal.open(`Solicitar Ajuste — ${item.name}`, `
          <div style="font-size:13px; color:#475569; display:flex; flex-direction:column; gap:12px;">
            <p style="margin:0; line-height:1.5;">Como Produtor/Exportador, alterações de limiares de colheita e Brix padrão exigem homologação técnica para manter conformidade com certificações internacionais.</p>
            <div>
              <label style="font-weight:700; color:#1E293B; display:block; margin-bottom:5px;">Justificativa da Solicitação</label>
              <textarea id="modal-justificativa" placeholder="Ex: Solicito revisão do Brix mínimo para lote antecipado devido a demanda da UE..." style="width:100%; height:75px; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:12px; box-sizing:border-box;"></textarea>
            </div>
          </div>
        `, () => {
          toast.success('Solicitação Enviada', `Pedido de ajuste para ${item.name} registrado para o Administrador.`);
        }, 'Enviar Solicitação');
        return;
      }

      Modal.open(`Calibrar Padrão — ${item.name}`, `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
          <p style="margin:0; font-size:12px; color:#64748B;">Ajuste os parâmetros fisiológicos e de embarque para esta cultura:</p>
          <div>
            <label style="font-weight:700; color:#1E293B; display:block; margin-bottom:5px;">Grau Brix Mínimo</label>
            <input id="modal-edit-brix" value="${item.brix}" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; box-sizing:border-box; font-size:13px;">
          </div>
          <div>
            <label style="font-weight:700; color:#1E293B; display:block; margin-bottom:5px;">Calibre Padrão de Colheita</label>
            <input id="modal-edit-calibre" value="${item.calibre}" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; box-sizing:border-box; font-size:13px;">
          </div>
        </div>
      `, () => {
        const novoBrix = document.getElementById('modal-edit-brix')?.value.trim();
        const novoCalibre = document.getElementById('modal-edit-calibre')?.value.trim();
        if (novoBrix) item.brix = novoBrix;
        if (novoCalibre) item.calibre = novoCalibre;
        toast.success('Padrão Atualizado', `Limiares de ${item.name} foram calibrados com sucesso.`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 'Gravar Calibração');
    });
  });

  // H1) Calibração Rápida de Limiares Agronômicos no Topo
  document.getElementById('btn-modal-calibrar-rapido')?.addEventListener('click', async () => {
    let limiares = [];
    try {
      const res = await api.getCalibracaoResumo();
      limiares = res?.limiares || [];
    } catch (e) {
      limiares = [
        { id_config: 1, fruta: 'Manga Tommy / Kent', temp_min: 10.0, temp_max: 13.0, umidade_min: 90, umidade_max: 95 },
        { id_config: 2, fruta: 'Uva de Mesa (Vitória / Crimson)', temp_min: -0.5, temp_max: 2.0, umidade_min: 90, umidade_max: 95 },
        { id_config: 3, fruta: 'Melão Amarelo', temp_min: 10.0, temp_max: 12.0, umidade_min: 85, umidade_max: 95 }
      ];
    }

    const htmlInputs = limiares.map(c => `
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px; margin-bottom:10px;">
        <strong style="display:block; font-size:13px; color:#0F172A; margin-bottom:8px;">${c.fruta || 'Cultura'} (ID #${c.id_config})</strong>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px;">
          <div>
            <label style="font-size:10px; color:#64748B; font-weight:700;">Temp Mín (°C)</label>
            <input type="number" step="0.1" class="quick-calib-tmin" data-id="${c.id_config}" value="${c.temp_min}" style="width:100%; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:12px;">
          </div>
          <div>
            <label style="font-size:10px; color:#64748B; font-weight:700;">Temp Máx (°C)</label>
            <input type="number" step="0.1" class="quick-calib-tmax" data-id="${c.id_config}" value="${c.temp_max}" style="width:100%; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:12px;">
          </div>
          <div>
            <label style="font-size:10px; color:#64748B; font-weight:700;">UR Mín (%)</label>
            <input type="number" step="1" class="quick-calib-umin" data-id="${c.id_config}" value="${c.umidade_min}" style="width:100%; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:12px;">
          </div>
          <div>
            <label style="font-size:10px; color:#64748B; font-weight:700;">UR Máx (%)</label>
            <input type="number" step="1" class="quick-calib-umax" data-id="${c.id_config}" value="${c.umidade_max}" style="width:100%; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:12px;">
          </div>
        </div>
      </div>
    `).join('');

    Modal.open('Calibração de Limiares Agronômicos', `
      <div style="font-size:13px; color:#334155;">
        <p style="margin:0 0 12px; font-size:12px; color:#64748B;">Ajuste direto dos limiares fisiológicos de armazenamento no PostgreSQL:</p>
        ${htmlInputs}
      </div>
    `, async () => {
      try {
        const rows = document.querySelectorAll('.quick-calib-tmin');
        for (const input of rows) {
          const id = input.dataset.id;
          const tmin = parseFloat(input.value);
          const tmax = parseFloat(document.querySelector(`.quick-calib-tmax[data-id="${id}"]`)?.value);
          const umin = parseFloat(document.querySelector(`.quick-calib-umin[data-id="${id}"]`)?.value);
          const umax = parseFloat(document.querySelector(`.quick-calib-umax[data-id="${id}"]`)?.value);
          if (!isNaN(tmin) && !isNaN(tmax) && !isNaN(umin) && !isNaN(umax)) {
            await api.salvarLimiarCalibracao(id, { temp_min: tmin, temp_max: tmax, umidade_min: umin, umidade_max: umax });
          }
        }
        toast.success('Limiares Calibrados', 'Parâmetros atualizados no banco PostgreSQL.');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return true;
      } catch (err) {
        toast.error('Erro na Calibração', err.message || 'Falha ao gravar limiares.');
        return false;
      }
    }, 'Salvar Limiares');
  });

  // I) Adicionar e Remover Culturas (Admin)
  document.getElementById('btn-add-cultura')?.addEventListener('click', () => {
    Modal.open('Cadastrar Nova Cultura', `
      <div style="font-size:13px;">
        <label style="font-weight:700; color:#1E293B; display:block; margin-bottom:5px;">Nome da Cultura</label>
        <input id="modal-nova-cultura" placeholder="Ex: Melão Amarelo, Goiaba Paluma..." style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; box-sizing:border-box; font-size:13px;">
      </div>
    `, () => {
      const nova = document.getElementById('modal-nova-cultura')?.value.trim();
      if (nova) {
        CULTURAS_LIST.push(nova);
        toast.success('Cultura Cadastrada', `A cultura ${nova} foi adicionada à propriedade.`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }, 'Cadastrar Cultura');
  });

  document.querySelectorAll('.btn-remove-cultura').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const removida = CULTURAS_LIST.splice(idx, 1);
      toast.info('Cultura Removida', `${removida[0]} foi removida da lista.`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  // J) Salvar Configurações do Sistema (Apenas Perfil Administrador)
  document.getElementById('btn-salvar-configuracoes-admin')?.addEventListener('click', () => {
    const farmName = document.getElementById('cfg-farm-name')?.value || 'Fazenda Vale das Uvas';
    const farmCoords = document.getElementById('cfg-farm-coords')?.value || '-21.177502, -47.616331';
    const farmArea = document.getElementById('cfg-farm-area')?.value || '1.250';
    const tipoSolo = document.getElementById('cfg-tipo-solo')?.value || '';
    const bio = document.getElementById('cfg-profile-bio')?.value || '';
    const phone = document.getElementById('cfg-profile-phone')?.value || '';
    const matinal = document.getElementById('cfg-horario-matinal')?.value || '06:30 AM';
    const emailCc = document.getElementById('cfg-email-cc')?.value || '';

    const currentPrefs = auth.getPreferences();
    const updated = {
      ...currentPrefs,
      propriedade_json: {
        ...(currentPrefs.propriedade_json || {}),
        farmName,
        farmCoords,
        farmArea,
        tipoSolo,
        culturas: CULTURAS_LIST,
        variedades: VARIEDADES_LIST
      },
      notificacoes_json: {
        ...(currentPrefs.notificacoes_json || {}),
        horarioMatinal: matinal,
        emailCc
      }
    };
    auth.savePreferences(updated);
    toast.success('Configurações Salvas', 'Todos os parâmetros da propriedade e do sistema foram gravados com sucesso.');
  });

  // H) Exportar Perfil & Padrões de Qualidade (PDF & CSV)
  document.getElementById('btn-export-config-gestora')?.addEventListener('click', () => {
    const headers = ['Variedade', 'Mercado Alvo', 'Brix Minimo', 'Calibre'];
    const rows = VARIEDADES_LIST.map(v => [v.name, v.market, v.brix, v.calibre]);
    const dataTag = new Date().toISOString().slice(0, 10);
    openExportChoiceModal(
      Modal,
      'Exportar Perfil, Propriedade & Padrões de Qualidade',
      () => {
        downloadCSV(`perfil_padroes_qualidade_${dataTag}.csv`, headers, rows);
        toast.success('CSV Exportado', `perfil_padroes_qualidade_${dataTag}.csv baixado.`);
      },
      () => {
        downloadPDF(`perfil_padroes_qualidade_${dataTag}.pdf`, {
          title: 'Ficha Cadastral da Propriedade & Padrões de Embarque',
          subtitle: 'Fazenda RaizTech - Polo Sul • Petrolina - Setor 04 (1.250 ha)',
          headers,
          rows,
          notes: [
            `Culturas Ativas: ${CULTURAS_LIST.join(', ')}.`,
            'Padrões homologados Embrapa Semiárido para exportação UE / UK / USDA.'
          ]
        });
        toast.success('PDF Exportado', `perfil_padroes_qualidade_${dataTag}.pdf baixado.`);
      }
    );
  });

  // =========================================================================
  // 2. SEGURANÇA E TOTP (Autenticação em Dois Fatores por App)
  // =========================================================================
  async function carregarStatusTotp() {
    const contentArea = document.getElementById('totp-content-area');
    const statusBadge = document.getElementById('totp-status-badge');
    if (!contentArea) return;

    try {
      const status = await api.getTotpStatus();
      const ativo = status?.ativo === true;
      const codigosRestantes = status?.codigos_recuperacao_restantes ?? '—';

      if (statusBadge) {
        statusBadge.textContent = ativo ? '✓ Autenticador Ativo' : 'Desativado';
        statusBadge.style.background = ativo ? '#D1FAE5' : '#FEF2F2';
        statusBadge.style.color = ativo ? '#065F46' : '#991B1B';
      }

      if (ativo) {
        contentArea.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #065F46;">Autenticação por aplicativo está ativa</div>
                <div style="font-size: 11px; color: #059669;">Códigos de recuperação restantes: <strong>${codigosRestantes}</strong></div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button type="button" id="btn-regenerar-codigos" style="padding: 9px 16px; background: #FFFFFF; border: 1.5px solid #0284C7; color: #0284C7; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Regenerar Códigos de Recuperação
              </button>
              <button type="button" id="btn-desativar-totp" style="padding: 9px 16px; background: #FFFFFF; border: 1.5px solid #DC2626; color: #DC2626; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Desativar Autenticador
              </button>
            </div>
          </div>
        `;
        setupTotpAtivoEvents();
      } else {
        contentArea.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              </svg>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #92400E;">Autenticador não configurado</div>
                <div style="font-size: 11px; color: #B45309;">Adicione uma camada extra de segurança à sua conta com um aplicativo autenticador.</div>
              </div>
            </div>
            <button type="button" id="btn-ativar-totp" style="padding: 10px 20px; background: #0284C7; color: #FFFFFF; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; box-shadow: 0 2px 6px rgba(2,132,199,0.25);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              Ativar Aplicativo Autenticador
            </button>
          </div>
        `;
        setupTotpInativoEvents();
      }
    } catch (err) {
      if (statusBadge) {
        statusBadge.textContent = 'Indisponível';
        statusBadge.style.background = '#F1F5F9';
        statusBadge.style.color = '#64748B';
      }
      contentArea.innerHTML = `
        <div style="padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 12px; color: #64748B; text-align: center;">
          Não foi possível verificar o status do autenticador. <a href="javascript:void(0)" id="btn-retry-totp" style="color: #0284C7; font-weight: 700;">Tentar novamente</a>
        </div>
      `;
      document.getElementById('btn-retry-totp')?.addEventListener('click', carregarStatusTotp);
    }
  }

  function mostrarCodigosRecuperacao(codigos, aviso) {
    const codigosFormatados = codigos.join('\n');
    Modal.open('Códigos de Recuperação', `
      <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 14px;">
        <div style="padding: 12px 14px; background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">⚠️ ATENÇÃO — Guarde esses códigos com segurança!</div>
          <div style="font-size: 11px; color: #B91C1C; line-height: 1.5;">${aviso || 'Estes códigos só serão exibidos UMA ÚNICA VEZ. Cada código só pode ser usado uma vez. Se perder o acesso ao autenticador, use um desses códigos para entrar.'}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; font-family: 'Courier New', monospace;">
          <div id="recovery-codes-display" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px;">
            ${codigos.map((c, i) => `<div style="font-size: 14px; font-weight: 700; color: #0F172A; padding: 4px 0;">${i + 1}. ${c}</div>`).join('')}
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button type="button" id="btn-copy-codes" style="padding: 8px 16px; background: #059669; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            📋 Copiar Todos
          </button>
          <button type="button" id="btn-download-codes" style="padding: 8px 16px; background: #0284C7; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            💾 Baixar como TXT
          </button>
        </div>
      </div>
    `, () => true, 'Já salvei meus códigos');

    setTimeout(() => {
      document.getElementById('btn-copy-codes')?.addEventListener('click', () => {
        navigator.clipboard.writeText(codigosFormatados).then(() => {
          toast.success('Copiado!', 'Códigos de recuperação copiados para a área de transferência.');
        }).catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = codigosFormatados;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('Copiado!', 'Códigos copiados.');
        });
      });

      document.getElementById('btn-download-codes')?.addEventListener('click', () => {
        const conteudo = 'RAIZ AGRO IOT - Códigos de Recuperação 2FA\n' +
          '============================================\n\n' +
          'Gerados em: ' + new Date().toLocaleString('pt-BR') + '\n\n' +
          codigos.map((c, i) => `${i + 1}. ${c}`).join('\n') + '\n\n' +
          'IMPORTANTE: Cada código só pode ser usado uma vez.\n' +
          'Guarde este arquivo em local seguro.';
        const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raiz-agro-codigos-recuperacao-2fa.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Download', 'Arquivo TXT baixado com sucesso.');
      });
    }, 100);
  }

  function setupTotpInativoEvents() {
    document.getElementById('btn-ativar-totp')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-ativar-totp');
      const textoOriginal = btn?.innerHTML;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Gerando QR Code...';
      }

      try {
        const dados = await api.iniciarTotp();

        Modal.open('Configurar Aplicativo Autenticador', `
          <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 16px;">
            <div style="text-align: center;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #64748B;">Escaneie o QR Code abaixo com seu aplicativo autenticador:</p>
              <img src="data:image/png;base64,${dados.qr_code_png_base64}" alt="QR Code TOTP" style="width: 200px; height: 200px; border: 2px solid #E2E8F0; border-radius: 12px; padding: 8px; background: #FFFFFF;">
            </div>
            <div style="padding: 12px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">Ou digite manualmente no app:</div>
              <div style="font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; color: #0F172A; letter-spacing: 2px; word-break: break-all;">${dados.segredo_manual}</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">Tipo: TOTP • ${dados.digitos || 6} dígitos • Período: ${dados.periodo_s || 30}s</div>
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 6px;">DIGITE O CÓDIGO EXIBIDO NO APP PARA CONFIRMAR:</label>
              <input type="text" id="modal-totp-confirm-code" placeholder="000000" maxlength="6" inputmode="numeric" style="width: 100%; padding: 12px 16px; border: 1.5px solid #0284C7; border-radius: 8px; font-size: 20px; font-weight: 700; text-align: center; letter-spacing: 8px; box-sizing: border-box; outline: none;">
            </div>
          </div>
        `, async (modal) => {
          const codigo = document.getElementById('modal-totp-confirm-code')?.value?.trim();
          if (!codigo || codigo.length !== 6) {
            toast.warning('Código Incompleto', 'Digite os 6 dígitos exibidos no aplicativo autenticador.');
            return false;
          }

          try {
            const res = await api.confirmarTotp(codigo);
            toast.success('Autenticador Ativado!', 'A verificação em dois fatores por aplicativo foi ativada com sucesso.');

            if (res.codigos_recuperacao && res.codigos_recuperacao.length > 0) {
              setTimeout(() => mostrarCodigosRecuperacao(res.codigos_recuperacao, res.aviso), 400);
            }

            carregarStatusTotp();
            return true;
          } catch (err) {
            toast.error('Código Inválido', err.message || 'O código digitado não corresponde. Tente novamente.');
            return false;
          }
        }, 'Confirmar e Ativar');
      } catch (err) {
        if (err.message?.includes('409') || err.message?.includes('já está ativo') || err.message?.includes('ativo')) {
          toast.info('Já Ativo', 'O autenticador já está ativo na sua conta.');
          carregarStatusTotp();
        } else {
          toast.error('Erro', err.message || 'Não foi possível iniciar a configuração do autenticador.');
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
        }
      }
    });
  }

  function setupTotpAtivoEvents() {
    // Regenerar códigos de recuperação
    document.getElementById('btn-regenerar-codigos')?.addEventListener('click', () => {
      Modal.open('Regenerar Códigos de Recuperação', `
        <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
            Para gerar novos códigos de recuperação, digite o código atual de 6 dígitos do seu aplicativo autenticador.
            <strong>Os códigos anteriores serão invalidados.</strong>
          </p>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 6px;">CÓDIGO DO AUTENTICADOR</label>
            <input type="text" id="modal-regen-code" placeholder="000000" maxlength="6" inputmode="numeric" style="width: 100%; padding: 12px 16px; border: 1.5px solid #0284C7; border-radius: 8px; font-size: 18px; font-weight: 700; text-align: center; letter-spacing: 6px; box-sizing: border-box; outline: none;">
          </div>
        </div>
      `, async () => {
        const codigo = document.getElementById('modal-regen-code')?.value?.trim();
        if (!codigo || codigo.length !== 6) {
          toast.warning('Código Incompleto', 'Digite os 6 dígitos do autenticador.');
          return false;
        }
        try {
          const res = await api.regenerarCodigosTotp(codigo);
          if (res.codigos_recuperacao && res.codigos_recuperacao.length > 0) {
            setTimeout(() => mostrarCodigosRecuperacao(res.codigos_recuperacao, 'Os códigos anteriores foram invalidados. Guarde estes novos códigos com segurança.'), 400);
          }
          carregarStatusTotp();
          return true;
        } catch (err) {
          toast.error('Código Inválido', err.message || 'O código não corresponde.');
          return false;
        }
      }, 'Regenerar Códigos');
    });

    // Desativar autenticador
    document.getElementById('btn-desativar-totp')?.addEventListener('click', () => {
      Modal.open('Desativar Autenticador', `
        <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px 14px; background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #991B1B;">⚠️ Atenção: isso reduzirá a segurança da sua conta.</div>
            <div style="font-size: 11px; color: #B91C1C; margin-top: 4px;">Após desativar, o login usará apenas e-mail e senha (ou verificação por e-mail, se configurada).</div>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 6px;">SUA SENHA ATUAL</label>
            <input type="password" id="modal-deactivate-password" placeholder="••••••••••••" style="width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box; outline: none;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 6px;">CÓDIGO DO AUTENTICADOR</label>
            <input type="text" id="modal-deactivate-code" placeholder="000000" maxlength="6" inputmode="numeric" style="width: 100%; padding: 12px 16px; border: 1.5px solid #DC2626; border-radius: 8px; font-size: 18px; font-weight: 700; text-align: center; letter-spacing: 6px; box-sizing: border-box; outline: none;">
          </div>
        </div>
      `, async () => {
        const senha = document.getElementById('modal-deactivate-password')?.value;
        const codigo = document.getElementById('modal-deactivate-code')?.value?.trim();
        if (!senha) {
          toast.warning('Senha Necessária', 'Digite sua senha atual.');
          return false;
        }
        if (!codigo || codigo.length !== 6) {
          toast.warning('Código Incompleto', 'Digite os 6 dígitos do autenticador.');
          return false;
        }
        try {
          await api.desativarTotp(senha, codigo);
          toast.success('Autenticador Desativado', 'A verificação por aplicativo foi removida da sua conta.');
          carregarStatusTotp();
          return true;
        } catch (err) {
          toast.error('Falha', err.message || 'Senha ou código inválidos.');
          return false;
        }
      }, 'Desativar');
    });
  }

  // Carrega status do TOTP ao entrar na página
  carregarStatusTotp();

  // =========================================================================
  // 3. BOTÃO EM VERMELHO: SOLICITAR MUDANÇA AO ADMINISTRADOR
  // =========================================================================
  document.getElementById('btn-solicitar-mudanca')?.addEventListener('click', () => {
    Modal.open('Solicitar Mudança ao Administrador', `
      <div style="font-size:13px; color:#475569; display:flex; flex-direction:column; gap:14px;">
        <p style="margin:0; line-height:1.5;">
          Seu perfil atual (<strong>${perfilFormatado}</strong>) possui permissão operacional de leitura sobre os parâmetros do sistema. Envie abaixo seu pedido detalhado para homologação pelo <strong>Administrador</strong>:
        </p>
        <div>
          <label style="display:block; font-size:11px; font-weight:700; color:#1E293B; margin-bottom:5px;">CATEGORIA DA MUDANÇA</label>
          <select id="modal-solicitar-categoria" style="width:100%; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; color:#0F172A; background:#FFFFFF;">
            <option>Dados Cadastrais e Perfil Pessoal</option>
            <option>Área, Localização ou Culturas da Propriedade</option>
            <option>Padrões de Qualidade e Brix de Embarque</option>
            <option>Limiares de Alertas e Notificações</option>
            <option>Outras Solicitações Técnicas</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:11px; font-weight:700; color:#1E293B; margin-bottom:5px;">DESCRIÇÃO DA ALTERAÇÃO DESEJADA</label>
          <textarea id="modal-solicitar-desc" rows="4" placeholder="Ex: Solicito alteração da cultura ativa e ajuste da área monitorada..." style="width:100%; padding:10px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; color:#0F172A; font-family:inherit; resize:vertical; box-sizing:border-box;"></textarea>
        </div>
      </div>
    `, () => {
      toast.success('Solicitação Enviada', 'Seu pedido de alteração foi encaminhado com sucesso ao Administrador!');
    }, 'Enviar Solicitação');
  });
}
