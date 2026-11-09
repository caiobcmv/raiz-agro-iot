/**
 * VIEW: SENSORES & TELEMETRIA DE CAMPO - FIEL AO FIGMA ADM
 * Sub-barra técnica com Provisionamento, Ingestão ThingSpeak, 4 KPIs Superiores,
 * Filtros de Talhões e Culturas, Tabela Completa de Hardware com Ações Operacionais,
 * e Gráfico de Correlação Térmica & Hídrica 24h sem distorção.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderSensoresAdmin() {
  const sensores = [
    {
      id: 'SNS-SL-001',
      tipo: 'FDR Solo Capacitivo',
      status: 'Ativo',
      talhao: 'Talhão A1 (Uva Vitória) • Lote #LT-2026-079 • Prof. 30cm',
      vwc: '48.2% VWC',
      bateria: '96%',
      rssi: '-78 dBm',
      statusClass: 'ativo',
      icone: 'droplet',
      corIcone: '#10B981'
    },
    {
      id: 'SNS-AR-002',
      tipo: 'Microclima SHT31 (Ar)',
      status: 'Ativo',
      talhao: 'Talhão A1 (Uva Vitória) • Torre Climatológica 2.0m • Mesh ID 3x4B',
      vwc: '28.1°C • 59.4% UR',
      bateria: '92%',
      rssi: '-80 dBm',
      statusClass: 'ativo',
      icone: 'thermometer',
      corIcone: '#0284C7'
    },
    {
      id: 'SNS-SL-003',
      tipo: 'TDR Analítico Solo',
      status: 'Ativo',
      talhao: 'Talhão A2 (Uva Crimson) • Lote #LT-2026-041 • Prof. 45cm',
      vwc: '37.8% VWC',
      bateria: '95%',
      rssi: '-82 dBm',
      statusClass: 'ativo',
      icone: 'activity',
      corIcone: '#10B981'
    },
    {
      id: 'SNS-SL-019',
      tipo: 'FDR Solo Multi-nível',
      status: 'Atenção / Calibração',
      talhao: 'Talhão C1 (Manga Tommy) • Lote #LT-2026-054 • Leitura Isolada',
      vwc: 'Outlier Térmico: 62.4°C (Sanitizado)',
      bateria: '74%',
      rssi: '',
      statusClass: 'atencao',
      icone: 'alert-triangle',
      corIcone: '#EF4444'
    },
    {
      id: 'SNS-ESP-025',
      tipo: 'Bancada ESP32-C3 Teste',
      status: 'Homologação',
      talhao: 'Sem talhão vinculado • Antena Omnidirecional 3dBi • Firmware v4.2.1-rc',
      vwc: 'Calibração 0-100% OK',
      bateria: '',
      rssi: '',
      statusClass: 'homologacao',
      icone: 'cpu',
      corIcone: '#8B5CF6'
    }
  ];

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Administrador -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px;">
          <span style="font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            • Ambiente de Produção
          </span>
          <span style="color: #475569;">Rede Mesh LoRaWAN US915</span>
          <span style="color: #64748B;">• Gateway Central Petrolina</span>
          <span style="color: #0284C7; font-weight: 600;">• Broker ThingSpeak Sincronizado</span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-analista-sync" id="btn-sync-esp32" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Sincronizar Nós (ESP32)</span>
          </button>
          <button class="btn-analista-sync" id="btn-export-leituras" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Leituras (CSV)</span>
          </button>
          <button class="btn btn-primary" id="btn-provisionar-sensor" style="font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            <span>+ Provisionar Novo Sensor</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Técnicos de Sensores -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">DISPONIBILIDADE DA REDE MESH</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">Mesh OK</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 12px 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; border: 4px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0F172A;">
              96%
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A;">24 / 25</div>
              <div style="font-size: 11px; color: #64748B;">operacionais</div>
              <div style="font-size: 10px; color: #94A3B8;">Latência: 118ms</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            1 nó em calibração preventiva
          </div>
        </div>

        <!-- KPI 2 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">DISTRIBUIÇÃO DE SENSORES</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7;">24 Ativos</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">16</span>
                <span style="font-size: 10px; color: #64748B;">Solo (FDR/TDR 67%)</span>
              </div>
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">8</span>
                <span style="font-size: 10px; color: #64748B;">Ar SHT31 (33%)</span>
              </div>
            </div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 67%; background: #10B981;"></div>
              <div style="width: 33%; background: #0284C7;"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Solo: 14 Campo</span>
            <span>2 Bancada</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">INGESTÃO THINGSPEAK</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7;">PostgreSQL</span>
          </div>
          <div style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">99.8 %</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Taxa de ingestão sem perda</div>
            </div>
            <i data-lucide="cloud-check" style="width: 24px; height: 24px; color: #10B981;"></i>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>300s cadência • 200 batches/h</span>
            <span style="color: #DC2626; font-weight: 600;">2 outliers</span>
          </div>
        </div>

        <!-- KPI 4 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">QUALIDADE RSSI • BATERIA</span>
            <span style="font-size: 10px; font-weight: 600; color: #047857;">Solar + Li-ion</span>
          </div>
          <div style="margin: 10px 0; display: flex; justify-content: space-between;">
            <div>
              <div style="font-size: 20px; font-weight: 800; color: #0F172A;">-81 <span style="font-size: 11px; font-weight: 600; color: #64748B;">dBm</span></div>
              <div style="font-size: 10px; color: #047857; font-weight: 600;">RSSI Médio Excelente</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: 800; color: #0F172A;">94 %</div>
              <div style="font-size: 10px; color: #64748B;">Carga Média OK</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #047857; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            Fluxo estável sem perda de pacotes
          </div>
        </div>
      </div>

      <!-- Distribuição Operacional por Talhões & Culturas -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 700; color: #64748B; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="map" style="width: 14px; height: 14px; color: #10B981;"></i>
            Distribuição Operacional por Talhões &amp; Culturas
          </span>
          <span style="font-size: 10px; font-weight: 700; color: #0284C7;">TOPOLOGIA DE CAMPO ATIVA</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #10B981;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão A1</strong>
            <span style="font-size: 10px; color: #64748B;">Uva Vitória • 8 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">Solo + Ar (100% Online)</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #0284C7;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão A2</strong>
            <span style="font-size: 10px; color: #64748B;">Uva Crimson • 6 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">FDR 30/60cm (100% Online)</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #F59E0B;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão B2</strong>
            <span style="font-size: 10px; color: #64748B;">Melão Amarelo • 4 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">Umidade &amp; CE (100% Online)</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #EF4444;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão C1 / C2</strong>
            <span style="font-size: 10px; color: #64748B;">Manga Tommy/Palmer • 6 Nós</span>
            <div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 2px;">Est. Microclima (1 Atenção)</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #8B5CF6;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Bancada Testes</strong>
            <span style="font-size: 10px; color: #64748B;">Reserva • 2 Nós</span>
            <div style="font-size: 10px; color: #7C3AED; font-weight: 600; margin-top: 2px;">Calibração Lab ESP32</div>
          </div>
        </div>
      </div>

      <!-- Tabela Completa de Sensores Cadastrados -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="position: relative; flex: 1; max-width: 380px;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" placeholder="Filtrar por ID do sensor, talhão, cultura ou tipo..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px;">
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="tab-sensor-admin active" style="padding: 5px 10px; font-size: 10px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (26)</button>
            <button class="tab-sensor-admin" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (16)</button>
            <button class="tab-sensor-admin" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Microclima (8)</button>
            <button class="tab-sensor-admin" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; cursor: pointer;">Atenção (2)</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${sensores.map(s => `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; color: ${s.corIcone}; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="${s.icone}" style="width: 18px; height: 18px;"></i>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 14px; color: #0F172A;">#${s.id}</strong>
                    <span style="font-size: 10px; color: #64748B;">${s.tipo}</span>
                    <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${
                      s.statusClass === 'ativo' ? 'background: #DCFCE7; color: #15803D;' :
                      s.statusClass === 'atencao' ? 'background: #FEE2E2; color: #DC2626;' :
                      'background: #E0F2FE; color: #0284C7;'
                    }">
                      • ${s.status}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                    ${s.talhao}
                  </div>
                  <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 4px;">
                    ${s.vwc} ${s.bateria ? `<span style="font-weight: 400; color: #64748B; font-size: 10px; margin-left: 8px;">• ${s.bateria} • ${s.rssi}</span>` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                ${s.id === 'SNS-SL-019' ? `
                  <button class="btn-sn-act" data-id="${s.id}" data-action="reset" style="background: #FEE2E2; border: 1px solid #FCA5A5; color: #DC2626; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Forçar Reset</button>
                  <button class="btn-sn-act" data-id="${s.id}" data-action="offset" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Recalibrar Offset</button>
                ` : (s.id === 'SNS-ESP-025' ? `
                  <button class="btn-sn-act" data-id="${s.id}" data-action="vincular" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Vincular a Lote</button>
                  <button class="btn-sn-act" data-id="${s.id}" data-action="ativar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ativar em Campo</button>
                ` : `
                  <button class="btn-sn-act" data-id="${s.id}" data-action="editar" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Editar</button>
                  <button class="btn-sn-act" data-id="${s.id}" data-action="calibrar" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Calibrar</button>
                  <button class="btn-sn-act" data-id="${s.id}" data-action="leituras" style="background: #183D2E; color: #FFFFFF; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ver Leituras</button>
                `)}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B;">
          <span>Exibindo 1-5 de 26 sensores cadastrados</span>
          <div style="display: flex; gap: 6px;">
            <button style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700;">1</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo &gt;</button>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Correlação Térmica & Hídrica 24h + Filtro de Ruído & Sanitização -->
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px;">
        <!-- Card 1: Correlação Térmica & Hídrica (24h) SEM BUG / ESTICAMENTO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Correlação Térmica &amp; Hídrica (24h)</h4>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Dinâmica solo vs microclima em tempo real</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Tempo Real</span>
          </div>

          <!-- Gráfico SVG com Proporção Fixa Perfeita -->
          <div style="position: relative; width: 100%; height: 210px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 10px;">
            <svg viewBox="0 0 600 160" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid meet">
              <!-- Faixa Ideal -->
              <rect x="0" y="50" width="600" height="60" fill="#ECFDF5" opacity="0.6"/>

              <!-- Curva Solo (Verde) -->
              <path d="M 0,100 C 150,110 300,70 450,85 L 600,60" fill="none" stroke="#10B981" stroke-width="2.5"/>

              <!-- Curva Ar (Azul Pontilhada) -->
              <path d="M 0,60 C 150,40 300,90 450,120 L 600,95" fill="none" stroke="#0284C7" stroke-width="2" stroke-dasharray="4,4"/>

              <!-- Pontos -->
              <circle cx="450" cy="85" r="4" fill="#10B981"/>
              <circle cx="450" cy="120" r="4" fill="#0284C7"/>
            </svg>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <span style="font-size: 10px; color: #64748B;">Temp. Solo: <strong style="color: #0F172A;">24.1°C</strong></span>
              <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 2px;">• Ideal para raiz</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Umidade Solo: <strong>46.8%</strong></div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <span style="font-size: 10px; color: #64748B;">Temp. Ar: <strong style="color: #0F172A;">27.4°C</strong></span>
              <div style="font-size: 11px; color: #0284C7; font-weight: 600; margin-top: 2px;">• Ventilação 3.2 m/s</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Umidade Ar (UR): <strong>61.2%</strong></div>
            </div>
          </div>
        </div>

        <!-- Card 2: Filtro de Ruído & Sanitização -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0;">Filtro de Ruído &amp; Sanitização</h4>
              <p style="font-size: 10px; color: #64748B; margin: 2px 0 0 0;">tabela: leitura_rejeitada</p>
            </div>
            <i data-lucide="shield-alert" style="width: 18px; height: 18px; color: #EF4444;"></i>
          </div>

          <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: #9F1239;">OUTLIERS EXCLUÍDOS</div>
            <div style="font-size: 20px; font-weight: 800; color: #BE123C; margin: 4px 0;">2 Leituras</div>
            <div style="font-size: 10px; color: #9F1239;">Prováveis vilões na fertirrigação</div>
            <div style="font-size: 10px; color: #475569; margin-top: 6px; border-top: 1px dashed #FECDD3; padding-top: 4px;">
              Nó #SNS-SL-019 • Hoje 14:22:04<br>
              Leitura térmica espúria <strong>62.4°C descartada</strong>. Média dos vizinhos: 27.1°C.
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 14px;">
            <span>Auto-calibração FDR Ativada</span>
            <input type="checkbox" checked style="accent-color: #10B981; cursor: pointer;">
          </div>

          <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
            <span style="font-weight: 700; color: #64748B; font-size: 10px;">AÇÕES RÁPIDAS DE INFRAESTRUTURA</span>
            <a href="#/rede-esp32" style="color: #0284C7; text-decoration: none; font-weight: 600;">Topologia Espacial LoRaWAN &rarr;</a>
            <a href="#/sensores" style="color: #0284C7; text-decoration: none; font-weight: 600;">Firmware OTA v4.2.1 (Deploy Lote) &rarr;</a>
            <a href="#/auditoria" style="color: #0284C7; text-decoration: none; font-weight: 600;">Auditoria Geral de Gateways &rarr;</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupSensoresAdminEvents() {
  document.querySelectorAll('.btn-sn-act').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const act = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      if (act === 'reset') {
        toast.warning('Comando de Reset', `Sinal de reinicialização enviado ao nó #${id} via gateway.`);
      } else if (act === 'offset') {
        toast.info('Offset Térmico', `Recalibrando curva analógica do sensor #${id}.`);
      } else {
        toast.info('Sensor', `Ação "${act}" acionada para o sensor #${id}.`);
      }
    });
  });

  const btnSync = document.getElementById('btn-sync-esp32');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      toast.success('ESP32 Mesh Sincronizado', '25 nós responderam com telemetria e carga de bateria atualizadas.');
    });
  }

  const btnExport = document.getElementById('btn-export-leituras');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      toast.success('Download Iniciado', 'Arquivo CSV de leituras climáticas compilado.');
    });
  }
}
