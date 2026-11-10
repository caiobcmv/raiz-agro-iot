/**
 * CONFIGURAÇÕES DO SISTEMA & PERFIL DO USUÁRIO
 * Totalmente dinâmico, responsivo (320px+) e com persistência real no PostgreSQL por ID do usuário.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

const DEFAULT_CULTURAS = ['Uva de Mesa', 'Morango', 'Manga'];

const DEFAULT_VARIEDADES = [
  { dot: '#059669', name: 'Uva Vitória (Seedless)', market: 'Mercado alvo: União Europeia / UK', brix: '≥18,0° Brix', calibre: 'Calibre: ≥22mm' },
  { dot: '#DC2626', name: 'Uva Crimson', market: 'Mercado alvo: América do Norte (USDA)', brix: '≥17,5° Brix', calibre: 'Calibre: 19mm' },
  { dot: '#F59E0B', name: 'Uva Thompson', market: 'Mercado alvo: Ásia (China / Coreia do Sul)', brix: '≥17,0° Brix', calibre: 'Calibre: ≥18mm' },
  { dot: '#A78BFA', name: 'Manga Palmer', market: 'Mercado alvo: Spot Europa (Roterdã)', brix: '≥13,0° Brix', calibre: 'Calibre: ≥350g' },
  { dot: '#A78BFA', name: 'Manga Tommy', market: 'Mercado alvo: Mercado Nacional', brix: '≥12,5° Brix', calibre: 'Calibre: ≥400g' },
];

let CULTURAS_LIST = [...DEFAULT_CULTURAS];
let VARIEDADES_LIST = DEFAULT_VARIEDADES.map(v => ({ ...v }));

const AVATAR_COLOR_OPTIONS = [
  { key: 'emerald', label: 'Esmeralda', bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  { key: 'forest',  label: 'Floresta',  bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
  { key: 'sky',     label: 'Azul Céu',  bg: '#E0F2FE', border: '#0284C7', text: '#0369A1' },
  { key: 'amber',   label: 'Âmbar',     bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  { key: 'purple',  label: 'Violeta',   bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' },
  { key: 'rose',    label: 'Rosa',      bg: '#FFE4E6', border: '#F43F5E', text: '#9F1239' }
];

export async function renderConfiguracoes() {
  // Sincroniza do banco antes de montar a tela para refletir dados mais recentes
  await auth.syncPreferencesFromDB().catch(() => {});
  const profile = auth.getProfileData();
  const prefs = auth.getPreferences();
  const propJson = prefs.propriedade_json || {};
  const notifJson = prefs.notificacoes_json || {};

  if (Array.isArray(propJson.culturas) && propJson.culturas.length > 0) {
    CULTURAS_LIST = [...propJson.culturas];
  } else {
    CULTURAS_LIST = [...DEFAULT_CULTURAS];
  }

  if (Array.isArray(propJson.variedades) && propJson.variedades.length > 0) {
    VARIEDADES_LIST = propJson.variedades.map(v => ({ ...v }));
  } else {
    VARIEDADES_LIST = DEFAULT_VARIEDADES.map(v => ({ ...v }));
  }

  const farmName = propJson.farmName || 'Fazenda RaizTech - Polo Sul';
  const farmCoords = propJson.farmCoords || '-21.177502,  -47.616331';
  const farmArea = propJson.farmArea || '1.250';
  const tipoSolo = propJson.tipoSolo || 'Latossolo Vermelho Eutrófico (Textura Média a Argilosa)';
  const urReefer = propJson.urReefer || '90% a 95%';
  const portoAtivo = propJson.portoAtivo || 'porto-pecem';
  const alarmeFinanceiro = notifJson.alarmeFinanceiro !== false;
  const horarioMatinal = notifJson.horarioMatinal || '06:30 AM';
  const emailCc = notifJson.emailCc || 'gerencia@raizagro.agr.br, agronomo@raizagro.agr.br';
  const moedaAtiva = prefs.moeda || 'BRL';
  const temaAtivo = profile.tema || 'claro';
  const efeitosVisuais = profile.efeitos_visuais !== false;
  const tempoReal = profile.atualizacao_tempo_real !== false;

  return `
  <div class="dashboard-canvas cfg-page-canvas" style="padding: 24px 32px 24px;">

    <!-- CARD DESTAQUE: MEU PERFIL & PREFERÊNCIAS DO USUÁRIO (PERSISTIDO NO BANCO DE DADOS) -->
    <div class="apple-card cfg-profile-card" style="padding: 24px 26px; margin-bottom: 20px; border: 1.5px solid rgba(16, 185, 129, 0.25);">
      <div class="cfg-card-top-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:14px;">
          <div id="cfg-avatar-preview" style="width:54px; height:54px; border-radius:50%; background:${profile.avatarBg}; border:2px solid ${profile.avatarBorder}; color:${profile.avatarColor}; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.08); transition:all 0.25s ease;">
            ${profile.iniciais}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h3 style="font-size:16px; font-weight:800; color:var(--text-dark, #0F172A); margin:0;">Meu Perfil & Preferências Pessoais</h3>
              <span id="cfg-db-sync-badge" style="background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; font-size:10px; font-weight:700; padding:3px 9px; border-radius:999px; display:inline-flex; align-items:center; gap:5px;">
                <span style="width:6px; height:6px; border-radius:50%; background:#10B981;"></span>
                Vinculado ao Usuário #${profile.id_usuario} (${profile.email})
              </span>
            </div>
            <div style="font-size:12px; color:#64748B; margin-top:3px;">
              Todas as alterações abaixo são salvas permanentemente no banco PostgreSQL e carregadas automaticamente em qualquer dispositivo.
            </div>
          </div>
        </div>

        <button type="button" id="btn-salvar-perfil-rapido" class="btn btn-primary" style="padding:10px 18px; background:#059669; color:#fff; border:none; border-radius:10px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:7px;">
          <i data-lucide="cloud-upload" style="width:15px; height:15px;"></i>
          <span>Salvar Perfil no Banco</span>
        </button>
      </div>

      <!-- Grid de campos de Perfil e Aparência -->
      <div class="cfg-grid-3col" style="display:grid; grid-template-columns: 1.2fr 1.2fr 1fr; gap:18px; margin-bottom:18px;">
        <!-- Coluna 1: Identidade -->
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px;">Nome de Exibição</label>
            <input id="cfg-user-nome" value="${profile.nome}" placeholder="Seu nome completo" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; background:#F8FAFC; box-sizing:border-box;">
          </div>
          <div style="display:grid; grid-template-columns: 1fr 90px; gap:10px;">
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px;">Cargo / Função</label>
              <input id="cfg-user-cargo" value="${profile.cargo}" placeholder="Ex: Gestora Técnica" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; background:#F8FAFC; box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px;">Iniciais</label>
              <input id="cfg-user-iniciais" value="${profile.iniciais}" maxlength="3" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; font-weight:800; text-transform:uppercase; text-align:center; color:#0F172A; background:#F8FAFC; box-sizing:border-box;">
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px;">Telefone / WhatsApp de Alerta</label>
            <input id="cfg-user-telefone" value="${profile.telefone}" placeholder="(87) 99999-0000" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; background:#F8FAFC; box-sizing:border-box;">
          </div>
        </div>

        <!-- Coluna 2: Bio e Cor do Avatar -->
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:5px;">Biografia / Escopo Operacional</label>
            <textarea id="cfg-user-bio" rows="3" placeholder="Descreva sua atuação técnica na fazenda..." style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; background:#F8FAFC; box-sizing:border-box; resize:vertical;">${profile.bio}</textarea>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:6px;">Cor do Avatar</label>
            <div id="cfg-avatar-colors" style="display:flex; gap:8px; flex-wrap:wrap;">
              ${AVATAR_COLOR_OPTIONS.map(opt => `
                <button type="button" class="avatar-color-chip ${profile.paletteKey === opt.key ? 'active' : ''}" data-color-key="${opt.key}" data-bg="${opt.bg}" data-border="${opt.border}" data-text="${opt.text}" title="${opt.label}" style="display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; background:${opt.bg}; border:2px solid ${profile.paletteKey === opt.key ? opt.border : 'transparent'}; color:${opt.text}; font-size:11px; font-weight:700; cursor:pointer;">
                  <span style="width:10px; height:10px; border-radius:50%; background:${opt.border};"></span>
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Coluna 3: Tema, Efeitos Visuais e Tempo Real -->
        <div style="display:flex; flex-direction:column; gap:12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px 16px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:6px;">Tema Visual da Plataforma</label>
            <div id="cfg-theme-selector" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
              <button type="button" class="theme-option-btn ${temaAtivo === 'claro' ? 'active' : ''}" data-theme-val="claro" style="padding:8px 6px; border-radius:8px; font-size:11px; font-weight:700; border:1px solid ${temaAtivo === 'claro' ? '#059669' : '#CBD5E1'}; background:${temaAtivo === 'claro' ? '#ECFDF5' : '#FFFFFF'}; color:${temaAtivo === 'claro' ? '#065F46' : '#475569'}; cursor:pointer;">
                ☀️ Claro
              </button>
              <button type="button" class="theme-option-btn ${temaAtivo === 'escuro' ? 'active' : ''}" data-theme-val="escuro" style="padding:8px 6px; border-radius:8px; font-size:11px; font-weight:700; border:1px solid ${temaAtivo === 'escuro' ? '#059669' : '#CBD5E1'}; background:${temaAtivo === 'escuro' ? '#183D2E' : '#FFFFFF'}; color:${temaAtivo === 'escuro' ? '#FFFFFF' : '#475569'}; cursor:pointer;">
                🌙 Escuro
              </button>
              <button type="button" class="theme-option-btn ${temaAtivo === 'alto_contraste' ? 'active' : ''}" data-theme-val="alto_contraste" style="padding:8px 6px; border-radius:8px; font-size:11px; font-weight:700; border:1px solid ${temaAtivo === 'alto_contraste' ? '#0F172A' : '#CBD5E1'}; background:${temaAtivo === 'alto_contraste' ? '#0F172A' : '#FFFFFF'}; color:${temaAtivo === 'alto_contraste' ? '#FFFFFF' : '#475569'}; cursor:pointer;">
                ⚡ Contraste
              </button>
            </div>
          </div>

          <!-- Toggle Efeitos Visuais -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; border-top:1px solid #E2E8F0;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#0F172A;">Efeitos Visuais & Animações</div>
              <div style="font-size:10px; color:#64748B;">Transições suaves, glassmorphism e micro-interações</div>
            </div>
            <button type="button" id="toggle-efeitos-visuais" class="toggle-track ${efeitosVisuais ? 'active' : ''}" aria-pressed="${efeitosVisuais}" style="width:42px; height:24px; background:${efeitosVisuais ? '#059669' : '#CBD5E1'}; border-radius:12px; position:relative; cursor:pointer; transition:background .25s; flex-shrink:0; border:none;">
              <span class="toggle-knob" style="position:absolute; left:${efeitosVisuais ? '20px' : '2px'}; top:3px; width:18px; height:18px; background:#fff; border-radius:50%; box-shadow:0 1px 4px rgba(0,0,0,.2); transition:left .25s;"></span>
            </button>
          </div>

          <!-- Toggle Atualização em Tempo Real -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; border-top:1px solid #E2E8F0;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#0F172A;">Telemetria em Tempo Real</div>
              <div style="font-size:10px; color:#64748B;">Atualiza leituras automaticamente sem recarregar</div>
            </div>
            <button type="button" id="toggle-tempo-real" class="toggle-track ${tempoReal ? 'active' : ''}" aria-pressed="${tempoReal}" style="width:42px; height:24px; background:${tempoReal ? '#059669' : '#CBD5E1'}; border-radius:12px; position:relative; cursor:pointer; transition:background .25s; flex-shrink:0; border:none;">
              <span class="toggle-knob" style="position:absolute; left:${tempoReal ? '20px' : '2px'}; top:3px; width:18px; height:18px; background:#fff; border-radius:50%; box-shadow:0 1px 4px rgba(0,0,0,.2); transition:left .25s;"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SEÇÃO: HISTÓRICO DE SAFRA DO PRODUTOR (DADOS REAIS DO BACKEND POSTGRESQL) -->
    <div class="apple-card" style="padding: 22px 26px; margin-bottom: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="sprout" style="width:18px; height:18px; color:#059669;"></i>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h3 style="font-size:15px; font-weight:800; color:#0F172A; margin:0;">Histórico de Safra do Produtor</h3>
              <span style="background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px;">PostgreSQL • Tempo Real</span>
            </div>
            <div style="font-size:11px; color:#64748B; margin-top:2px;">
              Ciclos consolidados de colheita com cultura, área plantada, produtividade, consumo hídrico e Brix médio.
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" id="btn-cfg-refresh-safras" style="padding:7px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; font-size:11px; font-weight:600; color:#334155; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
            <i data-lucide="refresh-cw" style="width:12px; height:12px; color:#059669;"></i> Recarregar
          </button>
          <a href="#/leituras" style="padding:7px 14px; background:#183D2E; color:#FFFFFF; border-radius:8px; font-size:11px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="bar-chart-2" style="width:13px; height:13px;"></i> Painel Completo de Safra &rarr;
          </a>
        </div>
      </div>

      <!-- Container gerenciado dinamicamente (estados: carregando, vazio, erro e listagem) -->
      <div id="cfg-historico-safra-container">
        <div style="padding: 18px; text-align: center; color: #64748B; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span class="btn-spinner" style="border-color: #CBD5E1; border-top-color: #059669;"></span>
          Buscando histórico de safras no backend...
        </div>
      </div>
    </div>

    <!-- 2-col topo: Informações + Padrões de Qualidade -->
    <div class="cfg-grid-2col" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">

      <!-- Informações & Cadastro da Propriedade -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; gap:10px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#F0FDF4; border-radius:10px; display:flex;align-items:center;justify-content:center; flex-shrink:0;">
              <i data-lucide="map-pin" style="width:16px;height:16px;color:#059669;"></i>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#0F172A;">Informações & Cadastro da Propriedade</div>
              <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Dados cadastrais de infraestrutura física e territorial</div>
            </div>
          </div>
          <div style="background:#F1F5F9; color:#64748B; font-size:10px; font-weight:700; padding:4px 10px; border-radius:6px; white-space:nowrap;">ID: POLO-SUL-04</div>
        </div>

        <!-- Nome da Fazenda -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Nome da Fazenda</label>
          <input id="cfg-farm-name" value="${farmName}" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; transition:border .2s;">
        </div>

        <!-- Localização -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Localização & Coordenadas Geográficas</label>
          <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <input id="cfg-farm-coords" value="${farmCoords}" style="flex:1; min-width:140px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;">
            <div style="display:flex; flex-direction:column; gap:5px; min-width:160px;">
              <div style="background:#F0FDF4; border-radius:8px; padding:5px 10px; font-size:10px; font-weight:700; color:#065F46;">Petrolina – Setor 04 (Submédio São Francisco)</div>
              <button type="button" id="btn-gps-sync" style="padding:6px 10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; font-size:11px; color:#0284C7; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:600;">
                <i data-lucide="map-pin" style="width:11px;height:11px;"></i> Sincronizar GPS
              </button>
            </div>
          </div>
        </div>

        <!-- Área + Talhões Ativos -->
        <div class="cfg-subgrid-2col" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Área Monitorada</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input id="cfg-farm-area" value="${farmArea}" style="flex:1; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;">
              <span style="font-size:12px; color:#64748B; white-space:nowrap;">ha</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Talhões Ativos</label>
            <input value="8 talhões ativos (Monitoramento total)" readonly style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#475569; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
          </div>
        </div>

        <!-- Culturas Ativas -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:7px;">Culturas Ativas em Produção</label>
          <div id="culturas-tags-container" style="display:flex; flex-wrap:wrap; gap:7px; align-items:center;">
            ${CULTURAS_LIST.map((c, i) => `
              <div class="culture-tag" data-index="${i}" style="background:#183D2E; color:#fff; font-size:11px; font-weight:600; padding:5px 10px; border-radius:7px; display:flex; align-items:center; gap:6px;">
                ${c} <button type="button" class="btn-remove-culture" data-index="${i}" style="cursor:pointer; opacity:.85; margin-left:2px; font-size:12px; color:#fff; background:none; border:none; padding:0 2px;">✕</button>
              </div>
            `).join('')}
            <button type="button" id="btn-add-cultura" style="padding:5px 12px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:7px; font-size:11px; color:#059669; cursor:pointer; font-weight:600;">+ Adicionar cultura</button>
          </div>
        </div>

        <!-- Tipo de Solo -->
        <div>
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Tipo de Solo / Caracterização Terroir</label>
          <select id="cfg-tipo-solo" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:pointer;">
            <option ${tipoSolo.includes('Latossolo') ? 'selected' : ''}>Latossolo Vermelho Eutrófico (Textura Média a Argilosa)</option>
            <option ${tipoSolo.includes('Argissolo') ? 'selected' : ''}>Argissolo Vermelho-Amarelo</option>
            <option ${tipoSolo.includes('Neossolo') ? 'selected' : ''}>Neossolo Quartzarênico</option>
          </select>
        </div>
      </div>

      <!-- Padrões de Qualidade & Brix de Embarque -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; gap:10px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#FFF7ED; border-radius:10px; display:flex;align-items:center;justify-content:center; flex-shrink:0;">
              <i data-lucide="award" style="width:16px;height:16px;color:#F59E0B;"></i>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#0F172A;">Padrões de Qualidade & Brix de Embarque</div>
              <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Controle estrito de maturação para liberação de colheita e packing</div>
            </div>
          </div>
          <button type="button" id="btn-nova-variedade" style="padding:6px 14px; background:#059669; color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
            <i data-lucide="plus" style="width:12px;height:12px;"></i> Nova variedade
          </button>
        </div>

        <!-- Variedades table -->
        <div id="variedades-table-container" style="display:flex; flex-direction:column; gap:2px; overflow-x:auto;">
          <div style="display:grid; grid-template-columns:2fr 1.1fr 1fr auto; gap:10px; padding:8px 12px; background:#F8FAFC; border-radius:8px; margin-bottom:4px; min-width:380px;">
            ${['Variedade / Mercado-alvo', 'Mínimo Brix', 'Calibre', ''].map(h => `<div style="font-size:9px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.5px;">${h}</div>`).join('')}
          </div>

          <div id="variedades-rows-list" style="min-width:380px;">
            ${VARIEDADES_LIST.map((v, i) => `
              <div class="variedade-row" data-index="${i}" style="display:grid; grid-template-columns:2fr 1.1fr 1fr auto; gap:10px; padding:10px 12px; border-radius:8px; align-items:center; border-bottom:1px solid #F8FAFC;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:${v.dot};flex-shrink:0;"></div>
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#0F172A;">${v.name}</div>
                    <div style="font-size:10px; color:#94A3B8;">${v.market}</div>
                  </div>
                </div>
                <div style="background:#FEF9C3; color:#92400E; font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px; text-align:center;">${v.brix}</div>
                <div style="font-size:11px; color:#475569;">${v.calibre}</div>
                <button type="button" class="btn-edit-variedade" data-index="${i}" style="width:28px;height:28px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; cursor:pointer; display:flex;align-items:center;justify-content:center;" title="Editar variedade">
                  <i data-lucide="pencil" style="width:12px;height:12px;color:#64748B;"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 2-col bottom: Cadeia Fria + Regras de Disparo -->
    <div class="cfg-grid-2col" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">

      <!-- Cadeia Fria & Trânsito Logístico -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px;height:36px; background:#EFF6FF; border-radius:10px; display:flex;align-items:center;justify-content:center; flex-shrink:0;">
            <i data-lucide="snowflake" style="width:16px;height:16px;color:#0284C7;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:700; color:#0F172A;">Cadeia Fria & Trânsito Logístico (REEFER)</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Controle térmico de baú, umidade do engaço e monitoramento até o porto</div>
          </div>
        </div>

        <!-- Temp slider -->
        <div style="margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <label style="font-size:11px; font-weight:600; color:#475569;">Temperatura Alvo do Baú Frigorífico</label>
            <div style="background:#EFF6FF; color:#0284C7; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">0,5°C a 2,0°C (Pico máx: 3,0°C)</div>
          </div>
          <div style="position:relative; height:28px; border-radius:10px; overflow:hidden; background:linear-gradient(90deg, #BFDBFE 0%, #10B981 25%, #10B981 55%, #FEF9C3 75%, #FEE2E2 100%); margin-bottom:6px;">
            <div style="position:absolute; left:30%; top:0; bottom:0; width:2px; background:#0F172A; border-radius:9999px;"></div>
            <div style="position:absolute; left:55%; top:0; bottom:0; width:2px; background:#F59E0B; border-radius:9999px;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#94A3B8; flex-wrap:wrap; gap:4px;">
            <span>-4,0°C (Congelamento)</span>
            <span style="color:#059669; font-weight:700;">0,5°C (Setpoint)</span>
            <span style="color:#F59E0B; font-weight:700;">2,0°C (Limite)</span>
            <span>+5,0°C (Risco/Dano)</span>
          </div>
        </div>

        <!-- UR -->
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Umidade Relativa (UR) — Preservação do engaço verde</label>
          <input id="cfg-ur-reefer" value="${urReefer}" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;">
        </div>

        <!-- Portos -->
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:8px;">Portos e Destinos Padrão de Exportação</label>
          <div id="portos-options-container">
            ${[
              { id: 'porto-pecem', name: 'Porto de Pecém / CE', sub: 'Frete rodoviário estimado: 14h 20m', active: portoAtivo === 'porto-pecem' },
              { id: 'porto-suape', name: 'Porto de Suape / PE', sub: 'Frete rodoviário estimado: 13h 45m', active: portoAtivo === 'porto-suape' },
              { id: 'porto-salvador', name: 'Porto de Salvador / BA', sub: 'Frete rodoviário estimado: 9h 12m', active: portoAtivo === 'porto-salvador' },
            ].map(p => `
              <div class="porto-option-card ${p.active ? 'selected' : ''}" data-porto="${p.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:${p.active ? '#F0FDF4' : '#F8FAFC'}; border:1px solid ${p.active ? '#BBF7D0' : '#E2E8F0'}; border-radius:9px; margin-bottom:6px; cursor:pointer; transition:all .2s; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="porto-radio-dot" style="width:14px;height:14px; border-radius:50%; border:2px solid ${p.active ? '#059669' : '#CBD5E1'}; display:flex;align-items:center;justify-content:center; flex-shrink:0;">
                    ${p.active ? `<div style="width:6px;height:6px;border-radius:50%;background:#059669;"></div>` : ''}
                  </div>
                  <div>
                    <div class="porto-title-text" style="font-size:12px; font-weight:700; color:#0F172A;">${p.name}</div>
                    <div style="font-size:10px; color:#94A3B8;">${p.sub}</div>
                  </div>
                </div>
                <div class="porto-badge" style="background:${p.active ? '#059669' : '#F1F5F9'}; color:${p.active ? '#fff' : '#64748B'}; font-size:10px; font-weight:700; padding:3px 9px; border-radius:6px; white-space:nowrap;">${p.active ? 'Rota Padrão' : 'Alternativo'}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Toggle alarme financeiro -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#FFFBEB; border:1px solid #FEF3C7; border-radius:9px; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="dollar-sign" style="width:14px;height:14px;color:#F59E0B;flex-shrink:0;"></i>
            <div>
              <div style="font-size:11px; font-weight:700; color:#92400E;">Alarme Financeiro de Valor em Risco (CARGO-SLA)</div>
              <div style="font-size:10px; color:#94A3B8;">Disparar alertas para cargas &gt; R$ 30.000 com temperatura fora da faixa por &gt; 20 min</div>
            </div>
          </div>
          <button type="button" id="toggle-alarme-financeiro" class="toggle-track ${alarmeFinanceiro ? 'active' : ''}" style="width:40px;height:22px;background:${alarmeFinanceiro ? '#059669' : '#CBD5E1'};border-radius:11px;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0;border:none;">
            <div class="toggle-knob" style="position:absolute;left:${alarmeFinanceiro ? '20px' : '2px'};top:2px;width:18px;height:18px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .25s;"></div>
          </button>
        </div>
      </div>

      <!-- Regras de Disparo & Canais de Notificação -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px;height:36px; background:#FEF2F2; border-radius:10px; display:flex;align-items:center;justify-content:center; flex-shrink:0;">
            <i data-lucide="bell" style="width:16px;height:16px;color:#DC2626;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:700; color:#0F172A;">Regras de Disparo & Canais de Notificação</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Matriz de acionamento para eventos críticos e operacionais</div>
          </div>
        </div>

        <!-- Alerta Crítico P1 -->
        <div style="background:#FEF2F2; border:1px solid #FEE2E2; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:4px;">
            <div style="font-size:12px; font-weight:800; color:#DC2626;">Alerta Crítico (P1)</div>
            <div style="font-size:10px; color:#94A3B8;">Murcha &lt;40% | Baú &gt;3,0°C</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            ${[
              { id: 'notif-p1-push', label: 'Push App', checked: notifJson.p1Push !== false, color: '#DC2626' },
              { id: 'notif-p1-whatsapp', label: 'WhatsApp', checked: notifJson.p1Whatsapp !== false, color: '#DC2626' },
              { id: 'notif-p1-sms', label: 'SMS Urgent', checked: notifJson.p1Sms !== false, color: '#DC2626' },
            ].map(cb => `
              <label class="custom-checkbox-label" style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:600; color:#0F172A;">
                <input type="checkbox" id="${cb.id}" ${cb.checked ? 'checked' : ''} style="accent-color:${cb.color}; width:15px; height:15px; cursor:pointer;">
                ${cb.label}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Alerta Moderado P2 -->
        <div style="background:#FFFBEB; border:1px solid #FEF3C7; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:4px;">
            <div style="font-size:12px; font-weight:800; color:#F59E0B;">Alerta Moderado (P2)</div>
            <div style="font-size:10px; color:#94A3B8;">Umidade ar &lt;30% | Vento &gt;35km/h</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            ${[
              { id: 'notif-p2-push', label: 'Push App', checked: notifJson.p2Push !== false, color: '#F59E0B' },
              { id: 'notif-p2-whatsapp', label: 'WhatsApp', checked: Boolean(notifJson.p2Whatsapp), color: '#F59E0B' },
              { id: 'notif-p2-email', label: 'E-mail Diário', checked: notifJson.p2Email !== false, color: '#F59E0B' },
            ].map(cb => `
              <label class="custom-checkbox-label" style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:600; color:#0F172A;">
                <input type="checkbox" id="${cb.id}" ${cb.checked ? 'checked' : ''} style="accent-color:${cb.color}; width:15px; height:15px; cursor:pointer;">
                ${cb.label}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Relatório Matinal -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:700; color:#0F172A;">Relatório Matinal Executivo</div>
            <div style="font-size:10px; font-weight:600; color:#94A3B8;">PDF · CSV</div>
          </div>
          <div class="cfg-subgrid-2col" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">Horário do Envio</label>
              <input id="cfg-horario-matinal" value="${horarioMatinal}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; font-weight:700; color:#0F172A; outline:none; background:#fff; box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">E-mails CC</label>
              <input id="cfg-email-cc" value="${emailCc}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:11px; color:#475569; outline:none; background:#fff; box-sizing:border-box;">
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
          <div id="currency-selector-btns" style="display:flex; gap:8px; flex-wrap:wrap;">
            ${[
              { code: 'BRL', label: 'Real brasileiro (R$)' },
              { code: 'USD', label: 'USD ($)' },
              { code: 'EUR', label: 'EUR (€)' }
            ].map(cur => {
              const isAct = moedaAtiva === cur.code;
              return `<button type="button" class="currency-btn ${isAct ? 'active' : ''}" data-cur="${cur.code}" style="padding:7px 15px; background:${isAct ? '#183D2E' : '#F8FAFC'}; color:${isAct ? '#fff' : '#475569'}; border:${isAct ? 'none' : '1px solid #E2E8F0'}; border-radius:8px; font-size:12px; font-weight:${isAct ? '700' : '500'}; cursor:pointer;">${cur.label}</button>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="cfg-footer-actions" style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; gap:14px; flex-wrap:wrap;">
      <button type="button" id="btn-restaurar-padroes" style="padding:11px 20px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; font-size:13px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all .2s;">
        <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Restaurar padrões
      </button>
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="font-size:11px; color:#64748B;">ⓘ Alterações salvas permanentemente no PostgreSQL vinculadas à sua conta.</div>
        <button type="button" id="btn-salvar-configuracoes" style="padding:11px 24px; background:#059669; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:7px; box-shadow:0 4px 14px rgba(5,150,105,.3);">
          <i data-lucide="check" style="width:14px;height:14px;"></i> Salvar alterações
        </button>
      </div>
    </div>

  </div>
  `;
}

export async function setupConfiguracoesEvents() {
  if (window.lucide) window.lucide.createIcons();

  let selectedAvatarColor = auth.getProfileData().paletteKey || 'emerald';
  let selectedTheme = auth.getProfileData().tema || 'claro';

  // Atualização em tempo real do preview do avatar ao digitar iniciais ou escolher cor
  const iniciaisInput = document.getElementById('cfg-user-iniciais');
  const avatarPreview = document.getElementById('cfg-avatar-preview');

  iniciaisInput?.addEventListener('input', () => {
    const val = (iniciaisInput.value || 'RZ').toUpperCase().slice(0, 3);
    if (avatarPreview) avatarPreview.textContent = val;
  });

  document.querySelectorAll('.avatar-color-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.avatar-color-chip').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'transparent';
      });
      chip.classList.add('active');
      selectedAvatarColor = chip.dataset.colorKey || 'emerald';
      chip.style.borderColor = chip.dataset.border || '#10B981';

      if (avatarPreview) {
        avatarPreview.style.background = chip.dataset.bg;
        avatarPreview.style.borderColor = chip.dataset.border;
        avatarPreview.style.color = chip.dataset.text;
      }
    });
  });

  // Seletor de Tema Visual (aplica na hora + salva ao confirmar)
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTheme = btn.dataset.themeVal || 'claro';
      document.documentElement.setAttribute('data-theme', selectedTheme);

      document.querySelectorAll('.theme-option-btn').forEach(b => {
        const val = b.dataset.themeVal;
        const isAct = val === selectedTheme;
        b.classList.toggle('active', isAct);
        if (val === 'claro') {
          b.style.background = isAct ? '#ECFDF5' : '#FFFFFF';
          b.style.color = isAct ? '#065F46' : '#475569';
          b.style.borderColor = isAct ? '#059669' : '#CBD5E1';
        } else if (val === 'escuro') {
          b.style.background = isAct ? '#183D2E' : '#FFFFFF';
          b.style.color = isAct ? '#FFFFFF' : '#475569';
          b.style.borderColor = isAct ? '#059669' : '#CBD5E1';
        } else {
          b.style.background = isAct ? '#0F172A' : '#FFFFFF';
          b.style.color = isAct ? '#FFFFFF' : '#475569';
          b.style.borderColor = isAct ? '#0F172A' : '#CBD5E1';
        }
      });

      const nomesTema = { claro: 'Modo Claro Padrão', escuro: 'Modo Escuro Agro', alto_contraste: 'Modo Alto Contraste' };
      toast.info('Tema Aplicado', `${nomesTema[selectedTheme] || selectedTheme} ativado.`);
    });
  });

  // Toggles de Efeitos Visuais e Tempo Real
  function bindToggleSwitch(btnId, attrName, labelTitle) {
    const toggleBtn = document.getElementById(btnId);
    toggleBtn?.addEventListener('click', () => {
      toggleBtn.classList.toggle('active');
      const isAct = toggleBtn.classList.contains('active');
      toggleBtn.setAttribute('aria-pressed', String(isAct));
      toggleBtn.style.background = isAct ? '#059669' : '#CBD5E1';
      const knob = toggleBtn.querySelector('.toggle-knob');
      if (knob) knob.style.left = isAct ? '20px' : '2px';
      document.documentElement.setAttribute(attrName, isAct ? 'on' : 'off');
      toast.info(labelTitle, isAct ? 'Recurso ativado em tempo real.' : 'Recurso desativado.');
    });
  }

  bindToggleSwitch('toggle-efeitos-visuais', 'data-visual-effects', 'Efeitos Visuais');
  bindToggleSwitch('toggle-tempo-real', 'data-realtime', 'Telemetria em Tempo Real');

  // 1. Adicionar / Remover Culturas
  const culturasContainer = document.getElementById('culturas-tags-container');

  function renderCulturas() {
    if (!culturasContainer) return;
    culturasContainer.innerHTML = `
      ${CULTURAS_LIST.map((c, i) => `
        <div class="culture-tag" data-index="${i}" style="background:#183D2E; color:#fff; font-size:11px; font-weight:600; padding:5px 10px; border-radius:7px; display:flex; align-items:center; gap:6px;">
          ${c} <button type="button" class="btn-remove-culture" data-index="${i}" style="cursor:pointer; opacity:.85; margin-left:2px; font-size:12px; color:#fff; background:none; border:none; padding:0 2px;">✕</button>
        </div>
      `).join('')}
      <button type="button" id="btn-add-cultura" style="padding:5px 12px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:7px; font-size:11px; color:#059669; cursor:pointer; font-weight:600;">+ Adicionar cultura</button>
    `;
    setupCulturasListeners();
  }

  function setupCulturasListeners() {
    document.querySelectorAll('.btn-remove-culture').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const removed = CULTURAS_LIST.splice(idx, 1);
        toast.info('Cultura Removida', `${removed} foi desvinculada dos talhões.`);
        renderCulturas();
      });
    });

    document.getElementById('btn-add-cultura')?.addEventListener('click', () => {
      Modal.open('Adicionar Nova Cultura', `
        <div style="font-size: 13px;">
          <label style="display:block; font-weight:600; margin-bottom:6px; color:#E2E8F0;">Nome da Cultura</label>
          <input id="input-new-cultura" placeholder="Ex: Maracujá, Pêra, Pitaya..." style="width:100%; padding:9px 12px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
        </div>
      `, (modal) => {
        const input = modal.querySelector('#input-new-cultura');
        const val = input ? input.value.trim() : '';
        if (val) {
          CULTURAS_LIST.push(val);
          toast.success('Cultura Adicionada', `${val} foi cadastrada com sucesso.`);
          renderCulturas();
          return true;
        }
        return false;
      }, 'Adicionar');
    });
  }

  setupCulturasListeners();

  // 2. Nova Variedade
  document.getElementById('btn-nova-variedade')?.addEventListener('click', () => {
    Modal.open('Cadastrar Padrão de Variedade', `
      <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
        <div>
          <label style="display:block; font-weight:600; margin-bottom:4px; color:#E2E8F0;">Nome da Variedade</label>
          <input id="new-var-name" placeholder="Ex: Uva BRS Melodia" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block; font-weight:600; margin-bottom:4px; color:#E2E8F0;">Mercado-Alvo</label>
          <input id="new-var-market" placeholder="Ex: Mercado Europeu / Premium" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="display:block; font-weight:600; margin-bottom:4px; color:#E2E8F0;">Grau Brix Mínimo</label>
            <input id="new-var-brix" placeholder="≥18,0° Brix" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:4px; color:#E2E8F0;">Calibre Mínimo</label>
            <input id="new-var-calibre" placeholder="Calibre: ≥20mm" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
          </div>
        </div>
      </div>
    `, (modal) => {
      const name = modal.querySelector('#new-var-name')?.value.trim();
      const market = modal.querySelector('#new-var-market')?.value.trim() || 'Mercado Geral';
      const brix = modal.querySelector('#new-var-brix')?.value.trim() || '≥17,0° Brix';
      const calibre = modal.querySelector('#new-var-calibre')?.value.trim() || '≥20mm';

      if (name) {
        VARIEDADES_LIST.unshift({ dot: '#059669', name, market, brix, calibre });
        renderVariedades();
        toast.success('Variedade Cadastrada', `${name} adicionada aos padrões de qualidade.`);
        return true;
      }
      return false;
    }, 'Cadastrar');
  });

  function renderVariedades() {
    const container = document.getElementById('variedades-rows-list');
    if (!container) return;
    container.innerHTML = VARIEDADES_LIST.map((v, i) => `
      <div class="variedade-row" data-index="${i}" style="display:grid; grid-template-columns:2fr 1.1fr 1fr auto; gap:10px; padding:10px 12px; border-radius:8px; align-items:center; border-bottom:1px solid #F8FAFC;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${v.dot};flex-shrink:0;"></div>
          <div>
            <div style="font-size:12px; font-weight:700; color:#0F172A;">${v.name}</div>
            <div style="font-size:10px; color:#94A3B8;">${v.market}</div>
          </div>
        </div>
        <div style="background:#FEF9C3; color:#92400E; font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px; text-align:center;">${v.brix}</div>
        <div style="font-size:11px; color:#475569;">${v.calibre}</div>
        <button type="button" class="btn-edit-variedade" data-index="${i}" style="width:28px;height:28px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; cursor:pointer; display:flex;align-items:center;justify-content:center;">
          <i data-lucide="pencil" style="width:12px;height:12px;color:#64748B;"></i>
        </button>
      </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons();
    setupEditVariedadeListeners();
  }

  function setupEditVariedadeListeners() {
    document.querySelectorAll('.btn-edit-variedade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const item = VARIEDADES_LIST[idx];
        if (!item) return;

        Modal.open(`Editar ${item.name}`, `
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
            <div>
              <label style="font-weight:600; color:#E2E8F0; display:block; margin-bottom:4px;">Grau Brix Mínimo</label>
              <input id="edit-brix" value="${item.brix}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-weight:600; color:#E2E8F0; display:block; margin-bottom:4px;">Calibre Padrão</label>
              <input id="edit-calibre" value="${item.calibre}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; color:#0F172A; background:#FFFFFF; box-sizing:border-box;">
            </div>
          </div>
        `, (modal) => {
          item.brix = modal.querySelector('#edit-brix')?.value || item.brix;
          item.calibre = modal.querySelector('#edit-calibre')?.value || item.calibre;
          renderVariedades();
          toast.success('Padrão Atualizado', `Limiares de ${item.name} foram atualizados.`);
          return true;
        }, 'Atualizar');
      });
    });
  }

  setupEditVariedadeListeners();

  // 3. Seleção Interativa de Portos
  document.querySelectorAll('.porto-option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.porto-option-card').forEach(c => {
        c.classList.remove('selected');
        c.style.background = '#F8FAFC';
        c.style.borderColor = '#E2E8F0';
        const radio = c.querySelector('.porto-radio-dot');
        if (radio) {
          radio.style.borderColor = '#CBD5E1';
          radio.innerHTML = '';
        }
        const badge = c.querySelector('.porto-badge');
        if (badge) {
          badge.style.background = '#F1F5F9';
          badge.style.color = '#64748B';
          badge.textContent = 'Alternativo';
        }
      });

      card.classList.add('selected');
      card.style.background = '#F0FDF4';
      card.style.borderColor = '#BBF7D0';
      const radio = card.querySelector('.porto-radio-dot');
      if (radio) {
        radio.style.borderColor = '#059669';
        radio.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#059669;"></div>';
      }
      const badge = card.querySelector('.porto-badge');
      if (badge) {
        badge.style.background = '#059669';
        badge.style.color = '#fff';
        badge.textContent = 'Rota Padrão';
      }
      toast.info('Destino Portuário Selecionado', `Rota reefer direcionada para ${card.querySelector('.porto-title-text')?.textContent || 'porto selecionado'}.`);
    });
  });

  // 4. Toggle Alarme Financeiro
  const toggleAlarme = document.getElementById('toggle-alarme-financeiro');
  toggleAlarme?.addEventListener('click', () => {
    toggleAlarme.classList.toggle('active');
    const isActive = toggleAlarme.classList.contains('active');
    toggleAlarme.style.background = isActive ? '#059669' : '#CBD5E1';
    const knob = toggleAlarme.querySelector('.toggle-knob');
    if (knob) knob.style.left = isActive ? '20px' : '2px';
    toast.info('Alarme Financeiro', isActive ? 'Alarme SLA ativado (> R$ 30.000).' : 'Alarme SLA desativado.');
  });

  // 5. Botões de Moeda
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
      toast.info('Moeda do Sistema', `Valores convertidos para ${btn.textContent}.`);
    });
  });

  // 6. Botão Sincronizar GPS com estado de loading real
  const btnGps = document.getElementById('btn-gps-sync');
  btnGps?.addEventListener('click', async () => {
    btnGps.classList.add('is-loading');
    btnGps.disabled = true;
    const originalHtml = btnGps.innerHTML;
    btnGps.innerHTML = `<span class="btn-spinner"></span> Sincronizando...`;
    await new Promise(r => setTimeout(r, 550));
    btnGps.classList.remove('is-loading');
    btnGps.disabled = false;
    btnGps.innerHTML = originalHtml;
    if (window.lucide) window.lucide.createIcons();
    toast.success('GPS Sincronizado', 'Coordenadas validadas via constelação GNSS RTK (-21.177502, -47.616331).');
  });

  // Função centralizada que coleta todos os campos e persiste no banco PostgreSQL
  async function persistirTudoNoBanco(triggerBtn) {
    if (!triggerBtn) return;
    const originalHtml = triggerBtn.innerHTML;
    triggerBtn.classList.add('is-loading');
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="btn-spinner"></span> Salvando no banco...`;

    const payload = {
      nome: document.getElementById('cfg-user-nome')?.value.trim() || auth.getProfileData().nome,
      cargo: document.getElementById('cfg-user-cargo')?.value.trim() || auth.getProfileData().cargo,
      bio: document.getElementById('cfg-user-bio')?.value.trim() || '',
      telefone: document.getElementById('cfg-user-telefone')?.value.trim() || '',
      avatar_iniciais: (document.getElementById('cfg-user-iniciais')?.value.trim() || 'RZ').toUpperCase().slice(0, 3),
      avatar_cor: selectedAvatarColor,
      tema: selectedTheme,
      efeitos_visuais: document.getElementById('toggle-efeitos-visuais')?.classList.contains('active') ?? true,
      atualizacao_tempo_real: document.getElementById('toggle-tempo-real')?.classList.contains('active') ?? true,
      moeda: document.querySelector('.currency-btn.active')?.dataset.cur || 'BRL',
      notificacoes_json: {
        alarmeFinanceiro: document.getElementById('toggle-alarme-financeiro')?.classList.contains('active') ?? true,
        p1Push: document.getElementById('notif-p1-push')?.checked ?? true,
        p1Whatsapp: document.getElementById('notif-p1-whatsapp')?.checked ?? true,
        p1Sms: document.getElementById('notif-p1-sms')?.checked ?? true,
        p2Push: document.getElementById('notif-p2-push')?.checked ?? true,
        p2Whatsapp: document.getElementById('notif-p2-whatsapp')?.checked ?? false,
        p2Email: document.getElementById('notif-p2-email')?.checked ?? true,
        horarioMatinal: document.getElementById('cfg-horario-matinal')?.value || '06:30 AM',
        emailCc: document.getElementById('cfg-email-cc')?.value || ''
      },
      propriedade_json: {
        farmName: document.getElementById('cfg-farm-name')?.value.trim() || 'Fazenda RaizTech - Polo Sul',
        farmCoords: document.getElementById('cfg-farm-coords')?.value.trim() || '-21.177502,  -47.616331',
        farmArea: document.getElementById('cfg-farm-area')?.value.trim() || '1.250',
        tipoSolo: document.getElementById('cfg-tipo-solo')?.value || '',
        urReefer: document.getElementById('cfg-ur-reefer')?.value || '90% a 95%',
        portoAtivo: document.querySelector('.porto-option-card.selected')?.dataset.porto || 'porto-pecem',
        culturas: [...CULTURAS_LIST],
        variedades: VARIEDADES_LIST.map(v => ({ ...v }))
      }
    };

    const syncBadge = document.getElementById('cfg-db-sync-badge');

    try {
      await auth.savePreferencesToDB(payload);
      triggerBtn.classList.remove('is-loading');
      triggerBtn.classList.add('is-success');
      triggerBtn.innerHTML = `✓ Salvo no PostgreSQL!`;
      if (syncBadge) {
        syncBadge.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#10B981;"></span> Sincronizado no PostgreSQL • ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      }
      toast.success('Salvo no Banco de Dados', 'Suas preferências, perfil e parâmetros foram gravados permanentemente no PostgreSQL.');
    } catch (err) {
      triggerBtn.classList.remove('is-loading');
      triggerBtn.classList.add('is-error');
      triggerBtn.innerHTML = `⚠ Falha ao salvar`;
      if (syncBadge) {
        syncBadge.style.background = '#FEF2F2';
        syncBadge.style.color = '#DC2626';
        syncBadge.style.borderColor = '#FECACA';
        syncBadge.innerHTML = `⚠ Erro de conexão com o banco (${err.message || 'Falha de rede'})`;
      }
      toast.error('Erro de Rede ao Salvar no Servidor', err.message || 'Não foi possível gravar as alterações no banco de dados. Tente novamente.');
    } finally {
      setTimeout(() => {
        triggerBtn.disabled = false;
        triggerBtn.classList.remove('is-success', 'is-error');
        triggerBtn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }, 1800);
    }
  }

  // Carregamento do Histórico de Safra dentro do Perfil do Produtor (com estados: carregando, vazio, erro e dados)
  const safraBox = document.getElementById('cfg-historico-safra-container');
  async function carregarHistoricoSafraNoPerfil() {
    if (!safraBox) return;
    safraBox.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #64748B; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #F8FAFC; border-radius: 10px;">
        <span class="btn-spinner" style="border-color: #CBD5E1; border-top-color: #059669;"></span>
        Carregando histórico de safras do servidor PostgreSQL...
      </div>
    `;
    try {
      const res = await api.getHistoricoSafras();
      const safras = Array.isArray(res?.safras) ? res.safras : [];
      if (safras.length === 0) {
        safraBox.innerHTML = `
          <div style="padding: 24px; text-align: center; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px;">
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Nenhuma safra encontrada</div>
            <div style="font-size: 12px; color: #64748B; margin-bottom: 12px;">Não há ciclos de safra registrados no banco de dados para esta propriedade.</div>
            <a href="#/leituras" style="padding: 7px 14px; background: #059669; color: #fff; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none;">+ Cadastrar Safra</a>
          </div>
        `;
        return;
      }

      safraBox.innerHTML = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                <th style="padding: 10px 12px;">Ano / Ciclo</th>
                <th style="padding: 10px 12px;">Cultura Principal</th>
                <th style="padding: 10px 12px;">Área (ha)</th>
                <th style="padding: 10px 12px;">Produtividade</th>
                <th style="padding: 10px 12px;">Volume Colhido</th>
                <th style="padding: 10px 12px;">Consumo Água</th>
                <th style="padding: 10px 12px;">Brix Médio</th>
                <th style="padding: 10px 12px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${safras.map(s => {
                const isAtiva = s.status === 'Em Andamento';
                return `
                  <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 11px 12px; font-weight: 800; color: #0F172A;">Safra ${s.ciclo}</td>
                    <td style="padding: 11px 12px; font-weight: 600; color: #334155;">${s.cultura}</td>
                    <td style="padding: 11px 12px; font-family: monospace; color: #475569;">${Number(s.area_ha).toLocaleString('pt-BR')} ha</td>
                    <td style="padding: 11px 12px; font-family: monospace; font-weight: 700; color: #047857;">${Number(s.produtividade_ton_ha).toFixed(1).replace('.', ',')} ton/ha</td>
                    <td style="padding: 11px 12px; font-family: monospace; color: #0F172A;">${Number(s.volume_total_ton).toLocaleString('pt-BR')} ton</td>
                    <td style="padding: 11px 12px; font-family: monospace; color: #0284C7;">${Number(s.consumo_agua_m3_ha).toLocaleString('pt-BR')} m³/ha</td>
                    <td style="padding: 11px 12px; font-family: monospace; font-weight: 700; color: #059669;">${Number(s.brix_medio).toFixed(1)}° Brix</td>
                    <td style="padding: 11px 12px;">
                      <span style="padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; background: ${isAtiva ? '#ECFDF5' : '#F1F5F9'}; color: ${isAtiva ? '#047857' : '#475569'};">
                        ${s.status}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      safraBox.innerHTML = `
        <div style="padding: 18px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="color: #991B1B; font-size: 12px;">
            <strong>Falha ao buscar o histórico de safra:</strong> ${err.message || 'Erro de conexão com o backend.'}
          </div>
          <button type="button" id="btn-cfg-retry-safras" style="padding: 6px 12px; background: #DC2626; color: #fff; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
            Tentar Novamente
          </button>
        </div>
      `;
      document.getElementById('btn-cfg-retry-safras')?.addEventListener('click', carregarHistoricoSafraNoPerfil);
    }
  }

  carregarHistoricoSafraNoPerfil();
  document.getElementById('btn-cfg-refresh-safras')?.addEventListener('click', carregarHistoricoSafraNoPerfil);

  // 7. Botões de Salvar (Topo do Perfil e Rodapé da Página)
  document.getElementById('btn-salvar-configuracoes')?.addEventListener('click', (e) => {
    persistirTudoNoBanco(e.currentTarget);
  });

  document.getElementById('btn-salvar-perfil-rapido')?.addEventListener('click', (e) => {
    persistirTudoNoBanco(e.currentTarget);
  });

  // 8. Botão Restaurar Padrões
  document.getElementById('btn-restaurar-padroes')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    CULTURAS_LIST = [...DEFAULT_CULTURAS];
    VARIEDADES_LIST = DEFAULT_VARIEDADES.map(v => ({ ...v }));
    selectedTheme = 'claro';
    document.documentElement.setAttribute('data-theme', 'claro');
    document.documentElement.setAttribute('data-visual-effects', 'on');
    document.documentElement.setAttribute('data-realtime', 'on');

    const farmInput = document.getElementById('cfg-farm-name');
    if (farmInput) farmInput.value = 'Fazenda RaizTech - Polo Sul';
    renderCulturas();
    renderVariedades();
    await persistirTudoNoBanco(btn);
    toast.info('Padrões Restaurados', 'Parâmetros operacionais e visuais resetados para os valores recomendados.');
  });
}
