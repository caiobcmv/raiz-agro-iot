import { liveTelemetry } from '../live-telemetry.js';
/**
 * VIEW: SENSORES & TELEMETRIA DE CAMPO - FIEL AO FIGMA (PERFIL ANALISTA)
 * Suporte a correlação multidimensional, canais ThingSpeak e auditoria de hardware.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderSensores() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 4 KPIs Técnicos do Parque de Sensores -->
      <div class="kpi-grid-4col">
        <!-- KPI 1 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">SENSORES ATIVOS (SENSOR)</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: #0284C7;">
              <i data-lucide="radio" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="sensores-ativos-ratio">24/26</span>
            <span class="kpi-sub-num" style="color: #059669; font-weight: 600;">status = 'ativo'</span>
          </div>
          <!-- Barra segmentada de 7 blocos (6 verdes + 1 azul-claro) -->
          <div style="display: flex; gap: 4px; margin: 8px 0;">
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #10B981;"></div>
            <div style="flex: 1; height: 6px; border-radius: 3px; background: #38BDF8;"></div>
          </div>
          <div class="kpi-bottom-row">
            <span style="display: inline-flex; align-items: center; gap: 4px; color: #059669; font-weight: 700;">
              <i data-lucide="check-circle-2" style="width: 13px; height: 13px; color: #059669;"></i>
              <span data-kpi="sensores-detalhe-amb">12 Ar • 12 Solo</span>
            </span>
            <span style="color: #64748B;" data-kpi="sensores-inativos">2 inativos</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">UMIDADE (LEITURA_CLIMATICA)</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #10B981;">
              <i data-lucide="droplet" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="leitura-umid-solo">46,8%</span>
            <span class="kpi-sub-num">umidade_solo méd.</span>
          </div>
          <!-- Sparkline suave ascendente terminando num ponto verde -->
          <div style="height: 18px; margin: 8px 0; width: 100%;">
            <svg viewBox="0 0 120 18" style="width: 100%; height: 100%;" preserveAspectRatio="none">
              <path d="M 0,14 Q 35,13 65,9 T 114,4" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
              <circle cx="114" cy="4" r="3" fill="#10B981"/>
            </svg>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #047857; font-weight: 700;">● Solo: 46.8%</span>
            <span style="color: #64748B;">Ar: 61.2% (umidade)</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">TEMPERATURA (AR & SOLO)</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
              <i data-lucide="thermometer" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" data-kpi="leitura-temp-ar">+27,4°C</span>
            <span class="kpi-sub-num">temperatura (ar)</span>
          </div>
          <!-- Barra azul (trecho escuro ~45% + trecho claro) -->
          <div style="height: 6px; width: 100%; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin: 10px 0;">
            <div style="width: 45%; height: 100%; background: #0284C7;"></div>
            <div style="width: 35%; height: 100%; background: #93C5FD;"></div>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #475569;">temperatura_solo: <strong style="color: #0F172A;" data-kpi="leitura-temp-solo">24.1°C</strong></span>
            <span style="color: #0284C7; font-weight: 600;">Delta: 3.3°C</span>
          </div>
        </div>

        <!-- KPI 4 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">INGESTÃO & REJEIÇÃO</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
              <i data-lucide="cloud-check" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #059669;">99.8%</span>
            <span class="kpi-sub-num">taxa sucesso</span>
          </div>
          <!-- Caixinha com borda azul-clara -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 6px; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin: 8px 0;">
            <span style="color: #059669; font-weight: 700;">ThingSpeak API</span>
            <span style="color: #64748B; font-size: 10px;">entry_id verificado</span>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #475569;">rejeitadas: <strong style="color: #0F172A;">3 hoje</strong></span>
            <span style="color: #D97706; font-weight: 600;">alertas ativos: 2</span>
          </div>
        </div>
      </div>

      <!-- Card Correlação Multidimensional: Leitura Climática -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A;">
              Correlação Multidimensional: Leitura Climática
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Série temporal de leitura_climatica: temperatura vs umidade e temperatura_solo vs umidade_solo
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <select id="select-correlacao-lote" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #1E293B; cursor: pointer;">
              <option value="lote1">Lote 1 • Uva Niágara (Channel 248901)</option>
              <option value="lote2">Lote 2 • Uva Crimson (Channel 248902)</option>
              <option value="lote3">Lote 3 • Uva Thompson (Channel 248903)</option>
            </select>
            <span style="background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 600; padding: 6px 10px; border-radius: 6px;">24h (ThingSpeak)</span>
          </div>
        </div>

        <!-- Legenda do Gráfico -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 18px; font-size: 11px; color: #64748B; flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #047857;"></span>
              umidade_solo (%)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
              temperatura (°C - Ar)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #0F766E;"></span>
              umidade (%)
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94A3B8; margin-top: 6px;">
            <span style="width: 18px; height: 0px; border-top: 2px dashed #94A3B8; display: inline-block;"></span>
            <span>Limiar Alerta Preditivo (risco &gt; 0.70)</span>
          </div>
        </div>

        <!-- Painel do Gráfico sem borda -->
        <div style="position: relative; width: 100%; background: #F8FAFC; border-radius: 12px; overflow: hidden; padding: 16px 16px 12px 16px;">
          <div style="position: relative; width: 100%; height: 260px;">
            <svg viewBox="0 0 860 220" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="grad-umidade-solo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/>
                </linearGradient>
              </defs>

              <!-- Linhas de Grade e Eixo Y -->
              <!-- Linha 55% VWC / 35°C -->
              <line x1="110" y1="55" x2="700" y2="55" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="12" y="58" fill="#64748B" font-size="10" font-weight="500">55% VWC / 35°C</text>
              <text x="710" y="58" fill="#047857" font-size="10" font-weight="600">Capacidade de Campo (52%)</text>

              <!-- Linha 40% VWC / 28°C -->
              <line x1="110" y1="110" x2="700" y2="110" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="12" y="113" fill="#64748B" font-size="10" font-weight="500">40% VWC / 28°C</text>
              <text x="710" y="113" fill="#64748B" font-size="10" font-weight="500">Faixa Ideal Manejo</text>

              <!-- Linha 25% VWC / 20°C -->
              <line x1="110" y1="165" x2="700" y2="165" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="12" y="168" fill="#64748B" font-size="10" font-weight="500">25% VWC / 20°C</text>
              <text x="710" y="168" fill="#DC2626" font-size="10" font-weight="600">Ponto de Murcha Permanente (28%)</text>

              <!-- Curva Umidade (Verde) com Área Degradê -->
              <path d="M 110,85 C 200,90 280,135 380,135 C 480,135 560,75 640,75 L 700,75 L 700,210 L 110,210 Z" fill="url(#grad-umidade-solo)"/>
              <path d="M 110,85 C 200,90 280,135 380,135 C 480,135 560,75 640,75 L 700,75" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round"/>

              <!-- Marcadores da Curva Verde -->
              <circle cx="280" cy="118" r="3.5" fill="#047857" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="480" cy="115" r="3.5" fill="#047857" stroke="#FFFFFF" stroke-width="1.5"/>
              <circle cx="700" cy="75" r="5" fill="#047857" stroke="#FFFFFF" stroke-width="2"/>

              <!-- Curva Temperatura (Azul) -->
              <path d="M 110,170 C 220,165 340,140 450,55 C 490,25 540,65 590,130 C 630,160 670,145 700,135" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round"/>

              <!-- Marcador do Pico Temperatura -->
              <circle cx="485" cy="46" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>

              <!-- Tooltip Escuro: Pico 31.2°C às 13:40 -->
              <g>
                <rect x="420" y="12" width="130" height="24" rx="4" fill="#0F172A"/>
                <polygon points="485,36 480,41 490,41" fill="#0F172A"/>
                <text x="485" y="27" fill="#FFFFFF" font-size="10" font-weight="700" text-anchor="middle" id="svg-ponto-temperatura-texto">Pico 31.2°C às 13:40</text>
              </g>
            </svg>
          </div>

          <!-- Eixo X com Labels de Tempo -->
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 6px; padding: 0 100px 0 110px;">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span style="color: #0284C7; font-weight: 600;">12:00 (Pico Irradiação)</span>
            <span>16:00</span>
            <span>20:00</span>
            <span style="color: #047857; font-weight: 700;">Agora (14:30)</span>
          </div>
        </div>

        <!-- 3 Mini Cards no Rodapé do Gráfico -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;">
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #0284C7; border: 1px solid #BAE6FD;">
              <i data-lucide="thermometer" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #0F172A;">24.1°C / 27.4°C</div>
              <div style="font-size: 10px; color: #64748B;">temperatura_solo / ar</div>
            </div>
          </div>

          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #059669; border: 1px solid #BAE6FD;">
              <i data-lucide="waves" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #0F172A;">46.8% / 61.2%</div>
              <div style="font-size: 10px; color: #64748B;">umidade_solo / ar</div>
            </div>
          </div>

          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #0F172A; border: 1px solid #BAE6FD;">
              <i data-lucide="cloud-check" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #0F172A;">entry_id #14.892</div>
              <div style="font-size: 10px; color: #64748B;">ThingSpeak feed verificado</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Inventário de Sensores (Tabela sensor & lote) -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="layers" style="width: 18px; height: 18px; color: #10B981;"></i>
              Inventário de Sensores (Tabela sensor &amp; lote)
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Relação de nós cadastrados, canais ThingSpeak e últimas medições em leitura_climatica
            </p>
          </div>
          <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">
            ● 26 sensores cadastrados
          </span>
        </div>

        <!-- Barra de Busca -->
        <div style="position: relative; margin-bottom: 14px;">
          <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
          <input type="text" id="input-busca-sensores" placeholder="Filtrar por sensor.nome, lote, ambiente ('ar' / 'solo') ou status…" style="width: 100%; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px 8px 36px; font-size: 12px; outline: none; transition: border-color 0.2s;">
        </div>

        <!-- Tabela Estilizada -->
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 2px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 14px; font-weight: 700;">ID / NOME (SENSOR)</th>
                <th style="padding: 10px 14px; font-weight: 700;">TIPO / AMBIENTE</th>
                <th style="padding: 10px 14px; font-weight: 700;">LOTE / FRUTA</th>
                <th style="padding: 10px 14px; font-weight: 700;">CHANNEL THINGSPEAK</th>
                <th style="padding: 10px 14px; font-weight: 700;">ÚLTIMA LEITURA (LEITURA_CLIMATICA)</th>
                <th style="padding: 10px 14px; text-align: center; font-weight: 700;">STATUS</th>
              </tr>
            </thead>
            <tbody id="tabela-sensores-body">
              <!-- Item 1 -->
              <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">SNS-SL-001</div>
                  <div style="font-size: 11px; color: #64748B;">id_sensor: 1 • Sonda FDR Solo A1</div>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="sprout" style="width: 13px; height: 13px;"></i>
                    FDR Capacitivo • solo
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">Lote 1 (Talhão A1)</div>
                  <div style="font-size: 11px; color: #64748B;">Uva Niágara</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0284C7; font-family: monospace;">Ch 248901</div>
                  <div style="font-size: 11px; color: #64748B;">entry_id: #14.892</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #047857;">48.2% solo • 24.5°C solo</div>
                  <div style="font-size: 11px; color: #64748B;">28.1°C ar • 59% umid.</div>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <span style="background: #ECFDF5; color: #047857; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">ativo</span>
                </td>
              </tr>

              <!-- Item 2 -->
              <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">SNS-AR-002</div>
                  <div style="font-size: 11px; color: #64748B;">id_sensor: 2 • Estação Microclima A1</div>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="cloud" style="width: 13px; height: 13px;"></i>
                    DHT22/SHT31 • ar
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600; color: #0F172A;">Lote 1 (Talhão A1)</div>
                  <div style="font-size: 11px; color: #64748B;">Uva Niágara</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0284C7; font-family: monospace;">Ch 248901</div>
                  <div style="font-size: 11px; color: #64748B;">entry_id: #14.892</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="color: #0F172A;"><strong style="color: #0284C7;">28.1°C</strong> ar • <strong style="color: #047857;">59.4% umid.</strong></div>
                  <div style="font-size: 11px; color: #64748B;">temp_solo vinculada: 24.5°C</div>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <span style="background: #ECFDF5; color: #047857; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">ativo</span>
                </td>
              </tr>

              <!-- Item 3 -->
              <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">SNS-SL-003</div>
                  <div style="font-size: 11px; color: #64748B;">id_sensor: 3 • Sonda FDR Solo A2</div>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="background: #ECFDF5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="sprout" style="width: 13px; height: 13px;"></i>
                    TDR Analítico • solo
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">Lote 2 (Talhão A2)</div>
                  <div style="font-size: 11px; color: #64748B;">Uva Crimson</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0284C7; font-family: monospace;">Ch 248902</div>
                  <div style="font-size: 11px; color: #64748B;">entry_id: #14.889</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #047857;">37.8% solo • 25.8°C solo</div>
                  <div style="font-size: 11px; color: #64748B;">31.5°C ar • 52% umid.</div>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <span style="background: #ECFDF5; color: #047857; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">ativo</span>
                </td>
              </tr>

              <!-- Item 4 -->
              <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" class="tr-sensor-item">
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">SNS-SL-025</div>
                  <div style="font-size: 11px; color: #64748B;">id_sensor: 25 • Sonda Bancada Teste</div>
                </td>
                <td style="padding: 12px 14px;">
                  <span style="background: #FEF3C7; color: #B45309; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
                    <i data-lucide="sprout" style="width: 13px; height: 13px;"></i>
                    FDR Calibração • solo
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #0F172A;">Lote 3 (Talhão B1)</div>
                  <div style="font-size: 11px; color: #64748B;">Thompson Seedless</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 700; color: #64748B; font-family: monospace;">Ch 248903</div>
                  <div style="font-size: 11px; color: #64748B;">entry_id: #11.204</div>
                </td>
                <td style="padding: 12px 14px;">
                  <div style="font-weight: 600; color: #64748B;">-- / --</div>
                  <div style="font-size: 11px; color: #D97706;">Sinal pausado para calibração</div>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <span style="background: #F1F5F9; color: #64748B; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">inativo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 11px; color: #64748B;">
          <span>Exibindo 1-4 de 24 sondas</span>
          <div style="display: flex; gap: 4px;">
            <button class="map-tab-btn" id="btn-pag-ant" style="border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Anterior</button>
            <button class="map-tab-btn active" style="border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">1</button>
            <button class="map-tab-btn" style="border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">2</button>
            <button class="map-tab-btn" id="btn-pag-prox" style="border: 1px solid #CBD5E1; background: #FFFFFF; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Próximo</button>
          </div>
        </div>
      </div>

      <!-- Grid Inferior (2 Colunas): Alertas Preditivos & Auditoria -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Card Esquerda: Alertas Preditivos por Sensor -->
        <div class="analista-chart-box">
          <div class="chart-header-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="pie-chart" style="width: 16px; height: 16px; color: #10B981;"></i>
                Alertas Preditivos por Sensor
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Classificação probabilística de estresse hídrico e patológico
              </p>
            </div>
            <span style="font-family: monospace; font-size: 10px; background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px;">alertas_preditivos</span>
          </div>

          <div style="display: flex; align-items: center; gap: 24px; margin: 16px 0;">
            <!-- Donut SVG 92% Risco Baixo -->
            <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <!-- Base track -->
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="3.8"/>
                <!-- Verde: 92% -->
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="3.8" stroke-dasharray="92, 100" stroke-dashoffset="0"/>
                <!-- Azul: ~6% -->
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0284C7" stroke-width="3.8" stroke-dasharray="6, 100" stroke-dashoffset="-92"/>
                <!-- Vermelho: ~2% -->
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="3.8" stroke-dasharray="2, 100" stroke-dashoffset="-98"/>
              </svg>
              <div class="donut-center-wrap">
                <div class="donut-center-val">92%</div>
                <div class="donut-center-sub">RISCO BAIXO (&lt; 0.35)</div>
              </div>
            </div>

            <!-- Lista de Severidade -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                  Severidade 'baixa' (prob &lt; 0.35)
                </span>
                <strong>22 sensores</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7;"></span>
                  Severidade 'moderada' (0.35 - 0.70)
                </span>
                <strong>2 sensores</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: #F8FAFC; padding: 6px 10px; border-radius: 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></span>
                  Severidade 'alta' (prob &gt; 0.70)
                </span>
                <strong>0 sensores</strong>
              </div>
            </div>
          </div>

          <!-- Card de Corte Predição Ativo -->
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <div>
              <span style="font-weight: 700; color: #15803D; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="triangle-alert" style="width: 14px; height: 14px; color: #0284C7;"></i>
                Corte Predição Ativo
              </span>
              <div style="color: #475569; font-size: 10px; margin-top: 2px;">Sensor #4 • prob_risco = 0.58 • Lote 2</div>
            </div>
            <span style="background: #DBEAFE; color: #1D4ED8; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Moderada</span>
          </div>
        </div>

        <!-- Card Direita: Auditoria & Leituras Rejeitadas -->
        <div class="analista-chart-box">
          <div class="chart-header-row">
            <div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="clipboard-x" style="width: 16px; height: 16px; color: #EF4444;"></i>
                Auditoria &amp; Leituras Rejeitadas
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Descartes por inconsistência física ou falha de canal ThingSpeak
              </p>
            </div>
            <span style="font-size: 11px; background: #ECFDF5; color: #047857; font-weight: 600; padding: 3px 8px; border-radius: 6px;">● leitura_rejeitada</span>
          </div>

          <!-- Item Rejeitado 1 -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px;">
              <span style="font-weight: 700; color: #DC2626; font-family: monospace; display: flex; align-items: center; gap: 5px;">
                <i data-lucide="circle-alert" style="width: 13px; height: 13px; color: #DC2626;"></i>
                temperatura_bruta &gt; 60°C
              </span>
              <span style="color: #64748B; font-size: 10px;">Hoje 14:12</span>
            </div>
            <div style="font-size: 11px; color: #334155; margin-left: 18px;">
              Motivo: Outlier de sensor térmico (78.4°C)
            </div>
            <div style="font-size: 10px; color: #64748B; margin-top: 3px; margin-left: 18px; display: flex; justify-content: space-between;">
              <span>Sensor #02 • Ar • Ch 248901</span>
              <span>umidade_bruta: 12%</span>
            </div>
          </div>

          <!-- Item Rejeitado 2 -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px;">
              <span style="font-weight: 700; color: #DC2626; font-family: monospace;">
                umidade_bruta &lt; 0%
              </span>
              <span style="color: #64748B; font-size: 10px;">Ontem 22:45</span>
            </div>
            <div style="font-size: 11px; color: #334155;">
              Motivo: Leitura analógica corrompida (-4.2%)
            </div>
            <div style="font-size: 10px; color: #64748B; margin-top: 3px; display: flex; justify-content: space-between;">
              <span>Sensor #14 • Solo • Ch 248905</span>
              <span>temp_bruta: 23.1°C</span>
            </div>
          </div>

          <!-- Item 3: Alertas Preditivos Ativos -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 2px;">
              <span style="font-weight: 600; color: #0F172A;">Alertas Preditivos Ativos</span>
              <span style="font-weight: 700; color: #0284C7;">1 corte ativo</span>
            </div>
            <div style="font-size: 11px; color: #475569;">
              Corte: probabilidade_risco &gt;= 0.50 • Severidade moderada
            </div>
          </div>

          <!-- Botão Verde Médio -->
          <button class="btn-log-ingestao" id="btn-log-ingestao">
            <div>
              <div style="font-weight: 700; font-size: 12px; color: #FFFFFF;">Log de Ingestão ThingSpeak</div>
              <div style="font-size: 10px; color: rgba(255, 255, 255, 0.85); margin-top: 1px;">Ver histórico completo de descartes</div>
            </div>
            <i data-lucide="arrow-right" style="width: 16px; height: 16px; color: #FFFFFF;"></i>
          </button>
        </div>
      </div>

      <!-- Rodapé da página -->
      <div style="text-align: center; margin-top: 24px; margin-bottom: 8px; font-size: 11px; color: #94A3B8;">
        Raíz - Plataforma de Inteligência Agro IoT &amp; Logística de Exportação • Conectado via LoRaWAN &amp; ESP32 • Vale do São Francisco
      </div>
    </div>
  `;
}

export function setupSensoresEvents() {
  liveTelemetry.start();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Filtro de Busca na Tabela de Sensores
  const inputBusca = document.getElementById('input-busca-sensores');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      const termo = e.target.value.toLowerCase();
      document.querySelectorAll('.tr-sensor-item').forEach(tr => {
        const text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(termo) ? '' : 'none';
      });
    });
  }

  // Interação no Seletor de Lote da Correlação
  const selectLote = document.getElementById('select-correlacao-lote');
  if (selectLote) {
    selectLote.addEventListener('change', (e) => {
      toast.info('Canal ThingSpeak Selecionado', `Carregando série temporal para ${e.target.options[e.target.selectedIndex].text}...`);
    });
  }

  // Exportar CSV de Sensores
  const btnExpSens = document.getElementById('btn-exportar-sensores-csv');
  if (btnExpSens) {
    btnExpSens.addEventListener('click', () => {
      const headers = ["ID Sensor", "Nome", "Tipo", "Talhao", "Canal ThingSpeak", "Bateria", "Status"];
      const rows = [
        [1, "SNS-SL-001", "Solo (FDR)", "Talhao A1 - Uva Vitoria", 248901, "98%", "ativo"],
        [2, "SNS-AR-002", "Ar / Microclima", "Talhao A1 - Uva Vitoria", 248901, "95%", "ativo"],
        [3, "SNS-SL-003", "Solo (FDR)", "Talhao B2 - Uva Thompson", 248902, "92%", "ativo"],
        [4, "SNS-AR-004", "Ar / Microclima", "Talhao B2 - Uva Thompson", 248902, "90%", "ativo"],
        [5, "SNS-SL-005", "Solo (FDR)", "Talhao C1 - Manga Palmer", 248903, "88%", "ativo"]
      ];
      const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "inventario_sensores_agro.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download Concluído', 'Inventário de sensores exportado com sucesso.');
    });
  }

  // Botão Log de Ingestão
  const btnLog = document.getElementById('btn-log-ingestao');
  if (btnLog) {
    btnLog.addEventListener('click', () => {
      Modal.open('Log Completo de Ingestão ThingSpeak', `
        <div style="font-family: monospace; font-size: 11px; background: #0F172A; color: #86EFAC; padding: 14px; border-radius: 8px; line-height: 1.7; max-height: 260px; overflow-y: auto;">
          [14:12:00] REJECTED - Outlier térmico 78.4°C descartado por filtro Penman (Sensor #02 • Ch 248901)<br>
          [14:10:00] CHANNEL 248901 - POST /update ? api_key=THINGSPEAK_KEY &amp; field1=27.4 &amp; field2=46.8 - 200 OK<br>
          [14:05:00] CHANNEL 248901 - POST /update ? api_key=THINGSPEAK_KEY &amp; field1=27.2 &amp; field2=46.7 - 200 OK<br>
          [14:00:00] CHANNEL 248901 - POST /update ? api_key=THINGSPEAK_KEY &amp; field1=27.1 &amp; field2=46.8 - 200 OK<br>
          [13:55:00] CHANNEL 248902 - POST /update ? api_key=THINGSPEAK_KEY &amp; field1=25.8 &amp; field2=37.8 - 200 OK<br>
          [Ontem 22:45] REJECTED - Leitura analógica corrompida -4.2% descartada (Sensor #14 • Ch 248905)
        </div>
      `, () => {
        toast.success('Download Concluído', 'Dump de 1.000 feeds do ThingSpeak exportado com sucesso.');
      }, 'Exportar Feed Completo');
    });
  }

  // Paginação
  const btnAnt = document.getElementById('btn-pag-ant');
  const btnProx = document.getElementById('btn-pag-prox');
  if (btnAnt) btnAnt.addEventListener('click', () => toast.info('Paginação', 'Exibindo página 1 de 2.'));
  if (btnProx) btnProx.addEventListener('click', () => toast.info('Paginação', 'Exibindo página 2 de 2.'));
}
