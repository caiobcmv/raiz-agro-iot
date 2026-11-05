import { liveTelemetry } from '../live-telemetry.js';
/**
 * VIEW: REDE ESP32 & TOPOLOGIA - FIEL AO FIGMA (PERFIL ANALISTA)
 * Distribuição espacial dos nós LoRaWAN, topologia em malha e sinal RSSI/PDR 24h.
 */

import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderRedeEsp32() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info">
          <span class="analista-dot-pulse"></span>
          <span>Gateway Petrolina-04 Conectado • US915 (Canal 915 MHz) • 24 Sensores Ativos</span>
          <span style="color: #64748B; font-size: 11px; font-weight: 400;">Sincronizado há 2 min</span>
        </div>
        <div class="analista-subbar-actions">
          <button class="btn-analista-sync" id="btn-sync-rede">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Sincronizar ThingSpeak</span>
          </button>
          <button class="btn-analista-export" id="btn-export-csv">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar (CSV)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs da Rede ESP32 -->
      <div class="kpi-grid-4col">
        <!-- KPI 1 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">DISPONIBILIDADE DA REDE</span>
            <span class="kpi-badge green">Excelente</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="rede-disponibilidade">96%</span>
            <span class="kpi-sub-num" data-kpi="rede-nos-ativos">24 de 25 nós ativos</span>
          </div>
          <div class="kpi-bottom-row">
            <span>Latência média: <strong>118 ms</strong></span>
            <span style="color: #059669; font-weight: 600;">Mesh OK</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SENSORES POR AMBIENTE</span>
            <span style="color: #0284C7;"><i data-lucide="split" style="width: 15px; height: 15px;"></i></span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="rede-sensores-amb">24</span>
            <span class="kpi-sub-num">Instalados em campo</span>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #047857; font-weight: 600;" data-kpi="rede-amb-detalhes">16 Solo (FDR) • 8 Ar (Microclima)</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">INGESTÃO THINGSPEAK</span>
            <span class="kpi-badge blue">Estável</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #0284C7;">99.8%</span>
            <span class="kpi-sub-num">Taxa de Sucesso</span>
          </div>
          <div class="kpi-bottom-row">
            <span>Cadência de lote: <strong>300s (5 min)</strong></span>
            <span>Batch Write: <strong>200</strong></span>
          </div>
        </div>

        <!-- KPI 4 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">LEITURAS REJEITADAS</span>
            <span class="kpi-badge yellow">Atenção Leve</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #D97706;">2</span>
            <span class="kpi-sub-num">Descartes hoje</span>
          </div>
          <div class="kpi-bottom-row">
            <span>1 outlier térmico, 1 sinal anl.</span>
            <span style="color: #059669; font-weight: 600;">Auto-filtro</span>
          </div>
        </div>
      </div>

      <!-- Seção do Meio (2 Colunas): Topologia Espacial (65%) + Inventário Técnico (35%) -->
      <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Coluna Esquerda: Topologia Espacial dos Nós LoRaWAN -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div class="chart-header-row">
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="share-2" style="width: 18px; height: 18px; color: #10B981;"></i>
                Topologia Espacial dos Nós LoRaWAN
                <span style="font-size: 11px; color: #64748B; font-weight: 400;">Petrolina 45.0 ha</span>
              </h3>
              <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
                Distribuição georreferenciada dos nós ESP32 e links de radiofrequência ao Gateway
              </p>
            </div>

            <div class="map-filter-tabs">
              <button class="map-tab-btn active" data-topo-filter="todos">Todos (24)</button>
              <button class="map-tab-btn" data-topo-filter="solo">Solo (16)</button>
              <button class="map-tab-btn" data-topo-filter="ar">Ar (8)</button>
            </div>
          </div>

          <!-- Mapa Escuro de Topologia com Enlaces Radiais SVG -->
          <div style="position: relative; width: 100%; height: 350px; background: #0B192C; border-radius: 12px; overflow: hidden; border: 1px solid #1E293B;">
            <!-- Fundo de Mapa Geográfico Estilizado (Cartografia Noturna) -->
            <svg viewBox="0 0 700 350" style="width: 100%; height: 100%;" preserveAspectRatio="none">
              <defs>
                <!-- Grade Geométrica de Fundo -->
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8"/>
                </pattern>
                <!-- Gradiente de Alcance LoRa -->
                <radialGradient id="lora-coverage" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.25"/>
                  <stop offset="60%" stop-color="#10B981" stop-opacity="0.08"/>
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0"/>
                </radialGradient>
              </defs>

              <rect width="100%" height="100%" fill="#0F172A"/>
              <rect width="100%" height="100%" fill="url(#grid-pattern)"/>

              <!-- Círculos de Alcance do Gateway -->
              <circle cx="350" cy="175" r="140" fill="url(#lora-coverage)"/>
              <circle cx="350" cy="175" r="90" fill="none" stroke="#10B981" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>
              <circle cx="350" cy="175" r="140" fill="none" stroke="#10B981" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>

              <!-- Linhas de Enlace de Radiofrequência do Gateway aos Nós -->
              <!-- Link N-01 -->
              <line x1="350" y1="175" x2="240" y2="150" stroke="#10B981" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
              <!-- Link N-02 -->
              <line x1="350" y1="175" x2="490" y2="120" stroke="#0284C7" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
              <!-- Link N-03 (Atenção) -->
              <line x1="350" y1="175" x2="520" y2="210" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
              <!-- Link N-04 -->
              <line x1="350" y1="175" x2="260" y2="240" stroke="#0284C7" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
              <!-- Link N-05 (Rejeição) -->
              <line x1="350" y1="175" x2="160" y2="200" stroke="#EF4444" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
            </svg>

            <!-- Talhões Identificados no Mapa -->
            <div style="position: absolute; top: 18px; left: 18px; display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 10px; background: rgba(15, 23, 42, 0.85); color: #38BDF8; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.3);">
                • Talhão A1: Uva Vitória (12.4 ha)
              </span>
              <span style="font-size: 10px; background: rgba(15, 23, 42, 0.85); color: #34D399; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(52, 211, 153, 0.3);">
                • Talhão B2: Uva Thompson (18.1 ha)
              </span>
              <span style="font-size: 10px; background: rgba(15, 23, 42, 0.85); color: #A78BFA; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(167, 139, 250, 0.3);">
                • Talhão C1/C2: Manga (14.5 ha)
              </span>
            </div>

            <!-- Gateway Central Marker -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; z-index: 15; cursor: pointer;" id="topo-gateway-marker" title="Gateway Central Petrolina-04">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #10B981; border: 3px solid #FFFFFF; display: flex; align-items: center; justify-content: center; color: #FFFFFF; box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);">
                <i data-lucide="radio" style="width: 20px; height: 20px;"></i>
              </div>
              <span style="font-size: 9px; font-weight: 800; color: #FFFFFF; background: #0F172A; padding: 2px 6px; border-radius: 4px; margin-top: 4px; border: 1px solid #334155;">
                GATEWAY PETROLINA-04
              </span>
            </div>

            <!-- Nós Espalhados com Rótulos -->
            <!-- N-01 • Solo -->
            <div style="position: absolute; top: 40%; left: 32%; z-index: 10; cursor: pointer;" class="topo-node-item" data-node="N-01" title="N-01 • Solo (-74 dBm)">
              <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #10B981; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
                N-01 • Solo
              </div>
            </div>

            <!-- N-02 • Ar -->
            <div style="position: absolute; top: 32%; left: 68%; z-index: 10; cursor: pointer;" class="topo-node-item" data-node="N-02" title="N-02 • Ar (-79 dBm)">
              <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #0284C7; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
                N-02 • Ar
              </div>
            </div>

            <!-- N-03 • Atenção -->
            <div style="position: absolute; top: 58%; left: 72%; z-index: 10; cursor: pointer;" class="topo-node-item" data-node="N-03" title="N-03 • Atenção (-89 dBm)">
              <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #F59E0B; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #F59E0B;"></span>
                N-03 • Atenção
              </div>
            </div>

            <!-- N-04 • Solo -->
            <div style="position: absolute; top: 66%; left: 35%; z-index: 10; cursor: pointer;" class="topo-node-item" data-node="N-04" title="N-04 • Solo (-72 dBm)">
              <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #0284C7; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
                N-04 • Solo
              </div>
            </div>

            <!-- N-05 • Rejeição -->
            <div style="position: absolute; top: 55%; left: 20%; z-index: 10; cursor: pointer;" class="topo-node-item" data-node="N-05" title="N-05 • Rejeição (-95 dBm)">
              <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #EF4444; color: #FFFFFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #EF4444;"></span>
                N-05 • Rejeição
              </div>
            </div>
          </div>

          <!-- Legenda da Topologia -->
          <div class="map-legend-row" style="margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                Nós Ativos (22 nós &gt; -85 dBm)
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B;"></span>
                Atenção / Limiar (2 nós)
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #183D2E; border: 1px solid #10B981;"></span>
                Gateway US915 Concentrador
              </span>
            </div>
            <span style="color: #64748B; font-size: 10px; font-weight: 600;">
              Banda US915 • SF7 • BW 125 kHz
            </span>
          </div>
        </div>

        <!-- Coluna Direita: Inventário Técnico de Sensores (35%) -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div class="chart-header-row">
            <div>
              <h3 style="font-size: 15px; font-weight: 700; color: #0F172A;">
                Inventário Técnico de Sensores
              </h3>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Tabela 'sensor' • Lotes vinculados
              </p>
            </div>
            <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
              24 Ativos
            </span>
          </div>

          <!-- Campo de Busca -->
          <input type="text" id="input-busca-tecnica" placeholder="Buscar sensor, lote ou channel_id..." style="width: 100%; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-size: 12px; margin-bottom: 12px; outline: none;">

          <!-- Lista de Sensores Técnicos -->
          <div style="display: flex; flex-direction: column; gap: 10px; max-height: 290px; overflow-y: auto; padding-right: 4px;">
            <!-- Sensor 1 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;" class="card-tecnico-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 700; color: #0F172A; font-size: 12px;">#SNS-SL-01</span>
                <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Ativo</span>
              </div>
              <div style="font-size: 11px; color: #334155; font-weight: 600;">#01 Talhão A1 • Uva Vitória</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 2px;">id_lote: 1</div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px; border-top: 1px solid #EDF2F7; padding-top: 4px;">
                <span>Ambiente: <strong>Solo (FDR)</strong></span>
                <span style="font-family: monospace; color: #0284C7;">channel_id: 248901</span>
              </div>
            </div>

            <!-- Sensor 2 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;" class="card-tecnico-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 700; color: #0F172A; font-size: 12px;">#SNS-AR-02</span>
                <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Ativo</span>
              </div>
              <div style="font-size: 11px; color: #334155; font-weight: 600;">#02 Talhão A1 • Microclima</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 2px;">id_lote: 1</div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px; border-top: 1px solid #EDF2F7; padding-top: 4px;">
                <span>Ambiente: <strong>Ar (Temp/Umid)</strong></span>
                <span style="font-family: monospace; color: #0284C7;">channel_id: 248902</span>
              </div>
            </div>

            <!-- Sensor 3 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;" class="card-tecnico-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 700; color: #0F172A; font-size: 12px;">#SNS-SL-03</span>
                <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Ativo</span>
              </div>
              <div style="font-size: 11px; color: #334155; font-weight: 600;">#03 Talhão B2 • Uva Thompson</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 2px;">id_lote: 2</div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 6px; border-top: 1px solid #EDF2F7; padding-top: 4px;">
                <span>Ambiente: <strong>Solo (FDR)</strong></span>
                <span style="font-family: monospace; color: #0284C7;">channel_id: 248905</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção Inferior: Histórico de Transmissão & Sinal 24h -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="radio-tower" style="width: 18px; height: 18px; color: #10B981;"></i>
              Histórico de Transmissão & Sinal 24h
              <span style="font-size: 11px; color: #059669; font-weight: 600; background: #ECFDF5; padding: 2px 8px; border-radius: 4px;">Média Global do Enlace</span>
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Variação do RSSI médio (-dBm) e integridade dos pacotes transmitidos por amostragem horária
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 16px; font-size: 11px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
              RSSI Médio (-81 dBm)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
              Integridade PDR (99.8%)
            </span>
          </div>
        </div>

        <!-- Gráfico SVG Área Dupla (RSSI vs PDR) -->
        <div style="position: relative; width: 100%; height: 200px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 10px;">
          <svg viewBox="0 0 800 180" style="width: 100%; height: 100%;" preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad-rssi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10B981" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/>
              </linearGradient>
              <linearGradient id="grad-pdr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0284C7" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#0284C7" stop-opacity="0.01"/>
              </linearGradient>
            </defs>

            <!-- Linhas de Grade -->
            <line x1="0" y1="45" x2="800" y2="45" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
            <line x1="0" y1="90" x2="800" y2="90" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
            <line x1="0" y1="135" x2="800" y2="135" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>

            <!-- Curva RSSI (Verde) -->
            <path d="M 0,110 C 120,105 240,95 360,75 C 480,55 520,70 640,65 C 700,60 750,75 800,80 L 800,175 L 0,175 Z" fill="url(#grad-rssi)"/>
            <path d="M 0,110 C 120,105 240,95 360,75 C 480,55 520,70 640,65 C 700,60 750,75 800,80" fill="none" stroke="#10B981" stroke-width="2.8"/>

            <!-- Curva PDR Integridade (Azul) -->
            <path d="M 0,140 C 120,135 240,130 360,110 C 480,90 520,105 640,95 C 720,85 760,100 800,105 L 800,175 L 0,175 Z" fill="url(#grad-pdr)"/>
            <path d="M 0,140 C 120,135 240,130 360,110 C 480,90 520,105 640,95 C 720,85 760,100 800,105" fill="none" stroke="#0284C7" stroke-width="2.5"/>
          </svg>

          <!-- Marcadores de Tempo X -->
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 4px; padding: 0 10px;">
            <span>00:00</span>
            <span>04:00</span>
            <span style="color: #047857; font-weight: 600;">08:00 (Irrigação)</span>
            <span style="color: #0284C7; font-weight: 600;">12:00 (Pico Solar)</span>
            <span>16:00</span>
            <span>20:00</span>
            <span style="color: #0F172A; font-weight: 700;">Agora (22:45)</span>
          </div>
        </div>

        <!-- 3 KPIs no Rodapé do Sinal -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">MARGEM DE SINAL</div>
            <div style="font-size: 18px; font-weight: 800; color: #047857; margin-top: 2px;">+19.2 dBm</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Estabilidade excelente</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">PERDA DE PACOTES</div>
            <div style="font-size: 18px; font-weight: 800; color: #0284C7; margin-top: 2px;">0.18%</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Tolerância máxima: 1.5%</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">THROUGHPUT MÉDIO</div>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">5,47 kbps</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Alocação 100% nominal</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupRedeEsp32Events() {
  liveTelemetry.start();

  // Sincronizar ThingSpeak
  const btnSync = document.getElementById('btn-sync-rede');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      toast.info('Sincronização LoRaWAN', 'Consultando gateway concentrador Petrolina-04 na frequência 915 MHz...');
      setTimeout(() => {
        toast.success('Rede Sincronizada', '24 nós responderam com ACK em menos de 120ms.');
      }, 900);
    });
  }

  // Exportar CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      toast.success('Relatório Gerado', 'Arquivo topologia_enlaces_esp32.csv baixado com sucesso.');
    });
  }

  // Filtros de Nós na Topologia
  document.querySelectorAll('[data-topo-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-topo-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const f = e.currentTarget.dataset.topoFilter;
      toast.info('Filtro de Topologia', `Exibindo nós da categoria: ${f.toUpperCase()}`);
    });
  });

  // Clique nos Nós da Topologia
  document.querySelectorAll('.topo-node-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const node = e.currentTarget.dataset.node;
      Modal.open(`Diagnóstico Técnico — ${node}`, `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#64748B;">Potência de Sinal (RSSI)</div>
            <div style="font-size:16px; font-weight:800; color:#059669;">-81 dBm</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#64748B;">Relação Sinal/Ruído (SNR)</div>
            <div style="font-size:16px; font-weight:800; color:#0284C7;">+9.5 dB</div>
          </div>
        </div>
        <div style="font-size:12px; color:#475569; line-height:1.6;">
          <strong>Hardware:</strong> ESP32-WROOM-32 com transceptor SX1262 LoRa<br>
          <strong>Spreading Factor:</strong> SF7 • Largura de banda: 125 kHz<br>
          <strong>Pacotes Transmitidos (24h):</strong> 288 (1 a cada 5 min)<br>
          <strong>Taxa de Perda:</strong> 0.0%
        </div>
      `, () => {
        toast.success('Teste de Enlace', `Comando ECHO enviado para ${node}. Tempo de resposta: 94ms.`);
      }, 'Enviar Teste Ping LoRa');
    });
  });

  // Busca Técnica
  const inputBusca = document.getElementById('input-busca-tecnica');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      const t = e.target.value.toLowerCase();
      document.querySelectorAll('.card-tecnico-item').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(t) ? 'block' : 'none';
      });
    });
  }
}

