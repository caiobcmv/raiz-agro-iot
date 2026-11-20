/**
 * VIEW: SENSORES & TELEMETRIA DE CAMPO - FIEL AO FIGMA ADM
 * Sub-barra técnica com Provisionamento, Ingestão ThingSpeak, 4 KPIs Superiores,
 * Filtros de Talhões e Culturas, Tabela Completa de Hardware com Ações Operacionais,
 * Paginação Interativa, e Gráfico de Correlação Térmica & Hídrica 24h.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let _sensoresList = [
  {
    id: 'SNS-SL-001',
    tipo: 'FDR Solo Capacitivo',
    status: 'Ativo',
    categoria: 'solo',
    talhao: 'Talhão A1 (Uva Vitória) • Lote #LT-2026-079 • Prof. 30cm',
    vwc: '48.2% VWC',
    bateria: '96%',
    rssi: '-78 dBm',
    statusClass: 'ativo',
    icone: 'droplet',
    corIcone: '#10B981',
    offset: 0.0,
    firmware: 'v4.2.0-prod'
  },
  {
    id: 'SNS-AR-002',
    tipo: 'Microclima SHT31 (Ar)',
    status: 'Ativo',
    categoria: 'microclima',
    talhao: 'Talhão A1 (Uva Vitória) • Torre Climatológica 2.0m • Mesh ID 3x4B',
    vwc: '28.1°C • 59.4% UR',
    bateria: '92%',
    rssi: '-80 dBm',
    statusClass: 'ativo',
    icone: 'thermometer',
    corIcone: '#0284C7',
    offset: 0.0,
    firmware: 'v4.2.0-prod'
  },
  {
    id: 'SNS-SL-003',
    tipo: 'TDR Analítico Solo',
    status: 'Ativo',
    categoria: 'solo',
    talhao: 'Talhão A2 (Uva Crimson) • Lote #LT-2026-041 • Prof. 45cm',
    vwc: '37.8% VWC',
    bateria: '95%',
    rssi: '-82 dBm',
    statusClass: 'ativo',
    icone: 'activity',
    corIcone: '#10B981',
    offset: 0.0,
    firmware: 'v4.2.0-prod'
  },
  {
    id: 'SNS-SL-019',
    tipo: 'FDR Solo Multi-nível',
    status: 'Atenção / Calibração',
    categoria: 'atencao',
    talhao: 'Talhão C1 (Manga Tommy) • Lote #LT-2026-054 • Leitura Isolada',
    vwc: 'Outlier Térmico: 62.4°C (Sanitizado)',
    bateria: '74%',
    rssi: '-89 dBm',
    statusClass: 'atencao',
    icone: 'alert-triangle',
    corIcone: '#EF4444',
    offset: -35.3,
    firmware: 'v4.1.9-patch'
  },
  {
    id: 'SNS-ESP-025',
    tipo: 'Bancada ESP32-C3 Teste',
    status: 'Homologação',
    categoria: 'homologacao',
    talhao: 'Sem talhão vinculado • Antena Omnidirecional 3dBi • Firmware v4.2.1-rc',
    vwc: 'Calibração 0-100% OK',
    bateria: '100%',
    rssi: '-65 dBm',
    statusClass: 'homologacao',
    icone: 'cpu',
    corIcone: '#8B5CF6',
    offset: 0.0,
    firmware: 'v4.2.1-rc'
  },
  {
    id: 'SNS-SL-004',
    tipo: 'FDR Solo Capacitivo',
    status: 'Ativo',
    categoria: 'solo',
    talhao: 'Talhão B2 (Melão Amarelo) • Lote #LT-2026-068 • Prof. 30cm',
    vwc: '32.4% VWC',
    bateria: '94%',
    rssi: '-79 dBm',
    statusClass: 'ativo',
    icone: 'droplet',
    corIcone: '#10B981',
    offset: 0.0,
    firmware: 'v4.2.0-prod'
  },
  {
    id: 'SNS-AR-005',
    tipo: 'Microclima SHT31 (Ar)',
    status: 'Ativo',
    categoria: 'microclima',
    talhao: 'Talhão C2 (Manga Palmer) • Estação Secundária • Mesh ID 5x1C',
    vwc: '29.3°C • 54.1% UR',
    bateria: '88%',
    rssi: '-83 dBm',
    statusClass: 'ativo',
    icone: 'thermometer',
    corIcone: '#0284C7',
    offset: 0.0,
    firmware: 'v4.2.0-prod'
  }
];

let _filtroCategoriaSensor = 'todos';
let _termoBuscaSensor = '';
let _paginaAtualSensores = 1;
const _itensPorPagina = 5;

export async function renderSensoresAdmin() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- Sub-barra Técnica do Administrador -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px;">
          <span style="font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            • Ambiente de Produção
          </span>
          <span style="color: #475569;">• Rede Mesh LoRaWAN US915</span>
          <span style="color: #64748B;">• Gateway Central Petrolina</span>
          <span style="color: #0284C7; font-weight: 600;">• Broker ThingSpeak Sincronizado</span>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-analista-sync" id="btn-sync-esp32" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i>
            <span>Sincronizar Nós (ESP32)</span>
          </button>
          <button class="btn-analista-sync" id="btn-export-leituras" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i>
            <span>Exportar Leituras (CSV)</span>
          </button>
          <button class="btn btn-primary" id="btn-provisionar-sensor" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            <span>+ Provisionar Novo Sensor</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Técnicos de Sensores -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISPONIBILIDADE DA REDE MESH</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">Mesh OK</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; margin: 12px 0;">
            <div style="width: 54px; height: 54px; border-radius: 50%; border: 4.5px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0F172A;">
              96%
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 800; color: #0F172A;">24 / 25 <span style="font-size: 11px; font-weight: 500; color: #64748B;">operacionais</span></div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Latência: 118ms</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            1 nó em calibração preventiva
          </div>
        </div>

        <!-- KPI 2 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISTRIBUIÇÃO DE SENSORES</span>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">24 Ativos</span>
          </div>
          <div style="margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">16</span>
                <span style="font-size: 10px; color: #64748B;"> Solo (FDR/TDR 67%)</span>
              </div>
              <div>
                <span style="font-size: 20px; font-weight: 800; color: #0F172A;">8</span>
                <span style="font-size: 10px; color: #64748B;"> Ar SHT31 (33%)</span>
              </div>
            </div>
            <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 67%; background: #10B981;" title="Solo FDR/TDR 67%"></div>
              <div style="width: 33%; background: #0284C7;" title="Ar SHT31 33%"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Solo: 14 Campo</span>
            <span>Microclima: 8 Campo</span>
            <span>2 Bancada</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">INGESTÃO THINGSPEAK</span>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">PostgreSQL</span>
          </div>
          <div style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">99.8 %</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Taxa de ingestão sem perda</div>
            </div>
            <div style="width: 34px; height: 34px; border-radius: 50%; background: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="cloud" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>300s cadência • 200 batches/h</span>
            <span style="color: #DC2626; font-weight: 700;">2 outliers</span>
          </div>
        </div>

        <!-- KPI 4 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">QUALIDADE RSSI • BATERIA</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">Solar + Li-ion</span>
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
          <div style="font-size: 10px; color: #047857; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            Fluxo estável sem perda de pacotes
          </div>
        </div>
      </div>

      <!-- Distribuição Operacional por Talhões & Culturas -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 800; color: #64748B; display: flex; align-items: center; gap: 6px; letter-spacing: 0.5px;">
            <i data-lucide="map" style="width: 14px; height: 14px; color: #10B981;"></i>
            Distribuição Operacional por Talhões &amp; Culturas
          </span>
          <span style="font-size: 10px; font-weight: 700; color: #0284C7; letter-spacing: 0.5px;">TOPOLOGIA DE CAMPO ATIVA</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          <div class="card-filtro-talhao-sensor" data-talhao="Talhão A1" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #10B981; cursor: pointer;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão A1</strong>
            <span style="font-size: 10px; color: #64748B;">Uva Vitória • 8 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">Solo + Ar (100% Online)</div>
          </div>

          <div class="card-filtro-talhao-sensor" data-talhao="Talhão A2" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #0284C7; cursor: pointer;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão A2</strong>
            <span style="font-size: 10px; color: #64748B;">Uva Crimson • 6 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">FDR 30/60cm (100% Online)</div>
          </div>

          <div class="card-filtro-talhao-sensor" data-talhao="Talhão B2" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #F59E0B; cursor: pointer;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão B2</strong>
            <span style="font-size: 10px; color: #64748B;">Melão Amarelo • 4 Nós</span>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">Umidade &amp; CE (100% Online)</div>
          </div>

          <div class="card-filtro-talhao-sensor" data-talhao="Talhão C1" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #EF4444; cursor: pointer;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Talhão C1 / C2</strong>
            <span style="font-size: 10px; color: #64748B;">Manga Tommy/Palmer • 6 Nós</span>
            <div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 2px;">Est. Microclima (1 Atenção)</div>
          </div>

          <div class="card-filtro-talhao-sensor" data-talhao="Bancada" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; border-left: 3px solid #8B5CF6; cursor: pointer;">
            <strong style="font-size: 12px; color: #0F172A; display: block;">Bancada Testes</strong>
            <span style="font-size: 10px; color: #64748B;">Reserva • 2 Nós</span>
            <div style="font-size: 10px; color: #7C3AED; font-weight: 600; margin-top: 2px;">Calibração Lab ESP32</div>
          </div>
        </div>
      </div>

      <!-- Tabela Completa de Sensores Cadastrados -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="position: relative; flex: 1; max-width: 380px;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" id="input-busca-sensor" placeholder="Filtrar por ID do sensor, talhão, cultura ou tipo..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="tab-sensor-admin active" data-cat="todos" style="padding: 6px 12px; font-size: 10px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (26)</button>
            <button class="tab-sensor-admin" data-cat="solo" style="padding: 6px 12px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (16)</button>
            <button class="tab-sensor-admin" data-cat="microclima" style="padding: 6px 12px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Microclima (8)</button>
            <button class="tab-sensor-admin" data-cat="atencao" style="padding: 6px 12px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; cursor: pointer;">Atenção (2)</button>
          </div>
        </div>

        <!-- Lista de Sensores Renderizada -->
        <div id="container-lista-sensores" style="display: flex; flex-direction: column; gap: 12px;">
          ${renderLinhasSensoresHtml()}
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B; flex-wrap: wrap; gap: 8px;">
          <span id="texto-paginacao-sensores">Exibindo 1-5 de 26 sensores cadastrados</span>
          <div style="display: flex; gap: 6px;" id="controles-paginacao-sensores">
            <button class="btn-pag-sensor active" data-pag="1" style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700; cursor: pointer;">1</button>
            <button class="btn-pag-sensor" data-pag="2" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button class="btn-pag-sensor" data-pag="3" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
            <button class="btn-pag-sensor-prox" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo &gt;</button>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Correlação Térmica & Hídrica 24h + Filtro de Ruído & Sanitização -->
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px;">
        <!-- Card 1: Correlação Térmica & Hídrica (24h) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0;">Correlação Térmica &amp; Hídrica (24h)</h4>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Dinâmica solo vs microclima em tempo real</p>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 4px;">Tempo Real</span>
          </div>

          <!-- Gráfico SVG com Proporção Perfeita -->
          <div style="position: relative; width: 100%; height: 210px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 10px;">
            <svg viewBox="0 0 600 160" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="none">
              <!-- Faixa Ideal de Manejo Verde Suave -->
              <rect x="0" y="45" width="600" height="70" fill="#ECFDF5" opacity="0.6"/>

              <!-- Linhas de Grade Horizontais -->
              <line x1="0" y1="45" x2="600" y2="45" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>
              <line x1="0" y1="80" x2="600" y2="80" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>
              <line x1="0" y1="115" x2="600" y2="115" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>

              <!-- Curva Solo (Verde Contínua) -->
              <path d="M 0,105 C 100,115 200,65 320,75 C 440,85 520,55 600,60" fill="none" stroke="#10B981" stroke-width="2.5"/>

              <!-- Curva Ar (Azul Pontilhada) -->
              <path d="M 0,55 C 120,40 220,95 340,110 C 460,125 540,85 600,90" fill="none" stroke="#0284C7" stroke-width="2" stroke-dasharray="5,5"/>

              <!-- Pontos de Amostragem -->
              <circle cx="320" cy="75" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="340" cy="110" r="4.5" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="600" cy="60" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="600" cy="90" r="4.5" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5"/>
            </svg>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <span style="font-size: 10px; color: #64748B;">Temp. Solo: <strong style="color: #0F172A;">24.1°C</strong></span>
              <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 2px;">• Ideal para raiz</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Umidade Solo: <strong>46.8%</strong> (Faixa VWC ótima)</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <span style="font-size: 10px; color: #64748B;">Temp. Ar: <strong style="color: #0F172A;">27.4°C</strong></span>
              <div style="font-size: 11px; color: #0284C7; font-weight: 600; margin-top: 2px;">• Ventilação 3.2 m/s</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Umidade Ar (UR): <strong>61.2%</strong> (Déficit de Pressão OK)</div>
            </div>
          </div>

          <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 10px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="check-circle" style="width: 13px; height: 13px;"></i>
            Faixa Ideal de Manejo Agronômico
          </div>
        </div>

        <!-- Card 2: Filtro de Ruído & Sanitização -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0;">Filtro de Ruído &amp; Sanitização</h4>
              <p style="font-size: 10px; color: #64748B; margin: 2px 0 0 0; font-family: monospace;">tabela: leitura_rejeitada</p>
            </div>
            <i data-lucide="shield-alert" style="width: 18px; height: 18px; color: #EF4444;"></i>
          </div>

          <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #9F1239; letter-spacing: 0.5px;">OUTLIERS EXCLUÍDOS</div>
            <div style="font-size: 22px; font-weight: 800; color: #BE123C; margin: 4px 0;">2 Leituras</div>
            <div style="font-size: 10px; color: #9F1239;">Prováveis vilões na fertirrigação</div>
            <div style="font-size: 10px; color: #475569; margin-top: 8px; border-top: 1px dashed #FECDD3; padding-top: 6px; line-height: 1.4;">
              <strong>Nó #SNS-SL-019</strong> • Hoje 14:22:04<br>
              Leitura térmica espúria <strong>62.4°C descartada</strong>. Média dos vizinhos: 27.1°C.
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
            <span style="font-weight: 600; color: #0F172A;">Auto-calibração FDR Ativada</span>
            <input type="checkbox" id="check-auto-calibracao" checked style="accent-color: #10B981; width: 16px; height: 16px; cursor: pointer;">
          </div>

          <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
            <span style="font-weight: 800; color: #64748B; font-size: 10px; letter-spacing: 0.5px;">AÇÕES RÁPIDAS DE INFRAESTRUTURA</span>
            <button class="btn-infra-rapida" data-action="topologia" style="background: none; border: none; text-align: left; color: #0284C7; font-weight: 600; cursor: pointer; padding: 4px 0; display: flex; justify-content: space-between;">
              <span>Topologia Espacial LoRaWAN</span> &rarr;
            </button>
            <button class="btn-infra-rapida" data-action="ota" style="background: none; border: none; text-align: left; color: #0284C7; font-weight: 600; cursor: pointer; padding: 4px 0; display: flex; justify-content: space-between;">
              <span>Firmware OTA v4.2.1 (Deploy Lote)</span> &rarr;
            </button>
            <button class="btn-infra-rapida" data-action="gateways" style="background: none; border: none; text-align: left; color: #0284C7; font-weight: 600; cursor: pointer; padding: 4px 0; display: flex; justify-content: space-between;">
              <span>Auditoria Geral de Gateways</span> &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getSensoresFiltrados() {
  return _sensoresList.filter(s => {
    // Busca textual
    if (_termoBuscaSensor) {
      const t = _termoBuscaSensor.toLowerCase();
      const matchId = s.id.toLowerCase().includes(t);
      const matchTipo = s.tipo.toLowerCase().includes(t);
      const matchTalhao = s.talhao.toLowerCase().includes(t);
      if (!matchId && !matchTipo && !matchTalhao) return false;
    }

    // Filtro de categoria
    if (_filtroCategoriaSensor === 'solo') {
      return s.categoria === 'solo';
    } else if (_filtroCategoriaSensor === 'microclima') {
      return s.categoria === 'microclima';
    } else if (_filtroCategoriaSensor === 'atencao') {
      return s.categoria === 'atencao' || s.status.includes('Atenção');
    }
    return true;
  });
}

function renderLinhasSensoresHtml() {
  const filtrados = getSensoresFiltrados();
  const inicio = (_paginaAtualSensores - 1) * _itensPorPagina;
  const paginaItens = filtrados.slice(inicio, inicio + _itensPorPagina);

  if (paginaItens.length === 0) {
    return `
      <div style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
        Nenhum sensor encontrado com os filtros atuais.
      </div>
    `;
  }

  return paginaItens.map(s => `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; transition: all 0.2s;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 38px; height: 38px; border-radius: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; color: ${s.corIcone}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="${s.icone}" style="width: 18px; height: 18px;"></i>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="font-size: 14px; color: #0F172A;">#${s.id}</strong>
            <span style="font-size: 11px; color: #64748B;">${s.tipo}</span>
            <span style="font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${
              s.statusClass === 'ativo' ? 'background: #DCFCE7; color: #15803D;' :
              s.statusClass === 'atencao' ? 'background: #FEE2E2; color: #DC2626;' :
              'background: #E0F2FE; color: #0284C7;'
            }">
              • ${s.status}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
            ${s.talhao}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 4px;">
            ${s.vwc} ${s.bateria ? `<span style="font-weight: 400; color: #64748B; font-size: 11px; margin-left: 8px;">• Carga: ${s.bateria} • RSSI: ${s.rssi}</span>` : ''}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 6px; align-items: center;">
        ${s.id === 'SNS-SL-019' ? `
          <button class="btn-sn-act" data-id="${s.id}" data-action="reset" style="background: #FEE2E2; border: 1px solid #FCA5A5; color: #DC2626; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Forçar Reset</button>
          <button class="btn-sn-act" data-id="${s.id}" data-action="offset" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Recalibrar Offset</button>
        ` : (s.id === 'SNS-ESP-025' ? `
          <button class="btn-sn-act" data-id="${s.id}" data-action="vincular" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Vincular a Lote</button>
          <button class="btn-sn-act" data-id="${s.id}" data-action="ativar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ativar em Campo</button>
        ` : `
          <button class="btn-sn-act" data-id="${s.id}" data-action="editar" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Editar</button>
          <button class="btn-sn-act" data-id="${s.id}" data-action="calibrar" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Calibrar</button>
          <button class="btn-sn-act" data-id="${s.id}" data-action="leituras" style="background: #183D2E; color: #FFFFFF; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ver Leituras</button>
        `)}
      </div>
    </div>
  `).join('');
}

function atualizarTabelaSensores() {
  const container = document.getElementById('container-lista-sensores');
  if (container) {
    container.innerHTML = renderLinhasSensoresHtml();
    if (window.lucide) window.lucide.createIcons();
    vincularEventosSensores();
  }

  const textoPag = document.getElementById('texto-paginacao-sensores');
  if (textoPag) {
    const total = getSensoresFiltrados().length;
    const inicio = (_paginaAtualSensores - 1) * _itensPorPagina + 1;
    const fim = Math.min(_paginaAtualSensores * _itensPorPagina, total);
    textoPag.textContent = `Exibindo ${total > 0 ? inicio : 0}-${fim} de ${total} sensores cadastrados`;
  }
}

function vincularEventosSensores() {
  document.querySelectorAll('.btn-sn-act').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const act = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      const sensor = _sensoresList.find(s => s.id === id);

      if (act === 'reset') {
        Modal.open(`Forçar Reset — Nó #${id}`, `
          <div style="font-size: 12px; color: #475569;">
            <p>O gateway enviará um pacote downlink de reinicialização para o módulo ESP32 LoRaWAN.</p>
            <div style="background: #FFF1F2; border: 1px solid #FECDD3; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <strong>Aviso:</strong> O nó permanecerá offline por cerca de 15 segundos durante a autoverificação de memória e reconexão.
            </div>
          </div>
        `, () => {
          if (sensor) {
            sensor.status = 'Ativo';
            sensor.statusClass = 'ativo';
            sensor.vwc = '42.1% VWC';
            sensor.icone = 'droplet';
            sensor.corIcone = '#10B981';
          }
          atualizarTabelaSensores();
          toast.success('Reset Concluído', `Nó #${id} reinicializado e reingressado na rede Mesh.`);
        }, 'Confirmar Reinicialização');
      } else if (act === 'offset') {
        Modal.open(`Recalibrar Offset — #${id}`, `
          <div style="font-size: 12px; color: #475569;">
            <label style="display: block; margin-bottom: 8px;">Offset Térmico Atual (°C):
              <input type="number" id="input-modal-offset" value="${sensor?.offset || 0}" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <p style="font-size: 11px; color: #64748B;">A curva de calibração polinomial será atualizada no broker ThingSpeak.</p>
          </div>
        `, () => {
          const val = parseFloat(document.getElementById('input-modal-offset')?.value || '0');
          if (sensor) {
            sensor.offset = val;
            sensor.vwc = '26.8°C (Calibrado)';
            sensor.status = 'Ativo';
            sensor.statusClass = 'ativo';
            sensor.icone = 'droplet';
            sensor.corIcone = '#10B981';
          }
          atualizarTabelaSensores();
          toast.success('Offset Salvo', `Curva do nó #${id} ajustada para ${val}°C.`);
        }, 'Salvar Calibração');
      } else if (act === 'editar') {
        Modal.open(`Editar Sensor — #${id}`, `
          <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
            <label>Tipo do Sensor:
              <input type="text" id="edit-sensor-tipo" value="${sensor?.tipo || ''}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Alocação / Talhão:
              <input type="text" id="edit-sensor-talhao" value="${sensor?.talhao || ''}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Status Operacional:
              <select id="edit-sensor-status" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
                <option value="Ativo" ${sensor?.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                <option value="Atenção / Calibração" ${sensor?.status?.includes('Atenção') ? 'selected' : ''}>Atenção / Calibração</option>
                <option value="Homologação" ${sensor?.status === 'Homologação' ? 'selected' : ''}>Homologação</option>
              </select>
            </label>
          </div>
        `, () => {
          if (sensor) {
            sensor.tipo = document.getElementById('edit-sensor-tipo')?.value || sensor.tipo;
            sensor.talhao = document.getElementById('edit-sensor-talhao')?.value || sensor.talhao;
            sensor.status = document.getElementById('edit-sensor-status')?.value || sensor.status;
            sensor.statusClass = sensor.status === 'Ativo' ? 'ativo' : (sensor.status.includes('Atenção') ? 'atencao' : 'homologacao');
          }
          atualizarTabelaSensores();
          toast.success('Sensor Atualizado', `Informações do sensor #${id} sincronizadas com sucesso.`);
        }, 'Salvar Alterações');
      } else if (act === 'calibrar') {
        Modal.open(`Calibração Físico-Química — #${id}`, `
          <div style="font-size: 12px; color: #475569;">
            <p>Selecione os pontos de calibração do sensor de solo (FDR):</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <label>Ponto Seco (0% VWC):
                <input type="number" value="1420" style="width: 100%; padding: 6px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              </label>
              <label>Ponto Saturado (100% VWC):
                <input type="number" value="3840" style="width: 100%; padding: 6px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              </label>
            </div>
          </div>
        `, () => {
          toast.success('Sensor Calibrado', `Novos coeficientes gravados na EEPROM do ESP32 #${id}.`);
        }, 'Gravar na EEPROM');
      } else if (act === 'leituras') {
        Modal.open(`Telemetria em Tempo Real — #${id}`, `
          <div style="font-size: 12px; color: #334155;">
            <div style="margin-bottom: 12px;"><strong>Sensor:</strong> ${sensor?.tipo} (${sensor?.talhao})</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #F1F5F9; text-align: left;">
                  <th style="padding: 6px 10px;">Horário</th>
                  <th style="padding: 6px 10px;">Leitura</th>
                  <th style="padding: 6px 10px;">Bateria</th>
                  <th style="padding: 6px 10px;">Sinal RSSI</th>
                  <th style="padding: 6px 10px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 6px 10px;">14:35:00</td>
                  <td style="padding: 6px 10px; font-weight: 700; color: #047857;">${sensor?.vwc}</td>
                  <td style="padding: 6px 10px;">${sensor?.bateria || '95%'}</td>
                  <td style="padding: 6px 10px;">${sensor?.rssi || '-78 dBm'}</td>
                  <td style="padding: 6px 10px;"><span style="color:#047857; font-weight:700;">OK</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 6px 10px;">14:30:00</td>
                  <td style="padding: 6px 10px; font-weight: 700; color: #047857;">${sensor?.vwc}</td>
                  <td style="padding: 6px 10px;">${sensor?.bateria || '95%'}</td>
                  <td style="padding: 6px 10px;">${sensor?.rssi || '-79 dBm'}</td>
                  <td style="padding: 6px 10px;"><span style="color:#047857; font-weight:700;">OK</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        `, null, 'Fechar');
      } else if (act === 'vincular') {
        Modal.open(`Vincular Nó #${id} a Lote`, `
          <div style="font-size: 12px; color: #475569;">
            <label style="display: block; margin-bottom: 10px;">Selecione o Lote de Destino:
              <select id="select-vincular-lote" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
                <option value="LT-2026-084">#LT-2026-084 (Manga Tommy • Talhão C1)</option>
                <option value="LT-2026-079">#LT-2026-079 (Uva Vitória • Talhão A1)</option>
                <option value="LT-2026-068">#LT-2026-068 (Melão Amarelo • Talhão B2)</option>
              </select>
            </label>
          </div>
        `, () => {
          const lote = document.getElementById('select-vincular-lote')?.value;
          if (sensor) {
            sensor.talhao = `Vinculado a #${lote}`;
          }
          atualizarTabelaSensores();
          toast.success('Nó Vinculado', `Sensor #${id} atrelado à rastreabilidade do lote #${lote}.`);
        }, 'Vincular');
      } else if (act === 'ativar') {
        if (sensor) {
          sensor.status = 'Ativo';
          sensor.statusClass = 'ativo';
          sensor.categoria = 'solo';
        }
        atualizarTabelaSensores();
        toast.success('Sensor Ativado', `Nó #${id} promovido para ambiente produtivo de campo.`);
      }
    });
  });
}

export function setupSensoresAdminEvents() {
  // Sincronizar ESP32
  const btnSync = document.getElementById('btn-sync-esp32');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      toast.info('Sincronizando Mesh LoRaWAN', 'Enviando comando de ping para os 25 nós...');
      setTimeout(() => {
        toast.success('ESP32 Mesh Sincronizado', '25 nós responderam com telemetria e carga de bateria atualizadas.');
      }, 1000);
    });
  }

  // Exportar CSV
  const btnExport = document.getElementById('btn-export-leituras');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const csv = `id_sensor;tipo;talhao;status;leitura_atual;bateria;rssi_dbm;firmware\n` +
        _sensoresList.map(s => `${s.id};${s.tipo};"${s.talhao}";${s.status};"${s.vwc}";${s.bateria};${s.rssi};${s.firmware}`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensores_telemetria_raiz_agro_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download Concluído', 'Arquivo CSV de leituras e telemetria compilado.');
    });
  }

  // Provisionar Novo Sensor
  const btnProvisionar = document.getElementById('btn-provisionar-sensor');
  if (btnProvisionar) {
    btnProvisionar.addEventListener('click', () => {
      Modal.open('Provisionar Novo Sensor LoRaWAN (ESP32)', `
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Identificador (ID):
              <input type="text" id="novo-sensor-id" value="SNS-SL-0${_sensoresList.length + 1}" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Tipo do Sensor:
              <select id="novo-sensor-tipo" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
                <option value="FDR Solo Capacitivo">FDR Solo Capacitivo (30cm/60cm)</option>
                <option value="Microclima SHT31 (Ar)">Microclima SHT31 (Ar)</option>
                <option value="TDR Analítico Solo">TDR Analítico Solo</option>
              </select>
            </label>
          </div>
          <label>Talhão / Localização:
            <select id="novo-sensor-talhao" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="Talhão A1 (Uva Vitória)">Talhão A1 (Uva Vitória)</option>
              <option value="Talhão A2 (Uva Crimson)">Talhão A2 (Uva Crimson)</option>
              <option value="Talhão B2 (Melão Amarelo)">Talhão B2 (Melão Amarelo)</option>
              <option value="Talhão C1 (Manga Tommy)">Talhão C1 (Manga Tommy)</option>
              <option value="Bancada Testes">Bancada Testes ESP32</option>
            </select>
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Versão Firmware:
              <input type="text" id="novo-sensor-firmware" value="v4.2.1-prod" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>DevEUI LoRaWAN (Hex):
              <input type="text" value="A840411F1820" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px; font-family: monospace;">
            </label>
          </div>
        </div>
      `, () => {
        const id = document.getElementById('novo-sensor-id')?.value || `SNS-SL-0${_sensoresList.length + 1}`;
        const tipo = document.getElementById('novo-sensor-tipo')?.value || 'FDR Solo Capacitivo';
        const talhao = document.getElementById('novo-sensor-talhao')?.value || 'Talhão A1';
        const firmware = document.getElementById('novo-sensor-firmware')?.value || 'v4.2.1-prod';
        const isAr = tipo.includes('Ar');

        _sensoresList.unshift({
          id,
          tipo,
          status: 'Ativo',
          categoria: isAr ? 'microclima' : 'solo',
          talhao: `${talhao} • Novo nó provisionado`,
          vwc: isAr ? '27.8°C • 58.2% UR' : '45.0% VWC',
          bateria: '100%',
          rssi: '-75 dBm',
          statusClass: 'ativo',
          icone: isAr ? 'thermometer' : 'droplet',
          corIcone: isAr ? '#0284C7' : '#10B981',
          offset: 0.0,
          firmware
        });

        atualizarTabelaSensores();
        toast.success('Sensor Provisionado', `Nó #${id} cadastrado com sucesso e chave de sessão OTAA gerada.`);
      }, 'Provisionar Nó');
    });
  }

  // Campo de busca
  const inputBusca = document.getElementById('input-busca-sensor');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaSensor = e.target.value.trim();
      _paginaAtualSensores = 1;
      atualizarTabelaSensores();
    });
  }

  // Abas de filtro
  document.querySelectorAll('.tab-sensor-admin').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-sensor-admin').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#F8FAFC';
        t.style.color = t.dataset.cat === 'atencao' ? '#DC2626' : '#475569';
        t.style.border = t.dataset.cat === 'atencao' ? '1px solid #FCA5A5' : '1px solid #E2E8F0';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.color = '#FFFFFF';
      tab.style.border = 'none';
      tab.style.fontWeight = '700';

      _filtroCategoriaSensor = tab.dataset.cat || 'todos';
      _paginaAtualSensores = 1;
      atualizarTabelaSensores();
    });
  });

  // Filtro por talhão rápido
  document.querySelectorAll('.card-filtro-talhao-sensor').forEach(card => {
    card.addEventListener('click', () => {
      const talhao = card.dataset.talhao;
      _termoBuscaSensor = talhao;
      const input = document.getElementById('input-busca-sensor');
      if (input) input.value = talhao;
      _paginaAtualSensores = 1;
      atualizarTabelaSensores();
      toast.info('Filtro por Talhão', `Exibindo nós operacionais em: "${talhao}".`);
    });
  });

  // Paginação
  document.querySelectorAll('.btn-pag-sensor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-pag-sensor').forEach(b => {
        b.style.background = '#FFFFFF';
        b.style.color = '#0F172A';
        b.style.border = '1px solid #CBD5E1';
        b.style.fontWeight = '400';
      });
      btn.style.background = '#183D2E';
      btn.style.color = '#FFFFFF';
      btn.style.border = '1px solid #183D2E';
      btn.style.fontWeight = '700';

      _paginaAtualSensores = parseInt(btn.dataset.pag || '1', 10);
      atualizarTabelaSensores();
    });
  });

  const btnProx = document.querySelector('.btn-pag-sensor-prox');
  if (btnProx) {
    btnProx.addEventListener('click', () => {
      const total = getSensoresFiltrados().length;
      const maxPag = Math.ceil(total / _itensPorPagina);
      if (_paginaAtualSensores < maxPag) {
        _paginaAtualSensores++;
        atualizarTabelaSensores();
      }
    });
  }

  // Toggle Auto-calibração
  const checkAuto = document.getElementById('check-auto-calibracao');
  if (checkAuto) {
    checkAuto.addEventListener('change', (e) => {
      if (e.target.checked) {
        toast.success('Auto-calibração', 'Filtro dinâmico de rejeição por desvio padrão (3σ) reativado.');
      } else {
        toast.warning('Auto-calibração', 'Filtro desativado temporariamente.');
      }
    });
  }

  // Ações Rápidas de Infraestrutura
  document.querySelectorAll('.btn-infra-rapida').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const act = e.currentTarget.dataset.action;
      if (act === 'topologia') {
        window.location.hash = '#/rede-esp32';
      } else if (act === 'ota') {
        Modal.open('Deploy OTA v4.2.1 em Lote', `
          <div style="font-size: 12px; color: #475569;">
            <p>O pacote binário <code>firmware_raiz_v4.2.1.bin</code> será transmitido via multicast LoRaWAN para os 25 nós.</p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <strong>Tempo estimado:</strong> 4 minutos e 20 segundos.<br>
              <strong>Bateria mínima requerida:</strong> 60%.
            </div>
          </div>
        `, () => {
          toast.success('OTA Iniciado', 'Transmissão em lote iniciada nos canais 915.2 - 916.6 MHz.');
        }, 'Iniciar Atualização OTA');
      } else {
        window.location.hash = '#/auditoria';
      }
    });
  });

  vincularEventosSensores();
}
