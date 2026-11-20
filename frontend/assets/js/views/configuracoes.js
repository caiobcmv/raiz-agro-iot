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

let CULTURAS_LIST = ['Uva de Mesa', 'Morango', 'Manga'];

let VARIEDADES_LIST = [
  { dot: '#059669', name: 'Uva Vitória (Seedless)', market: 'Mercado alvo: União Europeia / UK', brix: '≥18,0° Brix', calibre: 'Calibre: ≥22mm' },
  { dot: '#DC2626', name: 'Uva Crimson', market: 'Mercado alvo: América do Norte (USDA)', brix: '≥17,5° Brix', calibre: 'Calibre: 19mm' },
  { dot: '#F59E0B', name: 'Uva Thompson', market: 'Mercado alvo: Ásia (China / Coreia do Sul)', brix: '≥17,0° Brix', calibre: 'Calibre: ≥18mm' },
  { dot: '#A78BFA', name: 'Manga Palmer', market: 'Mercado alvo: Spot Europa (Roterdã)', brix: '≥13,0° Brix', calibre: 'Calibre: ≥350g' },
  { dot: '#A78BFA', name: 'Manga Tommy', market: 'Mercado alvo: Mercado Nacional', brix: '≥12,5° Brix', calibre: 'Calibre: ≥400g' },
];

export async function renderConfiguracoes() {
  const isAnalista = auth.getActiveProfile() === 'analista';
  const profile = auth.getProfileData();
  const nomeExibicao = profile.nome;
  const cargoExibicao = profile.cargo;
  const iniciais = profile.iniciais;
  const emailUsuario = profile.email;
  const userId = isAnalista ? '2' : '1';
  const telefone = isAnalista ? '(87) 99812-4420' : '(87) 99842-1104';
  const bio = isAnalista
    ? 'Supervisão técnica de enlaces LoRaWAN, amostragem FDR e calibração de sensores IoT.'
    : 'Gestão operacional de colheita, irrigação de precisão e manejo integrado de campo.';

  return `
  <div class="dashboard-canvas" style="padding: 28px 36px 48px; overflow-y: auto;">

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
              <span style="background: #ECFDF5; color: #065F46; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
                Vinculado ao Usuário #${userId} (${emailUsuario})
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
            <input id="cfg-profile-name" value="${nomeExibicao}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; cursor: default;">
          </div>

          <!-- Cargo e Iniciais -->
          <div style="display: grid; grid-template-columns: 1fr 70px; gap: 10px; margin-bottom: 14px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Cargo / Função</label>
              <input id="cfg-profile-role" value="${cargoExibicao}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; cursor: default;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Iniciais</label>
              <input id="cfg-profile-initials" value="${iniciais}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; font-weight: 700; text-align: center; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; cursor: default;">
            </div>
          </div>

          <!-- Telefone de Contato -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Telefone de Contato</label>
            <input id="cfg-profile-phone" value="${telefone}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; cursor: default;">
          </div>
        </div>

        <!-- Coluna 2: Biografia e Cor do Avatar -->
        <div>
          <!-- Biografia / Escopo Operacional -->
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Biografia / Escopo Operacional</label>
            <textarea id="cfg-profile-bio" rows="3" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 9px; font-size: 13px; color: #0F172A; outline: none; background: #F8FAFC; box-sizing: border-box; resize: none; font-family: inherit; line-height: 1.5; cursor: default;">${bio}</textarea>
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
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #0F172A;">Safra 2025/2026</td>
              <td style="padding: 14px; font-size: 13px; color: #334155;">Uva Vitória e Manga Palmer</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">42,5 ha</td>
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #059669;">30,2 ton/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">1.284,5 ton</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">3.420 m³/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">19,4° Brix</td>
              <td style="padding: 14px;">
                <span style="background: #D1FAE5; color: #065F46; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Em Andamento</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #0F172A;">Safra 2024/2025</td>
              <td style="padding: 14px; font-size: 13px; color: #334155;">Uva Vitória (Seedless)</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">40 ha</td>
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #059669;">26,5 ton/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">1.060 ton</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">3.280 m³/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">18,8° Brix</td>
              <td style="padding: 14px;">
                <span style="background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Concluída</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #0F172A;">Safra 2023/2024</td>
              <td style="padding: 14px; font-size: 13px; color: #334155;">Manga Tommy e Uva Crimson</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">38 ha</td>
              <td style="padding: 14px; font-size: 13px; font-weight: 700; color: #059669;">24,8 ton/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">942,4 ton</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">3.150 m³/ha</td>
              <td style="padding: 14px; font-size: 13px; color: #475569;">18,2° Brix</td>
              <td style="padding: 14px;">
                <span style="background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Concluída</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- 2-COL: INFORMAÇÕES DA PROPRIEDADE + PADRÕES DE QUALIDADE -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">

      <!-- Informações e Cadastro da Propriedade -->
      <div class="apple-card" style="padding:24px 26px;">
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
          <div style="background:#F1F5F9; color:#64748B; font-size:10px; font-weight:700; padding:4px 10px; border-radius:6px; white-space:nowrap;">ID: POLO-SUL-04</div>
        </div>

        <!-- Nome da Fazenda -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Nome da Fazenda</label>
          <input id="cfg-farm-name" value="Fazenda RaizTech - Polo Sul" readonly style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
        </div>

        <!-- Localização -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Localização e Coordenadas Geográficas</label>
          <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <input id="cfg-farm-coords" value="-21.177502, -47.616331" readonly style="flex:1; min-width:140px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
            <div style="background:#F0FDF4; border-radius:8px; padding:8px 12px; font-size:11px; font-weight:700; color:#065F46; min-width:160px;">
              Petrolina – Setor 04 (Submédio São Francisco)
            </div>
          </div>
        </div>

        <!-- Área + LOTES Ativos -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Área Monitorada</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input id="cfg-farm-area" value="1.250" readonly style="flex:1; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
              <span style="font-size:12px; color:#64748B; white-space:nowrap;">ha</span>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">LOTES Ativos</label>
            <input value="8 LOTES ativos (Monitoramento total)" readonly style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#475569; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
          </div>
        </div>

        <!-- Culturas Ativas -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:7px;">Culturas Ativas em Produção</label>
          <div id="culturas-tags-container" style="display:flex; flex-wrap:wrap; gap:7px; align-items:center;">
            ${CULTURAS_LIST.map((c, i) => `
              <div class="culture-tag" data-index="${i}" style="background:#183D2E; color:#fff; font-size:11px; font-weight:600; padding:5px 12px; border-radius:7px; display:flex; align-items:center; gap:6px;">
                ${c}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Tipo de Solo -->
        <div>
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Tipo de Solo / Caracterização Terroir</label>
          <select id="cfg-tipo-solo" disabled style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:default;">
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
              </div>
            </div>
          `).join('')}
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
              <input id="cfg-horario-matinal" value="06:30 AM" readonly style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; font-weight:700; color:#0F172A; outline:none; background:#fff; box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">E-mails CC</label>
              <input id="cfg-email-cc" value="gerencia@raizagro.agr.br, agronomo@raiz..." readonly style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:11px; color:#475569; outline:none; background:#fff; box-sizing:border-box;">
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

    <!-- FOOTER ACTIONS: BOTÃO EM VERMELHO PARA SOLICITAR MUDANÇA -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px;">
      <button id="btn-restaurar-padroes" style="padding:11px 20px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; font-size:13px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all .2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#F8FAFC'">
        <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Restaurar padrões visuais
      </button>
      <div>
        <button id="btn-solicitar-mudanca" style="padding:11px 24px; background:#DC2626; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(220,38,38,.28); transition:transform .15s, opacity .2s;" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
          <i data-lucide="send" style="width:14px;height:14px;"></i> Solicitar Mudança ao Administrador
        </button>
      </div>
    </div>

  </div>
  `;
}

export async function setupConfiguracoesEvents() {
  if (window.lucide) window.lucide.createIcons();

  const isAnalista = auth.getActiveProfile() === 'analista';
  const perfilFormatado = isAnalista ? 'Analista' : 'Produtor / Exportador';

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

  // G) Restaurar Padrões Visuais
  document.getElementById('btn-restaurar-padroes')?.addEventListener('click', () => {
    auth.saveAvatarTheme('esmeralda');
    document.body.classList.remove('dark-theme-preview');
    toast.info('Padrões Restaurados', 'Tema Claro e paleta Esmeralda restaurados.');
  });

  // =========================================================================
  // 2. BOTÃO EM VERMELHO: SOLICITAR MUDANÇA AO ADMINISTRADOR
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
