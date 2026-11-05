/**
 * CONFIGURAÇÕES DO SISTEMA - FIEL AO FIGMA & TOTALMENTE DINÂMICO
 */

import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

let CULTURAS_LIST = ['Uva de Mesa', 'Morango', 'Manga'];

let VARIEDADES_LIST = [
  { dot: '#059669', name: 'Uva Vitória (Seedless)', market: 'Mercado alvo: União Europeia / UK', brix: '≥18,0° Brix', calibre: 'Calibre: ≥22mm' },
  { dot: '#DC2626', name: 'Uva Crimson', market: 'Mercado alvo: América do Norte (USDA)', brix: '≥17,5° Brix', calibre: 'Calibre: 19mm' },
  { dot: '#F59E0B', name: 'Uva Thompson', market: 'Mercado alvo: Ásia (China / Coreia do Sul)', brix: '≥17,0° Brix', calibre: 'Calibre: ≥18mm' },
  { dot: '#A78BFA', name: 'Manga Palmer', market: 'Mercado alvo: Spot Europa (Roterdã)', brix: '≥13,0° Brix', calibre: 'Calibre: ≥350g' },
  { dot: '#A78BFA', name: 'Manga Tommy', market: 'Mercado alvo: Mercado Nacional', brix: '≥12,5° Brix', calibre: 'Calibre: ≥400g' },
];

export async function renderConfiguracoes() {
  return `
  <div class="dashboard-canvas" style="padding: 28px 36px 48px; overflow-y: auto;">

    <!-- 2-col topo: Informações + Padrões de Qualidade -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">

      <!-- Informações & Cadastro da Propriedade -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#F0FDF4; border-radius:10px; display:flex;align-items:center;justify-content:center;">
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
          <input id="cfg-farm-name" value="Fazenda RaizTech - Polo Sul" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; transition:border .2s;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Localização -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Localização & Coordenadas Geográficas</label>
          <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <input id="cfg-farm-coords" value="-21.177502,  -47.616331" style="flex:1; min-width:140px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#E2E8F0'">
            <div style="display:flex; flex-direction:column; gap:5px; min-width:160px;">
              <div style="background:#F0FDF4; border-radius:8px; padding:5px 10px; font-size:10px; font-weight:700; color:#065F46;">Petrolina – Setor 04 (Submédio São Francisco)</div>
              <button id="btn-gps-sync" style="padding:6px 10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; font-size:11px; color:#0284C7; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:600;">
                <i data-lucide="map-pin" style="width:11px;height:11px;"></i> Sincronizar GPS
              </button>
            </div>
          </div>
        </div>

        <!-- Área + Talhões Ativos -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Área Monitorada</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input id="cfg-farm-area" value="1.250" style="flex:1; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#E2E8F0'">
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
                ${c} <span class="btn-remove-culture" data-index="${i}" style="cursor:pointer; opacity:.7; margin-left:2px; font-size:12px;">✕</span>
              </div>
            `).join('')}
            <button id="btn-add-cultura" style="padding:5px 12px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:7px; font-size:11px; color:#059669; cursor:pointer; font-weight:600;">+ Adicionar cultura</button>
          </div>
        </div>

        <!-- Tipo de Solo -->
        <div>
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Tipo de Solo / Caracterização Terroir</label>
          <select id="cfg-tipo-solo" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box; cursor:pointer;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#E2E8F0'">
            <option>Latossolo Vermelho Eutrófico (Textura Média a Argilosa)</option>
            <option>Argissolo Vermelho-Amarelo</option>
            <option>Neossolo Quartzarênico</option>
          </select>
        </div>
      </div>

      <!-- Padrões de Qualidade & Brix de Embarque -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px; background:#FFF7ED; border-radius:10px; display:flex;align-items:center;justify-content:center;">
              <i data-lucide="award" style="width:16px;height:16px;color:#F59E0B;"></i>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:#0F172A;">Padrões de Qualidade & Brix de Embarque</div>
              <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Controle estrito de maturação para liberação de colheita e packing</div>
            </div>
          </div>
          <button id="btn-nova-variedade" style="padding:6px 14px; background:#059669; color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
            <i data-lucide="plus" style="width:12px;height:12px;"></i> Nova variedade
          </button>
        </div>

        <!-- Variedades table -->
        <div id="variedades-table-container" style="display:flex; flex-direction:column; gap:2px;">
          <!-- Header -->
          <div style="display:grid; grid-template-columns:2fr 1.1fr 1fr auto; gap:10px; padding:8px 12px; background:#F8FAFC; border-radius:8px; margin-bottom:4px;">
            ${['Variedade / Mercado-alvo', 'Mínimo Brix', 'Calibre', ''].map(h => `<div style="font-size:9px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.5px;">${h}</div>`).join('')}
          </div>

          <div id="variedades-rows-list">
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
                <button class="btn-edit-variedade" data-index="${i}" style="width:28px;height:28px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; cursor:pointer; display:flex;align-items:center;justify-content:center;">
                  <i data-lucide="pencil" style="width:12px;height:12px;color:#64748B;"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 2-col bottom: Cadeia Fria + Regras de Disparo -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">

      <!-- Cadeia Fria & Trânsito Logístico -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px;height:36px; background:#EFF6FF; border-radius:10px; display:flex;align-items:center;justify-content:center;">
            <i data-lucide="snowflake" style="width:16px;height:16px;color:#0284C7;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:700; color:#0F172A;">Cadeia Fria & Trânsito Logístico (REEFER)</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Controle térmico de baú, umidade do engaço e monitoramento até o porto</div>
          </div>
        </div>

        <!-- Temp slider -->
        <div style="margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label style="font-size:11px; font-weight:600; color:#475569;">Temperatura Alvo do Baú Frigorífico</label>
            <div style="background:#EFF6FF; color:#0284C7; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">0,5°C a 2,0°C (Pico máx: 3,0°C)</div>
          </div>
          <div style="position:relative; height:28px; border-radius:10px; overflow:hidden; background:linear-gradient(90deg, #BFDBFE 0%, #10B981 25%, #10B981 55%, #FEF9C3 75%, #FEE2E2 100%); margin-bottom:6px;">
            <div style="position:absolute; left:30%; top:0; bottom:0; width:2px; background:#0F172A; border-radius:9999px;"></div>
            <div style="position:absolute; left:55%; top:0; bottom:0; width:2px; background:#F59E0B; border-radius:9999px;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#94A3B8;">
            <span>-4,0°C (Congelamento)</span>
            <span style="color:#059669; font-weight:700;">0,5°C (Setpoint)</span>
            <span style="color:#F59E0B; font-weight:700;">2,0°C (Limite)</span>
            <span>+5,0°C (Risco/Dano)</span>
          </div>
        </div>

        <!-- UR -->
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Umidade Relativa (UR) — Preservação do engaço verde</label>
          <input id="cfg-ur-reefer" value="90% a 95%" style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:#F8FAFC; box-sizing:border-box;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Portos -->
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:8px;">Portos e Destinos Padrão de Exportação</label>
          <div id="portos-options-container">
            ${[
              { id: 'porto-pecem', name: 'Porto de Pecém / CE', sub: 'Frete rodoviário estimado: 14h 20m', rota: 'Rota Padrão', active: true },
              { id: 'porto-suape', name: 'Porto de Suape / PE', sub: 'Frete rodoviário estimado: 13h 45m', rota: 'Alternativo', active: false },
              { id: 'porto-salvador', name: 'Porto de Salvador / BA', sub: 'Frete rodoviário estimado: 9h 12m', rota: 'Alternativo', active: false },
            ].map(p => `
              <div class="porto-option-card ${p.active ? 'selected' : ''}" data-porto="${p.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:${p.active ? '#F0FDF4' : '#F8FAFC'}; border:1px solid ${p.active ? '#BBF7D0' : '#E2E8F0'}; border-radius:9px; margin-bottom:6px; cursor:pointer; transition:all .2s;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="porto-radio-dot" style="width:14px;height:14px; border-radius:50%; border:2px solid ${p.active ? '#059669' : '#CBD5E1'}; display:flex;align-items:center;justify-content:center;">
                    ${p.active ? `<div style="width:6px;height:6px;border-radius:50%;background:#059669;"></div>` : ''}
                  </div>
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#0F172A;">${p.name}</div>
                    <div style="font-size:10px; color:#94A3B8;">${p.sub}</div>
                  </div>
                </div>
                <div class="porto-badge" style="background:${p.active ? '#059669' : '#F1F5F9'}; color:${p.active ? '#fff' : '#64748B'}; font-size:10px; font-weight:700; padding:3px 9px; border-radius:6px;">${p.rota}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Toggle alarme financeiro -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#FFFBEB; border:1px solid #FEF3C7; border-radius:9px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="dollar-sign" style="width:14px;height:14px;color:#F59E0B;"></i>
            <div>
              <div style="font-size:11px; font-weight:700; color:#92400E;">Alarme Financeiro de Valor em Risco (CARGO-SLA)</div>
              <div style="font-size:10px; color:#94A3B8;">Disparar alertas para cargas > R$ 30.000 com temperatura fora da faixa por > 20 min</div>
            </div>
          </div>
          <div id="toggle-alarme-financeiro" class="toggle-track active" style="width:40px;height:22px;background:#059669;border-radius:11px;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0;">
            <div class="toggle-knob" style="position:absolute;left:20px;top:2px;width:18px;height:18px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .25s;"></div>
          </div>
        </div>
      </div>

      <!-- Regras de Disparo & Canais de Notificação -->
      <div class="apple-card" style="padding:24px 26px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px;height:36px; background:#FEF2F2; border-radius:10px; display:flex;align-items:center;justify-content:center;">
            <i data-lucide="bell" style="width:16px;height:16px;color:#DC2626;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:700; color:#0F172A;">Regras de Disparo & Canais de Notificação</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:1px;">Matriz de acionamento para eventos críticos e operacionais</div>
          </div>
        </div>

        <!-- Alerta Crítico P1 -->
        <div style="background:#FEF2F2; border:1px solid #FEE2E2; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:800; color:#DC2626;">Alerta Crítico (P1)</div>
            <div style="font-size:10px; color:#94A3B8;">Murcha &lt;40% | Baú &gt;3,0°C</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            ${[
              { id: 'notif-p1-push', label: 'Push App', checked: true, color: '#DC2626' },
              { id: 'notif-p1-whatsapp', label: 'WhatsApp', checked: true, color: '#DC2626' },
              { id: 'notif-p1-sms', label: 'SMS Urgent', checked: true, color: '#DC2626' },
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
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:12px; font-weight:800; color:#F59E0B;">Alerta Moderado (P2)</div>
            <div style="font-size:10px; color:#94A3B8;">Umidade ar &lt;30% | Vento &gt;35km/h</div>
          </div>
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            ${[
              { id: 'notif-p2-push', label: 'Push App', checked: true, color: '#F59E0B' },
              { id: 'notif-p2-whatsapp', label: 'WhatsApp', checked: false, color: '#F59E0B' },
              { id: 'notif-p2-email', label: 'E-mail Diário', checked: true, color: '#F59E0B' },
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
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">Horário do Envio</label>
              <input id="cfg-horario-matinal" value="06:30 AM" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; font-weight:700; color:#0F172A; outline:none; background:#fff; box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block; font-size:10px; font-weight:600; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;">E-mails CC</label>
              <input id="cfg-email-cc" value="gerencia@raizagro.agr.br, agronomo@raiz..." style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; font-size:11px; color:#475569; outline:none; background:#fff; box-sizing:border-box;">
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

    <!-- Footer actions -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px;">
      <button id="btn-restaurar-padroes" style="padding:11px 20px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; font-size:13px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all .2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#F8FAFC'">
        <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Restaurar padrões
      </button>
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="font-size:10px; color:#94A3B8;">ⓘ As alterações aplicadas a raiz de campo entrarão em vigor no próximo ciclo de sincronização (em até 5 minutos).</div>
        <button id="btn-salvar-configuracoes" style="padding:11px 24px; background:#059669; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:7px; transition:opacity .2s; box-shadow:0 4px 14px rgba(5,150,105,.3);" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
          <i data-lucide="check" style="width:14px;height:14px;"></i> Salvar alterações
        </button>
      </div>
    </div>

  </div>
  `;
}

export async function setupConfiguracoesEvents() {
  if (window.lucide) window.lucide.createIcons();

  // 1. Adicionar / Remover Culturas
  const culturasContainer = document.getElementById('culturas-tags-container');

  function renderCulturas() {
    if (!culturasContainer) return;
    const btnAdd = document.getElementById('btn-add-cultura');
    culturasContainer.innerHTML = `
      ${CULTURAS_LIST.map((c, i) => `
        <div class="culture-tag" data-index="${i}" style="background:#183D2E; color:#fff; font-size:11px; font-weight:600; padding:5px 10px; border-radius:7px; display:flex; align-items:center; gap:6px;">
          ${c} <span class="btn-remove-culture" data-index="${i}" style="cursor:pointer; opacity:.7; margin-left:2px; font-size:12px;">✕</span>
        </div>
      `).join('')}
      <button id="btn-add-cultura" style="padding:5px 12px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:7px; font-size:11px; color:#059669; cursor:pointer; font-weight:600;">+ Adicionar cultura</button>
    `;
    setupCulturasListeners();
  }

  function setupCulturasListeners() {
    document.querySelectorAll('.btn-remove-culture').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const removed = CULTURAS_LIST.splice(idx, 1);
        toast.info('Cultura Removida', `${removed} foi desvinculada dos talhões.`);
        renderCulturas();
      });
    });

    document.getElementById('btn-add-cultura')?.addEventListener('click', () => {
      Modal.open('Adicionar Nova Cultura', `
        <div style="font-size: 13px;">
          <label style="display:block; font-weight:600; margin-bottom:6px; color:#1E293B;">Nome da Cultura</label>
          <input id="input-new-cultura" placeholder="Ex: Maracujá, Pêra, Pitaya..." style="width:100%; padding:9px 12px; border:1px solid #E2E8F0; border-radius:8px; font-size:13px; box-sizing:border-box;">
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
          <label style="display:block; font-weight:600; margin-bottom:4px; color:#1E293B;">Nome da Variedade</label>
          <input id="new-var-name" placeholder="Ex: Uva BRS Melodia" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block; font-weight:600; margin-bottom:4px; color:#1E293B;">Mercado-Alvo</label>
          <input id="new-var-market" placeholder="Ex: Mercado Europeu / Premium" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="display:block; font-weight:600; margin-bottom:4px; color:#1E293B;">Grau Brix Mínimo</label>
            <input id="new-var-brix" placeholder="≥18,0° Brix" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:4px; color:#1E293B;">Calibre Mínimo</label>
            <input id="new-var-calibre" placeholder="Calibre: ≥20mm" style="width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
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
        <button class="btn-edit-variedade" data-index="${i}" style="width:28px;height:28px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:7px; cursor:pointer; display:flex;align-items:center;justify-content:center;">
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
              <label style="font-weight:600;">Grau Brix Mínimo</label>
              <input id="edit-brix" value="${item.brix}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-weight:600;">Calibre Padrão</label>
              <input id="edit-calibre" value="${item.calibre}" style="width:100%; padding:8px 10px; border:1px solid #E2E8F0; border-radius:8px; box-sizing:border-box;">
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
      toast.info('Destino Portuário Selecionado', `Rota reefer direcionada para ${card.querySelector('strong, [style*="font-weight:700"]')?.textContent || 'porto selecionado'}.`);
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

  // 6. Botão Sincronizar GPS
  document.getElementById('btn-gps-sync')?.addEventListener('click', () => {
    toast.success('GPS Sincronizado', 'Coordenadas validadas via constelação GNSS RTK (-21.177502, -47.616331).');
  });

  // 7. Botão Salvar Alterações
  document.getElementById('btn-salvar-configuracoes')?.addEventListener('click', () => {
    toast.success('Configurações Salvas', 'Todos os parâmetros da propriedade foram gravados com sucesso.');
  });

  // 8. Botão Restaurar Padrões
  document.getElementById('btn-restaurar-padroes')?.addEventListener('click', () => {
    toast.info('Padrões Restaurados', 'Parâmetros operacionais resetados para os valores recomendados pela Embrapa Semiárido.');
  });
}
