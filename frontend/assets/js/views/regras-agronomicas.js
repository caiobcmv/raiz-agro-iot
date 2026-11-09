/**
 * VIEW: REGRAS AGRONÔMICAS & LIMIARES FISIOLÓGICOS (FIGMA PIXEL PERFECT)
 * 100% IDÊNTICO À FOTO ENVIADA PELO USUÁRIO.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderRegrasAgronomicas() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="padding: 24px; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      
      <!-- Sub-barra Técnica Verde/Clara do Figma -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 10px; border-radius: 20px;">
              • v4.2 - Governança Fisiológica &amp; Limiares de Decisão
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #64748B;">
            <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="shield" style="width: 12px; height: 12px; color: #64748B;"></i> Ambiente de Produção</span>
            <span>•</span>
            <span>✓ Validação Cruzada: <strong>Embrapa Semiárido &amp; UC Davis</strong></span>
            <span>•</span>
            <span style="color: #059669; font-weight: 500;">⟳ Sincronização em Tempo Real com Nós LoRaWAN</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-sub-action" id="btn-restaurar-padroes" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i>
            <span>Restaurar Padrões</span>
          </button>
          <button class="btn-sub-action" id="btn-exportar-matriz" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i>
            <span>Exportar Matriz</span>
          </button>
          <button class="btn-sub-action" id="btn-nova-regra" style="background: #183D2E; border: none; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
            <span>+ Nova Regra Agronômica</span>
          </button>
        </div>
      </div>

      <!-- 4 Cards Superiores (KPIs do Figma) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
        <!-- Card 1: REGRAS ATIVAS NO CLUSTER -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">REGRAS ATIVAS NO CLUSTER</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">18 Regras</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 58px; height: 58px; border-radius: 50%; border: 5px solid #10B981; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 14px; font-weight: 800; color: #0F172A;">100%</span>
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0F172A;">Homologadas</div>
              <div style="font-size: 11px; color: #64748B;">(5 Culturas)</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: 12px;">
            <span>0 conflitos ativos</span>
            <span>&lt; 80ms latência</span>
          </div>
        </div>

        <!-- Card 2: EFICÁCIA DE MITIGAÇÃO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">EFICÁCIA DE MITIGAÇÃO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+5.2% safra</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">94.6%</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Taxa de interceptação</div>
            </div>
            <div style="width: 50px; height: 24px;">
              <svg viewBox="0 0 50 24" style="width: 100%; height: 100%;">
                <path d="M 0,20 Q 25,18 50,4" fill="none" stroke="#10B981" stroke-width="2"/>
              </svg>
            </div>
          </div>
          <div style="font-size: 11px; color: #047857; font-weight: 700; border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: 12px;">
            R$ 184.200 <span style="font-weight: 400; color: #64748B; font-size: 10px;">em perdas evitadas</span>
          </div>
        </div>

        <!-- Card 3: ADERÊNCIA PARAMÉTRICA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">ADERÊNCIA PARAMÉTRICA</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">Embrapa / UC Davis</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 6px; border-radius: 4px;">88.2%</span>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Conformidade Alta</div>
              <div style="font-size: 10px; color: #64748B;">Global G.A.P. &amp; MAPA</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: 12px;">
            Sem inconformidades nos últimos 90d
          </div>
        </div>

        <!-- Card 4: DISPAROS & PROTOCOLOS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISPAROS &amp; PROTOCOLOS</span>
            <span style="font-size: 10px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 2px 8px; border-radius: 12px;">30 Dias</span>
          </div>
          <div>
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">142 Eventos</div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 86%; background: #10B981;" title="86% Mitigados"></div>
              <div style="width: 14%; background: #F59E0B;" title="14% Manuais"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px; margin-top: 12px;">
            <span style="color: #047857; font-weight: 600;">86% Mitigados</span>
            <span style="color: #D97706; font-weight: 600;">14% Manuais</span>
            <span>0% Falhas</span>
          </div>
        </div>
      </div>

      <!-- Barra Esteira de Protocolos Agronômicos -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">ESTEIRA DE PROTOCOLOS AGRONÔMICOS POR CULTURA &amp; ESTÁGIO FENOLÓGICO</span>
          <span style="font-size: 10px; color: #64748B;">5 Cadeias Monitoradas</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
          <!-- Item 1: Uva -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #10B981;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">1. Uva de Mesa</div>
            <div style="font-size: 10px; color: #64748B;">Vitória / Crimson</div>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 4px;">4 Regras • Pós-Frio</div>
          </div>

          <!-- Item 2: Manga -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #0284C7;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">2. Manga Tommy/Palm</div>
            <div style="font-size: 10px; color: #64748B;">Pós-Colheita / Frio</div>
            <div style="font-size: 10px; color: #0284C7; font-weight: 600; margin-top: 4px;">5 Regras • Chilling</div>
          </div>

          <!-- Item 3: Melão -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #F59E0B;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">3. Melão Amarelo</div>
            <div style="font-size: 10px; color: #64748B;">Packing &amp; Maturação</div>
            <div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 4px;">3 Regras • Hídrico &amp; CE</div>
          </div>

          <!-- Item 4: Solo -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #8B5CF6;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">4. Solo &amp; Raízes</div>
            <div style="font-size: 10px; color: #64748B;">Sondas FDR 30/60cm</div>
            <div style="font-size: 10px; color: #7C3AED; font-weight: 600; margin-top: 4px;">4 Regras • Faixa VWC</div>
          </div>

          <!-- Item 5: Microclima -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #06B6D4;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">5. Microclima</div>
            <div style="font-size: 10px; color: #64748B;">Estresse Térmico &amp; VWC</div>
            <div style="font-size: 10px; color: #0891B2; font-weight: 600; margin-top: 4px;">2 Regras • Molhamento</div>
          </div>
        </div>
      </div>

      <!-- Seção Limiares Biológicos de Conservação & Maturação -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 0;">Limiares Biológicos de Conservação &amp; Maturação</h3>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">config_parametro • Mapeamento por cultura e sensor físico</div>
          </div>
          <span style="font-size: 11px; color: #64748B; font-weight: 600;">18 Regras Compiladas</span>
        </div>

        <!-- Filtros em Barra Horizontal -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="position: relative; width: 340px;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" placeholder="Filtrar por cultura, parâmetro ou tipo de sensor..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px;">
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="tab-flt active" style="padding: 5px 12px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (18)</button>
            <button class="tab-flt" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Manga (5)</button>
            <button class="tab-flt" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Uva (4)</button>
            <button class="tab-flt" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Melão (4)</button>
            <button class="tab-flt" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (5)</button>
          </div>
        </div>

        <!-- 4 Cards Fisiológicos FIEIS AO FIGMA -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Card 1: Uva de Mesa -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="grape" style="width: 16px; height: 16px; color: #10B981;"></i>
                  <strong style="font-size: 14px; color: #0F172A;">Uva de Mesa (Vitória / Crimson Seedless) — Câmara &amp; Maturação</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-left: 24px;">Variedades: R102 • Embrapa Semiárido Doc. 144</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Suscetibilidade Alta</span>
            </div>

            <!-- Faixa Térmica -->
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Temperatura de Polpa &amp; Ambiente</span>
                <span style="font-weight: 600;">Faixa Segura: <strong style="color: #047857;">-0.5°C a +1.0°C</strong></span>
              </div>
              <div style="width: 100%; height: 14px; background: #FEE2E2; border-radius: 7px; overflow: hidden; display: flex; position: relative;">
                <div style="width: 15%; background: #EF4444;" title="Congelamento < -1.5°C"></div>
                <div style="width: 45%; background: #10B981;" title="Faixa Ótima -0.5°C a +1.0°C"></div>
                <div style="width: 40%; background: #FDE047;" title="Teto > 2.0°C"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 3px;">
                <span>Perigo Congelo: &lt; -1.5°C</span>
                <span>-0.5°C</span>
                <span>+1.0°C</span>
                <span>Teto: 2.0°C</span>
              </div>
            </div>

            <!-- Régua UR e Brix -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 12px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Umidade Relativa (UR)</span>
                  <strong style="color: #0284C7;">90% a 95%</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 92%; height: 100%; background: #0284C7;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Padrão Brix Mínimo</span>
                  <strong style="color: #047857;">≥ 16.0 °Bx (Exportação)</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 85%; height: 100%; background: #10B981;"></div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px;">
              <span>14 Sensores Atrelados (Câmaras 01 a 04)</span>
              <div style="display: flex; gap: 8px;">
                <button style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button style="background: #183D2E; color: #FFFFFF; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>

          <!-- Card 2: Manga Tommy Atkins & Palmer -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="sprout" style="width: 16px; height: 16px; color: #10B981;"></i>
                  <strong style="font-size: 14px; color: #0F172A;">Manga Tommy Atkins &amp; Palmer — Conservação Pós-Colheita</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-left: 24px;">Variedades: R101 • UC Davis Postharvest Series</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Chilling Injury Watch</span>
            </div>

            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Faixa Térmica de Conservação</span>
                <span style="font-weight: 600;">Faixa Segura: <strong style="color: #047857;">10.0°C a 13.0°C</strong></span>
              </div>
              <div style="width: 100%; height: 14px; background: #FEE2E2; border-radius: 7px; overflow: hidden; display: flex; position: relative;">
                <div style="width: 20%; background: #EF4444;" title="Dano Frio < 10.0°C"></div>
                <div style="width: 50%; background: #10B981;" title="Faixa Ótima 10.0°C a 13.0°C"></div>
                <div style="width: 30%; background: #FDE047;" title="Teto 14.5°C"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 3px;">
                <span>Dano Frio: &lt; 10.0°C</span>
                <span>10.0°C</span>
                <span>13.0°C</span>
                <span>Pico Max 14.5°C (18h)</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 12px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Umidade Relativa (UR)</span>
                  <strong style="color: #0284C7;">85% a 90%</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 88%; height: 100%; background: #0284C7;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Produção Etileno Limiar</span>
                  <strong style="color: #047857;">&lt; 0.2 µL/kg·h</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 40%; height: 100%; background: #10B981;"></div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px;">
              <span>10 Sensores Atrelados (Galpão 03 &amp; Túnel 02)</span>
              <div style="display: flex; gap: 8px;">
                <button style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button style="background: #183D2E; color: #FFFFFF; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>

          <!-- Card 3: Melão Amarelo -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="circle-dot" style="width: 16px; height: 16px; color: #F59E0B;"></i>
                  <strong style="font-size: 14px; color: #0F172A;">Melão Amarelo (Cantaloupe / AF-522) — Packing &amp; Pós-Colheita</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-left: 24px;">Variedades: R103 • IAC Homologado</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Padrão Conab / Export</span>
            </div>

            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Janela Térmica Operacional</span>
                <span style="font-weight: 600;">Faixa Segura: <strong style="color: #047857;">10.0°C a 12.0°C</strong></span>
              </div>
              <div style="width: 100%; height: 14px; background: #FEE2E2; border-radius: 7px; overflow: hidden; display: flex; position: relative;">
                <div style="width: 20%; background: #EF4444;" title="Dano Frio < 7.0°C"></div>
                <div style="width: 50%; background: #10B981;" title="Faixa Ótima 10.0°C a 12.0°C"></div>
                <div style="width: 30%; background: #FDE047;" title="Sobreaquecimento > 14.0°C"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 3px;">
                <span>Dano Térmico: &lt; 7.0°C</span>
                <span>10.0°C</span>
                <span>12.0°C</span>
                <span>Sobreaquecimento &gt; 14.0°C</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 12px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Umidade Relativa (UR)</span>
                  <strong style="color: #0284C7;">85% a 90%</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 88%; height: 100%; background: #0284C7;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Firmeza de Polpa Alvo</span>
                  <strong style="color: #047857;">≥ 28 N (Newton)</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 75%; height: 100%; background: #10B981;"></div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px;">
              <span>8 Sensores Atrelados (Câmara de Desverdecimento)</span>
              <div style="display: flex; gap: 8px;">
                <button style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button style="background: #183D2E; color: #FFFFFF; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>

          <!-- Card 4: Manejo de Solo & Umidade Radicular -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="droplet" style="width: 16px; height: 16px; color: #0284C7;"></i>
                  <strong style="font-size: 14px; color: #0F172A;">Manejo de Solo &amp; Umidade Radicular (Sondas FDR 30/60cm)</strong>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-left: 24px;">Cluster Solos: v01 • Curvas de Retenção Van Genuchten</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Fertirrigação Ativa</span>
            </div>

            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Teor Volumétrico de Água no Solo (VWC)</span>
                <span style="font-weight: 600;">Faixa Ótima: <strong style="color: #047857;">18.0% a 32.0% VWC</strong></span>
              </div>
              <div style="width: 100%; height: 14px; background: #FEE2E2; border-radius: 7px; overflow: hidden; display: flex; position: relative;">
                <div style="width: 18%; background: #EF4444;" title="Murcha < 18%"></div>
                <div style="width: 48%; background: #10B981;" title="Faixa Ótima 18% a 32%"></div>
                <div style="width: 34%; background: #3B82F6;" title="Encharcamento > 42%"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 3px;">
                <span>Murcha: &lt; 18%</span>
                <span>20.0%</span>
                <span>32.0%</span>
                <span>Encharcamento: &gt; 42%</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 12px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Condutividade Elétrica (CE)</span>
                  <strong style="color: #047857;">1.2 a 1.8 dS/m</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 60%; height: 100%; background: #10B981;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                  <span>Temperatura Subterrânea (30cm)</span>
                  <strong style="color: #0F172A;">22.4°C Estável</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="width: 50%; height: 100%; background: #0284C7;"></div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px;">
              <span>32 Sondas Telemétricas (Setores Sul e Leste)</span>
              <div style="display: flex; gap: 8px;">
                <button style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Calibrar Sondas</button>
                <button style="background: #183D2E; color: #FFFFFF; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Cortes de Alerta Preditivo & Governança de Schema -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Card 1: Cortes de Alerta Preditivo -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0;">Cortes de Alerta Preditivo</h4>
              <div style="font-size: 10px; color: #64748B;">cortes_alerta_preditivo • Random Forest Model</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 6px; border-radius: 4px;">ML Inference</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #047857;">
                <span>• Risco BAIXO (Score 0.30 - 0.49)</span>
                <span style="color: #64748B;">Perda: ~2.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Notificação no Dashboard e logs internos.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Observação passiva e acompanhamento de lote.</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #D97706;">
                <span>• Risco MÉDIO (Score 0.50 - 0.79)</span>
                <span style="color: #64748B;">Perda: ~10.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Push + WhatsApp para agrônomo de plantão.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Ajuste preventivo e verificação de refrigeração/fertirrigação.</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #DC2626;">
                <span>• Risco CRÍTICO (Score 0.80 - 1.00)</span>
                <span style="color: #64748B;">Perda: ~39.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Sirene + SMS urgente + Protocolo #4.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Intervenção logística e operacional imediata no lote.</div>
            </div>
          </div>

          <button id="btn-ajustar-pesos-ml" style="margin-top: 14px; width: 100%; padding: 8px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 11px; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Ajustar Pesos dos Modelos de ML</span>
          </button>
        </div>

        <!-- Card 2: Governança de Schema -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0;">Governança de Schema</h4>
              <div style="font-size: 10px; color: #64748B;">Mapeamento relacional de tabelas de parametrização</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">Postgres Sync</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">config_parametro</code>
                <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Limiares fisiológicos de temperatura na polpa, UR, Brix e umidade radicular VWC homologados.</div>
              </div>
              <strong style="color: #0F172A; margin-left: 10px;">18 registros</strong>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">cortes_alerta_preditivo</code>
                <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Mapeamento estatístico de perda esperada (2% a 39%) com gatilhos automáticos multi-canal.</div>
              </div>
              <strong style="color: #0F172A; margin-left: 10px;">3 faixas ativas</strong>
            </div>
          </div>

          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">AÇÕES RÁPIDAS</div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; font-size: 11px;">
            <a href="#/auditoria" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between;">
              <span>Auditoria de Alterações de Limiares</span> &rarr;
            </a>
            <a href="#/sensores" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between;">
              <span>Reclassificar Pesos de Predição (XRF)</span> &rarr;
            </a>
            <a href="#/relatorios" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between;">
              <span>Exportar Dicionário de Parâmetros (PDF)</span> &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupRegrasAgronomicasEvents() {
  const btnNova = document.getElementById('btn-nova-regra');
  if (btnNova) {
    btnNova.addEventListener('click', () => {
      Modal.open('Cadastrar Nova Regra Agronômica', `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
          Insira os limiares biológicos recomendados por instituição de pesquisa:
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <label>Cultura &amp; Variedade:
            <input type="text" placeholder="Ex: Manga Palmer Pós-Colheita" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Temperatura Mínima Segura (°C):
            <input type="number" value="10.0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Temperatura Máxima Segura (°C):
            <input type="number" value="13.0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Instituição Validadora:
            <input type="text" value="Embrapa Semiárido / UC Davis" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
        </div>
      `, () => {
        toast.success('Regra Registrada', 'Nova parametrização homologada no banco de dados raiz_agro.db.');
      }, 'Homologar Regra');
    });
  }

  const btnAjustarML = document.getElementById('btn-ajustar-pesos-ml');
  if (btnAjustarML) {
    btnAjustarML.addEventListener('click', () => {
      toast.info('Modelos Preditivos', 'Pesos do Random Forest e regressão logística calibrados.');
    });
  }
}
