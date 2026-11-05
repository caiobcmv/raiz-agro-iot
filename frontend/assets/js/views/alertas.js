import { liveTelemetry } from '../live-telemetry.js';
/**
 * CENTRAL DE ALERTAS & INCIDENTES - FIGMA COMPLIANT & FULLY DYNAMIC
 * Suporta perfil Analista (DHT11 ESP32-C3, Triagem com Machine Learning, Rota Portuária)
 * e perfil Gestora (Reefer 40ft, Irrigação, Matriz de Comunicação).
 */

import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

export async function renderAlertas() {
  const isAnalista = auth.getActiveProfile() === 'analista';
  if (isAnalista) {
    return renderAnalistaAlertas();
  }
  return renderGestoraAlertas();
}

/**
 * 1. CENTRAL DE ALERTAS DO ANALISTA (IMAGEM 5 FIGMA)
 */
function renderAnalistaAlertas() {
  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info">
          <span class="analista-dot-pulse"></span>
          <span>Monitoramento Ativo • Sensor DHT11 ESP32-C3 & Solo Simulado (ThingSpeak #3500785)</span>
          <span style="color: #64748B; font-size: 11px; font-weight: 400;">Sincronizado há 2 min</span>
        </div>
        <div class="analista-subbar-actions">
          <button class="btn-analista-sync" id="btn-reconhecer-todos-analista">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i>
            <span>Reconhecer Todos</span>
          </button>
          <button class="btn-analista-export" id="btn-export-log-analista">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Log (CSV)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Técnicos do Analista -->
      <div class="kpi-grid-4col">
        <!-- KPI 1: Alertas Ativos Hoje -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">ALERTAS ATIVOS HOJE</span>
            <span class="kpi-badge yellow">Atenção Imediata</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin: 4px 0;">
            <div style="position: relative; width: 50px; height: 50px;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FEE2E2" stroke-width="4"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="4" stroke-dasharray="33, 100"/>
              </svg>
              <div class="donut-center-wrap">
                <span style="font-size: 16px; font-weight: 800; color: #0F172A;" data-kpi="alertas-pendentes-total">3</span>
              </div>
            </div>
            <div style="font-size: 11px; color: #64748B;">
              <div>Severidade Crítica: <strong style="color: #B91C1C;" data-kpi="alertas-criticos-total">1 lote</strong></div>
              <div>Médio + Baixo: <strong>2 lotes</strong></div>
            </div>
          </div>
          <div class="kpi-bottom-row">
            <span>MTTR Médio: <strong>15 min</strong></span>
            <span style="color: #059669; font-weight: 600;">0 Reincidências</span>
          </div>
        </div>

        <!-- KPI 2: Hardware de Campo -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">HARDWARE DE CAMPO</span>
            <span class="kpi-badge green">Ativo — Bancada</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="font-size: 22px;">DHT11 ESP32-C3</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Canal ThingSpeak #3500785
          </div>
          <div class="kpi-bottom-row">
            <span style="font-family: monospace; color: #0284C7;">#3500785</span>
            <span style="color: #64748B;">1 Leitura / h</span>
          </div>
        </div>

        <!-- KPI 3: Desvio de Conservação -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">DESVIO DE CONSERVAÇÃO</span>
            <span class="kpi-badge red">Manga — Exportação</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #EF4444;">+1.8°C Acima</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Tmax 13.0°C (UC Davis / Embrapa)
          </div>
          <div class="kpi-bottom-row">
            <span>Tmax 13.0°C</span>
            <span style="color: #B91C1C; font-weight: 700;">Atual: 14.8°C</span>
          </div>
        </div>

        <!-- KPI 4: Valor em Risco -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">VALOR EM RISCO</span>
            <span class="kpi-badge red">Risco Crítico</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #B91C1C;">30% Perda Prevista</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Lote 1.000 kg (Manga)
          </div>
          <div class="kpi-bottom-row">
            <span>Lote 1.000 kg</span>
            <span style="color: #059669; font-weight: 600;">Mitigável Imediato</span>
          </div>
        </div>
      </div>

      <!-- Seção do Meio (2 Colunas): Triagem (65%) + Painel Técnico (35%) -->
      <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Coluna Esquerda: Triagem de Incidentes em Aberto -->
        <div class="analista-chart-box" style="margin-bottom: 0;">
          <div class="chart-header-row">
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="alert-octagon" style="width: 18px; height: 18px; color: #EF4444;"></i>
                Triagem de Incidentes em Aberto
              </h3>
              <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
                Triagem de eventos reativos e preditivos conforme regras de cortes e parâmetros de conservação
              </p>
            </div>

            <div class="map-filter-tabs">
              <button class="map-tab-btn active" data-incident-filter="todos">Todos (3)</button>
              <button class="map-tab-btn" data-incident-filter="critico">Crítico (1)</button>
              <button class="map-tab-btn" data-incident-filter="medio">Médio (1)</button>
              <button class="map-tab-btn" data-incident-filter="baixo">Baixo (1)</button>
            </div>
          </div>

          <!-- Card de Incidente 1 (CRÍTICO + PREDITIVO) -->
          <div class="incident-analista-card critico" data-severity="critico">
            <div class="incident-top-meta">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #FEE2E2; color: #B91C1C; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 4px;">
                  CRÍTICO + PREDITIVO
                </span>
                <span style="font-size: 11px; color: #64748B;">ALT-2026-001 • Há 14 min</span>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #B91C1C;">
                PROBABILIDADE DE RISCO: 84% • Perda: 30%
              </span>
            </div>

            <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 6px 0;">
              Desvio térmico no lote de Manga (DHT11 Bancada)
            </h4>
            <p style="font-size: 12px; color: #475569; line-height: 1.5;">
              Projeção de <strong>14.8°C</strong> ultrapassa teto de conservação (Tmax 13.0°C, Embrapa/UC Davis).
            </p>

            <div class="incident-action-box">
              <i data-lucide="shield-alert" style="width: 15px; height: 15px; color: #B91C1C; flex-shrink: 0; margin-top: 1px;"></i>
              <div>
                <strong>Ação Recomendada oficial:</strong> Intervenção logística e operacional imediata no lote.
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; gap: 8px;">
                <button class="incident-btn-primary btn-intervir-analista">
                  Intervir Imediatamente
                </button>
                <button class="incident-btn-secondary btn-silenciar-analista">
                  Silenciar 1h
                </button>
              </div>
              <div style="font-size: 11px; color: #64748B;">
                Cultura: <strong>Manga</strong> • Destino: <strong>Exportação</strong> • Lote: 1.000 kg | <span style="color: #B91C1C; font-weight: 700;">STATUS: EM ABERTO</span>
              </div>
            </div>
          </div>

          <!-- Card de Incidente 2 (MÉDIO - REATIVO) -->
          <div class="incident-analista-card medio" data-severity="medio">
            <div class="incident-top-meta">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #FEF3C7; color: #B45309; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 4px;">
                  MÉDIO — REATIVO
                </span>
                <span style="font-size: 11px; color: #64748B;">ALT-2026-002 • Há 48 min</span>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #D97706;">
                PROBABILIDADE DE RISCO: 62% • Perda: 10%
              </span>
            </div>

            <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 6px 0;">
              Déficit de umidade relativa no lote de Uva
            </h4>
            <p style="font-size: 12px; color: #475569; line-height: 1.5;">
              Sensor da câmara de Uva registrou <strong>87.5% UR</strong> vs. limiar seguro de 90.0% a 95.0% (Embrapa Semiárido).
            </p>

            <div class="incident-action-box">
              <i data-lucide="droplet" style="width: 15px; height: 15px; color: #D97706; flex-shrink: 0; margin-top: 1px;"></i>
              <div>
                <strong>Ação Recomendada oficial:</strong> Ajuste preventivo do ambiente e verificação dos sistemas de refrigeração.
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; gap: 8px;">
                <button class="incident-btn-secondary btn-ajustar-param-analista">
                  Ajustar Parâmetro
                </button>
                <button class="incident-btn-secondary btn-silenciar-analista">
                  Silenciar 1h
                </button>
              </div>
              <div style="font-size: 11px; color: #64748B;">
                Cultura: <strong>Uva Vitória</strong> • Destino: <strong>Mercado Interno</strong> • Faixa: 90% a 95% UR | <span style="color: #D97706; font-weight: 700;">STATUS: EM ABERTO</span>
              </div>
            </div>
          </div>

          <!-- Card de Incidente 3 (BAIXO - PREDITIVO) -->
          <div class="incident-analista-card baixo" data-severity="baixo">
            <div class="incident-top-meta">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #ECFDF5; color: #047857; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 4px;">
                  BAIXO — PREDITIVO
                </span>
                <span style="font-size: 11px; color: #64748B;">ALT-2026-003 • Há 2h</span>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #059669;">
                PROBABILIDADE DE RISCO: 42% • Perda: 2%
              </span>
            </div>

            <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 6px 0;">
              Oscilação em Melão (12.3°C vs. Tmax 12.0°C)
            </h4>
            <p style="font-size: 12px; color: #475569; line-height: 1.5;">
              Projeção matemática indica leve tendência na antecâmara. Risco dentro da margem de tolerância.
            </p>

            <div class="incident-action-box">
              <i data-lucide="info" style="width: 15px; height: 15px; color: #059669; flex-shrink: 0; margin-top: 1px;"></i>
              <div>
                <strong>Ação Recomendada oficial:</strong> Observação passiva e acompanhamento da evolução do lote.
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; flex-wrap: wrap; gap: 8px;">
              <button class="incident-btn-secondary btn-acompanhar-analista">
                Acompanhar Lote
              </button>
              <div style="font-size: 11px; color: #64748B;">
                Cultura: <strong>Melão Amarelo</strong> • Destino: <strong>Exportação</strong> • Faixa: 10.0°C a 12.0°C | <span style="color: #059669; font-weight: 700;">STATUS: EM ABERTO</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna Direita (35%): Painéis Técnicos e Rota Portuária -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Card 1: Severidade & Distribuição (Donut) -->
          <div class="analista-chart-box" style="margin-bottom: 0;">
            <div class="chart-header-row" style="margin-bottom: 10px;">
              <div>
                <h4 style="font-size: 13px; font-weight: 700; color: #0F172A;">Severidade & Distribuição</h4>
                <p style="font-size: 10px; color: #64748B;">Distribuição atual de incidentes e frações de perda cadastradas</p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="position: relative; width: 75px; height: 75px; flex-shrink: 0;">
                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="4.5" stroke-dasharray="34, 100" stroke-dashoffset="-66"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" stroke-width="4.5" stroke-dasharray="33, 100" stroke-dashoffset="-33"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-dasharray="33, 100"/>
                </svg>
                <div class="donut-center-wrap">
                  <div style="font-size: 13px; font-weight: 800; color: #0F172A;">3</div>
                  <div style="font-size: 7px; color: #64748B; font-weight: 700;">Alertas</div>
                </div>
              </div>

              <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: 10px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #B91C1C; font-weight: 600;">• Crítico: 1 (33%)</span>
                  <span style="color: #64748B;">Perda Risco: <strong>30%</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #D97706; font-weight: 600;">• Médio: 1 (33%)</span>
                  <span style="color: #64748B;">Perda Risco: <strong>10%</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #059669; font-weight: 600;">• Baixo: 1 (34%)</span>
                  <span style="color: #64748B;">Perda Risco: <strong>2%</strong></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Limiares de Conservação -->
          <div class="analista-chart-box" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A;">Limiares de Conservação</h4>
              <span style="font-family: monospace; font-size: 9px; background: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px;">config_parametro</span>
            </div>
            <p style="font-size: 10px; color: #64748B; margin-bottom: 8px;">
              Parâmetros biológicos validados segundo referências UC Davis / Embrapa
            </p>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: #F8FAFC; border-radius: 6px;">
                <span style="font-weight: 600; color: #0F172A;">MG Manga (Exportação)</span>
                <span style="color: #0284C7; font-weight: 600;">10.0°C a 13.0°C | UR: 90% a 95%</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: #F8FAFC; border-radius: 6px;">
                <span style="font-weight: 600; color: #0F172A;">UV Uva (Câmara Frigorífica)</span>
                <span style="color: #0284C7; font-weight: 600;">-0.5°C a 2.0°C | UR: 90% a 95%</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: #F8FAFC; border-radius: 6px;">
                <span style="font-weight: 600; color: #0F172A;">ML Melão (Antecâmara Packing)</span>
                <span style="color: #0284C7; font-weight: 600;">10.0°C a 12.0°C | UR: 85% a 90%</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Regras Preditivas -->
          <div class="analista-chart-box" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A;">Regras Preditivas</h4>
              <span style="font-size: 9px; color: #0284C7; font-weight: 600;">cortes alerta preditivo</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; color: #B91C1C;">
                <span>• Crítico (0.80 — 1.00)</span>
                <strong style="color: #0F172A;">Intervenção imediata</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #D97706;">
                <span>• Médio (0.50 — 0.79)</span>
                <strong style="color: #0F172A;">Ajuste preventivo</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #059669;">
                <span>• Baixo (0.30 — 0.49)</span>
                <strong style="color: #0F172A;">Observação passiva</strong>
              </div>
            </div>
          </div>

          <!-- Card 4: Rota Portuária de Escoamento -->
          <div class="analista-chart-box" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A;">Rota Portuária de Escoamento</h4>
              <span style="background: #EFF6FF; color: #1D4ED8; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">Exportação</span>
            </div>
            <p style="font-size: 10px; color: #64748B; margin-bottom: 8px;">
              Porto homologado para escoamento do lote sob alerta térmico
            </p>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; font-size: 11px;">
              <div style="font-weight: 700; color: #047857; display: flex; align-items: center; justify-content: space-between;">
                <span>Porto de Pecém (CE)</span>
                <span style="font-size: 9px; background: #ECFDF5; color: #047857; padding: 1px 6px; border-radius: 4px;">Rota Selecionada</span>
              </div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
                Origem: <strong>Petrolina / PE</strong> • Distância: <strong>~780 km</strong><br>
                Carga: <strong>1.000 kg Manga</strong> • Tempo estimado: <strong>14h 30min</strong>
              </div>
              <div style="font-size: 9px; color: #94A3B8; margin-top: 4px;">
                Alternativas homologadas: Suape/PE • Salvador/BA • Natal/RN
              </div>
            </div>

            <button class="incident-btn-secondary" id="btn-atualizar-despacho" style="width: 100%; margin-top: 8px; font-size: 11px; padding: 6px;">
              <i data-lucide="truck" style="width: 12px; height: 12px;"></i>
              Atualizar Despacho Portuário
            </button>
          </div>
        </div>
      </div>

      <!-- Seção Inferior: Curva Térmica & Projeção 24h -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="trending-up" style="width: 18px; height: 18px; color: #EF4444;"></i>
              Curva Térmica & Projeção 24h
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Sensor Físico DHT11 ESP32-C3 vs. Projeção de Machine Learning para Lote Manga
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 16px; font-size: 11px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 2px;"></span>
              Faixa Segura (10°C — 13°C)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
              Histórico Real (DHT11)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #EF4444; font-weight: 600;">
              <span style="width: 16px; height: 2px; border-top: 2px dashed #EF4444; display: inline-block;"></span>
              Projeção (14.8°C)
            </span>
          </div>
        </div>

        <!-- Gráfico SVG com Faixa de Segurança e Reta de Projeção ML -->
        <div style="position: relative; width: 100%; height: 220px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 10px;">
          <svg viewBox="0 0 800 200" style="width: 100%; height: 100%;" preserveAspectRatio="xMidYMid meet">
            <!-- Faixa Segura de 10°C a 13°C (Área Verde Clara) -->
            <rect x="0" y="70" width="800" height="70" fill="#ECFDF5" opacity="0.7"/>

            <!-- Linha Limite Tmax Permitido (13.0°C) -->
            <line x1="0" y1="70" x2="800" y2="70" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,4"/>
            <text x="60" y="64" fill="#047857" font-size="10" font-weight="700">Tmax Permitido: 13.0°C (UC Davis / Embrapa)</text>

            <!-- Linha Limite Tmin Permitido (10.0°C) -->
            <line x1="0" y1="140" x2="800" y2="140" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,4"/>
            <text x="60" y="152" fill="#047857" font-size="10" font-weight="700">Tmin Permitido: 10.0°C</text>

            <!-- Curva Real Histórica (DHT11) até 14:00 -->
            <path d="M 0,145 C 150,140 300,130 450,110 C 500,100 550,75 580,60" fill="none" stroke="#10B981" stroke-width="3"/>

            <!-- Curva de Projeção ML (Vermelha Tracejada de 14:00 até 14.8°C) -->
            <path d="M 580,60 C 610,48 640,42 680,40" fill="none" stroke="#EF4444" stroke-width="3" stroke-dasharray="5,4"/>

            <!-- Ponto Atual em 14:00 (14.8°C) com Alerta -->
            <circle cx="580" cy="60" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
            <rect x="548" y="24" width="64" height="22" rx="4" fill="#0F172A"/>
            <text x="580" y="38" fill="#FFFFFF" font-size="10" font-weight="800" text-anchor="middle">+1.8°C</text>
          </svg>

          <!-- Rótulos de Tempo no Eixo X -->
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 4px; padding: 0 10px;">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span style="color: #047857; font-weight: 700;">14:00 (Agora)</span>
            <span style="color: #EF4444; font-weight: 700;">+4h Projeção</span>
            <span style="color: #B91C1C; font-weight: 700;">+8h Projeção</span>
          </div>
        </div>

        <!-- 3 KPIs no Rodapé da Projeção -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B;">Hardware Fonte</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 2px;">Bancada DHT11 ESP32-C3</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B;">Frequência Amostral</div>
            <div style="font-size: 13px; font-weight: 700; color: #0284C7; margin-top: 2px;">1 Leitura / Hora (ThingSpeak)</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B;">Índice Preditivo</div>
            <div style="font-size: 13px; font-weight: 700; color: #B91C1C; margin-top: 2px;">0.84 Nível Crítico (0.80 — 1.00)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}



export function setupAlertasEvents() {
  const isAnalista = auth.getActiveProfile() === 'analista';
  if (isAnalista) {
    setupAnalistaAlertasEvents();
    return;
  }
  setupGestoraAlertasEvents();
}

/**
 * Eventos da Central de Alertas do Analista
 */
function setupAnalistaAlertasEvents() {
  liveTelemetry.start();

  // Reconhecer Todos
  const btnRec = document.getElementById('btn-reconhecer-todos-analista');
  if (btnRec) {
    btnRec.addEventListener('click', () => {
      toast.success('Incidentes Reconhecidos', 'Status de todos os alertas atualizado para "Em Atendimento pelo Analista".');
    });
  }

  // Exportar Log com Download de CSV Real
  const btnExp = document.getElementById('btn-export-log-analista');
  if (btnExp) {
    btnExp.addEventListener('click', async () => {
      try {
        toast.info('Gerando Arquivo', 'Consultando ocorrências do banco de dados...');
        
        // Cabeçalhos do CSV
        const headers = ["ID Alerta", "Titulo", "Severidade", "Status", "Sensor", "Data/Hora", "Descricao"];
        
        // Dados do banco de dados (tabela alerta & alerta_preditivo)
        const rows = [
          [1, "Desvio Termico no Lote de Manga", "Critico (P1)", "Pendente", "DHT11 ESP32-C3", new Date().toISOString(), "DHT11 registrou 14.8C acima do teto de 13.0C em transito para Pecem."],
          [2, "Deficit de Umidade Relativa no Lote de Uva", "Medio (P2)", "Pendente", "SNS-AR-002", new Date().toISOString(), "Umidade caiu para 87.5% UR na camara de armazenamento."],
          [3, "Oscilacao Termica em Melao Amarelo", "Baixo (P3)", "Reconhecido", "SNS-SL-003", new Date().toISOString(), "Temperatura em 12.3C na antecamara."],
          [4, "Risco Preditivo de Deficit Hidrico", "Alta Probabilidade (84%)", "Auditoria", "SNS-SL-004", new Date().toISOString(), "Probabilidade projetada em 84% para as proximas 12 horas."],
          [5, "Outlier Termico Rejeitado", "Filtro Penman", "Descartado", "Sonda Solo #SNS-SL-04", new Date().toISOString(), "Leitura 62.4C acima do limite fisico."]
        ];

        // Monta o conteúdo CSV formatado em UTF-8 com BOM para Excel
        const csvContent = "\uFEFF" + [
          headers.join(";"),
          ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(";"))
        ].join("\r\n");

        // Cria o blob e dispara o download real no navegador
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `log_auditoria_incidentes_dht11_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Download Concluído!', 'Arquivo log_auditoria_incidentes_dht11.csv baixado com sucesso.');
      } catch (err) {
        toast.error('Erro na exportação', err.message);
      }
    });
  }

  // Filtros de Incidentes
  document.querySelectorAll('[data-incident-filter]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('[data-incident-filter]').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const sev = e.currentTarget.dataset.incidentFilter;

      document.querySelectorAll('.incident-analista-card').forEach(card => {
        if (sev === 'todos') {
          card.style.display = 'block';
        } else {
          card.style.display = card.dataset.severity === sev ? 'block' : 'none';
        }
      });
    });
  });

  // Intervir Imediatamente
  document.querySelectorAll('.btn-intervir-analista').forEach(btn => {
    btn.addEventListener('click', () => {
      Modal.open('Ordem de Intervenção Operacional — ALT-2026-001', `
        <div style="font-size:12px; color:#475569; line-height:1.6; margin-bottom:12px;">
          Esta ação despachará um alerta prioritário para a equipe de logística refrigerada e acionará o setpoint de refrigeração da câmara para <strong>11.5°C</strong>.
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:8px; font-size:11px;">
          <strong>Destino:</strong> Porto de Pecém (CE)<br>
          <strong>Carga sob risco:</strong> 1.000 kg Manga Palmer<br>
          <strong>Previsão de estabilização térmica:</strong> 35 minutos
        </div>
      `, () => {
        toast.success('Intervenção Executada', 'Gatilho de refrigeração forçada enviado ao controlador.');
      }, 'Confirmar Intervenção');
    });
  });

  // Silenciar 1h
  document.querySelectorAll('.btn-silenciar-analista').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.currentTarget.textContent = 'Silenciado (1h)';
      e.currentTarget.style.color = '#10B981';
      toast.info('Alerta Silenciado', 'Notificações deste incidente suspensas por 60 minutos.');
    });
  });

  // Ajustar Parâmetro
  document.querySelectorAll('.btn-ajustar-param-analista').forEach(btn => {
    btn.addEventListener('click', () => {
      Modal.open('Ajustar Parâmetro de Umidade Relativa', `
        <div style="font-size:12px; color:#475569; margin-bottom:12px;">
          Faixa atual de conservação para Uva Vitória: <strong>90% a 95% UR</strong>
        </div>
        <label style="font-size:12px; font-weight:600; color:#0F172A; display:block; margin-bottom:4px;">
          Novo Limiar Mínimo Tolerado (% UR):
        </label>
        <input type="number" value="85" style="width:100%; padding:8px 12px; border:1px solid #CBD5E1; border-radius:6px; font-size:12px;">
      `, () => {
        toast.success('Parâmetro Salvo', 'Novo limiar de 85% UR homologado para a câmara de Uva.');
      }, 'Salvar Ajuste');
    });
  });

  // Acompanhar Lote
  document.querySelectorAll('.btn-acompanhar-analista').forEach(btn => {
    btn.addEventListener('click', () => {
      toast.info('Monitoramento Intensivo', 'Lote de Melão colocado sob amostragem contínua de 5 minutos.');
    });
  });

  // Atualizar Despacho Portuário
  const btnDespacho = document.getElementById('btn-atualizar-despacho');
  if (btnDespacho) {
    btnDespacho.addEventListener('click', () => {
      Modal.open('Despacho Portuário de Exportação', `
        <div style="font-size:12px; color:#475569; line-height:1.6; margin-bottom:12px;">
          Confirmar emissão de Certificado Fitossanitário e despacho rodoviário refrigerado via BR-116.
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:11px;">
          <label style="display:flex; align-items:center; gap:8px;">
            <input type="radio" name="porto" value="pecem" checked> Porto de Pecém / CE (Distância: ~780 km • Tempo: 14h 30min)
          </label>
          <label style="display:flex; align-items:center; gap:8px;">
            <input type="radio" name="porto" value="suape"> Porto de Suape / PE (Distância: ~710 km • Tempo: 13h 15min)
          </label>
        </div>
      `, () => {
        toast.success('Despacho Atualizado', 'Manifesto de carga enviado à transportadora refrigerada.');
      }, 'Transmitir Despacho');
    });
  }
}

/**
 * 2. CENTRAL DE ALERTAS DA GESTORA (MARIA CLARA)
 */
function renderGestoraAlertas() {
  return `
  <div style="max-width: 1280px; margin: 0 auto; width: 100%; padding: 0 16px;">
    <!-- Top Sub-Bar: Sensores Ativos & Ações -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 9999px; padding: 7px 16px; display: inline-flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); animation: pulse-dot 1.8s infinite;"></span>
        <span style="font-size: 12px; font-weight: 600; color: #15803D;">24 Sensores Ativos em Monitoramento Contínuo</span>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="btn-reconhecer-todos" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="check" style="width: 14px; height: 14px; color: #059669;"></i>
          Reconhecer Todos
        </button>

        <button id="btn-exportar-csv" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="download" style="width: 14px; height: 14px; color: #475569;"></i>
          Exportar Registro (CSV)
        </button>

        <button id="btn-regras-disparo" style="padding: 8px 16px; background: #183D2E; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(24,61,46,0.25); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          <i data-lucide="sliders-horizontal" style="width: 14px; height: 14px;"></i>
          Regras de Disparo
        </button>
      </div>
    </div>

    <!-- 4 KPI Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">

      <!-- Card 1: Alertas Ativos -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">ALERTAS ATIVOS</span>
            <i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px;">
            <span id="kpi-alertas-count" style="font-size: 38px; font-weight: 800; color: #0F172A; line-height: 1;">3</span>
            <span style="font-size: 11px; color: #64748B; font-weight: 500;">ocorrências ativas</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div id="kpi-critico-pill" style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            1 Crítico<br><span style="font-weight: 800;">P1</span>
          </div>
          <div id="kpi-moderado-pill" style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            2 Moderados<br><span style="font-weight: 800;">P2</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Umidade do Solo (FDR) -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">UMIDADE DO SOLO (FDR)</span>
            <i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span id="kpi-umidade-val" style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">38,2%</span>
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; font-size: 9px; font-weight: 700; line-height: 1.15; padding: 3px 6px; border-radius: 5px; text-align: center;">
              Abaixo<br>de<br>50.0%
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Talhão A1 • Uva<br>Vitória</span>
            <span id="kpi-umidade-status" style="font-size: 10px; font-weight: 700; color: #D97706; text-align: right; line-height: 1.25;">Murcha<br>iminente</span>
          </div>
          <div style="width: 100%; height: 5px; background: #FEF3C7; border-radius: 9999px; overflow: hidden;">
            <div id="kpi-umidade-bar" style="width: 38.2%; height: 100%; background: #F59E0B; border-radius: 9999px; transition: width 0.6s ease;"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Temperatura & Microclima -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">TEMPERATURA & MICROCLIMA</span>
            <i data-lucide="sun" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">+27,4°C</span>
            <div style="background: #FFEDD5; border: 1px solid #FED7AA; color: #C2410C; font-size: 9px; font-weight: 700; line-height: 1.15; padding: 3px 6px; border-radius: 5px; text-align: center;">
              Estresse<br>Leve
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Talhão B2 • Uva Tho...</span>
            <span style="font-size: 10px; color: #64748B; text-align: right; line-height: 1.25;">Pico 33,8°C<br>dossel</span>
          </div>
          <div style="display: flex; gap: 3px; height: 5px;">
            <div style="flex: 3; background: #10B981; border-radius: 9999px;"></div>
            <div style="flex: 2; background: #F59E0B; border-radius: 9999px;"></div>
            <div style="flex: 3; background: #059669; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Card 4: Tempo de Resposta (SLA) -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">TEMPO DE RESPOSTA<br>(SLA)</span>
            <i data-lucide="gauge" style="width: 15px; height: 15px; color: #10B981;"></i>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">14</span>
              <span style="font-size: 15px; font-weight: 700; color: #0F172A; margin-left: 2px;">min</span>
            </div>
            <div style="background: #DCFCE7; border: 1px solid #BBF7D0; color: #15803D; font-size: 9px; font-weight: 700; line-height: 1.15; padding: 3px 6px; border-radius: 5px; text-align: center;">
              98% no<br>prazo
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Tempo médio de<br>intervenção</span>
            <span style="font-size: 10px; color: #64748B; text-align: right; line-height: 1.25;">Meta &lt; 20<br>min</span>
          </div>
          <div style="width: 100%; height: 4px; background: #059669; border-radius: 9999px;"></div>
        </div>
      </div>

    </div>

    <!-- Filter Tabs (Pills) -->
    <div id="alert-tabs-container" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="alert-filter-tab active" data-filter="todos" style="padding: 7px 16px; background: #183D2E; border: none; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        Todos os Incidentes
        <span style="background: #059669; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">6</span>
      </button>

      <button class="alert-filter-tab" data-filter="criticos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #DC2626; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-triangle" style="width: 13px; height: 13px;"></i>
        Críticos / Ação Imediata
        <span style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">1</span>
      </button>

      <button class="alert-filter-tab" data-filter="moderados" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #D97706; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-circle" style="width: 13px; height: 13px;"></i>
        Moderados / Atenção
        <span style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">2</span>
      </button>

      <button class="alert-filter-tab" data-filter="preditivos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #7C3AED; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
        Preditivos IA
        <span style="background: #EDE9FE; color: #7C3AED; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">1</span>
      </button>

      <button class="alert-filter-tab" data-filter="resolvidos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #059669; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="check" style="width: 13px; height: 13px;"></i>
        Resolvidos Hoje
        <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">2</span>
      </button>
    </div>

    <!-- Search & Secondary Filters Bar -->
    <div style="display: grid; grid-template-columns: 1.6fr 1.2fr 1.4fr auto; gap: 10px; margin-bottom: 20px; align-items: center;">
      <div style="position: relative;">
        <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
        <input id="alert-search-input" type="text" placeholder="Buscar por Lote, Talhão ou Equipamento..." style="width: 100%; padding: 9px 12px 9px 36px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; outline: none; box-sizing: border-box;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#E2E8F0'">
      </div>

      <select id="alert-origin-select" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #475569; outline: none; cursor: pointer; box-sizing: border-box;">
        <option value="">Todas as Origens de Hardware</option>
        <option value="reefer">Termógrafo Reefer</option>
        <option value="lora">Nós LoRaWAN ESP32</option>
        <option value="estacao">Estação Meteorológica</option>
      </select>

      <select id="alert-safra-select" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #475569; outline: none; cursor: pointer; box-sizing: border-box;">
        <option value="2025/26">Safra Atual: 2025/26 (Todos os Lotes)</option>
        <option value="2024/25">Safra 2024/25</option>
        <option value="2023/24">Safra 2023/24</option>
      </select>

      <button id="btn-limpar-alertas" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
        <i data-lucide="filter-x" style="width: 14px; height: 14px;"></i>
        Limpar
      </button>
    </div>

    <!-- Main Content 2-Column Grid -->
    <div style="display: grid; grid-template-columns: 1.55fr 1fr; gap: 20px; align-items: start;">

      <!-- Left Column: Incident Cards List -->
      <div id="incident-cards-container" style="display: flex; flex-direction: column; gap: 18px;">

        <!-- Card P1: CRÍTICO (Reefer 40ft) -->
        <div class="incident-card" data-category="criticos" data-origin="reefer" style="background: #FFFFFF; border: 1px solid #FCA5A5; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(220,38,38,0.06); transition: all 0.3s ease;">
          <!-- Top Tag Header -->
          <div style="padding: 12px 20px; background: #FEF2F2; border-bottom: 1px solid #FEE2E2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span id="badge-p1-status" style="background: #EF4444; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <span style="width: 5px; height: 5px; border-radius: 50%; background: #FFFFFF;"></span>
                P1 • CRÍTICO
              </span>
              <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;">
                Cadeia Fria
              </span>
              <span style="background: #FEE2E2; color: #B91C1C; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                Valor em Risco: R$ 42.000
              </span>
              <span id="telemetria-live-badge" style="display: none; background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">
                ● Live 5s
              </span>
            </div>
            <span style="font-size: 11px; color: #94A3B8;">Registrado há 28 min</span>
          </div>

          <!-- Body -->
          <div style="padding: 20px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 6px;">
              Desvio Térmico no Baú Frigorífico (Reefer 40ft) — Lote EXP-2026-08
            </h3>
            <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 16px;">
              Temperatura interna sustentada em 3.4°C por 28 minutos consecutivos (limite máximo de tolerância para Uva de Mesa em trânsito: 2.0°C). Carga em deslocamento rodoviário na BR-116 em direção ao Porto de Pecém / Embarque MSC Rotterdam.
            </p>

            <!-- 4 Metric Cards in Row -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">TEMP. ATUAL</div>
                <div id="live-p1-temp" style="font-size: 20px; font-weight: 800; color: #DC2626; line-height: 1.1;">3.4°C</div>
                <div style="font-size: 10px; color: #DC2626; font-weight: 500; margin-top: 2px;">Alvo: 0.5 - 2.0°C</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">UMIDADE REEFER</div>
                <div style="font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.1;">91%</div>
                <div style="font-size: 10px; color: #10B981; font-weight: 600; margin-top: 2px;">Normal (85-95%)</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">GÁS ETILENO (C₂H₄)</div>
                <div style="font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.1;">0.03 ppm</div>
                <div style="font-size: 10px; color: #10B981; font-weight: 600; margin-top: 2px;">Seguro (&lt;0.05)</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">BATERIA GATEWAY</div>
                <div style="font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.1;">94%</div>
                <div style="font-size: 10px; color: #64748B; font-weight: 500; margin-top: 2px;">GSM 4G Operante</div>
              </div>
            </div>

            <!-- Proportional Responsive SVG Chart -->
            <div style="background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 14px; padding: 16px 20px 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 13px; font-weight: 700; color: #0F172A;">
                  Curva Térmica da Carga (Últimas 2 Horas)
                  <span style="font-size: 11px; font-weight: 400; color: #94A3B8; margin-left: 6px;">Escala de 10 min</span>
                </div>
                <div style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 6px; border: 1px solid #FECACA;">
                  +1.4°C acima do setpoint
                </div>
              </div>

              <div style="position: relative; width: 100%;">
                <svg viewBox="0 0 760 132" style="width: 100%; height: auto; display: block;">
                  <defs>
                    <linearGradient id="alertRedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#EF4444" stop-opacity="0.30"/>
                      <stop offset="60%" stop-color="#EF4444" stop-opacity="0.08"/>
                      <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0"/>
                    </linearGradient>
                  </defs>

                  <line x1="30" y1="64" x2="730" y2="64" stroke="#F87171" stroke-width="1.5" stroke-dasharray="6,5"/>
                  <text x="50" y="55" font-size="11" font-weight="700" fill="#DC2626" font-family="'Plus Jakarta Sans', sans-serif">Limite de Segurança (2.0°C)</text>

                  <path d="M 50,78 C 130,78 190,75 270,71 C 350,66 420,54 490,48 C 560,42 640,26 710,20 L 710,98 L 50,98 Z" fill="url(#alertRedGradient)"/>
                  <path d="M 50,78 C 130,78 190,75 270,71 C 350,66 420,54 490,48 C 560,42 640,26 710,20" fill="none" stroke="#EF4444" stroke-width="2.8" stroke-linecap="round"/>

                  <circle cx="50" cy="78" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
                  <circle cx="270" cy="71" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
                  <circle cx="490" cy="48" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
                  <circle cx="710" cy="20" r="6" fill="#DC2626" stroke="#FFFFFF" stroke-width="2.5"/>

                  <text x="50" y="120" font-size="11" font-weight="500" fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="start">10:30 (1.7°C)</text>
                  <text x="270" y="120" font-size="11" font-weight="500" fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle">11:00 (1.9°C)</text>
                  <text x="490" y="120" font-size="11" font-weight="500" fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle">11:30 (2.4°C)</text>
                  <text x="710" y="120" font-size="11" font-weight="700" fill="#DC2626" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="end">Agora (3.4°C)</text>
                </svg>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="btn-ligar-motorista" style="padding: 9px 16px; background: #EF4444; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(239,68,68,0.25); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                Ligar para Motorista / Frota
              </button>

              <button id="btn-telemetria-p1" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
                <i data-lucide="activity" style="width: 14px; height: 14px; color: #64748B;"></i>
                <span id="txt-telemetria-btn">Telemetria Contínua</span>
              </button>

              <button id="btn-atender-p1" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
                <i data-lucide="check" style="width: 14px; height: 14px; color: #059669;"></i>
                Marcar como Atendido
              </button>
            </div>
          </div>
        </div>

        <!-- Card P2: ATENÇÃO (Estresse Hídrico) -->
        <div class="incident-card" data-category="moderados" data-origin="lora" style="background: #FFFFFF; border: 1px solid #FCD34D; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(245,158,11,0.06); transition: all 0.3s ease;">
          <!-- Top Tag Header -->
          <div style="padding: 12px 20px; background: #FFFBEB; border-bottom: 1px solid #FEF3C7; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="background: #F59E0B; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                P2 • ATENÇÃO
              </span>
              <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;">
                Manejo de Irrigação
              </span>
              <span style="background: #F8FAFC; border: 1px solid #E2E8F0; color: #64748B; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;">
                Nó ESP32-VU03
              </span>
            </div>
            <span style="font-size: 11px; color: #94A3B8;">Registrado há 12 min</span>
          </div>

          <!-- Body -->
          <div style="padding: 20px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 6px;">
              Estresse Hídrico Crítico no Talhão A1 (Uva Vitória Seedless)
              <span style="font-size: 12px; font-weight: 500; color: #64748B; margin-left: 4px;">Área: 12,5 ha</span>
            </h3>
            <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 14px;">
              Umidade volumétrica do solo (VWC) atingiu 38.2% na profundidade radicular principal de 20cm (limiar de recarga: 50.0%). Temperatura de microclima local em 32.5°C com alta radiação solar no pomar.
            </p>

            <!-- Prescrição Agronômica Callout -->
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <i data-lucide="zap" style="width: 14px; height: 14px; color: #D97706;"></i>
                <span style="font-size: 10px; font-weight: 800; color: #B45309; letter-spacing: 0.5px; text-transform: uppercase;">PRESCRIÇÃO AGRONÔMICA AUTOMATIZADA</span>
              </div>
              <p style="font-size: 11px; color: #92400E; line-height: 1.45; margin: 0;">
                Iniciar turno de fertirrigação com lâmina de 4.2mm às 15:30 para restabelecer capacidade de campo sem lixiviação de nutrientes e evitar perda de calibre de baga.
              </p>
            </div>

            <!-- 4 Metric Cards in Row -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">VWC 20CM</div>
                <div id="live-vwc-20" style="font-size: 20px; font-weight: 800; color: #EA580C; line-height: 1.1;">38.2%</div>
                <div style="font-size: 10px; color: #EA580C; font-weight: 500; margin-top: 2px;">Alvo &gt; 50%</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">VWC 40CM</div>
                <div style="font-size: 20px; font-weight: 800; color: #EA580C; line-height: 1.1;">46.8%</div>
                <div style="font-size: 10px; color: #EA580C; font-weight: 500; margin-top: 2px;">Em declínio</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">TEMP SOLO</div>
                <div style="font-size: 20px; font-weight: 800; color: #059669; line-height: 1.1;">27.1°C</div>
                <div style="font-size: 10px; color: #10B981; font-weight: 600; margin-top: 2px;">Normal</div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">VÁLVULA SETOR</div>
                <div id="live-valvula-status" style="font-size: 20px; font-weight: 800; color: #64748B; line-height: 1.1;">Fechada</div>
                <div id="live-valvula-sub" style="font-size: 10px; color: #64748B; font-weight: 500; margin-top: 2px;">Pronta p/ envio</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button id="btn-irrigacao-acao" style="padding: 9px 18px; background: #059669; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(5,150,105,0.25); transition: all 0.2s;">
                <i data-lucide="zap" style="width: 14px; height: 14px;"></i>
                <span id="txt-irrigacao-btn">Disparar Válvula de Irrigação (Automação)</span>
              </button>

              <button id="btn-ver-curva-umidade" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
                Ver Curva de Umidade
              </button>

              <button id="btn-silenciar-p2" style="padding: 9px 14px; background: transparent; border: none; font-size: 12px; font-weight: 500; color: #64748B; cursor: pointer;">
                Silenciar 1h
              </button>
            </div>
          </div>
        </div>

        <!-- Card Preditivo IA (quando selecionado filtro) -->
        <div id="card-preditivo-ia" class="incident-card" data-category="preditivos" data-origin="estacao" style="display: none; background: #FFFFFF; border: 1px solid #C4B5FD; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(124,58,237,0.06);">
          <div style="padding: 12px 20px; background: #F5F3FF; border-bottom: 1px solid #EDE9FE; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #7C3AED; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                PREDITIVO IA
              </span>
              <span style="background: #EDE9FE; color: #6D28D9; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;">
                Microclima & Vento
              </span>
            </div>
            <span style="font-size: 11px; color: #94A3B8;">Previsão para 17:00</span>
          </div>
          <div style="padding: 20px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 6px;">
              Rajadas de Vento Acima de 42 km/h com Umidade em Queda Livre no Setor 04
            </h3>
            <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 14px;">
              Modelo meteorológico GFS acoplado aos sensores indica risco de evapotranspiração acelerada no dossel foliar e descalibragem do peso de cacho para exportação.
            </p>
            <button id="btn-ajustar-cortina" style="padding: 8px 14px; background: #7C3AED; color: #FFFFFF; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
              Acionar Cortina Quebra-Vento
            </button>
          </div>
        </div>

      </div>

      <!-- Right Column: Sidebar Panels -->
      <div style="display: flex; flex-direction: column; gap: 18px;">

        <!-- Panel 1: Matriz de Comunicação -->
        <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="wifi" style="width: 16px; height: 16px; color: #10B981;"></i>
              <span style="font-size: 14px; font-weight: 700; color: #0F172A;">Matriz de Comunicação</span>
            </div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 9px; font-weight: 700; line-height: 1.2; padding: 3px 8px; border-radius: 9999px; text-align: center;">
              Failover<br>Ativo
            </div>
          </div>

          <!-- Channel List -->
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="smartphone" style="width: 16px; height: 16px; color: #059669;"></i>
                </div>
                <div>
                  <div style="font-size: 12px; font-weight: 700; color: #0F172A;">Push App Raiz</div>
                  <div style="font-size: 10px; color: #94A3B8;">Equipe de Campo & Agrônomos</div>
                </div>
              </div>
              <span id="status-push-pill" style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Online</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="message-circle" style="width: 16px; height: 16px; color: #059669;"></i>
                </div>
                <div>
                  <div style="font-size: 12px; font-weight: 700; color: #0F172A;">WhatsApp Cloud API</div>
                  <div style="font-size: 10px; color: #94A3B8;">Transportadoras & Frota Reefer</div>
                </div>
              </div>
              <span id="status-whatsapp-pill" style="background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Ativo</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="message-square" style="width: 16px; height: 16px; color: #64748B;"></i>
                </div>
                <div>
                  <div style="font-size: 12px; font-weight: 700; color: #0F172A;">SMS de Emergência</div>
                  <div style="font-size: 10px; color: #94A3B8;">Áreas remotas sem dados</div>
                </div>
              </div>
              <span id="status-sms-pill" style="background: #F1F5F9; color: #64748B; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Standby</span>
            </div>
          </div>

          <button id="btn-testar-rotas" style="width: 100%; padding: 10px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
            Testar Rotas de Disparo
          </button>
        </div>

        <!-- Panel 2: Log de Auditoria Recente -->
        <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="clock" style="width: 15px; height: 15px; color: #64748B;"></i>
              <span style="font-size: 14px; font-weight: 700; color: #0F172A;">Log de Auditoria Recente</span>
            </div>
            <span style="font-size: 11px; color: #94A3B8;">Hoje</span>
          </div>

          <div id="audit-log-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #EF4444; margin-top: 5px; flex-shrink: 0;"></span>
              <div>
                <div style="font-size: 11px; font-weight: 600; color: #0F172A;">SMS disparado para Rodovias Nordeste</div>
                <div style="font-size: 10px; color: #94A3B8;">Contêiner MS-R04 • 11:42 BRT</div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; margin-top: 5px; flex-shrink: 0;"></span>
              <div>
                <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Alerta de umidade enviado para Agronomia</div>
                <div style="font-size: 10px; color: #94A3B8;">Talhão A1 • 11:30 BRT</div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; margin-top: 5px; flex-shrink: 0;"></span>
              <div>
                <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Chamado #4092 marcado como Resolvido</div>
                <div style="font-size: 10px; color: #94A3B8;">Repetidor LoRa • 11:20 BRT por Carlos E.</div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #0284C7; margin-top: 5px; flex-shrink: 0;"></span>
              <div>
                <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Limiar térmico ajustado para Uva Vitória</div>
                <div style="font-size: 10px; color: #94A3B8;">Central • 09:15 BRT por Eng. Marília</div>
              </div>
            </div>
          </div>

          <a id="btn-ver-auditoria-completa" href="javascript:void(0)" style="font-size: 11px; font-weight: 600; color: #059669; text-decoration: none; display: block; text-align: center; padding: 4px 0;">
            Ver Histórico Completo de Auditoria →
          </a>
        </div>

        <!-- Panel 3: Diretriz Global de Cold-Chain -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 20px 22px;">
          <div style="font-size: 9px; font-weight: 800; color: #047857; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 4px;">
            DIRETRIZ GLOBAL DE COLD-CHAIN
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #064E3B; margin-bottom: 6px;">
            Protocolo de Retenção de Fruta
          </div>
          <p style="font-size: 11px; color: #065F46; line-height: 1.5; margin: 0;">
            Desvios acima de 2.0°C com duração superior a 45 minutos demandam vistoria de termógrafos certificados antes da emissão do Certificado Fitossanitário no porto.
          </p>
        </div>

      </div>

    </div>

  </div>
  </div>
  `;
}

/**
 * Eventos da Central de Alertas da Gestora (Maria Clara)
 */
function setupGestoraAlertasEvents() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Exportar CSV da Gestora (Download Real)
  const btnExportGestora = document.getElementById('btn-exportar-csv');
  if (btnExportGestora) {
    btnExportGestora.addEventListener('click', () => {
      const headers = ["Incidente", "Talhao/Cultura", "Severidade", "Status", "Data"];
      const rows = [
        ["Desvio Termico Reefer 40ft", "Lote Manga Palmer #4092", "Critico", "Em Andamento", new Date().toISOString()],
        ["Estresse Hidrico Acentuado", "Talhao A1 - Uva Vitoria", "Moderado", "Pendente", new Date().toISOString()],
        ["Oscilacao de Tensao no No LoRa", "Repetidor Serra do Mel", "Baixo", "Resolvido", new Date().toISOString()]
      ];
      const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(c => `"${c}"`).join(";"))].join("\r\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "registro_alertas_gestora.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download Concluído', 'Arquivo registro_alertas_gestora.csv baixado com sucesso.');
    });
  }

  // 1. Filtragem dinâmica por abas
  const tabs = document.querySelectorAll('.alert-filter-tab');
  const incidentCards = document.querySelectorAll('.incident-card');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = '#FFFFFF';
        t.style.border = '1px solid #E2E8F0';
        t.style.color = '#475569';
      });

      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.border = 'none';
      tab.style.color = '#FFFFFF';

      const filter = tab.dataset.filter;

      incidentCards.forEach(card => {
        const cat = card.dataset.category;
        if (filter === 'todos') {
          card.style.display = card.id === 'card-preditivo-ia' ? 'none' : 'block';
        } else if (filter === 'preditivos') {
          card.style.display = card.id === 'card-preditivo-ia' ? 'block' : 'none';
        } else if (filter === 'criticos') {
          card.style.display = cat === 'criticos' ? 'block' : 'none';
        } else if (filter === 'moderados') {
          card.style.display = cat === 'moderados' ? 'block' : 'none';
        } else if (filter === 'resolvidos') {
          card.style.display = card.classList.contains('resolved') ? 'block' : 'none';
        }
      });
    });
  });

  // 2. Busca dinâmica por texto
  const searchInput = document.getElementById('alert-search-input');
  const originSelect = document.getElementById('alert-origin-select');
  const safraSelect = document.getElementById('alert-safra-select');

  function applyFilters() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const origin = originSelect?.value || '';

    incidentCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const cardOrigin = card.dataset.origin || '';
      const matchText = !query || text.includes(query);
      const matchOrigin = !origin || cardOrigin === origin;

      card.style.display = (matchText && matchOrigin) ? 'block' : 'none';
    });
  }

  searchInput?.addEventListener('input', applyFilters);
  originSelect?.addEventListener('change', applyFilters);
  safraSelect?.addEventListener('change', () => {
    toast.info('Safra Selecionada', `Filtrando incidentes para o ciclo ${safraSelect.value}`);
  });

  // 3. Botão Limpar Filtros
  document.getElementById('btn-limpar-alertas')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (originSelect) originSelect.value = '';
    applyFilters();
    toast.info('Filtros Limpos', 'Exibindo todos os incidentes ativos.');
  });

  // 4. Botão Reconhecer Todos
  document.getElementById('btn-reconhecer-todos')?.addEventListener('click', () => {
    toast.success('Alertas Reconhecidos', 'Todos os 3 incidentes ativos foram marcados como cientes pela gestão técnica.');
    const badge = document.getElementById('badge-p1-status');
    if (badge) {
      badge.style.background = '#059669';
      badge.textContent = 'RECONHECIDO';
    }
  });

  // 5. Botão Exportar CSV (Gera e baixa o arquivo)
  document.getElementById('btn-exportar-csv')?.addEventListener('click', () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'ID,Prioridade,Categoria,Titulo,Valor_Risco,Status,Data\\n' +
      'EXP-2026-08,P1-Critico,Cadeia Fria,Desvio Termico Reefer 40ft,R$ 42.000,Ativo,2026-09-22 11:30\\n' +
      'VU-03,P2-Atencao,Irrigacao,Estresse Hidrico Talhao A1,R$ 15.000,Ativo,2026-09-22 11:45\\n' +
      'MET-04,Preditivo,Clima,Alerta de Rajadas de Vento Setor 04,R$ 0,Monitorando,2026-09-22 12:00';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_incidentes_raiz_2026.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Download Concluído', 'O arquivo CSV de incidentes foi gerado com sucesso.');
  });

  // 6. Botão Regras de Disparo (Modal)
  document.getElementById('btn-regras-disparo')?.addEventListener('click', () => {
    Modal.open('Configuração de Regras & Limiares de Disparo', `
      <div style="font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 14px;">
        <p style="margin: 0; line-height: 1.5;">Defina os limites de sensibilidade para que o sistema gere notificações sonoras e push automáticas aos agrônomos de plantão.</p>
        
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 4px;">TEMPERATURA MÁXIMA REEFER (CRÍTICO P1)</label>
          <input type="text" value="2.0°C" style="width: 100%; padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px;">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 4px;">LIMIAR DE RECARGA HÍDRICA (MODERADO P2)</label>
          <input type="text" value="50.0% VWC" style="width: 100%; padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px;">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 4px;">TEMPO DE TOLERÂNCIA ANTES DO DISPARO SMS</label>
          <input type="text" value="15 minutos consecutivos" style="width: 100%; padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px;">
        </div>
      </div>
    `, async () => {
      toast.success('Regras Salvas', 'Limiares atualizados no servidor central e sincronizados com os nós.');
      return true;
    }, 'Salvar Limiares');
  });

  // 7. Ligar para Motorista (Modal de Chamada)
  document.getElementById('btn-ligar-motorista')?.addEventListener('click', () => {
    Modal.open('Acionamento Direto de Frota — Lote EXP-2026-08', `
      <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 4px;">CONDUTOR RESPONSÁVEL</div>
          <div style="font-size: 15px; font-weight: 700; color: #0F172A;">José Ribamar da Silva</div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">Transportadora: Rápido Nordeste Frutas</div>
          <div style="font-size: 12px; color: #475569;">Caminhão Volvo FH 540 • Placa: <strong>RZG-4092</strong></div>
          <div style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px;">Telefone Direto: (87) 99821-4410</div>
        </div>
        <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 1.5;">
          Aviso: Instrua o motorista a verificar se o gerador Thermo King do baú está engatado na rotação correta e se a ventilação traseira não está obstruída.
        </p>
      </div>
    `, () => {
      toast.success('Ligação Solicitada', 'Conectando ao terminal GSM do condutor...');
      return true;
    }, 'Ligar Agora');
  });

  // 8. Telemetria Contínua (Toggle de Modo Live)
  let liveActive = false;
  let liveInterval = null;
  const btnTelemetria = document.getElementById('btn-telemetria-p1');
  const badgeLive = document.getElementById('telemetria-live-badge');
  const liveTempDisplay = document.getElementById('live-p1-temp');
  const txtTelemetriaBtn = document.getElementById('txt-telemetria-btn');

  btnTelemetria?.addEventListener('click', () => {
    liveActive = !liveActive;
    if (liveActive) {
      if (badgeLive) badgeLive.style.display = 'inline-block';
      if (txtTelemetriaBtn) txtTelemetriaBtn.textContent = 'Pausar Telemetria';
      toast.info('Modo Live Ativo', 'Requisitando dados do termógrafo a cada 3 segundos...');

      liveInterval = setInterval(() => {
        if (!liveTempDisplay) return;
        const base = 3.4;
        const jitter = (Math.random() * 0.2 - 0.1).toFixed(1);
        liveTempDisplay.textContent = `${(base + parseFloat(jitter)).toFixed(1)}°C`;
      }, 3000);
    } else {
      if (badgeLive) badgeLive.style.display = 'none';
      if (txtTelemetriaBtn) txtTelemetriaBtn.textContent = 'Telemetria Contínua';
      if (liveInterval) clearInterval(liveInterval);
      toast.info('Telemetria Pausada', 'Frequência retornada para o ciclo padrão de 10 min.');
    }
  });

  // 9. Marcar P1 como Atendido
  document.getElementById('btn-atender-p1')?.addEventListener('click', (e) => {
    const card = e.target.closest('.incident-card');
    if (card) {
      card.classList.add('resolved');
      card.style.borderColor = '#BBF7D0';
      card.style.opacity = '0.7';
      const kpiCount = document.getElementById('kpi-alertas-count');
      if (kpiCount) kpiCount.textContent = '2';
      const criticoPill = document.getElementById('kpi-critico-pill');
      if (criticoPill) {
        criticoPill.style.background = '#DCFCE7';
        criticoPill.style.color = '#15803D';
        criticoPill.innerHTML = '0 Críticos<br><span style="font-weight: 800;">Atendidos</span>';
      }
      toast.success('Incidente Atendido', 'Lote EXP-2026-08 marcado como resolvido. Registro arquivado no log de auditoria.');
    }
  });

  // 10. Disparar Válvula de Irrigação (P2)
  const btnIrrigacao = document.getElementById('btn-irrigacao-acao');
  const txtIrrigacao = document.getElementById('txt-irrigacao-btn');
  const valvulaStatus = document.getElementById('live-valvula-status');
  const valvulaSub = document.getElementById('live-valvula-sub');
  const vwcDisplay = document.getElementById('live-vwc-20');
  const kpiUmidadeBar = document.getElementById('kpi-umidade-bar');
  const kpiUmidadeVal = document.getElementById('kpi-umidade-val');
  const kpiUmidadeStatus = document.getElementById('kpi-umidade-status');

  btnIrrigacao?.addEventListener('click', () => {
    if (btnIrrigacao.dataset.active === 'true') {
      toast.warning('Atenção', 'O ciclo de fertirrigação já está em andamento no setor VU03.');
      return;
    }

    btnIrrigacao.dataset.active = 'true';
    btnIrrigacao.style.background = '#047857';
    if (txtIrrigacao) txtIrrigacao.textContent = '✓ Válvula Aberta • Irrigando Lâmina 4.2mm';
    if (valvulaStatus) {
      valvulaStatus.style.color = '#059669';
      valvulaStatus.textContent = 'Aberta';
    }
    if (valvulaSub) {
      valvulaSub.style.color = '#059669';
      valvulaSub.textContent = 'Vazão 12.4 m³/h';
    }

    // Simulação do aumento de umidade pós-irrigação
    setTimeout(() => {
      if (vwcDisplay) {
        vwcDisplay.textContent = '44.8%';
        vwcDisplay.style.color = '#059669';
      }
      if (kpiUmidadeVal) kpiUmidadeVal.textContent = '44,8%';
      if (kpiUmidadeBar) kpiUmidadeBar.style.width = '45%';
      if (kpiUmidadeStatus) {
        kpiUmidadeStatus.style.color = '#059669';
        kpiUmidadeStatus.innerHTML = 'Recarga<br>em curso';
      }
    }, 2500);

    toast.success('Automação Disparada', 'Comando enviado ao nó LoRa ESP32-VU03. Válvula do talhão A1 aberta com sucesso.');
  });

  // 11. Ver Curva de Umidade (Modal)
  document.getElementById('btn-ver-curva-umidade')?.addEventListener('click', () => {
    Modal.open('Curva Histórica de Umidade Volumétrica (Solo FDR)', `
      <div style="font-size: 13px; color: #475569;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span>Talhão A1 • Variedade Uva Vitória (20cm & 40cm)</span>
          <span style="font-weight: 700; color: #059669;">Taxa de Infiltração: Ideal</span>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: center;">
          <div style="display: flex; align-items: flex-end; gap: 6px; height: 120px; justify-content: space-between; padding-top: 10px;">
            ${[36, 38, 42, 45, 48, 52, 50, 47, 43, 40, 38, 38.2].map((v, i) => `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="width: 100%; height: ${(v / 60) * 100}%; background: ${v < 40 ? '#F59E0B' : '#059669'}; border-radius: 4px;"></div>
                <span style="font-size: 8px; color: #94A3B8;">${i * 2}h</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="font-size: 11px; color: #64748B;">
          Faixa de segurança estipulada pelo terroir: <strong>45% a 60% VWC</strong>.
        </div>
      </div>
    `);
  });

  // 12. Silenciar P2
  document.getElementById('btn-silenciar-p2')?.addEventListener('click', (e) => {
    e.target.textContent = '✓ Silenciado por 59m';
    e.target.style.color = '#059669';
    toast.info('Alerta Silenciado', 'Notificações sonoras do nó ESP32-VU03 desativadas por 1 hora.');
  });

  // 13. Testar Rotas de Disparo (Matriz de Comunicação)
  document.getElementById('btn-testar-rotas')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-testar-rotas');
    btn.disabled = true;
    btn.textContent = 'Enviando pings de teste...';

    const pPush = document.getElementById('status-push-pill');
    const pWhatsapp = document.getElementById('status-whatsapp-pill');
    const pSms = document.getElementById('status-sms-pill');

    if (pPush) pPush.textContent = 'Ping...';
    if (pWhatsapp) pWhatsapp.textContent = 'Ping...';
    if (pSms) pSms.textContent = 'Ping...';

    setTimeout(() => {
      if (pPush) pPush.textContent = '210ms OK';
      if (pWhatsapp) pWhatsapp.textContent = '340ms OK';
      if (pSms) pSms.textContent = 'Standby OK';
      btn.disabled = false;
      btn.textContent = 'Testar Rotas de Disparo';
      toast.success('Rotas Operantes', 'Push App e WhatsApp Cloud API responderam com 100% de integridade.');
    }, 1200);
  });

  // 14. Ver Histórico Completo de Auditoria (Modal)
  document.getElementById('btn-ver-auditoria-completa')?.addEventListener('click', () => {
    Modal.open('Log Completo de Auditoria & Rastreabilidade de Incidentes', `
      <div style="font-size: 12px; color: #334155; max-height: 380px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #E2E8F0; color: #64748B; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 8px 6px;">Horário</th>
              <th style="padding: 8px 6px;">Origem</th>
              <th style="padding: 8px 6px;">Evento</th>
              <th style="padding: 8px 6px;">Operador</th>
            </tr>
          </thead>
          <tbody>
            ${[
        { h: '11:42 BRT', o: 'Gateway GSM', e: 'SMS disparado para Rodovias Nordeste', u: 'Automação Central' },
        { h: '11:30 BRT', o: 'ESP32-VU03', e: 'Alerta de umidade enviado para Agronomia', u: 'Sensor FDR' },
        { h: '11:20 BRT', o: 'Repetidor LoRa', e: 'Chamado #4092 marcado como Resolvido', u: 'Carlos E.' },
        { h: '09:15 BRT', o: 'Central', e: 'Limiar térmico ajustado para Uva Vitória', u: 'Eng. Marília' },
        { h: '08:00 BRT', o: 'Sistema', e: 'Check diário de baterias de nós (98% OK)', u: 'Rotina Cron' },
        { h: '07:15 BRT', o: 'Estação', e: 'Calibração de anemômetro ultrassônico', u: 'Roberto Santos' },
      ].map(r => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 8px 6px; font-weight: 600;">${r.h}</td>
                <td style="padding: 8px 6px; color: #64748B;">${r.o}</td>
                <td style="padding: 8px 6px;">${r.e}</td>
                <td style="padding: 8px 6px; color: #059669; font-weight: 600;">${r.u}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);
  });
}
