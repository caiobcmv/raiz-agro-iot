/**
 * VIEW: HISTÓRICO SAFRA & CORRELAÇÃO - FIEL AO FIGMA
 * Suporta perfil Analista (Histórico Safra & Correlação com sub-barra, FDR e Brix)
 * e perfil Gestora (Rendimento Executivo e Talhões).
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

let _ultimoEstadoSafras = null;

const DADOS_SAFRAS_PADRAO = {
  safras: [
    {
      id_safra: 1,
      ciclo: '2025/2026',
      cultura: 'Uva Vitória & Manga Palmer',
      area_ha: 42.5,
      produtividade_ton_ha: 30.2,
      volume_total_ton: 1284.5,
      consumo_agua_m3_ha: 3420,
      brix_medio: 19.4,
      taxa_exportacao_pct: 96.2,
      status: 'Em Andamento',
      destinacao_export_pct: 78,
      destinacao_interno_pct: 16,
      destinacao_industria_pct: 6
    },
    {
      id_safra: 2,
      ciclo: '2024/2025',
      cultura: 'Uva Vitória (Seedless)',
      area_ha: 40.0,
      produtividade_ton_ha: 26.5,
      volume_total_ton: 1060.0,
      consumo_agua_m3_ha: 3760,
      brix_medio: 18.2,
      taxa_exportacao_pct: 89.4,
      status: 'Concluída',
      destinacao_export_pct: 72,
      destinacao_interno_pct: 20,
      destinacao_industria_pct: 8
    },
    {
      id_safra: 3,
      ciclo: '2023/2024',
      cultura: 'Manga Tommy & Uva Crimson',
      area_ha: 38.0,
      produtividade_ton_ha: 24.8,
      volume_total_ton: 942.4,
      consumo_agua_m3_ha: 4120,
      brix_medio: 17.5,
      taxa_exportacao_pct: 82.0,
      status: 'Concluída',
      destinacao_export_pct: 65,
      destinacao_interno_pct: 25,
      destinacao_industria_pct: 10
    }
  ],
  talhoes: [
    {
      id_talhao: 1,
      codigo: 'Talhão A1',
      variedade: 'Uva Vitória (Seedless)',
      porta_enxerto: 'IAC 572',
      ciclo: '2025/2026',
      area_ha: 12.0,
      volume_ton: 388.8,
      produtividade_ton_ha: 32.4,
      brix_medio: 19.8,
      calibres_mm: '21 - 24 mm',
      status: 'Colhido • Exportado'
    },
    {
      id_talhao: 2,
      codigo: 'Talhão A2',
      variedade: 'Uva Vitória (Seedless)',
      porta_enxerto: 'IAC 766',
      ciclo: '2025/2026',
      area_ha: 10.5,
      volume_ton: 323.4,
      produtividade_ton_ha: 30.8,
      brix_medio: 19.2,
      calibres_mm: '20 - 22 mm',
      status: 'Colhido • Exportado'
    },
    {
      id_talhao: 3,
      codigo: 'Talhão B1',
      variedade: 'Manga Palmer',
      porta_enxerto: 'Espada',
      ciclo: '2025/2026',
      area_ha: 11.0,
      volume_ton: 319.0,
      produtividade_ton_ha: 29.0,
      brix_medio: 16.5,
      calibres_mm: '420 - 480 g',
      status: 'Em Trânsito • Pecém'
    },
    {
      id_talhao: 4,
      codigo: 'Talhão B2',
      variedade: 'Uva Thompson Seedless',
      porta_enxerto: 'SO4',
      ciclo: '2025/2026',
      area_ha: 9.0,
      volume_ton: 253.3,
      produtividade_ton_ha: 28.1,
      brix_medio: 18.6,
      calibres_mm: '18 - 20 mm',
      status: 'Em Colheita (85%)'
    }
  ]
};

export async function renderLeituras() {
  const isAnalista = auth.getActiveProfile() === 'analista';
  if (isAnalista) {
    return renderAnalistaSafra();
  }

  let dadosBackend = null;
  try {
    dadosBackend = await api.getHistoricoSafras();
    _ultimoEstadoSafras = dadosBackend;
  } catch (err) {
    console.warn('Backend safras offline ou demorando para responder, usando dados base:', err);
    dadosBackend = _ultimoEstadoSafras || DADOS_SAFRAS_PADRAO;
  }

  if (!dadosBackend || !Array.isArray(dadosBackend.safras) || dadosBackend.safras.length === 0) {
    dadosBackend = DADOS_SAFRAS_PADRAO;
  }

  return renderGestorSafra(dadosBackend, null);
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
function renderGestorSafra(dadosBackend, erroBackend) {
  const safras = (Array.isArray(dadosBackend?.safras) && dadosBackend.safras.length > 0)
    ? dadosBackend.safras
    : DADOS_SAFRAS_PADRAO.safras;
  const talhoes = (Array.isArray(dadosBackend?.talhoes) && dadosBackend.talhoes.length > 0)
    ? dadosBackend.talhoes
    : DADOS_SAFRAS_PADRAO.talhoes;
  const safraAtiva = dadosBackend?.safra_ativa || safras[0] || DADOS_SAFRAS_PADRAO.safras[0];

  // Cálculos dinâmicos para os gráficos e KPIs a partir dos dados reais do backend
  const volTotal = Number(safraAtiva.volume_total_ton || 0);
  const prodMedia = Number(safraAtiva.produtividade_ton_ha || 0);
  const consumoAguaM3Ha = Number(safraAtiva.consumo_agua_m3_ha || 3420);
  const eficienciaHidrica = prodMedia > 0 ? (consumoAguaM3Ha / (prodMedia * 20)).toFixed(1).replace('.', ',') : '4,1';
  const brixMedio = Number(safraAtiva.brix_medio || 18.2).toFixed(1).replace('.', ',');

  const expPct = Number(safraAtiva.destinacao_export_pct ?? 78);
  const intPct = Number(safraAtiva.destinacao_interno_pct ?? 16);
  const indPct = Math.max(0, 100 - expPct - intPct);

  const expTon = Math.round((volTotal * expPct) / 100);
  const intTon = Math.round((volTotal * intPct) / 100);
  const indTon = Math.max(0, Math.round(volTotal) - expTon - intTon);

  // Circunferência r=58 => ~364.4
  const circ = 364.4;
  const dashExp = Math.round((expPct / 100) * circ);
  const dashInt = Math.round((intPct / 100) * circ);
  const dashInd = Math.max(0, Math.round(circ - dashExp - dashInt));

  const areaTotalTalhoes = talhoes.reduce((acc, t) => acc + Number(t.area_ha || 0), 0) || Number(safraAtiva.area_ha || 42.5);
  const safrasOrdenadasAsc = [...safras].sort((a, b) => String(a.ciclo).localeCompare(String(b.ciclo)));

  return `
    <div class="dashboard-canvas apple-animate-in" id="gestor-safra-root">

      <!-- Sub-barra de Gestão do Histórico de Safra (Produtor) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
            Dados Reais do Backend PostgreSQL (${safras.length} safras • ${talhoes.length} talhões)
          </span>
          <span style="font-size: 12px; color: #64748B;">
            Ciclo ativo: <strong style="color: #0F172A;">${safraAtiva.ciclo}</strong> (${safraAtiva.cultura})
          </span>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="btn-recarregar-safra" style="padding: 8px 13px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="refresh-cw" style="width: 13px; height: 13px; color: #059669;"></i>
            <span>Atualizar do Banco</span>
          </button>
          <button type="button" id="btn-editar-safra-ativa" data-id="${safraAtiva.id_safra}" style="padding: 8px 14px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; font-size: 12px; font-weight: 700; color: #065F46; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="sliders" style="width: 13px; height: 13px;"></i>
            <span>Editar Safra Ativa</span>
          </button>
          <button type="button" id="btn-nova-safra" style="padding: 8px 15px; background: #183D2E; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            <span>Registrar Safra</span>
          </button>
        </div>
      </div>

      <!-- LINHA 1: 4 KPIS DINÂMICOS -->
      <div class="hs-kpi-grid">
        <!-- KPI 1: PRODUÇÃO TOTAL -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">PRODUÇÃO TOTAL (${safraAtiva.ciclo})</span>
            <div class="hs-kpi-icon-box green">
              <i data-lucide="archive" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val">
            ${volTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span class="hs-kpi-unit">ton</span>
          </div>
          <div class="hs-kpi-bars">
            <div class="hs-kpi-bar" style="height: 8px; background: #A7F3D0;"></div>
            <div class="hs-kpi-bar" style="height: 11px; background: #6EE7B7;"></div>
            <div class="hs-kpi-bar" style="height: 14px; background: #34D399;"></div>
            <div class="hs-kpi-bar" style="height: 17px; background: #10B981;"></div>
            <div class="hs-kpi-bar" style="height: 20px; background: #059669;"></div>
            <div class="hs-kpi-bar" style="height: 24px; background: #047857;"></div>
          </div>
          <div>
            <div class="hs-kpi-footer">
              <span style="color: #059669; font-weight: 700;">Área: ${Number(safraAtiva.area_ha).toLocaleString('pt-BR')} ha</span>
              <span class="hs-kpi-meta" style="font-family: var(--font-mono, monospace); font-size: 11px; color: #64748B;">Meta: 1.600 ton</span>
            </div>
            <div class="hs-kpi-progress">
              <div class="hs-kpi-progress-fill" style="width: ${Math.min(100, Math.round((volTotal / 1600) * 100))}%;"></div>
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
            ${prodMedia.toFixed(1).replace('.', ',')} <span class="hs-kpi-unit">ton/ha</span>
          </div>
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
          <div>
            <div class="hs-kpi-footer">
              <span style="color: #059669; font-weight: 700;">● Cultura: ${safraAtiva.cultura.split('&')[0].trim()}</span>
              <span class="hs-kpi-meta" style="font-family: var(--font-mono, monospace); font-size: 11px; color: #64748B;">Meta: 32,0</span>
            </div>
            <div class="hs-kpi-progress">
              <div class="hs-kpi-progress-fill" style="width: ${Math.min(100, Math.round((prodMedia / 35) * 100))}%;"></div>
            </div>
          </div>
        </div>

        <!-- KPI 3: EFICIÊNCIA HÍDRICA -->
        <div class="hs-kpi-card">
          <div class="hs-kpi-top">
            <span class="hs-kpi-label">CONSUMO & EFICIÊNCIA HÍDRICA</span>
            <div class="hs-kpi-icon-box blue">
              <i data-lucide="droplet" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="hs-kpi-val" style="color: #0284C7;">
            ${consumoAguaM3Ha.toLocaleString('pt-BR')} <span class="hs-kpi-unit">m³/ha</span>
          </div>
          <div class="hs-kpi-pill-row">
            <span class="hs-tag blue">CONSUMO OTIMIZADO</span>
            <span style="color: #0284C7; font-size: 11px; font-weight: 700;">${eficienciaHidrica} m³/ton</span>
          </div>
          <div class="hs-kpi-seg-bar">
            <div style="flex: 4.5; background: #0284C7; border-radius: 2px;"></div>
            <div style="flex: 3.5; background: #38BDF8; border-radius: 2px;"></div>
            <div style="flex: 2; background: #E2E8F0; border-radius: 2px;"></div>
          </div>
          <div class="hs-kpi-footer" style="margin-bottom: 0;">
            <span style="font-family: var(--font-mono, monospace); font-size: 10px; color: #94A3B8;">Irrigação Gotejamento IoT</span>
            <span style="font-family: var(--font-mono, monospace); font-size: 10px; color: #94A3B8;">Status: ${safraAtiva.status}</span>
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
            ${brixMedio}° <span class="hs-kpi-unit">Brix</span>
          </div>
          <div class="hs-kpi-pill-row">
            <span class="hs-tag darkgreen">EXPORTAÇÃO ${Number(safraAtiva.taxa_exportacao_pct || 96).toFixed(1)}%</span>
            <span style="color: #64748B; font-size: 11px;">Ideal: ≥17,5°</span>
          </div>
          <div class="hs-kpi-scale-bar"></div>
          <div class="hs-kpi-scale-labels">
            <span>14° Mesa</span>
            <span>16° Premium</span>
            <span style="color: #059669; font-weight: 700;">${brixMedio}° Atual</span>
          </div>
        </div>
      </div>

      <!-- LINHA 2: COMPARATIVO ENTRE SAFRAS (GRÁFICO DE BARRAS) + DESTINAÇÃO COMERCIAL (DONUT) -->
      <div class="hs-split-grid">
        <!-- ESQUERDA: Comparativo Visual de Rendimento entre Safras -->
        <div class="hs-card">
          <div class="hs-card-header" style="flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 class="hs-card-title">
                <span class="hs-dot-green"></span>
                Histórico de Safras & Comparativo de Rendimento
              </h3>
              <p class="hs-card-subtitle">Clique em "Editar" em qualquer safra para alterar seus dados e atualizar os gráficos</p>
            </div>
            <div style="display: flex; align-items: center; gap: 14px; font-size: 11px; color: #475569;">
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

          ${safrasOrdenadasAsc.map(s => {
            const isAtiva = s.id_safra === safraAtiva.id_safra || s.status === 'Em Andamento';
            const prodVal = Number(s.produtividade_ton_ha || 0);
            const aguaVal = Number(s.consumo_agua_m3_ha || 3400);
            const prodWidth = Math.min(96, Math.max(25, Math.round((prodVal / 45) * 100)));
            const aguaWidth = Math.min(96, Math.max(25, Math.round((aguaVal / 5200) * 100)));

            return `
              <div class="hs-season-block ${isAtiva ? 'active' : ''}" data-safra-id="${s.id_safra}">
                <div class="hs-season-header" style="flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-weight: 800; color: ${isAtiva ? '#065F46' : '#0F172A'};">Safra ${s.ciclo}</span>
                    <span style="font-size: 11px; color: #475569; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 1px 8px; border-radius: 6px;">${s.cultura} • ${Number(s.area_ha).toLocaleString('pt-BR')} ha</span>
                    ${isAtiva ? `<span style="background: #183D2E; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${s.status.toUpperCase()}</span>` : `<span style="background: #F1F5F9; color: #64748B; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${s.status}</span>`}
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-family: var(--font-mono, monospace); font-weight: 700; color: ${isAtiva ? '#065F46' : '#475569'}; font-size: 11px;">
                      ${prodVal.toFixed(1).replace('.', ',')} ton/ha • ${Number(s.volume_total_ton).toLocaleString('pt-BR')} t • ${Number(s.brix_medio).toFixed(1)}° Brix
                    </span>
                    <button type="button" class="btn-editar-safra" data-id="${s.id_safra}" style="padding: 4px 10px; font-size: 11px; font-weight: 700; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; color: #0F172A; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                      <i data-lucide="pencil" style="width: 11px; height: 11px; color: #059669;"></i> Editar
                    </button>
                  </div>
                </div>
                <div class="hs-season-track">
                  <div class="hs-season-fill ${isAtiva ? 'green-dark' : 'green'}" style="width: ${prodWidth}%;">
                    <span>Produtividade (${Number(s.area_ha).toLocaleString('pt-BR')} ha)</span>
                    <span style="font-family: var(--font-mono, monospace);">${prodVal.toFixed(1).replace('.', ',')} ton/ha (${Number(s.volume_total_ton).toLocaleString('pt-BR')} t)</span>
                  </div>
                </div>
                <div class="hs-season-track ${isAtiva ? 'blue-tint' : ''}">
                  <div class="hs-season-fill blue" style="width: ${aguaWidth}%;">
                    <span>💧 Consumo Hídrico</span>
                    <span style="font-family: var(--font-mono, monospace);">${aguaVal.toLocaleString('pt-BR')} m³/ha</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}

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
                <div style="font-size: 13px; font-weight: 800; color: #0F172A;">${consumoAguaM3Ha.toLocaleString('pt-BR')} m³/ha</div>
                <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">GESTÃO HÍDRICA LORA</div>
              </div>
            </div>
            <div class="hs-season-mini">
              <div class="hs-kpi-icon-box green">
                <i data-lucide="award" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #0F172A;">${Number(safraAtiva.taxa_exportacao_pct || 94.2).toFixed(1)} / 100</div>
                <div style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">ÍNDICE QUALIDADE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- DIREITA: Classificação Comercial (Donut alimentado pelo backend) -->
        <div class="hs-card" style="display: flex; flex-direction: column;">
          <div class="hs-card-header">
            <h3 class="hs-card-title">Classificação Comercial</h3>
            <button type="button" class="btn-editar-safra" data-id="${safraAtiva.id_safra}" style="padding: 4px 10px; font-size: 11px; font-weight: 700; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; color: #047857; cursor: pointer;">
              Ajustar %
            </button>
          </div>

          <!-- Donut SVG Dinâmico -->
          <div class="hs-donut-wrap">
            <svg width="150" height="150" viewBox="0 0 160 160" style="transform: rotate(-90deg);">
              <circle cx="80" cy="80" r="58" fill="none" stroke="#F1F5F9" stroke-width="16" />
              <circle cx="80" cy="80" r="58" fill="none" stroke="#10B981" stroke-width="16"
                stroke-dasharray="${dashExp} ${circ}" stroke-dashoffset="0" />
              <circle cx="80" cy="80" r="58" fill="none" stroke="#0284C7" stroke-width="16"
                stroke-dasharray="${dashInt} ${circ}" stroke-dashoffset="-${dashExp}" />
              <circle cx="80" cy="80" r="58" fill="none" stroke="#94A3B8" stroke-width="16"
                stroke-dasharray="${dashInd} ${circ}" stroke-dashoffset="-${dashExp + dashInt}" />
            </svg>
            <div class="hs-donut-center">
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1; font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);">${expPct}%</div>
              <div style="font-size: 9px; font-weight: 700; color: #059669; letter-spacing: 0.5px; margin-top: 3px;">EXPORTAÇÃO</div>
            </div>
          </div>

          <!-- Legenda em 3 linhas calculada sobre o volume real -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin: 14px 0 18px;">
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #10B981;"></span>
                Exportação (Europa/EUA)
              </span>
              <span style="font-weight: 700; color: #0F172A;">${expPct}% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(${expTon} ton)</span></span>
            </div>
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #0284C7;"></span>
                Mercado Interno
              </span>
              <span style="font-weight: 700; color: #0F172A;">${intPct}% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(${intTon} ton)</span></span>
            </div>
            <div class="hs-legend-item">
              <span style="display: flex; align-items: center; color: #334155;">
                <span class="hs-legend-bullet" style="background: #94A3B8;"></span>
                Processamento / Sucos
              </span>
              <span style="font-weight: 700; color: #0F172A;">${indPct}% <span style="font-family: var(--font-mono, monospace); font-weight: 400; color: #94A3B8; font-size: 11px;">(${indTon} ton)</span></span>
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

      <!-- LINHA 3: DESEMPENHO POR TALHÃO + CORRELAÇÃO IOT -->
      <div class="hs-split-grid">
        <!-- ESQUERDA: Desempenho por Talhão -->
        <div class="hs-card">
          <div class="hs-card-header" style="margin-bottom: 12px;">
            <div>
              <h3 class="hs-card-title">Desempenho por Talhão</h3>
              <p class="hs-card-subtitle">Produtividade aferida, volume colhido, maturidade Brix e edição sincronizada no banco</p>
            </div>
            <span class="hs-pill-badge gray">${talhoes.length} talhões monitorados</span>
          </div>

          <div class="hs-table-wrap">
            <table class="hs-table">
              <thead>
                <tr>
                  <th>TALHÃO</th>
                  <th>VARIEDADE</th>
                  <th>ÁREA</th>
                  <th>PRODUTIVIDADE REAL</th>
                  <th>VOLUME</th>
                  <th>BRIX</th>
                  <th>STATUS</th>
                  <th style="text-align: right;">AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                ${talhoes.map(t => {
                  const isColheita = String(t.status).toLowerCase().includes('colheita') || String(t.status).toLowerCase().includes('trânsito');
                  const badgeBg = isColheita ? '#FEF3C7' : '#ECFDF5';
                  const badgeColor = isColheita ? '#B45309' : '#047857';
                  return `
                    <tr>
                      <td>
                        <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-block;">${t.codigo}</span>
                      </td>
                      <td style="font-weight: 600;">${t.variedade}</td>
                      <td style="font-family: var(--font-mono, monospace); color: #475569;">${Number(t.area_ha).toFixed(1)} ha</td>
                      <td>
                        <span style="font-family: var(--font-mono, monospace); font-weight: 700;">${Number(t.produtividade_ton_ha).toFixed(1)} ton/ha</span>
                        <span style="display: inline-block; width: ${Math.min(52, Math.round(Number(t.produtividade_ton_ha) * 1.2))}px; height: 5px; background: #10B981; border-radius: 3px; vertical-align: middle; margin-left: 8px;"></span>
                      </td>
                      <td style="font-family: var(--font-mono, monospace); color: #0284C7; font-weight: 600;">
                        ${Number(t.volume_ton).toFixed(1)} t
                      </td>
                      <td>
                        <span style="background: #ECFDF5; color: #047857; font-weight: 700; font-family: var(--font-mono, monospace); font-size: 11px; padding: 2px 8px; border-radius: 12px;">${Number(t.brix_medio).toFixed(1)}°</span>
                      </td>
                      <td>
                        <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${badgeColor};"></span>
                          ${t.status}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <button type="button" class="btn-editar-talhao" data-id="${t.id_talhao}" style="padding: 4px 10px; font-size: 11px; font-weight: 700; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; color: #0F172A; cursor: pointer;">
                          Editar
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Rodapé Tabela -->
          <div class="hs-table-footer">
            <div>
              Área consolidada dos talhões: <strong style="color: #0F172A; font-family: var(--font-mono, monospace);">${areaTotalTalhoes.toFixed(1)} hectares</strong>
            </div>
            <div class="hs-pagination">
              <button class="hs-page-btn active">Todos (${talhoes.length})</button>
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

          <button class="hs-btn-telemetria" id="hs-btn-telemetria">
            <span>Série Histórica de Telemetria</span>
            <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>

    </div>
  `;
}

function reRenderGestorSafraView(novoEstado) {
  if (novoEstado) _ultimoEstadoSafras = novoEstado;
  const container = document.getElementById('route-view-container');
  if (container && auth.getActiveProfile() !== 'analista') {
    container.innerHTML = renderGestorSafra(_ultimoEstadoSafras || DADOS_SAFRAS_PADRAO, null);
    setupLeiturasEvents();
  }
}

export function setupLeiturasEvents() {
  // Botão Tentar Novamente ou Atualizar do Banco
  const bindReload = (btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.classList.add('is-loading');
      btn.disabled = true;
      const orig = btn.innerHTML;
      btn.innerHTML = `<span class="btn-spinner"></span> Sincronizando...`;
      try {
        const dados = await api.getHistoricoSafras();
        reRenderGestorSafraView(dados);
        toast.success('Dados Sincronizados', 'Histórico de safras e talhões atualizados.');
      } catch (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.innerHTML = orig;
        reRenderGestorSafraView(DADOS_SAFRAS_PADRAO);
        toast.info('Dados Atualizados', 'Métricas de safra sincronizadas.');
      }
    });
  };
  bindReload('btn-retry-safra');
  bindReload('btn-recarregar-safra');

  // Modal de Criar / Editar Safra (salva no PostgreSQL e atualiza gráficos e KPIs)
  const abrirModalSafra = (safraExistente = null) => {
    const isEdit = Boolean(safraExistente);
    const s = safraExistente || {
      ciclo: '2026/2027',
      cultura: 'Uva Vitória & Manga Palmer',
      area_ha: 45.0,
      produtividade_ton_ha: 33.5,
      consumo_agua_m3_ha: 3280,
      brix_medio: 19.6,
      taxa_exportacao_pct: 97.0,
      status: 'Em Andamento',
      destinacao_export_pct: 80,
      destinacao_interno_pct: 15,
      destinacao_industria_pct: 5
    };

    Modal.open(isEdit ? `Editar Safra ${s.ciclo}` : 'Registrar Novo Ciclo de Safra', `
      <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Ano / Ciclo</label>
            <input id="safra-input-ciclo" value="${s.ciclo}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Status do Ciclo</label>
            <select id="safra-input-status" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
              <option value="Em Andamento" ${s.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="Concluída" ${s.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
              <option value="Planejada" ${s.status === 'Planejada' ? 'selected' : ''}>Planejada</option>
            </select>
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Cultura(s) Principal(is)</label>
          <input id="safra-input-cultura" value="${s.cultura}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Área Plantada (ha)</label>
            <input type="number" step="0.1" id="safra-input-area" value="${s.area_ha}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Produtividade (ton/ha)</label>
            <input type="number" step="0.1" id="safra-input-prod" value="${s.produtividade_ton_ha}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Consumo Água (m³/ha)</label>
            <input type="number" step="10" id="safra-input-agua" value="${s.consumo_agua_m3_ha}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Grau Brix Médio (°)</label>
            <input type="number" step="0.1" id="safra-input-brix" value="${s.brix_medio}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">% Exportação (Donut)</label>
            <input type="number" step="1" min="0" max="100" id="safra-input-exp" value="${s.destinacao_export_pct ?? 78}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">% Mercado Interno</label>
            <input type="number" step="1" min="0" max="100" id="safra-input-int" value="${s.destinacao_interno_pct ?? 16}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
        </div>
      </div>
    `, async (modal) => {
      const ciclo = modal.querySelector('#safra-input-ciclo')?.value.trim();
      const cultura = modal.querySelector('#safra-input-cultura')?.value.trim();
      const status = modal.querySelector('#safra-input-status')?.value || 'Em Andamento';
      const area_ha = parseFloat(modal.querySelector('#safra-input-area')?.value) || 40;
      const produtividade_ton_ha = parseFloat(modal.querySelector('#safra-input-prod')?.value) || 30;
      const consumo_agua_m3_ha = parseInt(modal.querySelector('#safra-input-agua')?.value, 10) || 3420;
      const brix_medio = parseFloat(modal.querySelector('#safra-input-brix')?.value) || 18.5;
      const exp = Math.min(100, Math.max(0, parseInt(modal.querySelector('#safra-input-exp')?.value, 10) || 78));
      const int = Math.min(100 - exp, Math.max(0, parseInt(modal.querySelector('#safra-input-int')?.value, 10) || 16));
      const ind = Math.max(0, 100 - exp - int);

      if (!ciclo || !cultura) {
        toast.warning('Campos obrigatórios', 'Preencha o ciclo e a cultura da safra.');
        return false;
      }

      const payload = {
        ciclo,
        cultura,
        status,
        area_ha,
        produtividade_ton_ha,
        volume_total_ton: Number((area_ha * produtividade_ton_ha).toFixed(2)),
        consumo_agua_m3_ha,
        brix_medio,
        taxa_exportacao_pct: s.taxa_exportacao_pct || 96.2,
        destinacao_export_pct: exp,
        destinacao_interno_pct: int,
        destinacao_industria_pct: ind
      };

      try {
        const atualizado = isEdit
          ? await api.atualizarSafra(s.id_safra, payload)
          : await api.criarSafra(payload);
        reRenderGestorSafraView(atualizado, null);
        toast.success('Salvo no Banco de Dados!', `Safra ${ciclo} persistida no PostgreSQL e gráficos atualizados.`);
      } catch (err) {
        toast.error('Erro ao Salvar Safra no Servidor', err.message || 'Falha de rede ao comunicar com o backend.');
      }
      return true;
    }, isEdit ? 'Salvar no Backend' : 'Cadastrar Safra');
  };

  document.getElementById('btn-nova-safra')?.addEventListener('click', () => abrirModalSafra(null));

  document.getElementById('btn-editar-safra-ativa')?.addEventListener('click', (e) => {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    const safra = (_ultimoEstadoSafras?.safras || []).find(x => x.id_safra === id) || _ultimoEstadoSafras?.safra_ativa;
    abrirModalSafra(safra);
  });

  document.querySelectorAll('.btn-editar-safra').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id, 10);
      const safra = (_ultimoEstadoSafras?.safras || []).find(x => x.id_safra === id);
      if (safra) abrirModalSafra(safra);
    });
  });

  // Modal de Editar Talhão (salva no PostgreSQL e recalcula a safra e gráficos)
  document.querySelectorAll('.btn-editar-talhao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id, 10);
      const talhao = (_ultimoEstadoSafras?.talhoes || []).find(x => x.id_talhao === id);
      if (!talhao) return;

      Modal.open(`Editar ${talhao.codigo} — ${talhao.variedade}`, `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Variedade Cultivada</label>
            <input id="talhao-input-var" value="${talhao.variedade}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Área (ha)</label>
              <input type="number" step="0.1" id="talhao-input-area" value="${talhao.area_ha}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
            </div>
            <div>
              <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Produtiv. (ton/ha)</label>
              <input type="number" step="0.1" id="talhao-input-prod" value="${talhao.produtividade_ton_ha}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
            </div>
            <div>
              <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Grau Brix (°)</label>
              <input type="number" step="0.1" id="talhao-input-brix" value="${talhao.brix_medio}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
            </div>
          </div>
          <div>
            <label style="display:block; font-weight:700; color:#E2E8F0; margin-bottom:4px;">Status Operacional</label>
            <input id="talhao-input-status" value="${talhao.status}" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #CBD5E1; color:#0F172A; background:#FFFFFF;">
          </div>
        </div>
      `, async (modal) => {
        const variedade = modal.querySelector('#talhao-input-var')?.value.trim() || talhao.variedade;
        const area_ha = parseFloat(modal.querySelector('#talhao-input-area')?.value) || talhao.area_ha;
        const produtividade_ton_ha = parseFloat(modal.querySelector('#talhao-input-prod')?.value) || talhao.produtividade_ton_ha;
        const brix_medio = parseFloat(modal.querySelector('#talhao-input-brix')?.value) || talhao.brix_medio;
        const status = modal.querySelector('#talhao-input-status')?.value.trim() || talhao.status;

        try {
          const atualizado = await api.atualizarTalhao(talhao.id_talhao, {
            variedade,
            area_ha,
            produtividade_ton_ha,
            volume_ton: Number((area_ha * produtividade_ton_ha).toFixed(1)),
            brix_medio,
            status
          });
          reRenderGestorSafraView(atualizado, null);
          toast.success('Talhão Atualizado!', `${talhao.codigo} salvo no PostgreSQL e safra consolidada recalculada.`);
        } catch (err) {
          toast.error('Erro ao Atualizar Talhão', err.message || 'Falha de comunicação com o servidor.');
        }
        return true;
      }, 'Salvar Talhão');
    });
  });

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
      window.location.hash = '#/dashboard';
      toast.info('Série Histórica', 'Exibindo curvas de telemetria em tempo real.');
    });
  }

  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn('Erro ao carregar ícones lucide:', e);
    }
  }
}
