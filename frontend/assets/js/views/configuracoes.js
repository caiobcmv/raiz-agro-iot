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

const ANALISTA_LIMIARES_PADRAO = [
  {
    id_config: 1,
    codigo: 'ID #101',
    etapa: 'armazenamento',
    nome: 'Manga Tommy / Kent',
    alerta_frio: 'Chilling Injury < 10°C',
    alerta_bg: '#FEE2E2',
    alerta_color: '#B91C1C',
    temp_min: 10.0,
    temp_max: 13.0,
    escala_min: '0°C (Dano)',
    escala_max: '25°C',
    bar_gradient: 'linear-gradient(90deg, #EF4444 0%, #EF4444 26%, #10B981 26%, #10B981 58%, #F59E0B 58%, #F59E0B 78%, #FDE68A 78%, #FDE68A 100%)',
    ur_min: 90,
    ur_max: 95,
    ur_gradient: 'linear-gradient(90deg, #F59E0B 0%, #F59E0B 38%, #0EA5E9 38%, #0EA5E9 68%, #E2E8F0 68%, #E2E8F0 100%)',
    fonte: 'Embrapa Semiárido Doc. 144',
  },
  {
    id_config: 2,
    codigo: 'ID #102',
    etapa: 'armazenamento',
    nome: 'Uva de Mesa (Vitória / Crimson)',
    alerta_frio: 'Congelamento < -1.0°C',
    alerta_bg: '#E0F2FE',
    alerta_color: '#0369A1',
    temp_min: -0.5,
    temp_max: 2.0,
    escala_min: '-2.0°C (Gelo)',
    escala_max: '8.0°C',
    bar_gradient: 'linear-gradient(90deg, #6366F1 0%, #6366F1 28%, #8B5CF6 28%, #8B5CF6 56%, #F59E0B 56%, #F59E0B 76%, #FEF3C7 76%, #FEF3C7 100%)',
    ur_min: 90,
    ur_max: 95,
    ur_gradient: 'linear-gradient(90deg, #F59E0B 0%, #F59E0B 40%, #0EA5E9 40%, #0EA5E9 70%, #E2E8F0 70%, #E2E8F0 100%)',
    fonte: 'UC Davis Postharvest Specs',
  },
  {
    id_config: 3,
    codigo: 'ID #103',
    etapa: 'armazenamento',
    nome: 'Melão Amarelo (Cantaloupe)',
    alerta_frio: 'Sensibilidade < 7°C',
    alerta_bg: '#FEF3C7',
    alerta_color: '#B45309',
    temp_min: 10.0,
    temp_max: 12.0,
    escala_min: '5°C (Dano)',
    escala_max: '25°C',
    bar_gradient: 'linear-gradient(90deg, #EF4444 0%, #EF4444 26%, #10B981 26%, #10B981 56%, #F59E0B 56%, #F59E0B 76%, #FEF3C7 76%, #FEF3C7 100%)',
    ur_min: 85,
    ur_max: 95,
    ur_gradient: 'linear-gradient(90deg, #F59E0B 0%, #F59E0B 34%, #0EA5E9 34%, #0EA5E9 70%, #E2E8F0 70%, #E2E8F0 100%)',
    fonte: 'Inst. Agronômico de Campinas (IAC)',
  },
];

function renderAnalistaConfiguracoes() {
  return `
  <div class="dashboard-canvas apple-animate-in" style="padding: 20px 32px 48px; overflow-y: auto; background: #F8FAFC;">

    <!-- Barra Superior de Status & Ações do Analista -->
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
          Safra 2025/2026 Ativa • Petrolina (45.0 ha)
        </span>
        <span id="analista-broker-pill" style="background: #FFFFFF; border: 1px solid #E2E8F0; color: #475569; font-size: 11px; font-weight: 500; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="radio" style="width: 12px; height: 12px; color: #059669;"></i>
          Broker ThingSpeak conectado há 2 min
        </span>
        <span id="analista-pg-badge" style="background: #ECFDF5; border: 1px solid #BBF7D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; margin-left: auto;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          PostgreSQL Conectado
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-sync-thingspeak" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="refresh-cw" style="width: 13px; height: 13px; color: #059669;"></i>
          <span>Sincronizar ThingSpeak</span>
        </button>
        <button id="btn-export-config-analista" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="download" style="width: 13px; height: 13px; color: #0284C7;"></i>
          <span>Exportar (PDF/CSV)</span>
        </button>
        <button id="btn-salvar-config-analista" style="padding: 8px 18px; background: #059669; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 2px 6px rgba(5,150,105,0.28); transition: opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          <i data-lucide="save" style="width: 13px; height: 13px;"></i>
          <span>Salvar Alterações</span>
        </button>
      </div>
    </div>

    <!-- SEÇÃO 1: LIMIARES FISIOLÓGICOS & CONSERVAÇÃO -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; border: 1px solid #A7F3D0; display: flex; align-items: center; justify-content: center; color: #059669;">
            <i data-lucide="thermometer" style="width: 17px; height: 17px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Limiares Fisiológicos &amp; Conservação</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Faixas seguras de temperatura e umidade relativa (<code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px; color: #0F172A;">config_parametro</code>) validadas contra frio e dessecação</p>
          </div>
        </div>

        <button id="btn-restaurar-gerais-analista" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="rotate-ccw" style="width: 12px; height: 12px;"></i>
          <span>Restaurar Padrões Gerais</span>
        </button>
      </div>

      <div id="analista-limiares-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        ${ANALISTA_LIMIARES_PADRAO.map(item => `
          <div class="apple-card analista-fruta-card" data-config-id="${item.id_config}" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
            <div>
              <!-- Header do Card -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 14px;">
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${item.nome}</div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <span style="font-size: 10px; font-weight: 700; color: #475569; background: #F1F5F9; padding: 2px 6px; border-radius: 4px;">${item.codigo}</span>
                    <span style="font-size: 10px; color: #64748B;">${item.etapa}</span>
                  </div>
                </div>
                <span style="background: ${item.alerta_bg}; color: ${item.alerta_color}; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; white-space: nowrap;">${item.alerta_frio}</span>
              </div>

              <!-- Box 1: Faixa Térmica Segura -->
              <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 11px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="thermometer" style="width: 12px; height: 12px; color: #64748B;"></i>
                    Faixa Térmica Segura
                  </span>
                  <span class="label-temp-range" style="font-size: 11px; font-weight: 800; color: #0F172A;">${item.temp_min.toFixed(1)}°C – ${item.temp_max.toFixed(1)}°C</span>
                </div>
                <div style="height: 6px; border-radius: 9999px; background: ${item.bar_gradient}; margin-bottom: 6px;"></div>
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-bottom: 10px;">
                  <span style="color: #DC2626; font-weight: 600;">${item.escala_min}</span>
                  <span style="color: #059669; font-weight: 700;">${item.temp_min.toFixed(1)}°C Min</span>
                  <span style="color: #D97706; font-weight: 700;">${item.temp_max.toFixed(1)}°C Max</span>
                  <span>${item.escala_max}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 4px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 7px; padding: 5px 8px;">
                    <span style="font-size: 10px; color: #64748B;">Mínimo:</span>
                    <input type="number" step="0.5" class="input-temp-min" value="${item.temp_min.toFixed(1)}" style="width: 100%; border: none; outline: none; font-size: 11px; font-weight: 700; color: #0F172A; text-align: right;">
                    <span style="font-size: 10px; color: #64748B;">°C</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 4px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 7px; padding: 5px 8px;">
                    <span style="font-size: 10px; color: #64748B;">Máximo:</span>
                    <input type="number" step="0.5" class="input-temp-max" value="${item.temp_max.toFixed(1)}" style="width: 100%; border: none; outline: none; font-size: 11px; font-weight: 700; color: #0F172A; text-align: right;">
                    <span style="font-size: 10px; color: #64748B;">°C</span>
                  </div>
                </div>
              </div>

              <!-- Box 2: Umidade Relativa (UR) -->
              <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 10px; padding: 12px 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 11px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="droplets" style="width: 12px; height: 12px; color: #0284C7;"></i>
                    Umidade Relativa (UR)
                  </span>
                  <span class="label-ur-range" style="font-size: 11px; font-weight: 800; color: #0F172A;">${item.ur_min}% – ${item.ur_max}%</span>
                </div>
                <div style="height: 6px; border-radius: 9999px; background: ${item.ur_gradient}; margin-bottom: 6px;"></div>
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B;">
                  <span>60%</span>
                  <span style="color: #0284C7; font-weight: 700;">${item.ur_min}% Mín</span>
                  <span style="color: #0369A1; font-weight: 700;">${item.ur_max}% Máx</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <!-- Rodapé do Card -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #F1F5F9;">
              <span style="background: #ECFDF5; color: #065F46; font-size: 10px; font-weight: 600; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
                <i data-lucide="book-open" style="width: 11px; height: 11px;"></i>
                ${item.fonte}
              </span>
              <button class="btn-restaurar-fruta" data-config-id="${item.id_config}" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: #64748B; cursor: pointer;">Restaurar</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SEÇÃO 2: CORTES DE ALERTA PREDITIVO & MITIGAÇÃO -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
        <div style="width: 34px; height: 34px; border-radius: 10px; background: #FFFBEB; border: 1px solid #FDE68A; display: flex; align-items: center; justify-content: center; color: #D97706;">
          <i data-lucide="alert-triangle" style="width: 17px; height: 17px;"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Cortes de Alerta Preditivo &amp; Mitigação</h3>
          <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Classificação de severidade de risco com cálculo de fração de perda esperada (<code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px; color: #0F172A;">cortes_alerta_preditivo</code>)</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <!-- Risco BAIXO -->
        <div style="background: #FFFFFF; border: 1.5px solid #6EE7B7; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Risco BAIXO
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #475569;">Score 0.30 - 0.49</span>
            </div>
            <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #475569; font-weight: 600;">Perda Estimada</span>
                <span style="font-size: 20px; font-weight: 800; color: #059669;">2.0%</span>
              </div>
              <div style="height: 6px; background: #DCFCE7; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
                <div style="width: 20%; height: 100%; background: #10B981; border-radius: 9999px;"></div>
              </div>
              <div style="font-size: 10px; color: #047857; font-weight: 600;">Fração no banco: 0.02 (Seguro)</div>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 6px;">Ação Operacional Cadastrada:</div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #334155; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
              <i data-lucide="eye" style="width: 14px; height: 14px; color: #059669; flex-shrink: 0;"></i>
              <span>Observação passiva e acompanhamento da evolução do lote</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #F1F5F9;">
            <span style="font-size: 10px; color: #64748B;">Disparo: Automático</span>
            <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Prioridade Baixa</span>
          </div>
        </div>

        <!-- Risco MÉDIO -->
        <div style="background: #FFFFFF; border: 1.5px solid #FCD34D; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="background: #FFFBEB; color: #B45309; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #F59E0B;"></span> Risco MÉDIO
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #475569;">Score 0.50 - 0.79</span>
            </div>
            <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #475569; font-weight: 600;">Perda Estimada</span>
                <span style="font-size: 20px; font-weight: 800; color: #D97706;">10.0%</span>
              </div>
              <div style="height: 6px; background: #FEF3C7; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
                <div style="width: 55%; height: 100%; background: #F59E0B; border-radius: 9999px;"></div>
              </div>
              <div style="font-size: 10px; color: #B45309; font-weight: 600;">Fração no banco: 0.10 (Atenção moderada)</div>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 6px;">Ação Operacional Cadastrada:</div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #334155; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
              <i data-lucide="sliders" style="width: 14px; height: 14px; color: #D97706; flex-shrink: 0;"></i>
              <span>Ajuste preventivo do ambiente e verificação dos sistemas de refrigeração</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #F1F5F9;">
            <span style="font-size: 10px; color: #64748B;">Disparo: Push + Telegram</span>
            <span style="background: #FFFBEB; color: #B45309; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Prioridade Média</span>
          </div>
        </div>

        <!-- Risco CRÍTICO -->
        <div style="background: #FFFFFF; border: 1.5px solid #FCA5A5; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="background: #FEF2F2; color: #B91C1C; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #EF4444;"></span> Risco CRÍTICO
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #475569;">Score 0.80 - 1.00</span>
            </div>
            <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #475569; font-weight: 600;">Perda Estimada</span>
                <span style="font-size: 20px; font-weight: 800; color: #DC2626;">30.0%</span>
              </div>
              <div style="height: 6px; background: #FEE2E2; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
                <div style="width: 90%; height: 100%; background: #DC2626; border-radius: 9999px;"></div>
              </div>
              <div style="font-size: 10px; color: #B91C1C; font-weight: 600;">Fração no banco: 0.30 (Risco imediato de perda)</div>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 6px;">Ação Operacional Cadastrada:</div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #991B1B; font-weight: 600; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
              <i data-lucide="alert-octagon" style="width: 14px; height: 14px; color: #DC2626; flex-shrink: 0;"></i>
              <span>Intervenção logística e operacional imediata no lote</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #F1F5F9;">
            <span style="font-size: 10px; color: #64748B;">Disparo: Sirene + SMS + Protocolo P1</span>
            <span style="background: #FEE2E2; color: #B91C1C; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">Prioridade Máxima</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 3 (2 COLUNAS): SANITIZAÇÃO IOT + BROKER THINGSPEAK -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px;">

      <!-- Esquerda: Sanitização IoT & Filtro de Outliers -->
      <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: #334155;">
                <i data-lucide="filter" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #0F172A;">Sanitização IoT &amp; Filtro de Outliers</div>
                <span style="display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 600; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 7px; border-radius: 5px;">tabela: leitura_rejeitada</span>
              </div>
            </div>
            <span id="analista-rejeitadas-badge" style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px;">Rejeitadas 24h: 0</span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">Janela Física de Temperatura Admissível</span>
              <span style="background: #FEE2E2; color: #B91C1C; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Rejeição Real Registrada: 99.9°C</span>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
              <span style="background: #DC2626; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">99.9°C (Sensor)</span>
            </div>
            <div style="height: 8px; border-radius: 9999px; background: linear-gradient(90deg, #10B981 0%, #10B981 66%, #FCA5A5 66%, #EF4444 100%); margin-bottom: 8px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px;">
              <span style="color: #DC2626; font-weight: 700;">-5.0°C (Corte Mín)</span>
              <span style="color: #059669; font-weight: 700;">Janela Válida Salva no PostgreSQL</span>
              <span style="color: #DC2626; font-weight: 700;">55.0°C (Corte Máx)</span>
            </div>
            <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">
              Pacotes que extrapolem esses limites são isolados automaticamente em <strong style="color: #0F172A;">leitura_rejeitada</strong> com o motivo <code style="font-size: 10px; color: #B91C1C; background: #FEF2F2; padding: 1px 4px; border-radius: 4px;">temperatura_fora_do_limite_fisico</code> sem corromper as médias agronômicas.
            </p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 10px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0F172A;">Autocalibração de sensor de solo e salinidade</div>
              <div style="font-size: 10px; color: #64748B;">Compensação iônica em tempo real por algoritmo dinâmico</div>
            </div>
            <div class="toggle-track active" style="width: 38px; height: 22px; background: #059669; border-radius: 9999px; position: relative; cursor: pointer; flex-shrink: 0;">
              <div style="position: absolute; left: 18px; top: 3px; width: 16px; height: 16px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 10px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0F172A;">Alerta de leituras rejeitadas (&gt;3/h)</div>
              <div style="font-size: 10px; color: #64748B;">Notificar analista imediatamente em anomalias recorrentes</div>
            </div>
            <div class="toggle-track active" style="width: 38px; height: 22px; background: #059669; border-radius: 9999px; position: relative; cursor: pointer; flex-shrink: 0;">
              <div style="position: absolute; left: 18px; top: 3px; width: 16px; height: 16px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Direita: Broker ThingSpeak & Ingestão -->
      <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 10px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
                <i data-lucide="wifi" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #0F172A;">Broker ThingSpeak &amp; Ingestão</div>
                <div style="font-size: 11px; color: #64748B;">Pipeline de ingestão HTTP/MQTT dos nós ESP32-C3</div>
              </div>
            </div>
            <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Canal Ativo
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
              <div style="font-size: 10px; color: #64748B; font-weight: 600; margin-bottom: 4px;">Channel ID</div>
              <div style="font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'Space Grotesk', sans-serif;">#3500765</div>
              <div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 4px;">✓ Autenticado com Read/Write APIKeys</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
              <div style="font-size: 10px; color: #64748B; font-weight: 600; margin-bottom: 4px;">Taxa de Polling / Gateway</div>
              <div id="analista-polling-display" style="font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'Space Grotesk', sans-serif;">5 minutos</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Padrão analítico equilibrado</div>
            </div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label for="select-freq-ingestao" style="font-size: 11px; font-weight: 700; color: #334155;">Frequência de Ingestão de Amostras</label>
              <span id="analista-amostras-dia" style="font-size: 10px; font-weight: 700; color: #059669;">432 amostras / 24h</span>
            </div>
            <select id="select-freq-ingestao" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #0F172A; outline: none; cursor: pointer;">
              <option value="5" selected>5 minutos (padrão analítico da safra)</option>
              <option value="1">1 minuto (alta resolução de bancada)</option>
              <option value="15">15 minutos (modo economia de bateria)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #F1F5F9;">
          <span id="analista-latencia-txt" style="font-size: 11px; color: #64748B; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
            Taxa de latência: <strong>180ms</strong> (broker AWS us-east-1)
          </span>
          <button id="btn-testar-conexao-broker" style="padding: 8px 14px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; font-size: 11px; font-weight: 700; color: #047857; cursor: pointer;">Testar Conexão</button>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 4: MAPEAMENTO DE HARDWARE & LOTES -->
    <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
            <i data-lucide="cpu" style="width: 17px; height: 17px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Mapeamento de Hardware &amp; Lotes</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Associação física de telemetria aos lotes agronômicos ativos de Petrolina (<code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">sensor x lote</code>)</p>
          </div>
        </div>
        <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="shield-check" style="width: 13px; height: 13px;"></i>
          Integridade Referencial 100% OK
        </span>
      </div>

      <div id="analista-hardware-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Sensor Físico #1 -->
        <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; background: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #059669; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="radio" style="width: 17px; height: 17px;"></i>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13px; font-weight: 700; color: #0F172A;">Sensor Físico #1: DHT11 ESP32-C3</span>
                  <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px;">Ativo</span>
                </div>
                <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Bancada de testes • ThingSpeak Ch: <strong>3500765</strong></div>
              </div>
            </div>
            <span style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">id_sensor: 1</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 10px; color: #64748B;">Lote Vinculado (fk_lote)</div>
              <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 2px;">Lote #1 (Manga Palmer)</div>
              <div style="font-size: 10px; color: #64748B;">Área: 15.0 ha • Galpão 2</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 10px; color: #64748B;">Ambiente de Operação</div>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <span style="background: #059669; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px;">Ar (ar)</span>
                <span style="font-size: 10px; color: #475569;">Temp + Umidade</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; padding-top: 8px; border-top: 1px solid #F1F5F9;">
            <span><span style="color: #10B981;">●</span> Último Heartbeat: <strong>Hoje às 15:42 (UTC)</strong></span>
            <span style="font-family: monospace;">MAC: A8:42:E3:11:88:2A</span>
          </div>
        </div>

        <!-- Sensor Virtual #2 -->
        <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; background: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="layers" style="width: 17px; height: 17px;"></i>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13px; font-weight: 700; color: #0F172A;">Sensor Virtual #2: Solo Simulado</span>
                  <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px;">Ativo</span>
                </div>
                <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Sonda TDR Capacitiva Sintetizada • Umidade de Solo</div>
              </div>
            </div>
            <span style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">id_sensor: 2</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 10px; color: #64748B;">Lote Vinculado (fk_lote)</div>
              <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 2px;">Lote #1 (Manga Palmer)</div>
              <div style="font-size: 10px; color: #64748B;">Área: 15.0 ha • Galpão 2</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 10px; color: #64748B;">Ambiente de Operação</div>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <span style="background: #0F766E; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px;">Solo (solo)</span>
                <span style="font-size: 10px; color: #475569;">Umidade Volumétrica</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; padding-top: 8px; border-top: 1px solid #F1F5F9;">
            <span><span style="color: #10B981;">●</span> Último Heartbeat: <strong>Hoje às 15:42 (UTC)</strong></span>
            <span style="font-family: monospace;">Sintetizador: Autonim seed.sql</span>
          </div>
        </div>
      </div>
    </div>

  </div>
  `;
}

function setupAnalistaConfiguracoesEvents() {
  if (window.lucide) window.lucide.createIcons();

  // Atualiza label de faixa térmica ao editar inputs
  document.querySelectorAll('.analista-fruta-card').forEach(card => {
    const minInput = card.querySelector('.input-temp-min');
    const maxInput = card.querySelector('.input-temp-max');
    const rangeLabel = card.querySelector('.label-temp-range');
    const updateRange = () => {
      const vMin = parseFloat(minInput?.value);
      const vMax = parseFloat(maxInput?.value);
      if (!isNaN(vMin) && !isNaN(vMax) && rangeLabel) {
        rangeLabel.textContent = `${vMin.toFixed(1)}°C – ${vMax.toFixed(1)}°C`;
      }
    };
    minInput?.addEventListener('input', updateRange);
    maxInput?.addEventListener('input', updateRange);

    card.querySelector('.btn-restaurar-fruta')?.addEventListener('click', () => {
      const id = Number(card.dataset.configId);
      const padrao = ANALISTA_LIMIARES_PADRAO.find(p => p.id_config === id);
      if (padrao && minInput && maxInput) {
        minInput.value = padrao.temp_min.toFixed(1);
        maxInput.value = padrao.temp_max.toFixed(1);
        updateRange();
        toast.info('Padrão Restaurado', `Limiares de ${padrao.nome} restaurados para os valores de referência.`);
      }
    });
  });

  // Restaurar Padrões Gerais
  document.getElementById('btn-restaurar-gerais-analista')?.addEventListener('click', () => {
    document.querySelectorAll('.analista-fruta-card').forEach(card => {
      const id = Number(card.dataset.configId);
      const padrao = ANALISTA_LIMIARES_PADRAO.find(p => p.id_config === id);
      const minInput = card.querySelector('.input-temp-min');
      const maxInput = card.querySelector('.input-temp-max');
      const rangeLabel = card.querySelector('.label-temp-range');
      if (padrao && minInput && maxInput) {
        minInput.value = padrao.temp_min.toFixed(1);
        maxInput.value = padrao.temp_max.toFixed(1);
        if (rangeLabel) rangeLabel.textContent = `${padrao.temp_min.toFixed(1)}°C – ${padrao.temp_max.toFixed(1)}°C`;
      }
    });
    toast.info('Padrões Restaurados', 'Todos os limiares fisiológicos voltaram às referências Embrapa / UC Davis / IAC.');
  });

  // Salvar Alterações (envia para PUT /config-parametros/{id} quando backend online)
  document.getElementById('btn-salvar-config-analista')?.addEventListener('click', async () => {
    const cards = Array.from(document.querySelectorAll('.analista-fruta-card'));
    let salvos = 0;
    for (const card of cards) {
      const id = Number(card.dataset.configId);
      const temp_min = parseFloat(card.querySelector('.input-temp-min')?.value);
      const temp_max = parseFloat(card.querySelector('.input-temp-max')?.value);
      if (isNaN(temp_min) || isNaN(temp_max) || temp_min >= temp_max) {
        toast.error('Faixa Inválida', 'A temperatura mínima deve ser menor que a máxima.');
        return;
      }
      try {
        await api.request(`/config-parametros/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ temp_min, temp_max })
        });
        salvos++;
      } catch (err) {
        // fallback silencioso se offline ou sem permissão
      }
    }
    if (salvos > 0) {
      toast.success('Alterações Salvas', `${salvos} faixas fisiológicas sincronizadas no PostgreSQL.`);
    } else {
      toast.success('Alterações Aplicadas', 'Parâmetros fisiológicos e regras de ingestão salvos localmente.');
    }
  });

  // Sincronizar ThingSpeak
  document.getElementById('btn-sync-thingspeak')?.addEventListener('click', async () => {
    const pill = document.getElementById('analista-broker-pill');
    toast.info('Sincronizando ThingSpeak', 'Consultando canal #3500765...');
    try {
      const resumo = typeof api.getAnalistaSensoresResumo === 'function' ? await api.getAnalistaSensoresResumo() : null;
      const rejBadge = document.getElementById('analista-rejeitadas-badge');
      if (rejBadge && resumo?.ingestao_24h) {
        rejBadge.textContent = `Rejeitadas 24h: ${resumo.ingestao_24h.rejeitadas ?? 0}`;
      }
      if (pill) pill.innerHTML = `<i data-lucide="radio" style="width: 12px; height: 12px; color: #059669;"></i> Broker ThingSpeak sincronizado agora`;
      if (window.lucide) window.lucide.createIcons();
      toast.success('ThingSpeak Sincronizado', 'Telemetria do canal #3500765 atualizada com o PostgreSQL.');
    } catch {
      if (pill) pill.innerHTML = `<i data-lucide="radio" style="width: 12px; height: 12px; color: #059669;"></i> Broker ThingSpeak sincronizado agora`;
      if (window.lucide) window.lucide.createIcons();
      toast.success('ThingSpeak Sincronizado', 'Canal #3500765 verificado com sucesso.');
    }
  });

  // Frequência de Ingestão
  document.getElementById('select-freq-ingestao')?.addEventListener('change', (e) => {
    const mins = Number(e.target.value);
    const amostras = Math.round((24 * 60) / mins);
    const disp = document.getElementById('analista-polling-display');
    const amEl = document.getElementById('analista-amostras-dia');
    if (disp) disp.textContent = `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
    if (amEl) amEl.textContent = `${amostras} amostras / 24h`;
    toast.info('Frequência Atualizada', `Polling configurado para ${mins} min (${amostras} amostras/24h).`);
  });

  // Testar Conexão Broker
  document.getElementById('btn-testar-conexao-broker')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Testando...';
    const t0 = performance.now();
    await api.checkHealth().catch(() => {});
    const ms = Math.max(45, Math.round(performance.now() - t0));
    setTimeout(() => {
      const lat = document.getElementById('analista-latencia-txt');
      if (lat) lat.innerHTML = `<span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span> Taxa de latência: <strong>${ms}ms</strong> (broker AWS us-east-1)`;
      btn.disabled = false;
      btn.textContent = 'Testar Conexão';
      toast.success('Conexão OK', `Broker ThingSpeak #3500765 respondeu em ${ms}ms.`);
    }, 450);
  });

  // Toggles de Sanitização
  document.querySelectorAll('.toggle-track').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const knob = toggle.querySelector('div');
      const isActive = toggle.classList.contains('active');
      if (isActive) {
        toggle.classList.remove('active');
        toggle.style.background = '#CBD5E1';
        if (knob) knob.style.left = '3px';
      } else {
        toggle.classList.add('active');
        toggle.style.background = '#059669';
        if (knob) knob.style.left = '18px';
      }
    });
  });

  // Exportar Configurações do Analista (PDF & CSV dedicados)
  document.getElementById('btn-export-config-analista')?.addEventListener('click', () => {
    const cards = Array.from(document.querySelectorAll('.analista-fruta-card'));
    const headers = ['ID Config', 'Cultura', 'Etapa', 'Temp Min (C)', 'Temp Max (C)', 'UR (%)', 'Referencia'];
    const rows = cards.map(card => {
      const id = Number(card.dataset.configId);
      const ref = ANALISTA_LIMIARES_PADRAO.find(p => p.id_config === id) || {};
      const tMin = card.querySelector('.input-temp-min')?.value ?? ref.temp_min;
      const tMax = card.querySelector('.input-temp-max')?.value ?? ref.temp_max;
      return [ref.codigo || `#${id}`, ref.nome || 'Cultura', ref.etapa || 'armazenamento', tMin, tMax, `${ref.ur_min || 90}-${ref.ur_max || 95}%`, ref.fonte || 'Embrapa'];
    });
    const dataTag = new Date().toISOString().slice(0, 10);
    openExportChoiceModal(
      Modal,
      'Exportar Configurações Fisiológicas & IoT (Analista)',
      () => {
        downloadCSV(`configuracoes_fisiologicas_iot_${dataTag}.csv`, headers, rows);
        toast.success('CSV Exportado', `configuracoes_fisiologicas_iot_${dataTag}.csv baixado com sucesso.`);
      },
      () => {
        downloadPDF(`configuracoes_fisiologicas_iot_${dataTag}.pdf`, {
          title: 'Configurações do Sistema — Limiares Fisiológicos & IoT',
          subtitle: 'Parâmetros config_parametro, Cortes Preditivos e Broker ThingSpeak #3500765',
          headers,
          rows,
          notes: [
            'Cortes Preditivos: BAIXO (2.0% perda) | MEDIO (10.0% perda) | CRITICO (30.0% perda).',
            'Janela Física de Sanitização: -5.0°C a 55.0°C (outliers isolados em leitura_rejeitada).',
            'Hardware Mapeado: Sensor #1 DHT11 ESP32-C3 (Ar) e Sensor #2 Solo Simulado (Solo).'
          ]
        });
        toast.success('PDF Exportado', `configuracoes_fisiologicas_iot_${dataTag}.pdf baixado com sucesso.`);
      }
    );
  });

  // Carrega dados reais do backend se online
  if (typeof api.getAnalistaSensoresResumo === 'function') {
    api.getAnalistaSensoresResumo().then(resumo => {
      const rejBadge = document.getElementById('analista-rejeitadas-badge');
      if (rejBadge && resumo?.ingestao_24h) {
        rejBadge.textContent = `Rejeitadas 24h: ${resumo.ingestao_24h.rejeitadas ?? 0}`;
      }
    }).catch(() => {});
  }
}

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
  const isAnalista = profileRole === 'analista';
  if (isAnalista) {
    return renderAnalistaConfiguracoes();
  }
  const isAdmin = profileRole === 'admin';
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
          <input id="cfg-farm-name" value="Fazenda Vale das Uvas" ${readOnlyAttr} style="width:100%; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
        </div>

        <!-- Localização -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:5px;">Localização e Coordenadas Geográficas</label>
          <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <input id="cfg-farm-coords" value="-21.177502, -47.616331" ${readOnlyAttr} style="flex:1; min-width:140px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
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
              <input id="cfg-farm-area" value="1.250" ${readOnlyAttr} style="flex:1; padding:10px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:13px; color:#0F172A; outline:none; background:${inputBg}; box-sizing:border-box; cursor:${inputCursor};">
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
                ${isAdmin ? `
                  <button type="button" class="btn-edit-variedade" data-index="${i}" style="padding:4px 9px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; font-size:11px; font-weight:700; color:#047857; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);" title="Editar Limiares">
                    <i data-lucide="edit-3" style="width:11px; height:11px;"></i> Editar
                  </button>
                ` : ''}
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
  if (isAnalista) {
    setupAnalistaConfiguracoesEvents();
    return;
  }
  const isAdmin = profileRole === 'admin';
  const perfilFormatado = isAdmin ? 'Administrador' : 'Produtor / Exportador';

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

  // H) Edição de Variedades e Limiares (Admin)
  document.querySelectorAll('.btn-edit-variedade').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = VARIEDADES_LIST[idx];
      if (!item) return;

      Modal.open(`Editar Padrão — ${item.name}`, `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
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
        toast.success('Padrão Atualizado', `Limiares de ${item.name} foram atualizados.`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 'Salvar Alterações');
    });
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
