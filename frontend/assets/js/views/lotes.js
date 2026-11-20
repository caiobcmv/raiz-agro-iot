/**
 * VIEW: LOTES E SAFRA (FIGMA MOCKUP 3)
 * Governança Agronômica, Ciclo Safra Vigente 25/26, 4 KPIs,
 * Esteira de Status Operacional (ENUM status_lote com 6 estágios),
 * Lotes Ativos em Monitoramento com busca, abas de filtro e inspeção completa,
 * e Régua de Qualidade & Brix Médio.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let _lotesData = [
  {
    id: 'LT-2026-084',
    codigo: '#LT-2026-084',
    cultura: 'Manga Tommy',
    talhao: 'Talhão C1 (14.5ha)',
    status: 'Em Produção',
    statusBadge: 'Em Campo',
    statusClass: 'em-campo',
    corBarra: '#10B981',
    colheita: '28/09',
    volume: '450.000 kg',
    destino: 'Pecém (UE)',
    rodape: '• 12 sensores ok',
    corRodape: '#047857',
    icone: 'sprout',
    corIcone: '#10B981',
    brix: 13.5,
    temp: 11.2,
    sensores: ['SNS-SL-019', 'SNS-AR-005', 'SNS-SL-020']
  },
  {
    id: 'LT-2026-079',
    codigo: '#LT-2026-079',
    cultura: 'Uva Vitória',
    talhao: 'Talhão A1 (12.4ha)',
    status: 'Pronto Colheita',
    statusBadge: 'Pronto',
    statusClass: 'pronto',
    corBarra: '#0284C7',
    colheita: '22/09',
    volume: '180.000 kg',
    destino: 'Suape (UK)',
    rodape: '• Brix 18.2°Bx (A+)',
    corRodape: '#D97706',
    icone: 'grape',
    corIcone: '#3B82F6',
    brix: 18.2,
    temp: 0.8,
    sensores: ['SNS-SL-001', 'SNS-AR-002']
  },
  {
    id: 'LT-2026-068',
    codigo: '#LT-2026-068',
    cultura: 'Melão Amarelo',
    talhao: 'Talhão B2 (8.5ha)',
    status: 'Colhido',
    statusBadge: 'Colhido',
    statusClass: 'colhido',
    corBarra: '#F59E0B',
    colheita: '15/09',
    volume: '120.000 kg',
    destino: 'Ceasa SP',
    rodape: 'No Packing House',
    corRodape: '#64748B',
    icone: 'circle-dot',
    corIcone: '#F59E0B',
    brix: 12.4,
    temp: 10.5,
    sensores: ['SNS-SL-008', 'SNS-AR-004']
  },
  {
    id: 'LT-2026-052',
    codigo: '#LT-2026-052',
    cultura: 'Manga Palmer',
    talhao: 'Talhão C2 (15.0ha)',
    status: 'Em Transporte',
    statusBadge: 'Trânsito',
    statusClass: 'transito',
    corBarra: '#3B82F6',
    colheita: 'Frio: 12.0°C',
    volume: '320.000 kg',
    destino: 'Salvador Port',
    rodape: 'GPS & Termo Ativo',
    corRodape: '#0284C7',
    icone: 'truck',
    corIcone: '#8B5CF6',
    brix: 14.1,
    temp: 12.0,
    sensores: ['SNS-REEFER-04', 'SNS-GPS-09']
  }
];

let _filtroAtivoLotes = 'todos';
let _termoBuscaLotes = '';

export async function renderLotes() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- Sub-barra: Governança Agronômica e Ciclo Safra Vigente -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px;">GOVERNANÇA AGRONÔMICA</span>
            <span style="font-size: 11px; color: #64748B;">Meta Global: <strong style="color: #0F172A; font-weight: 700;">34.2 ton/ha</strong></span>
          </div>
          <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 4px 0 2px 0;">Ciclo Safra Vigente 25/26</h3>
          <div style="font-size: 11px; color: #64748B;">Polo Irrigado Petrolina / Juazeiro</div>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <div style="font-size: 11px; color: #64748B; text-align: right; line-height: 1.5;">
            <div>Período Vigente: <strong style="color: #0F172A;">01/08/2025 - 30/07/2026</strong></div>
            <div>Área Produtiva: <strong style="color: #0F172A;">1.250 ha cadastrados</strong></div>
          </div>
          <button class="btn btn-primary" id="btn-abrir-nova-safra" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 12px; font-weight: 700; padding: 9px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="plus-circle" style="width: 15px; height: 15px;"></i>
            <span>+ Abrir Nova Safra (2026/2027)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs do Ciclo de Safra -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: META DE PRODUTIVIDADE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">META DE PRODUTIVIDADE</span>
            <span style="font-size: 10px; font-weight: 600; color: #64748B;">Safra 25/26</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; margin: 12px 0;">
            <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" stroke-width="3.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="3.5" stroke-dasharray="88, 100" stroke-linecap="round" />
              </svg>
              <span style="position: absolute; font-size: 13px; font-weight: 800; color: #0F172A;">88%</span>
            </div>
            <div>
              <div style="font-size: 17px; font-weight: 800; color: #0F172A;">1.480t</div>
              <div style="font-size: 11px; color: #64748B;">Meta: 1.600t proj.</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Rendimento Médio</span>
            <strong style="color: #0F172A;">34.2 ton/ha</strong>
          </div>
        </div>

        <!-- KPI 2: VOLUME MONITORADO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">VOLUME MONITORADO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+14 Lotes Ativos</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">1.800 toneladas</div>
            <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; display: flex; overflow: hidden; margin: 10px 0 8px 0;">
              <div style="width: 55%; background: #10B981;" title="Manga 55%"></div>
              <div style="width: 30%; background: #0284C7;" title="Uva 30%"></div>
              <div style="width: 15%; background: #F59E0B;" title="Melão 15%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B;">
              <span>• Manga 55%</span>
              <span>• Uva 30%</span>
              <span>• Melão 15%</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Capacidade Operacional</span>
            <strong style="color: #047857;">94.2%</strong>
          </div>
        </div>

        <!-- KPI 3: DESTINAÇÃO COMERCIAL -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DESTINAÇÃO COMERCIAL</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857;">GlobalG.A.P.</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin: 8px 0;">
            <div style="width: 48px; height: 48px; flex-shrink: 0;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E8F0" stroke-width="5" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10B981" stroke-width="5" stroke-dasharray="65 35" stroke-dashoffset="0" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#0284C7" stroke-width="5" stroke-dasharray="25 75" stroke-dashoffset="-65" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#F59E0B" stroke-width="5" stroke-dasharray="10 90" stroke-dashoffset="-90" />
              </svg>
            </div>
            <div style="font-size: 11px; color: #475569; display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Exportação</span>
                <strong>65% <span style="font-size: 10px; color: #94A3B8;">(1.170t)</span></strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span> M. Interno</span>
                <strong>25% <span style="font-size: 10px; color: #94A3B8;">(450t)</span></strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #F59E0B;"></span> Indústria</span>
                <strong>10% <span style="font-size: 10px; color: #94A3B8;">(180t)</span></strong>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>0% perdas cadastrais</span>
            <strong style="color: #047857;">Fluxo sem gargalo</strong>
          </div>
        </div>

        <!-- KPI 4: RITMO & CONFORMIDADE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">RITMO &amp; CONFORMIDADE</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 2px 8px; border-radius: 12px;">99.8% MAPA</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">42 dias <span style="font-size: 11px; font-weight: 500; color: #64748B;">ciclo médio</span></div>
            <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-top: 10px;">
              <div style="width: 85%; height: 100%; background: #10B981; border-radius: 4px;"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Status da Malha</span>
            <strong style="color: #047857;">14 Lotes Sem Risco</strong>
          </div>
        </div>
      </div>

      <!-- Seção: Esteira de Status Operacional (ENUM status_lote com 6 estágios) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="git-commit" style="width: 16px; height: 16px; color: #10B981;"></i>
              Esteira de Status Operacional (ENUM status_lote)
            </h3>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #64748B;">6 Estágios de Ciclo Produtivo</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
          <!-- Estágio 1 -->
          <div class="card-estagio-esteira" data-estagio="Em Produção" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #10B981; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">1. Em Produção</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">4</div>
            <div style="font-size: 10px; color: #64748B;">480 ton</div>
          </div>

          <!-- Estágio 2 -->
          <div class="card-estagio-esteira" data-estagio="Pronto Colheita" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #3B82F6; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">2. Pronto Colheita</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #3B82F6;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">220 ton</div>
          </div>

          <!-- Estágio 3 -->
          <div class="card-estagio-esteira" data-estagio="Colhido" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #0284C7; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">3. Colhido</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">3</div>
            <div style="font-size: 10px; color: #64748B;">350 ton</div>
          </div>

          <!-- Estágio 4 -->
          <div class="card-estagio-esteira" data-estagio="Em Transporte" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #8B5CF6; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">4. Em Transporte</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">280 ton</div>
          </div>

          <!-- Estágio 5 -->
          <div class="card-estagio-esteira" data-estagio="Armazenado" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #06B6D4; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">5. Armazenado</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #06B6D4;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">2</div>
            <div style="font-size: 10px; color: #64748B;">310 ton</div>
          </div>

          <!-- Estágio 6 -->
          <div class="card-estagio-esteira" data-estagio="Finalizado" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid #64748B; cursor: pointer; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 700; color: #0F172A;">6. Finalizado</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #64748B;"></span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">1</div>
            <div style="font-size: 10px; color: #64748B;">160 ton</div>
          </div>
        </div>
      </div>

      <!-- Seção: Lotes Ativos em Monitoramento (Cards dos Lotes) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;">Lotes Ativos em Monitoramento</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;" id="subtitulo-contagem-lotes">4 de 14 lotes com telemetria contínua</p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- Campo de Busca de Lotes -->
            <div style="position: relative; width: 220px;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-lote" placeholder="Buscar por lote, talhão..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
            </div>

            <!-- Abas de Filtro -->
            <div style="display: flex; gap: 6px; overflow-x: auto;">
              <button class="btn-filter-lote active" data-filter="todos" style="padding: 6px 14px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (14)</button>
              <button class="btn-filter-lote" data-filter="producao" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Produção (4)</button>
              <button class="btn-filter-lote" data-filter="colheita" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Colheita (2)</button>
              <button class="btn-filter-lote" data-filter="transporte" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Transporte (2)</button>
              <button id="btn-filtro-avancado-lotes" style="padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; color: #64748B; cursor: pointer;" title="Filtro Avançado">
                <i data-lucide="sliders-horizontal" style="width: 13px; height: 13px;"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Grid de Cards de Lotes -->
        <div id="container-cards-lotes" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          ${renderCardsLotesHtml(_lotesData)}
        </div>
      </div>

      <!-- Seção: Qualidade & Brix Médio -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="bar-chart-2" style="width: 16px; height: 16px; color: #0F172A;"></i>
            Qualidade &amp; Brix Médio
          </h3>
          <span style="font-size: 10px; font-weight: 800; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 4px;">100% APROVADO</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Cultura 1: Uva Vitória -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Uva Vitória</strong>
              <span style="color: #047857; font-weight: 700;">18.2°Bx (+0.2) <span style="font-size: 10px; color: #94A3B8; font-weight: 400;">Mín: 18.0°Bx</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 90%; height: 100%; background: #0284C7; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 4px;">
              <span>Calibre &gt; 22mm (98% lote)</span>
              <span style="color: #047857; font-weight: 600;">Exportação A+ OK</span>
            </div>
          </div>

          <!-- Cultura 2: Manga Palmer & Tommy -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Manga Palmer &amp; Tommy</strong>
              <span style="color: #047857; font-weight: 700;">13.8°Bx (+0.8) <span style="font-size: 10px; color: #94A3B8; font-weight: 400;">Mín: 13.0°Bx</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 82%; height: 100%; background: #10B981; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 4px;">
              <span>Peso médio: 395g (Faixa Ideal)</span>
              <span style="color: #047857; font-weight: 600;">Aprovado União Europeia</span>
            </div>
          </div>

          <!-- Cultura 3: Melão Amarelo -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <strong style="color: #0F172A;">Melão Amarelo</strong>
              <span style="color: #047857; font-weight: 700;">12.4°Bx (+0.4) <span style="font-size: 10px; color: #94A3B8; font-weight: 400;">Mín: 12.0°Bx</span></span>
            </div>
            <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
              <div style="width: 75%; height: 100%; background: #F59E0B; border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 4px;">
              <span>Sem manchas • Casca firme</span>
              <span style="color: #047857; font-weight: 600;">Mercado Premium OK</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé com status da malha de telemetria -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; padding: 8px 4px; flex-wrap: wrap; gap: 8px;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          48 Sondas Telemétricas Ativas (Conexão ESP32 Mesh Ativa)
        </span>
        <div style="text-align: right;">
          <div>Integridade da Malha: <strong style="color: #047857;">100% Auditável</strong></div>
          <div style="font-size: 10px; color: #94A3B8; font-family: monospace;">SQL Master: a 6ef 77b 2026 relational</div>
        </div>
      </div>
    </div>
  `;
}

function renderCardsLotesHtml(lotes) {
  if (!lotes || lotes.length === 0) {
    return `
      <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #64748B; font-size: 13px;">
        Nenhum lote encontrado com os filtros selecionados.
      </div>
    `;
  }

  return lotes.map(l => `
    <div class="card-lote-monitorado" data-id="${l.id}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${l.icone}" style="width: 14px; height: 14px; color: ${l.corIcone};"></i>
              <strong style="font-size: 13px; color: #0F172A;">${l.codigo}</strong>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${l.cultura}</div>
            <div style="font-size: 10px; color: #94A3B8;">${l.talhao}</div>
          </div>
          <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${
            l.statusClass === 'em-campo' ? 'background: #DCFCE7; color: #047857;' :
            l.statusClass === 'pronto' ? 'background: #E0F2FE; color: #0284C7;' :
            l.statusClass === 'colhido' ? 'background: #E0F2FE; color: #0284C7;' :
            'background: #F1F5F9; color: #64748B;'
          }">
            ${l.statusBadge}
          </span>
        </div>
        <div style="width: 100%; height: 5px; background: ${l.corBarra}; border-radius: 3px; margin: 12px 0 8px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="color: #64748B;">Colheita: ${l.colheita}</span>
          <strong style="color: #0F172A;">${l.volume}</strong>
        </div>
        <div style="font-size: 10px; color: #64748B; text-align: right; margin-top: 2px;">
          Destino: <strong>${l.destino}</strong>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: ${l.corRodape}; font-weight: 600;">
        <span>${l.rodape}</span>
        <button class="btn-ver-lote" data-id="${l.id}" title="Inspecionar ficha completa do lote" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #0F172A; cursor: pointer; transition: all 0.2s;">
          <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function filtrarLotes() {
  const container = document.getElementById('container-cards-lotes');
  if (!container) return;

  let filtrados = _lotesData.filter(l => {
    // Filtro de busca textual
    if (_termoBuscaLotes) {
      const termo = _termoBuscaLotes.toLowerCase();
      const matchCodigo = l.codigo.toLowerCase().includes(termo);
      const matchCultura = l.cultura.toLowerCase().includes(termo);
      const matchTalhao = l.talhao.toLowerCase().includes(termo);
      const matchDestino = l.destino.toLowerCase().includes(termo);
      if (!matchCodigo && !matchCultura && !matchTalhao && !matchDestino) return false;
    }

    // Filtro de abas
    if (_filtroAtivoLotes === 'producao') {
      return l.status === 'Em Produção';
    } else if (_filtroAtivoLotes === 'colheita') {
      return l.status === 'Pronto Colheita' || l.status === 'Colhido';
    } else if (_filtroAtivoLotes === 'transporte') {
      return l.status === 'Em Transporte' || l.status === 'Armazenado';
    } else if (_filtroAtivoLotes !== 'todos') {
      return l.status === _filtroAtivoLotes;
    }
    return true;
  });

  container.innerHTML = renderCardsLotesHtml(filtrados);
  if (window.lucide) window.lucide.createIcons();
  vincularEventosCards();

  const subtitulo = document.getElementById('subtitulo-contagem-lotes');
  if (subtitulo) {
    subtitulo.textContent = `${filtrados.length} de 14 lotes com telemetria contínua`;
  }
}

function abrirModalInspecaoLote(loteId) {
  const lote = _lotesData.find(l => l.id === loteId) || _lotesData[0];
  
  Modal.open(`Ficha Técnica do Lote — ${lote.codigo}`, `
    <div style="font-size: 12px; color: #334155;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div>
          <span style="font-size: 10px; color: #64748B;">Cultura:</span>
          <div style="font-weight: 700; color: #0F172A; font-size: 13px;">${lote.cultura}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Localização:</span>
          <div style="font-weight: 700; color: #0F172A;">${lote.talhao}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Volume Registrado:</span>
          <div style="font-weight: 700; color: #0F172A;">${lote.volume}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Destino Comercial:</span>
          <div style="font-weight: 700; color: #047857;">${lote.destino}</div>
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label style="font-size: 11px; font-weight: 700; color: #0F172A; display: block; margin-bottom: 6px;">
          Atualizar Estágio da Esteira (ENUM status_lote):
        </label>
        <select id="modal-select-status-lote" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF;">
          <option value="Em Produção" ${lote.status === 'Em Produção' ? 'selected' : ''}>1. Em Produção (Cultura em campo)</option>
          <option value="Pronto Colheita" ${lote.status === 'Pronto Colheita' ? 'selected' : ''}>2. Pronto Colheita (Brix atingido)</option>
          <option value="Colhido" ${lote.status === 'Colhido' ? 'selected' : ''}>3. Colhido (Packing house)</option>
          <option value="Em Transporte" ${lote.status === 'Em Transporte' ? 'selected' : ''}>4. Em Transporte (Cadeia fria Reefer)</option>
          <option value="Armazenado" ${lote.status === 'Armazenado' ? 'selected' : ''}>5. Armazenado (Porto / Ceasa)</option>
          <option value="Finalizado" ${lote.status === 'Finalizado' ? 'selected' : ''}>6. Finalizado (Entrega confirmada)</option>
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div style="background: #F1F5F9; padding: 10px; border-radius: 6px;">
          <span style="font-size: 10px; color: #64748B;">Brix Atual:</span>
          <div style="font-size: 14px; font-weight: 800; color: #047857;">${lote.brix}°Bx</div>
          <span style="font-size: 9px; color: #64748B;">Faixa ideal exportação</span>
        </div>
        <div style="background: #F1F5F9; padding: 10px; border-radius: 6px;">
          <span style="font-size: 10px; color: #64748B;">Temperatura Polpa:</span>
          <div style="font-size: 14px; font-weight: 800; color: #0284C7;">${lote.temp}°C</div>
          <span style="font-size: 9px; color: #64748B;">Termometria ativa</span>
        </div>
      </div>

      <div>
        <span style="font-size: 11px; font-weight: 700; color: #0F172A; display: block; margin-bottom: 4px;">Sensores Vinculados:</span>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${lote.sensores.map(s => `<span style="font-size: 10px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; padding: 3px 8px; border-radius: 4px; font-weight: 600;">#${s}</span>`).join('')}
        </div>
      </div>
    </div>
  `, () => {
    const novoStatus = document.getElementById('modal-select-status-lote')?.value;
    if (novoStatus) {
      lote.status = novoStatus;
      if (novoStatus === 'Em Produção') {
        lote.statusBadge = 'Em Campo';
        lote.statusClass = 'em-campo';
        lote.corBarra = '#10B981';
      } else if (novoStatus === 'Pronto Colheita') {
        lote.statusBadge = 'Pronto';
        lote.statusClass = 'pronto';
        lote.corBarra = '#0284C7';
      } else if (novoStatus === 'Colhido') {
        lote.statusBadge = 'Colhido';
        lote.statusClass = 'colhido';
        lote.corBarra = '#F59E0B';
      } else if (novoStatus === 'Em Transporte') {
        lote.statusBadge = 'Trânsito';
        lote.statusClass = 'transito';
        lote.corBarra = '#3B82F6';
      } else {
        lote.statusBadge = novoStatus;
        lote.statusClass = 'concluido';
        lote.corBarra = '#64748B';
      }
      filtrarLotes();
      toast.success('Lote Atualizado', `Status do lote ${lote.codigo} alterado para "${novoStatus}" e persistido.`);
    }
  }, 'Salvar Alterações');
}

function vincularEventosCards() {
  document.querySelectorAll('.btn-ver-lote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const loteId = e.currentTarget.dataset.id;
      abrirModalInspecaoLote(loteId);
    });
  });

  document.querySelectorAll('.card-lote-monitorado').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const loteId = card.dataset.id;
      abrirModalInspecaoLote(loteId);
    });
  });
}

export function setupLotesEvents() {
  // Botão Abrir Nova Safra
  const btnNovaSafra = document.getElementById('btn-abrir-nova-safra');
  if (btnNovaSafra) {
    btnNovaSafra.addEventListener('click', () => {
      Modal.open('Abertura de Ciclo Safra 2026/2027', `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
          Informe os parâmetros globais de planejamento da próxima safra:
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <label>Identificação do Ciclo:
            <input type="text" id="campo-nova-safra-ciclo" value="Safra 2026/2027 • Polo Petrolina" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Meta de Produtividade (ton/ha):
              <input type="number" id="campo-nova-safra-meta" value="35.5" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Área Planejada (ha):
              <input type="number" id="campo-nova-safra-area" value="1300" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Data Início:
              <input type="date" value="2026-08-01" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Data Término:
              <input type="date" value="2027-07-30" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
          </div>
        </div>
      `, () => {
        const ciclo = document.getElementById('campo-nova-safra-ciclo')?.value || 'Safra 2026/2027';
        toast.success('Safra Homologada', `${ciclo} cadastrada com sucesso no banco relacional.`);
      }, 'Homologar Safra');
    });
  }

  // Campo de busca em tempo real
  const inputBusca = document.getElementById('input-busca-lote');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaLotes = e.target.value.trim();
      filtrarLotes();
    });
  }

  // Abas de filtro
  document.querySelectorAll('.btn-filter-lote').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter-lote').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#F8FAFC';
        t.style.color = '#475569';
        t.style.border = '1px solid #E2E8F0';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.color = '#FFFFFF';
      tab.style.border = 'none';
      tab.style.fontWeight = '700';

      _filtroAtivoLotes = tab.dataset.filter || 'todos';
      filtrarLotes();
    });
  });

  // Filtro avançado botão
  const btnFiltroAvancado = document.getElementById('btn-filtro-avancado-lotes');
  if (btnFiltroAvancado) {
    btnFiltroAvancado.addEventListener('click', () => {
      Modal.open('Filtros Avançados de Lotes', `
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
          <label>Cultura:
            <select id="filtro-modal-cultura" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="todas">Todas as Culturas</option>
              <option value="Manga">Manga (Tommy & Palmer)</option>
              <option value="Uva">Uva Vitória</option>
              <option value="Melão">Melão Amarelo</option>
            </select>
          </label>
          <label>Destino Comercial:
            <select id="filtro-modal-destino" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="todos">Todos os Destinos</option>
              <option value="Pecém">Porto do Pecém (UE)</option>
              <option value="Suape">Porto de Suape (UK)</option>
              <option value="Salvador">Porto de Salvador</option>
              <option value="Ceasa">Ceasa SP</option>
            </select>
          </label>
        </div>
      `, () => {
        const cultura = document.getElementById('filtro-modal-cultura')?.value;
        if (cultura && cultura !== 'todas') {
          _termoBuscaLotes = cultura;
          const input = document.getElementById('input-busca-lote');
          if (input) input.value = cultura;
        } else {
          _termoBuscaLotes = '';
          const input = document.getElementById('input-busca-lote');
          if (input) input.value = '';
        }
        filtrarLotes();
        toast.info('Filtro Aplicado', 'Lotes filtrados pelos critérios selecionados.');
      }, 'Aplicar Filtros');
    });
  }

  // Cards da Esteira Operacional clicáveis
  document.querySelectorAll('.card-estagio-esteira').forEach(card => {
    card.addEventListener('click', () => {
      const estagio = card.dataset.estagio;
      _filtroAtivoLotes = estagio;
      document.querySelectorAll('.btn-filter-lote').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#F8FAFC';
        t.style.color = '#475569';
        t.style.border = '1px solid #E2E8F0';
      });
      filtrarLotes();
      toast.info('Esteira Operacional', `Filtrando lotes no estágio: "${estagio}".`);
    });
  });

  vincularEventosCards();
}
