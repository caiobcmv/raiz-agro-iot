/**
 * VIEW: LOTES E SAFRA (FIGMA MOCKUP 3)
 * Governança Agronômica, Ciclo Safra Vigente 25/26, 4 KPIs,
 * Esteira de Status Operacional (ENUM status_lote com 6 estágios),
 * Lotes Ativos em Monitoramento e Régua de Qualidade & Brix Médio.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderLotes() {
  let lotes = [];
  try {
    lotes = await api.getLotes();
  } catch (e) {
    console.warn('Falha ao carregar lotes do backend.');
  }

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra: Governança Agronômica e Ciclo Safra Vigente -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">GOVERNANÇA AGRONÔMICA</span>
            <span style="font-size: 11px; color: #64748B;">Meta Global: <strong style="color: #0F172A;">34.2 ton/ha</strong></span>
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 4px 0 0 0;">Ciclo Safra Vigente 25/26</h3>
          <div style="font-size: 11px; color: #64748B;">Polo Irrigado Petrolina / Juazeiro</div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="font-size: 11px; color: #64748B; text-align: right;">
            <div>Período Vigente: <strong style="color: #0F172A;">01/08/2025 - 30/07/2026</strong></div>
            <div>Área Produtiva: <strong style="color: #0F172A;">1.250 ha cadastrados</strong></div>
          </div>
          <button class="btn btn-primary" id="btn-abrir-nova-safra" style="font-size: 12px; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i>
            <span>+ Abrir Nova Safra (2026/2027)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs do Ciclo de Safra -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: META DE PRODUTIVIDADE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">META DE PRODUTIVIDADE</span>
            <span style="font-size: 10px; font-weight: 600; color: #64748B;">Safra 25/26</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 12px 0;">
            <div style="width: 54px; height: 54px; border-radius: 50%; border: 4px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0F172A;">
              88%
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 800; color: #0F172A;">1.480t</div>
              <div style="font-size: 10px; color: #64748B;">Meta: 1.600t proj.</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Rendimento Médio</span>
            <strong style="color: #0F172A;">34.2 ton/ha</strong>
          </div>
        </div>

        <!-- KPI 2: VOLUME MONITORADO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">VOLUME MONITORADO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+14 Lotes Ativos</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">1.800 toneladas</div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin: 8px 0 6px 0;">
              <div style="width: 55%; background: #10B981;"></div>
              <div style="width: 30%; background: #0284C7;"></div>
              <div style="width: 15%; background: #F59E0B;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B;">
              <span>• Manga 55%</span>
              <span>• Uva 30%</span>
              <span>• Melão 15%</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Capacidade Operacional</span>
            <strong style="color: #047857;">94.2%</strong>
          </div>
        </div>

        <!-- KPI 3: DESTINAÇÃO COMERCIAL -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">DESTINAÇÃO COMERCIAL</span>
            <span style="font-size: 10px; font-weight: 600; color: #047857;">GlobalG.A.P.</span>
          </div>
          <div style="margin: 8px 0; font-size: 11px; color: #475569; display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Exportação (UE/USA)</span>
              <strong>65% <span style="font-size: 10px; color: #94A3B8;">(1.170t)</span></strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span> M. Interno (Sudeste)</span>
              <strong>25% <span style="font-size: 10px; color: #94A3B8;">(450t)</span></strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #F59E0B;"></span> Indústria / Processamento</span>
              <strong>10% <span style="font-size: 10px; color: #94A3B8;">(180t)</span></strong>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>0% perdas cadastrais</span>
            <strong style="color: #047857;">Fluxo sem gargalo</strong>
          </div>
        </div>

        <!-- KPI 4: RITMO & CONFORMIDADE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">RITMO &amp; CONFORMIDADE</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 8px; border-radius: 12px;">99.8% MAPA</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">42 dias</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">ciclo médio lote &rarr; porto</div>
            <div style="width: 100%; height: 6px; background: #10B981; border-radius: 3px; margin-top: 8px;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Status da Malha</span>
            <strong style="color: #047857;">14 Lotes Sem Risco</strong>
          </div>
        </div>
      </div>

      <!-- Seção: Esteira de Status Operacional (ENUM status_lote com 6 estágios) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="git-commit" style="width: 16px; height: 16px; color: #10B981;"></i>
              Esteira de Status Operacional (ENUM status_lote)
            </h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Transição de estágios garantida por trigger SQL relacional</p>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #64748B;">6 Estágios de Ciclo Produtivo</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
          <!-- Estágio 1 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #10B981;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">1. Em Produção</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">4</div>
            <div style="font-size: 10px; color: #64748B;">480 ton</div>
          </div>

          <!-- Estágio 2 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #3B82F6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">2. Pronto Colheita</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #3B82F6;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">220 ton</div>
          </div>

          <!-- Estágio 3 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #0284C7;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">3. Colhido</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">3</div>
            <div style="font-size: 10px; color: #64748B;">350 ton</div>
          </div>

          <!-- Estágio 4 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #8B5CF6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">4. Em Transporte</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">280 ton</div>
          </div>

          <!-- Estágio 5 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #06B6D4;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">5. Armazenado</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #06B6D4;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">310 ton</div>
          </div>

          <!-- Estágio 6 -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #64748B;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">6. Finalizado</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #64748B;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">1</div>
            <div style="font-size: 10px; color: #64748B;">160 ton</div>
          </div>
        </div>
      </div>

      <!-- Seção: Lotes Ativos em Monitoramento (Cards dos 4 Lotes Principais) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Lotes Ativos em Monitoramento</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">4 de 14 lotes com telemetria contínua</p>
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="btn-filter-lote active" style="padding: 5px 12px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (14)</button>
            <button class="btn-filter-lote" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Produção (4)</button>
            <button class="btn-filter-lote" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Colheita (2)</button>
            <button class="btn-filter-lote" style="padding: 5px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Transporte (2)</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          <!-- Lote 1: #LT-2026-084 Manga Tommy -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="sprout" style="width: 14px; height: 14px; color: #10B981;"></i>
                    <strong style="font-size: 13px; color: #0F172A;">#LT-2026-084</strong>
                  </div>
                  <div style="font-size: 11px; color: #64748B;">Manga Tommy • Talhão C1 (14.5ha)</div>
                </div>
                <span style="font-size: 10px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 6px; border-radius: 4px;">Em Campo</span>
              </div>
              <div style="width: 100%; height: 5px; background: #10B981; border-radius: 3px; margin: 12px 0 8px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B;">Colheita: 28/09</span>
                <strong style="color: #0F172A;">450.000 kg • Pecém (UE)</strong>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #047857;">
              <span>• 12 sensores ok</span>
              <button class="btn-ver-lote" data-id="LT-2026-084" style="background: none; border: none; color: #64748B; cursor: pointer;">&gt;</button>
            </div>
          </div>

          <!-- Lote 2: #LT-2026-079 Uva Vitória -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="grape" style="width: 14px; height: 14px; color: #3B82F6;"></i>
                    <strong style="font-size: 13px; color: #0F172A;">#LT-2026-079</strong>
                  </div>
                  <div style="font-size: 11px; color: #64748B;">Uva Vitória • Talhão A1 (12.4ha)</div>
                </div>
                <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 2px 6px; border-radius: 4px;">Pronto</span>
              </div>
              <div style="width: 100%; height: 5px; background: #0284C7; border-radius: 3px; margin: 12px 0 8px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B;">Colheita: 22/09</span>
                <strong style="color: #0F172A;">180.000 kg • Suape (UK)</strong>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #D97706;">
              <span>• Brix 18.2°Bx (A+)</span>
              <button class="btn-ver-lote" data-id="LT-2026-079" style="background: none; border: none; color: #64748B; cursor: pointer;">&gt;</button>
            </div>
          </div>

          <!-- Lote 3: #LT-2026-068 Melão Amarelo -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="circle-dot" style="width: 14px; height: 14px; color: #F59E0B;"></i>
                    <strong style="font-size: 13px; color: #0F172A;">#LT-2026-068</strong>
                  </div>
                  <div style="font-size: 11px; color: #64748B;">Melão Amarelo • Talhão B2 (8.5ha)</div>
                </div>
                <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 2px 6px; border-radius: 4px;">Colhido</span>
              </div>
              <div style="width: 100%; height: 5px; background: #F59E0B; border-radius: 3px; margin: 12px 0 8px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B;">Colheita: 15/09</span>
                <strong style="color: #0F172A;">120.000 kg • Ceasa SP</strong>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #64748B;">
              <span>No Packing House</span>
              <button class="btn-ver-lote" data-id="LT-2026-068" style="background: none; border: none; color: #64748B; cursor: pointer;">&gt;</button>
            </div>
          </div>

          <!-- Lote 4: #LT-2026-052 Manga Palmer -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="truck" style="width: 14px; height: 14px; color: #8B5CF6;"></i>
                    <strong style="font-size: 13px; color: #0F172A;">#LT-2026-052</strong>
                  </div>
                  <div style="font-size: 11px; color: #64748B;">Manga Palmer • Talhão C2 (15.0ha)</div>
                </div>
                <span style="font-size: 10px; font-weight: 700; color: #64748B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px;">Trânsito</span>
              </div>
              <div style="width: 100%; height: 5px; background: #3B82F6; border-radius: 3px; margin: 12px 0 8px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748B;">Frio: 12.0°C</span>
                <strong style="color: #0F172A;">320.000 kg • Salvador Port</strong>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #0284C7;">
              <span>GPS &amp; Termo Ativo</span>
              <button class="btn-ver-lote" data-id="LT-2026-052" style="background: none; border: none; color: #64748B; cursor: pointer;">&gt;</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção: Qualidade & Brix Médio -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="bar-chart-2" style="width: 16px; height: 16px; color: #0F172A;"></i>
            Qualidade &amp; Brix Médio
          </h3>
          <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">100% APROVADO</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Cultura 1: Uva Vitória -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Uva Vitória</strong>
              <span style="color: #047857; font-weight: 700;">18.2°Bx (+0.2) <span style="font-size: 10px; color: #94A3B8;">(Mín: 18.0°Bx)</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 90%; height: 100%; background: #0284C7; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 3px;">
              <span>Calibre &gt; 22mm (98% lote)</span>
              <span style="color: #047857; font-weight: 600;">Exportação A+ OK</span>
            </div>
          </div>

          <!-- Cultura 2: Manga Palmer & Tommy -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Manga Palmer &amp; Tommy</strong>
              <span style="color: #047857; font-weight: 700;">13.8°Bx (+0.8) <span style="font-size: 10px; color: #94A3B8;">(Mín: 13.0°Bx)</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 82%; height: 100%; background: #10B981; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 3px;">
              <span>Peso médio: 395g (Faixa Ideal)</span>
              <span style="color: #047857; font-weight: 600;">Aprovado União Europeia</span>
            </div>
          </div>

          <!-- Cultura 3: Melão Amarelo -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Melão Amarelo</strong>
              <span style="color: #047857; font-weight: 700;">12.4°Bx (+0.4) <span style="font-size: 10px; color: #94A3B8;">(Mín: 12.0°Bx)</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 75%; height: 100%; background: #F59E0B; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 3px;">
              <span>Sem manchas • Casca firme</span>
              <span style="color: #047857; font-weight: 600;">Mercado Premium OK</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé com status da malha de telemetria -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; padding: 10px 4px;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          48 Sondas Telemétricas Ativas (Conexão ESP32 Mesh Ativa)
        </span>
        <span>Integridade da Malha: <strong style="color: #047857;">100% Auditável</strong></span>
      </div>
    </div>
  `;
}

export function setupLotesEvents() {
  const btnNovaSafra = document.getElementById('btn-abrir-nova-safra');
  if (btnNovaSafra) {
    btnNovaSafra.addEventListener('click', () => {
      Modal.open('Abertura de Ciclo Safra 2026/2027', `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
          Informe os parâmetros globais de planejamento da próxima safra:
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <label>Identificação do Ciclo:
            <input type="text" value="Safra 2026/2027 • Polo Petrolina" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Meta de Produtividade Global (ton/ha):
            <input type="number" value="35.5" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Data de Início das Janelas Hídricas:
            <input type="date" value="2026-08-01" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
        </div>
      `, () => {
        toast.success('Safra Registrada', 'Ciclo 2026/2027 provisionado no banco relacional raiz_agro.db.');
      }, 'Homologar Safra');
    });
  }

  document.querySelectorAll('.btn-ver-lote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lote = e.currentTarget.dataset.id;
      toast.info('Detalhes do Lote', `Abrindo ficha completa e telemetria da colheita do #${lote}`);
    });
  });
}
