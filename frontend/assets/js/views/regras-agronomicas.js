/**
 * VIEW: REGRAS AGRONÔMICAS & LIMIARES FISIOLÓGICOS (FIGMA MOCKUP ADM)
 * Governança Fisiológica, 4 KPIs, Esteira de Protocolos Agronômicos por Cultura,
 * Limiares Biológicos de Conservação & Maturação (com réguas de temperatura e umidade VWC),
 * Cortes de Alerta Preditivo e Governança de Schema.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderRegrasAgronomicas() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica de Governança -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            • v4.2 - Governança Fisiológica &amp; Limiares de Decisão
          </span>
          <span style="font-size: 11px; color: #64748B;">
            Ambiente de Produção • Validação Cruzada: <strong>Embrapa Semiárido &amp; UC Davis</strong>
          </span>
          <span style="font-size: 11px; color: #059669; font-weight: 600;">
            ✓ Sincronização em Tempo Real com Nós LoRaWAN
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-analista-sync" id="btn-restaurar-padroes" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
            <span>Restaurar Padrões</span>
          </button>
          <button class="btn-analista-sync" id="btn-exportar-matriz" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Matriz</span>
          </button>
          <button class="btn btn-primary" id="btn-nova-regra" style="font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            <span>+ Nova Regra Agronômica</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Superiores de Regras -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: REGRAS ATIVAS NO CLUSTER -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">REGRAS ATIVAS NO CLUSTER</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">18 Regras</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 12px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 4px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #0F172A;">
              100%
            </div>
            <div>
              <div style="font-size: 11px; color: #64748B;">Homologadas (5 Culturas)</div>
              <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">0 conflitos ativos</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            &lt; 80ms latência de disparo
          </div>
        </div>

        <!-- KPI 2: EFICÁCIA DE MITIGAÇÃO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">EFICÁCIA DE MITIGAÇÃO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">+5.2% safra</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">94.6%</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Taxa de interceptação</div>
          </div>
          <div style="font-size: 11px; color: #047857; font-weight: 600; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            R$ 184.200 em perdas evitadas
          </div>
        </div>

        <!-- KPI 3: ADERÊNCIA PARAMÉTRICA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">ADERÊNCIA PARAMÉTRICA</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #F0F9FF; padding: 2px 6px; border-radius: 4px;">Embrapa / UC Davis</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 16px; font-weight: 800; color: #0F172A;">Conformidade Alta</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">GlobalG.A.P. &amp; MAPA</div>
          </div>
          <div style="font-size: 10px; color: #047857; font-weight: 600; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            Sem inconformidades nos últimos 90d
          </div>
        </div>

        <!-- KPI 4: DISPAROS & PROTOCOLOS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">DISPAROS &amp; PROTOCOLOS</span>
            <span style="font-size: 10px; font-weight: 600; color: #64748B;">30 Dias</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">142 Eventos</div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 86%; background: #10B981;" title="86% Mitigados"></div>
              <div style="width: 14%; background: #F59E0B;" title="14% Manuais"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>86% Mitigados</span>
            <span>14% Manuais</span>
            <span>0% Falhas</span>
          </div>
        </div>
      </div>

      <!-- Seção: Esteira de Protocolos Agronômicos por Cultura & Estágio Fenológico -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 700; color: #64748B;">ESTEIRA DE PROTOCOLOS AGRONÔMICOS POR CULTURA &amp; ESTÁGIO FENOLÓGICO</span>
          <span style="font-size: 11px; color: #64748B;">5 Cadeias Monitoradas</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #10B981;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">1. Uva de Mesa</strong>
            <span style="font-size: 10px; color: #64748B;">Vitória / Crimson</span>
            <div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 4px;">4 Regras • Pós-Frio</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #0284C7;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">2. Manga Tommy/Palm</strong>
            <span style="font-size: 10px; color: #64748B;">Pós-Colheita / Frio</span>
            <div style="font-size: 10px; color: #0284C7; font-weight: 600; margin-top: 4px;">5 Regras • Chilling</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #F59E0B;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">3. Melão Amarelo</strong>
            <span style="font-size: 10px; color: #64748B;">Packing &amp; Maturação</span>
            <div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 4px;">3 Regras • Hídrico &amp; CE</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #8B5CF6;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">4. Solo &amp; Raízes</strong>
            <span style="font-size: 10px; color: #64748B;">Sondas FDR 30/60cm</span>
            <div style="font-size: 10px; color: #7C3AED; font-weight: 600; margin-top: 4px;">4 Regras • Faixa VWC</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #06B6D4;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">5. Microclima</strong>
            <span style="font-size: 10px; color: #64748B;">Estresse Térmico &amp; VWC</span>
            <div style="font-size: 10px; color: #0891B2; font-weight: 600; margin-top: 4px;">2 Regras • Molhamento</div>
          </div>
        </div>
      </div>

      <!-- Seção: Limiares Biológicos de Conservação & Maturação -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Limiares Biológicos de Conservação &amp; Maturação</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">config_parametro • Mapeamento por cultura e sensor físico</p>
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="tab-cultura-regra active" style="padding: 5px 12px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todas (18)</button>
            <button class="tab-cultura-regra" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Manga (5)</button>
            <button class="tab-cultura-regra" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Uva (4)</button>
            <button class="tab-cultura-regra" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Melão (4)</button>
            <button class="tab-cultura-regra" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (5)</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Card Cultura 1: Uva de Mesa -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 14px; color: #0F172A;">Uva de Mesa (Vitória / Crimson Seedless) — Câmara &amp; Maturação</strong>
                <div style="font-size: 11px; color: #64748B;">Variedades: R102 • Embrapa Semiárido Doc. 144</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Suscetibilidade Alta</span>
            </div>

            <!-- Régua Térmica -->
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Temperatura de Polpa &amp; Ambiente</span>
                <strong style="color: #047857;">Faixa Segura: -0.5°C a +1.0°C</strong>
              </div>
              <div style="width: 100%; height: 16px; background: #FEE2E2; border-radius: 8px; overflow: hidden; display: flex; position: relative;">
                <div style="width: 15%; background: #EF4444;" title="Congelamento < -1.5°C"></div>
                <div style="width: 45%; background: #10B981;" title="Faixa Ótima -0.5°C a 1.0°C"></div>
                <div style="width: 40%; background: #FDE047;" title="Maturação Acelerada > 2.0°C"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 3px;">
                <span>Perigo Congelo: &lt; -1.5°C</span>
                <span>-0.5°C</span>
                <span>+1.0°C</span>
                <span>Teto: 2.0°C</span>
              </div>
            </div>

            <!-- Régua de Umidade -->
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Umidade Relativa (UR)</span>
                <strong style="color: #0284C7;">90% a 95% UR</strong>
              </div>
              <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                <div style="width: 92%; height: 100%; background: #0284C7;"></div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              <span>14 Sensores Atrelados (Câmaras 01 a 04)</span>
              <div style="display: flex; gap: 8px;">
                <button class="btn-regra-acao" data-cultura="uva" data-acao="sensores" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button class="btn-regra-acao" data-cultura="uva" data-acao="calibrar" style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button class="btn-regra-acao" data-cultura="uva" data-acao="editar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 3px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>

          <!-- Card Cultura 2: Manga Tommy Atkins & Palmer -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 14px; color: #0F172A;">Manga Tommy Atkins &amp; Palmer — Conservação Pós-Colheita</strong>
                <div style="font-size: 11px; color: #64748B;">Variedades: R101 • UC Davis Postharvest Series</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #D97706; background: #FEF3C7; padding: 2px 8px; border-radius: 4px;">Chilling Injury Watch</span>
            </div>

            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Faixa Térmica de Conservação</span>
                <strong style="color: #047857;">Faixa Segura: 10.0°C a 13.0°C</strong>
              </div>
              <div style="width: 100%; height: 16px; background: #FEE2E2; border-radius: 8px; overflow: hidden; display: flex; position: relative;">
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

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              <span>10 Sensores Atrelados (Galpão 03 &amp; Túnel 02)</span>
              <div style="display: flex; gap: 8px;">
                <button class="btn-regra-acao" data-cultura="manga" data-acao="sensores" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button class="btn-regra-acao" data-cultura="manga" data-acao="calibrar" style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button class="btn-regra-acao" data-cultura="manga" data-acao="editar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 3px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>

          <!-- Card Cultura 3: Melão Amarelo -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 14px; color: #0F172A;">Melão Amarelo (Cantaloupe / AF-522) — Packing &amp; Pós-Colheita</strong>
                <div style="font-size: 11px; color: #64748B;">Variedades: R103 • IAC Homologado</div>
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Padrão Conab / Export</span>
            </div>

            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
                <span>Janela Térmica Operacional</span>
                <strong style="color: #047857;">Faixa Segura: 10.0°C a 12.0°C</strong>
              </div>
              <div style="width: 100%; height: 16px; background: #FEE2E2; border-radius: 8px; overflow: hidden; display: flex; position: relative;">
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

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              <span>8 Sensores Atrelados (Câmara de Desverdecimento)</span>
              <div style="display: flex; gap: 8px;">
                <button class="btn-regra-acao" data-cultura="melao" data-acao="sensores" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer;">Ver Sensores</button>
                <button class="btn-regra-acao" data-cultura="melao" data-acao="calibrar" style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer;">Calibrar</button>
                <button class="btn-regra-acao" data-cultura="melao" data-acao="editar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 3px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;">Editar Faixas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Cortes de Alerta Preditivo & Governança de Schema -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px;">
        <!-- Card 1: Cortes de Alerta Preditivo -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <strong style="font-size: 13px; color: #0F172A;">Cortes de Alerta Preditivo</strong>
              <div style="font-size: 11px; color: #64748B;">cortes_alerta_preditivo • Random Forest Model</div>
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
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #D97706;">
                <span>• Risco MÉDIO (Score 0.50 - 0.79)</span>
                <span style="color: #64748B;">Perda: ~10.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Push + WhatsApp para agrônomo de plantão.</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #DC2626;">
                <span>• Risco CRÍTICO (Score 0.80 - 1.00)</span>
                <span style="color: #64748B;">Perda: ~39.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Sirene + SMS urgente + Protocolo #4.</div>
            </div>
          </div>

          <button id="btn-ajustar-pesos-ml" style="margin-top: 12px; width: 100%; padding: 8px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 11px; font-weight: 600; color: #334155; cursor: pointer;">
            Ajustar Pesos dos Modelos de ML
          </button>
        </div>

        <!-- Card 2: Governança de Schema -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <strong style="font-size: 13px; color: #0F172A;">Governança de Schema</strong>
              <div style="font-size: 11px; color: #64748B;">Mapeamento relacional de tabelas de parametrização</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">Postgres Sync</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">config_parametro</code>
                <div style="color: #64748B; font-size: 10px;">Limiares fisiológicos de temperatura na polpa, UR, Brix e umidade.</div>
              </div>
              <strong style="color: #0F172A;">18 registros</strong>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">cortes_alerta_preditivo</code>
                <div style="color: #64748B; font-size: 10px;">Mapeamento probabilístico de perdas esperadas (2% a 39%).</div>
              </div>
              <strong style="color: #0F172A;">3 faixas ativas</strong>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
            <a href="#/auditoria" style="color: #0284C7; text-decoration: none; font-weight: 600;">Auditoria de Alterações de Limiares &rarr;</a>
            <a href="#/sensores" style="color: #0284C7; text-decoration: none; font-weight: 600;">Reclassificar Pesos de Predição (XRF) &rarr;</a>
            <a href="#/relatorios" style="color: #0284C7; text-decoration: none; font-weight: 600;">Exportar Dicionário de Parâmetros (PDF) &rarr;</a>
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

  document.querySelectorAll('.btn-regra-acao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const acao = e.currentTarget.dataset.acao;
      const cultura = e.currentTarget.dataset.cultura;
      if (acao === 'editar') {
        toast.info('Editar Limiares', `Abrindo editor de faixas bioclimáticas para ${cultura.toUpperCase()}`);
      } else if (acao === 'calibrar') {
        toast.info('Calibração', `Sincronizando offset dos nós de telemetria para ${cultura.toUpperCase()}`);
      } else {
        toast.info('Sensores', `Filtrando sondas alocadas aos talhões de ${cultura.toUpperCase()}`);
      }
    });
  });

  const btnAjustarML = document.getElementById('btn-ajustar-pesos-ml');
  if (btnAjustarML) {
    btnAjustarML.addEventListener('click', () => {
      toast.info('Modelos Preditivos', 'Pesos do Random Forest e regressão logística calibrados.');
    });
  }
}
