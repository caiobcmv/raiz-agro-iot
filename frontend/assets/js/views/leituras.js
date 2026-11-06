/**
 * VIEW: HISTÓRICO SAFRA & CORRELAÇÃO - FIEL AO FIGMA
 * Suporta perfil Analista (Histórico Safra & Correlação com sub-barra, FDR e Brix)
 * e perfil Gestora (Rendimento Executivo e Talhões).
 */

import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

export async function renderLeituras() {
  const isAnalista = auth.getActiveProfile() === 'analista';
  if (isAnalista) {
    return renderAnalistaSafra();
  }
  return renderGestorSafra();
}

  /**
   * 1. TELA DO ANALISTA: HISTÓRICO SAFRA & CORRELAÇÃO (IMAGEM 4 FIGMA)
   */
  function renderAnalistaSafra() {
    return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica do Analista -->
      <div class="analista-subbar">
        <div class="analista-subbar-info">
          <span class="analista-dot-pulse"></span>
          <span>Safra 2025/2026 Ativa • Petrolina (45.0 ha) • Variedades: Uva Vitória, Crimson, Thompson • 4 Talhões Homologados</span>
          <span style="color: #64748B; font-size: 11px; font-weight: 400;">Sincronizado há 2 min</span>
        </div>
        <div class="analista-subbar-actions">
          <button class="btn-analista-sync" id="btn-sync-safra">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Sincronizar ThingSpeak</span>
          </button>
          <button class="btn-analista-export" id="btn-export-safra">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Relatório (CSV/PDF)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs do Histórico Safra Analista -->
      <div class="kpi-grid-4col">
        <!-- KPI 1 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">PRODUÇÃO TOTAL DA SAFRA</span>
            <span class="kpi-badge green">META ATINGIDA</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num">1.480 ton</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Meta: 1.380 ton <span style="color: #059669; font-weight: 600;">(+7.2%)</span>
          </div>
          <div class="kpi-bottom-row">
            <span style="color: #059669; font-weight: 600;">+6.8% vs ciclo anterior</span>
            <span>32.9 ton/ha médio</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">EFICIÊNCIA HÍDRICA (FDR)</span>
            <span class="kpi-badge blue">OTIMIZADO</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #0284C7;">4,1 m³/ton</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Lâmina: 140 m³/ha vs Penman-Monteith
          </div>
          <div class="kpi-bottom-row">
            <span>Umidade solo (FDR): <strong>58% VWC</strong></span>
            <span style="color: #059669; font-weight: 600;">Manejo Sustentável</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">GRAU BRIX MÉDIO & CALIBRE</span>
            <span class="kpi-badge green">EXPORTAÇÃO A+</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #059669;">18,2° Brix</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Padrão Exportação (&ge; 17.5°)
          </div>
          <div class="kpi-bottom-row">
            <span>Calibre médio: <strong>22mm</strong></span>
            <span style="color: #047857; font-weight: 600;">100% Padrão Comercial</span>
          </div>
        </div>

        <!-- KPI 4 -->
        <div class="kpi-analista-card">
          <div class="kpi-top-row">
            <span class="kpi-label">AUDITORIA DE DADOS & SONDAS</span>
            <span class="kpi-badge yellow">99.8% ÍNTEGRO</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-big-num" style="color: #D97706;">99.8%</span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Taxa de Integridade Homologada
          </div>
          <div class="kpi-bottom-row">
            <span>24 Sondas homologadas</span>
            <span style="color: #64748B;">2 descartes validados hoje</span>
          </div>
        </div>
      </div>

      <!-- Comparativo de Rendimento & Eficiência Hídrica entre Safras -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: #10B981;"></i>
              Comparativo de Rendimento & Eficiência Hídrica entre Safras
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Evolução Multiciclo (2023 — 2026) • Otimização hídrica no Vale do São Francisco
            </p>
          </div>

          <div class="map-filter-tabs">
            <button class="map-tab-btn active" data-safra-filter="todos">Todos os Talhões</button>
            <button class="map-tab-btn" data-safra-filter="vitoria">Uva Vitória</button>
            <button class="map-tab-btn" data-safra-filter="thompson">Thompson</button>
            <button class="map-tab-btn" data-safra-filter="crimson">Crimson</button>
          </div>
        </div>

        <!-- Legenda de Barras -->
        <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 16px; font-size: 11px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: #10B981;"></span>
            Produtividade (ton/ha)
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: #0284C7;"></span>
            Consumo Água (m³/ha)
          </span>
        </div>

        <!-- Barras Horizontais Comparativas -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <!-- Safra 2023/2024 -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
              <span>Safra 2023/2024</span>
              <span style="font-size: 11px; color: #64748B;">28,4 ton/ha • 182 m³/ha</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="height: 18px; background: #F1F5F9; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 68%; background: #10B981; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: #FFFFFF;">
                  28,4 ton/ha
                </div>
              </div>
              <div style="height: 18px; background: #F1F5F9; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 82%; background: #0284C7; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: #FFFFFF;">
                  182 m³/ha
                </div>
              </div>
            </div>
          </div>

          <!-- Safra 2024/2025 -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
              <span>Safra 2024/2025</span>
              <span style="font-size: 11px; color: #64748B;">30,5 ton/ha • 168 m³/ha</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="height: 18px; background: #F1F5F9; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 76%; background: #10B981; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: #FFFFFF;">
                  30,5 ton/ha
                </div>
              </div>
              <div style="height: 18px; background: #F1F5F9; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 74%; background: #0284C7; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: #FFFFFF;">
                  168 m³/ha
                </div>
              </div>
            </div>
          </div>

          <!-- Safra 2025/2026 (Atual) [CICLO ATIVO] -->
          <div style="background: #FAFDFB; border: 1.5px solid #10B981; border-radius: 10px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 6px;">
              <span style="display: flex; align-items: center; gap: 6px;">
                Safra 2025/2026 (Atual)
                <span style="background: #183D2E; color: #FFFFFF; font-size: 9px; padding: 2px 6px; border-radius: 4px;">CICLO ATIVO</span>
              </span>
              <span>34,2 ton/ha • 140 m³/ha</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="height: 22px; background: #ECFDF5; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 88%; background: #059669; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-size: 11px; font-weight: 700; color: #FFFFFF;">
                  <span>&uarr; Produtividade</span>
                  <span>34,2 ton/ha (+12.1%)</span>
                </div>
              </div>
              <div style="height: 22px; background: #EFF6FF; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: 62%; background: #0284C7; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-size: 11px; font-weight: 700; color: #FFFFFF;">
                  <span>&darr; Consumo Reduzido</span>
                  <span>140 m³/ha (-16.7%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Mini Cards no Rodapé do Rendimento -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">EFICIÊNCIA INSUMO</div>
            <div style="font-size: 18px; font-weight: 800; color: #047857; margin-top: 2px;">+19.8%</div>
            <div style="font-size: 10px; color: #64748B;">Produtividade x Adubo</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">ÁGUA POUPADA</div>
            <div style="font-size: 18px; font-weight: 800; color: #0284C7; margin-top: 2px;">42 m³/ha</div>
            <div style="font-size: 10px; color: #64748B;">Divisor LoRa FDR</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">ÍNDICE FISIOLÓGICO</div>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">94,2 / 100</div>
            <div style="font-size: 10px; color: #059669; font-weight: 600;">Qualidade Superior</div>
          </div>
        </div>
      </div>

      <!-- Correlação Fenológica: Umidade de Solo (VWC) vs. Acúmulo de Brix -->
      <div class="analista-chart-box">
        <div class="chart-header-row">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="line-chart" style="width: 18px; height: 18px; color: #10B981;"></i>
              Correlação Fenológica: Umidade de Solo (VWC) vs. Acúmulo de Brix
            </h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">
              Curva contínua de monitoramento com sondas capacitivas FDR ao longo do ciclo de maturação
            </p>
          </div>
          <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
            Rede FDR 30/60 Ativa
          </span>
        </div>

        <!-- Legenda -->
        <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 14px; font-size: 11px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
            Curva Brix (°Bx)
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
            Umidade FDR 30cm (% VWC)
          </span>
        </div>

        <!-- Gráfico SVG com Curva de Maturação e Concentração de Brix -->
        <div style="position: relative; width: 100%; height: 210px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 10px;">
          <svg viewBox="0 0 800 180" style="width: 100%; height: 100%;" preserveAspectRatio="xMidYMid meet">
            <!-- Linhas de Estágios Fenológicos -->
            <line x1="200" y1="0" x2="200" y2="180" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,2"/>
            <line x1="400" y1="0" x2="400" y2="180" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,2"/>
            <line x1="600" y1="0" x2="600" y2="180" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,2"/>

            <!-- Curva Umidade FDR 30cm (Descendente suave para forçar concentração de açúcares) -->
            <path d="M 0,60 C 180,65 360,95 540,120 C 660,135 740,140 800,140" fill="none" stroke="#0284C7" stroke-width="2.8"/>

            <!-- Curva Acúmulo de Brix (Ascendente até atingir 18.2° Brix) -->
            <path d="M 0,160 C 180,150 360,120 540,80 C 660,50 740,42 800,40" fill="none" stroke="#10B981" stroke-width="3"/>

            <!-- Ponto Final de Colheita (18.2° Brix) -->
            <circle cx="780" cy="40" r="5" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
            <text x="690" y="32" fill="#047857" font-size="11" font-weight="800">18.2° Brix (Ideal)</text>
          </svg>

          <!-- Rótulos Fenológicos no Eixo X -->
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin-top: 4px; padding: 0 10px;">
            <span>Início Maturação (Semana 7)</span>
            <span>Enveraison / Pinta (Semana 9)</span>
            <span>Acúmulo Máximo (Semana 11)</span>
            <span style="color: #047857; font-weight: 700;">Colheita Homologada (Semana 13)</span>
          </div>
        </div>

        <!-- 3 KPIs da Correlação -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700;">FAIXA DE MATURAÇÃO</div>
            <div style="font-size: 16px; font-weight: 800; color: #0284C7;">28% — 32% VWC</div>
            <div style="font-size: 10px; color: #64748B;">Ideal mantido no ciclo</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700;">ACÚMULO DE SÓLIDOS</div>
            <div style="font-size: 16px; font-weight: 800; color: #059669;">+14% Brix</div>
            <div style="font-size: 10px; color: #64748B;">Sem desidratar engaço</div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; color: #64748B; font-weight: 700;">RISCO MÍLDIO</div>
            <div style="font-size: 16px; font-weight: 800; color: #0F172A;">0% Baixo Risco</div>
            <div style="font-size: 10px; color: #64748B;">Sensor sem molhamento</div>
          </div>
        </div>
      </div>

      <!-- Seção Inferior: Destino da Produção (Donut) & Desempenho por Talhão & Lote -->
      <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px;">
        <!-- Card Esquerda: Destino da Produção & Conformidade -->
        <div class="analista-chart-box">
          <div class="chart-header-row">
            <div>
              <h4 style="font-size: 15px; font-weight: 700; color: #0F172A;">
                Destino da Produção & Conformidade
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Classificação comercial (Tabela lote_classificacao)
              </p>
            </div>
            <span style="font-size: 10px; color: #64748B; font-weight: 600;">Volume Total</span>
          </div>

          <div style="display: flex; align-items: center; gap: 20px; margin: 16px 0;">
            <!-- Donut 65% Exportação -->
            <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" stroke-width="3.8"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0284C7" stroke-width="3.8" stroke-dasharray="25, 100" stroke-dashoffset="-65"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" stroke-width="3.8" stroke-dasharray="65, 100"/>
              </svg>
              <div class="donut-center-wrap">
                <div class="donut-center-val">65%</div>
                <div class="donut-center-sub">EXPORTAÇÃO</div>
              </div>
            </div>

            <!-- Legenda -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                  Exportação (Europa/EUA)
                </span>
                <strong>65% (962 ton)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284C7;"></span>
                  Mercado Interno
                </span>
                <strong>25% (370 ton)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></span>
                  Processamento / Sucos
                </span>
                <strong>10% (148 ton)</strong>
              </div>
            </div>
          </div>

          <!-- Selo GlobalG.A.P. -->
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="shield-check" style="width: 18px; height: 18px; color: #16A34A;"></i>
              <div>
                <div style="font-size: 12px; font-weight: 700; color: #14532D;">GlobalG.A.P. Compliance</div>
                <div style="font-size: 10px; color: #15803D;">Auditado via telemetria contínua US915</div>
              </div>
            </div>
            <span style="background: #16A34A; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">100% OK</span>
          </div>
        </div>

        <!-- Card Direita: Desempenho por Talhão & Lote -->
        <div class="analista-chart-box">
          <div class="chart-header-row">
            <div>
              <h4 style="font-size: 15px; font-weight: 700; color: #0F172A;">
                Desempenho por Talhão & Lote
              </h4>
              <p style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Métricas aferidas por lote auditado
              </p>
            </div>
            <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
              4 Lotes
            </span>
          </div>

          <!-- Lista de 4 Lotes -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Lote A1 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: #ECFDF5; color: #047857; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 6px;">A1</span>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Talhão A1 • Uva Vitória</div>
                  <div style="font-size: 10px; color: #64748B;">12.5 ha • Lâmina 3.9 m³/ton • FDR 30/60</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">18.2° Bx</span>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">36,8 ton/ha</div>
                  <div style="font-size: 10px; color: #059669; font-weight: 600;">Concluído</div>
                </div>
              </div>
            </div>

            <!-- Lote A2 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: #ECFDF5; color: #047857; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 6px;">A2</span>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Talhão A2 • Uva Crimson</div>
                  <div style="font-size: 10px; color: #64748B;">10.0 ha • Lâmina 4.1 m³/ton • FDR 30/60</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">18.5° Bx</span>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">34,5 ton/ha</div>
                  <div style="font-size: 10px; color: #059669; font-weight: 600;">Concluído</div>
                </div>
              </div>
            </div>

            <!-- Lote B1 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 6px;">B1</span>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Talhão B1 • Uva Thompson</div>
                  <div style="font-size: 10px; color: #64748B;">14.0 ha • Lâmina 4.4 m³/ton • FDR 30/60</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="background: #EFF6FF; color: #1D4ED8; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">17.8° Bx</span>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">31,2 ton/ha</div>
                  <div style="font-size: 10px; color: #D97706; font-weight: 600;">Em Colheita</div>
                </div>
              </div>
            </div>

            <!-- Lote B2 -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: #F1F5F9; color: #475569; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 6px;">B2</span>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Talhão B2 • Uva Autumn Crisp</div>
                  <div style="font-size: 10px; color: #64748B;">8.5 ha • Lâmina 4.0 m³/ton • FDR 30/60</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">18.0° Bx</span>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">35,0 ton/ha</div>
                  <div style="font-size: 10px; color: #64748B; font-weight: 600;">Em Produção</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Botão Relatório Detalhado -->
          <button class="incident-btn-primary" id="btn-export-lotes-analista" style="width: 100%; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px;">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
            <span>Exportar Relatório Detalhado de Lotes</span>
          </button>
        </div>
      </div>
    </div>
  `;
  }

    /**
     * 2. TELA DA GESTORA: HISTÓRICO SAFRA EXECUTIVO (FIEL AO DESIGN DE REFERÊNCIA)
     */
    function renderGestorSafra() {
      return `
    <div class="dashboard-canvas apple-animate-in">

      <!-- LINHA 1: 4 KPIS -->
      <div class="hs-kpi-grid">
        <!-- KPI 1: PRODUÇÃO TOTAL -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">PRODUÇÃO TOTAL</span>
            <div class="hs-kpi-icon-box green">
              <i data-lucide="archive" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val">
            1.480 <span class="hs-kpi-unit">ton</span>
          </div>
          <!-- Mini barras crescentes -->
          <div class="hs-kpi-bars">
            <div class="hs-kpi-bar" style="height: 8px; background: #A7F3D0;"></div>
            <div class="hs-kpi-bar" style="height: 11px; background: #6EE7B7;"></div>
            <div class="hs-kpi-bar" style="height: 14px; background: #34D399;"></div>
            <div class="hs-kpi-bar" style="height: 17px; background: #10B981;"></div>
            <div class="hs-kpi-bar" style="height: 20px; background: #059669;"></div>
            <div class="hs-kpi-bar" style="height: 24px; background: #047857;"></div>
          </div>
          <!-- Rodapé -->
          <div>
            <div class="hs-kpi-footer">
              <span style="color: #059669; font-weight: 700;">↑ +12% vs ciclo anterior</span>
              <span class="hs-kpi-meta" style="font-family: var(--font-mono, monospace); font-size: 11px; color: #64748B;">1.480 / 1.600 ton</span>
            </div>
            <div class="hs-kpi-progress">
              <div class="hs-kpi-progress-fill" style="width: 92.5%;"></div>
            </div>
          </div>
        </div>

        <!-- KPI 2: PRODUTIVIDADE MÉDIA -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">PRODUTIVIDADE MÉDIA</span>
            <div class="hs-kpi-icon-box green">
              <i data-lucide="trending-up" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val">
            34,2 <span class="hs-kpi-unit">ton/ha</span>
          </div>
          <!-- Sparkline de área suave ascendente -->
          <div class="hs-kpi-sparkline">
            <svg width="100%" height="24" viewBox="0 0 120 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hs-grad-kpi2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <path d="M0,20 Q20,19 40,15 T80,8 T120,3 L120,24 L0,24 Z" fill="url(#hs-grad-kpi2)"/>
              <path d="M0,20 Q20,19 40,15 T80,8 T120,3" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <!-- Rodapé -->
          <div>
            <div class="hs-kpi-footer">
              <span style="color: #059669; font-weight: 700;">● +2,2 ton/ha acima da meta</span>
              <span class="hs-kpi-meta" style="font-family: var(--font-mono, monospace); font-size: 11px; color: #64748B;">Meta: 32,0</span>
            </div>
            <div class="hs-kpi-progress">
              <div class="hs-kpi-progress-fill" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        <!-- KPI 3: EFICIÊNCIA HÍDRICA -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">EFICIÊNCIA HÍDRICA</span>
            <div class="hs-kpi-icon-box blue">
              <i data-lucide="droplet" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val" style="color: #0284C7;">
            4,1 <span class="hs-kpi-unit">m³/ton</span>
          </div>
          <!-- Pílula e variação -->
          <div class="hs-kpi-pill-row">
            <span class="hs-tag blue">CONSUMO OTIMIZADO</span>
            <span style="color: #0284C7; font-size: 11px; font-weight: 700;">↓ -8.4% aplicado</span>
          </div>
          <!-- Barra segmentada -->
          <div class="hs-kpi-seg-bar">
            <div style="flex: 4.5; background: #0284C7; border-radius: 2px;"></div>
            <div style="flex: 3.5; background: #38BDF8; border-radius: 2px;"></div>
            <div style="flex: 2; background: #E2E8F0; border-radius: 2px;"></div>
          </div>
          <!-- Rodapé em mono cinza -->
          <div class="hs-kpi-footer" style="margin-bottom: 0;">
            <span style="font-family: var(--font-mono, monospace); font-size: 10px; color: #94A3B8;">Alta Eficiência</span>
            <span style="font-family: var(--font-mono, monospace); font-size: 10px; color: #94A3B8;">-42 m³/ha vs 23/24</span>
          </div>
        </div>

        <!-- KPI 4: GRAU BRIX MÉDIO -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">GRAU BRIX MÉDIO</span>
            <div class="hs-kpi-icon-box green">
              <i data-lucide="badge-check" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val" style="color: #059669;">
            18,2° <span class="hs-kpi-unit">Brix</span>
          </div>
          <!-- Pílula e ideal -->
          <div class="hs-kpi-pill-row">
            <span class="hs-tag darkgreen">PADRÃO EXPORTAÇÃO A+</span>
            <span style="color: #64748B; font-size: 11px;">Ideal: ≥17,5°</span>
          </div>
          <!-- Barra escala -->
          <div class="hs-kpi-scale-bar"></div>
          <div class="hs-kpi-scale-labels">
            <span>14° Mesa</span>
            <span>16° Premium</span>
            <span style="color: #059669; font-weight: 700;">18.2° Atual</span>
          </div>
        </div>
      </div>

      <!-- LINHA 2: 2/3 + 1/3 -->
      <div class="hs-split-grid">
        <!-- ESQUERDA: Comparativo Visual de Rendimento entre Safras -->
        <div class="hs-card">
          <div class="hs-card-header">
            <h3 class="hs-card-title">
              <span class="hs-dot-green"></span>
              Comparativo Visual de Rendimento entre Safras
            </h3>
            <div style="display: flex; align-items: center; gap: 16px; font-size: 11px; color: #475569;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #10B981;"></span>
                Produtividade (ton/ha)
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #0284C7;"></span>
                Consumo Água (m³/ha)
              </span>
            </div>
          </div>

          <!-- Bloco 1: Safra 2023/2024 -->
          <div class="hs-season-block">
            <div class="hs-season-header">
              <span style="font-weight: 700; color: #0F172A;">Safra 2023/2024</span>
              <span style="font-family: var(--font-mono, monospace); color: #64748B; font-size: 11px;">28,4 ton/ha • 182 m³/ha</span>
            </div>
            <div class="hs-season-track">
              <div class="hs-season-fill green" style="width: 50%;">
                <span>Produtividade</span>
                <span style="font-family: var(--font-mono, monospace);">28,4 ton/ha</span>
              </div>
            </div>
            <div class="hs-season-track">
              <div class="hs-season-fill blue" style="width: 63%;">
                <span>Consumo Hídrico</span>
                <span style="font-family: var(--font-mono, monospace);">182 m³/ha</span>
              </div>
            </div>
          </div>

          <!-- Bloco 2: Safra 2024/2025 -->
          <div class="hs-season-block">
            <div class="hs-season-header">
              <span style="font-weight: 700; color: #0F172A;">Safra 2024/2025</span>
              <span style="font-family: var(--font-mono, monospace); color: #64748B; font-size: 11px;">30,5 ton/ha • 168 m³/ha</span>
            </div>
            <div class="hs-season-track">
              <div class="hs-season-fill green" style="width: 53%;">
                <span>Produtividade</span>
                <span style="font-family: var(--font-mono, monospace);">30,5 ton/ha</span>
              </div>
            </div>
            <div class="hs-season-track">
              <div class="hs-season-fill blue" style="width: 58%;">
                <span>Consumo Hídrico</span>
                <span style="font-family: var(--font-mono, monospace);">168 m³/ha</span>
              </div>
            </div>
          </div>

          <!-- Bloco 3: Safra 2025/2026 (Atual) [CICLO ATIVO] -->
          <div class="hs-season-block active">
            <div class="hs-season-header">
              <span style="font-weight: 700; color: #065F46; display: flex; align-items: center; gap: 8px;">
                Safra 2025/2026 (Atual)
                <span style="background: #183D2E; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.3px;">CICLO ATIVO</span>
              </span>
              <span style="font-family: var(--font-mono, monospace); font-weight: 700; color: #065F46; font-size: 11px;">34,2 ton/ha • 140 m³/ha</span>
            </div>
            <div class="hs-season-track">
              <div class="hs-season-fill green-dark" style="width: 60%;">
                <span>↑ Produtividade</span>
                <span style="font-family: var(--font-mono, monospace);">34,2 ton/ha (+12.1%)</span>
              </div>
            </div>
            <div class="hs-season-track blue-tint">
              <div class="hs-season-fill blue" style="width: 49%;">
                <span>💧 Consumo Reduzido</span>
                <span style="font-family: var(--font-mono, monospace);">140 m³/ha (-16.7%)</span>
              </div>
            </div>
          </div>

          <!-- 3 mini-cards em linha -->
          <div class="hs-season-kpis">
            <div class="hs-season-mini">
              <div class="hs-kpi-icon-box green">
                <i data-lucide="gauge" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #0F172A;">+19.8% Eficiência</div>
                <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">PRODUTIVIDADE X INSUMO</div>
              </div>
            </div>
            <div class="hs-season-mini">
              <div class="hs-kpi-icon-box blue">
                <i data-lucide="droplet" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #0F172A;">42 m³/ha Poupados</div>
                <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">GESTÃO IOT LORA</div>
              </div>
            </div>
            <div class="hs-season-mini">
              <div class="hs-kpi-icon-box green">
                <i data-lucide="award" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #0F172A;">94.2 / 100</div>
                <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">ÍNDICE QUALIDADE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- DIREITA: Classificação Comercial -->
        <div class="hs-card" style="display: flex; flex-direction: column;">
          <div class="hs-card-header">
            <h3 class="hs-card-title">Classificação Comercial</h3>
            <span class="hs-pill-badge gray">VOLUME TOTAL</span>
          </div>

          <!-- Donut SVG -->
          <div class="hs-donut-wrap">
            <svg width="150" height="150" viewBox="0 0 160 160" style="transform: rotate(-90deg);">
              <!-- Fundo base sutil -->
              <circle cx="80" cy="80" r="58" fill="none" stroke="#F1F5F9" stroke-width="16" />
              <!-- Segmento 1: Verde 65% (circumference ~364.4 => 65% is 236.8) -->
              <circle cx="80" cy="80" r="58" fill="none" stroke="#10B981" stroke-width="16"
                stroke-dasharray="233 131" stroke-dashoffset="0" />
              <!-- Segmento 2: Azul 25% (25% is 91.1) -->
              <circle cx="80" cy="80" r="58" fill="none" stroke="#0284C7" stroke-width="16"
                stroke-dasharray="87 277" stroke-dashoffset="-237" />
              <!-- Segmento 3: Cinza-azulado 10% (10% is 36.4) -->
              <circle cx="80" cy="80" r="58" fill="none" stroke="#94A3B8" stroke-width="16"
                stroke-dasharray="32 332" stroke-dashoffset="-328" />
            </svg>
            <div class="hs-donut-center">
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1; font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);">65%</div>
              <div style="font-size: 9px; font-weight: 700; color: #059669; letter-spacing: 0.5px; margin-top: 3px;">EXPORTAÇÃO</div>
            </div>
          </div>

          <!-- Legenda em 3 linhas -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin: 14px 0 18px;">
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #10B981;"></span>
                Exportação (Europa/EUA)
              </span>
              <span style="font-weight: 700; color: #0F172A;">65% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(962 ton)</span></span>
            </div>
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #0284C7;"></span>
                Mercado Interno
              </span>
              <span style="font-weight: 700; color: #0F172A;">25% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(370 ton)</span></span>
            </div>
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #94A3B8;"></span>
                Processamento / Sucos
              </span>
              <span style="font-weight: 700; color: #0F172A;">10% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(148 ton)</span></span>
            </div>
          </div>

          <!-- Rodapé: GlobalG.A.P. Compliance -->
          <div class="hs-compliance-box">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="shield-check" style="width: 18px; height: 18px; color: #16A34A;"></i>
              <div>
                <div style="font-size: 12px; font-weight: 700; color: #14532D;">GlobalG.A.P. Compliance</div>
                <div style="font-size: 9px; font-weight: 700; color: #15803D; font-family: var(--font-mono, monospace);">AUDITADO LORAWAN</div>
              </div>
            </div>
            <span style="background: #15803D; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">100% OK</span>
          </div>
        </div>
      </div>

      <!-- LINHA 3: 2/3 + 1/3 -->
      <div class="hs-split-grid">
        <!-- ESQUERDA: Desempenho por Talhão -->
        <div class="hs-card">
          <div class="hs-card-header" style="margin-bottom: 12px;">
            <div>
              <h3 class="hs-card-title">Desempenho por Talhão</h3>
              <p class="hs-card-subtitle">Produtividade aferida, hídrico e maturidade individualizada</p>
            </div>
            <span class="hs-pill-badge gray">4 talhões monitorados</span>
          </div>

          <div class="hs-table-wrap">
            <table class="hs-table">
              <thead>
                <tr>
                  <th>TALHÃO</th>
                  <th>VARIEDADE</th>
                  <th>ÁREA</th>
                  <th>PRODUTIVIDADE REAL</th>
                  <th>CONSUMO ÁGUA</th>
                  <th>BRIX</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <!-- Linha 1: A1 -->
                <tr>
                  <td>
                    <span style="background: #ECFDF5; color: #047857; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-block;">Talhão A1</span>
                  </td>
                  <td style="font-weight: 600;">Uva Vitória</td>
                  <td style="font-family: var(--font-mono, monospace); color: #475569;">12.5 ha</td>
                  <td>
                    <span style="font-family: var(--font-mono, monospace); font-weight: 700;">36.8 ton/ha</span>
                    <span style="display: inline-block; width: 44px; height: 5px; background: #10B981; border-radius: 3px; vertical-align: middle; margin-left: 8px;"></span>
                  </td>
                  <td style="font-family: var(--font-mono, monospace); color: #0284C7; font-weight: 600;">
                    💧 3.9 m³/ton
                  </td>
                  <td>
                    <span style="background: #ECFDF5; color: #047857; font-weight: 700; font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 8px; border-radius: 12px;">19.2°</span>
                  </td>
                  <td>
                    <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #059669;"></span>
                      Concluído
                    </span>
                  </td>
                </tr>

                <!-- Linha 2: A2 -->
                <tr>
                  <td>
                    <span style="background: #ECFDF5; color: #047857; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-block;">Talhão A2</span>
                  </td>
                  <td style="font-weight: 600;">Uva Crimson</td>
                  <td style="font-family: var(--font-mono, monospace); color: #475569;">10.0 ha</td>
                  <td>
                    <span style="font-family: var(--font-mono, monospace); font-weight: 700;">34.5 ton/ha</span>
                    <span style="display: inline-block; width: 40px; height: 5px; background: #10B981; border-radius: 3px; vertical-align: middle; margin-left: 8px;"></span>
                  </td>
                  <td style="font-family: var(--font-mono, monospace); color: #0284C7; font-weight: 600;">
                    💧 4.1 m³/ton
                  </td>
                  <td>
                    <span style="background: #ECFDF5; color: #047857; font-weight: 700; font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 8px; border-radius: 12px;">18.5°</span>
                  </td>
                  <td>
                    <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #059669;"></span>
                      Concluído
                    </span>
                  </td>
                </tr>

                <!-- Linha 3: B1 -->
                <tr>
                  <td>
                    <span style="background: #FEF3C7; color: #B45309; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-block;">Talhão B1</span>
                  </td>
                  <td style="font-weight: 600;">Uva Thompson</td>
                  <td style="font-family: var(--font-mono, monospace); color: #475569;">14.0 ha</td>
                  <td>
                    <span style="font-family: var(--font-mono, monospace); font-weight: 700;">31.2 ton/ha</span>
                    <span style="display: inline-block; width: 36px; height: 5px; background: #F59E0B; border-radius: 3px; vertical-align: middle; margin-left: 8px;"></span>
                  </td>
                  <td style="font-family: var(--font-mono, monospace); color: #0284C7; font-weight: 600;">
                    💧 4.4 m³/ton
                  </td>
                  <td>
                    <span style="background: #FEF3C7; color: #B45309; font-weight: 700; font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 8px; border-radius: 12px;">17.8°</span>
                  </td>
                  <td>
                    <span style="background: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #D97706;"></span>
                      Em Colheita
                    </span>
                  </td>
                </tr>

                <!-- Linha 4: B2 -->
                <tr>
                  <td>
                    <span style="background: #F1F5F9; color: #475569; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-block;">Talhão B2</span>
                  </td>
                  <td style="font-weight: 600;">Uva Autumn Crisp</td>
                  <td style="font-family: var(--font-mono, monospace); color: #475569;">8.5 ha</td>
                  <td>
                    <span style="font-family: var(--font-mono, monospace); font-weight: 700;">35.0 ton/ha</span>
                    <span style="display: inline-block; width: 42px; height: 5px; background: #10B981; border-radius: 3px; vertical-align: middle; margin-left: 8px;"></span>
                  </td>
                  <td style="font-family: var(--font-mono, monospace); color: #0284C7; font-weight: 600;">
                    💧 4.0 m³/ton
                  </td>
                  <td>
                    <span style="background: #F1F5F9; color: #475569; font-weight: 700; font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 8px; border-radius: 12px;">18.0°</span>
                  </td>
                  <td>
                    <span style="background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #64748B;"></span>
                      Planejado
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Rodapé Tabela -->
          <div class="hs-table-footer">
            <div>
              Área consolidada: <strong style="color: #0F172A; font-family: var(--font-mono, monospace);">45.0 hectares</strong>
            </div>
            <div class="hs-pagination">
              <button class="hs-page-btn" style="opacity: 0.6; cursor: default;">Anterior</button>
              <button class="hs-page-btn active">1</button>
              <button class="hs-page-btn">2</button>
              <button class="hs-page-btn">Próximo</button>
            </div>
          </div>
        </div>

        <!-- DIREITA: Correlação IoT -->
        <div class="hs-card" style="display: flex; flex-direction: column;">
          <div class="hs-card-header" style="margin-bottom: 12px;">
            <h3 class="hs-card-title">
              <i data-lucide="radio" style="width: 16px; height: 16px; color: #10B981;"></i>
              Correlação IoT
            </h3>
            <span class="hs-pill-badge green">MESH ATIVA</span>
          </div>

          <!-- Sub-card 1: Umidade Solo (VWC) -->
          <div class="hs-iot-subcard">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="waves" style="width: 16px; height: 16px; color: #0284C7;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Umidade Solo (VWC)</div>
                  <div style="font-family: var(--font-mono, monospace); font-size: 10px; color: #64748B;">FDR 30cm & 60cm</div>
                </div>
              </div>
              <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">+14% Brix</span>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px;">
              <span style="color: #64748B;">Faixa de Maturação Ideal</span>
              <span style="font-family: var(--font-mono, monospace); font-weight: 700; color: #0F172A;">28 – 32% VWC</span>
            </div>
            <div class="hs-range-track">
              <div class="hs-range-fill" style="left: 35%; width: 40%;"></div>
              <div class="hs-range-marker" style="left: 56%;"></div>
            </div>

            <!-- Sparkline de área suave -->
            <div style="width: 100%; height: 22px;">
              <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hs-grad-vwc" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#10B981" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M0,16 Q25,8 50,14 T100,6 L100,22 L0,22 Z" fill="url(#hs-grad-vwc)"/>
                <path d="M0,16 Q25,8 50,14 T100,6" fill="none" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
          </div>

          <!-- Sub-card 2: Risco Mildio & Molhamento -->
          <div class="hs-iot-subcard">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="leaf" style="width: 16px; height: 16px; color: #059669;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Risco Mildio & Molhamento</div>
                  <div style="font-family: var(--font-mono, monospace); font-size: 10px; color: #64748B;">Sensor Dielétrico Foliar</div>
                </div>
              </div>
              <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">-92% Perdas</span>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
              <span style="color: #059669; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>
                Baixo Risco (0%)
              </span>
              <span style="font-family: var(--font-mono, monospace); font-size: 10px; color: #64748B;">Lâmina d'água &lt; 4h</span>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
              <span style="color: #64748B;">Histórico 24h</span>
              <span style="color: #059669; font-weight: 700;">Sem Infecção</span>
            </div>

            <div class="hs-ticks-strip">
              ${Array(24).fill('<div class="hs-tick"></div>').join('')}
            </div>
          </div>

          <!-- Botão largo Série Histórica de Telemetria -->
          <button class="hs-btn-telemetria" id="hs-btn-telemetria">
            <span>Série Histórica de Telemetria</span>
            <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>

    </div>
    `;
    }

export function setupLeiturasEvents() {
  const btnSync = document.getElementById('btn-sync-safra');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      toast.info('Sincronização Safra', 'Consultando dados de colheita dos talhões homologados...');
      setTimeout(() => {
        toast.success('Safra Sincronizada', 'Métricas consolidadas com canais LoRaWAN US915.');
      }, 800);
    });
  }

  const btnExport = document.getElementById('btn-export-safra');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      toast.success('Download Concluído', 'Relatório executivo da safra 2025/2026 gerado com sucesso.');
    });
  }

  const btnLotes = document.getElementById('btn-export-lotes-analista');
  if (btnLotes) {
    btnLotes.addEventListener('click', () => {
      toast.success('Exportação de Lotes', 'Planilha detalhada de lotes (A1, A2, B1, B2) exportada.');
    });
  }

  // Filtros de Talhão (Analista)
  document.querySelectorAll('[data-safra-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-safra-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      toast.info('Filtro de Safra', `Exibindo indicadores para: ${e.currentTarget.innerText}`);
    });
  });

  // Evento botão Gestora Série Histórica
  const btnTelemetria = document.getElementById('hs-btn-telemetria');
  if (btnTelemetria) {
    btnTelemetria.addEventListener('click', () => {
      toast.info('Série Histórica', 'Telemetria e dados agroclimáticos dos últimos 90 dias.');
    });
  }

  // Paginação visual da tabela Gestora
  document.querySelectorAll('.hs-page-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.hs-page-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn('Erro ao carregar ícones lucide:', e);
    }
  }
}
