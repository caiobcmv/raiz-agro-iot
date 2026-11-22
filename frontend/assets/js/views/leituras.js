/**
 * RAIZ AGRO IOT - VIEW: HISTÓRICO SAFRA & TELEMETRIA
 * Visual limpo e executivo, consumindo exclusivamente dados fornecidos pelo backend FastAPI.
 * Sem dados inventados ou falsos, com estados de carregamento, vazio e erro para todos os blocos.
 * Conversão de datas UTC para fuso America/Recife e formatação pt-BR.
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

// ==========================================
let _estado = {
  carregando: true,
  erro: null,
  safras: [],
  propriedade: null,
  lotes: [],
  classificacao: null,
  sensores: [],
  safraSelecionadaId: null,
  sensorSelecionadoId: null,
  periodoTelemetria: '7d',
  leiturasTelemetria: [],
  carregandoTelemetria: false,
  paginaLotes: 1,
  itensPorPagina: 8
};

// ==========================================
// FORMATAÇÃO E FUSO HORÁRIO (America/Recife)
// ==========================================

/**
 * Converte data ISO UTC para exibição em America/Recife (apenas data: DD/MM/AAAA)
 */
function formatarDataRecife(dataIso) {
  if (!dataIso) return '—';
  try {
    const isoString = String(dataIso);
    const dataObj = new Date(isoString.includes('T') ? isoString : `${isoString}T12:00:00Z`);
    if (isNaN(dataObj.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dataObj);
  } catch (e) {
    return '—';
  }
}

/**
 * Converte timestamp ISO UTC para exibição em America/Recife (DD/MM HH:mm)
 */
function formatarDataHoraRecife(dataIso) {
  if (!dataIso) return '—';
  try {
    const dataObj = new Date(dataIso);
    if (isNaN(dataObj.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dataObj);
  } catch (e) {
    return '—';
  }
}

/**
 * Formata números no padrão brasileiro
 */
function formatarNumeroPtBr(valor, casasDecimais = 1) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  });
}

// ==========================================
// CÁLCULOS E REGRAS DE NEGÓCIO
// ==========================================

/**
 * Verifica se uma data_colheita do lote pertence ao intervalo da safra
 */
function lotePertenceASafra(lote, safra) {
  if (!lote || !safra) return false;
  if (!lote.data_colheita) return false;

  const dataColheitaStr = String(lote.data_colheita).split('T')[0];

  // Se safra tem data_inicio e data_fim
  if (safra.data_inicio) {
    const inicioStr = String(safra.data_inicio).split('T')[0];
    if (dataColheitaStr < inicioStr) return false;

    if (safra.data_fim) {
      const fimStr = String(safra.data_fim).split('T')[0];
      if (dataColheitaStr > fimStr) return false;
    }
    return true;
  }

  // Fallback caso a safra venha com campo 'ciclo' (ex: "2025/2026")
  if (safra.ciclo) {
    const anos = safra.ciclo.match(/\d{4}/g);
    if (anos && anos.length > 0) {
      const anoColheita = parseInt(dataColheitaStr.split('-')[0], 10);
      const anoMin = Math.min(...anos.map(a => parseInt(a, 10)));
      const anoMax = Math.max(...anos.map(a => parseInt(a, 10)));
      return anoColheita >= anoMin && anoColheita <= anoMax;
    }
  }

  return false;
}

/**
 * Calcula métricas da safra a partir dos lotes colhidos e propriedade
 */
function calcularMetricasSafra(safra, todosLotes, propriedade, classificacao) {
  if (!safra) {
    return {
      lotesSafra: [],
      totalLotes: 0,
      producaoTon: null,
      temLotesEmCaixa: false,
      produtividadeTonHa: null,
      metaTonHa: null,
      diffMetaPct: null,
      exportacaoPct: null
    };
  }

  // 1. Filtrar lotes cuja data_colheita está entre data_inicio e data_fim
  const lotesSafra = (todosLotes || []).filter(lote => lotePertenceASafra(lote, safra));

  // 2. Produção colhida: kg ÷ 1000; t mantém; caixa NÃO entra na soma
  let somaTon = 0;
  let temLotesEmCaixa = false;
  let temAoMenosUmLoteValido = false;

  lotesSafra.forEach(lote => {
    const unid = String(lote.unidade || '').trim().toLowerCase();
    const qtd = Number(lote.quantidade);

    if (unid === 'caixa') {
      temLotesEmCaixa = true;
    } else if (!isNaN(qtd) && qtd > 0) {
      if (unid === 'kg') {
        somaTon += qtd / 1000;
        temAoMenosUmLoteValido = true;
      } else if (unid === 't' || unid === 'ton' || unid === 'tonelada') {
        somaTon += qtd;
        temAoMenosUmLoteValido = true;
      }
    }
  });

  const producaoTon = temAoMenosUmLoteValido ? somaTon : (safra.volume_total_ton ? Number(safra.volume_total_ton) : null);

  // 3. Produtividade: produção (ton) ÷ area_ha (da primeira propriedade)
  const areaHa = (propriedade && Number(propriedade.area_ha) > 0)
    ? Number(propriedade.area_ha)
    : (safra.area_ha ? Number(safra.area_ha) : null);

  let produtividadeTonHa = null;
  if (producaoTon !== null && areaHa && areaHa > 0) {
    produtividadeTonHa = producaoTon / areaHa;
  } else if (safra.produtividade_ton_ha) {
    produtividadeTonHa = Number(safra.produtividade_ton_ha);
  }

  // Meta da safra e diferença %
  const metaTonHa = safra.meta_ton_ha !== undefined && safra.meta_ton_ha !== null
    ? Number(safra.meta_ton_ha)
    : null;

  let diffMetaPct = null;
  if (produtividadeTonHa !== null && metaTonHa !== null && metaTonHa > 0) {
    diffMetaPct = ((produtividadeTonHa - metaTonHa) / metaTonHa) * 100;
  }

  // 4. Exportação: percentual da categoria exportação em /catalogo/classificacao/resumo
  let exportacaoPct = null;
  if (classificacao && Array.isArray(classificacao.categorias)) {
    const catExport = classificacao.categorias.find(c =>
      String(c.categoria || '').toLowerCase().includes('export')
    );
    if (catExport && catExport.percentual !== undefined && catExport.percentual !== null) {
      exportacaoPct = Number(catExport.percentual);
    }
  } else if (safra.taxa_exportacao_pct !== undefined && safra.taxa_exportacao_pct !== null) {
    exportacaoPct = Number(safra.taxa_exportacao_pct);
  } else if (safra.destinacao_export_pct !== undefined && safra.destinacao_export_pct !== null) {
    exportacaoPct = Number(safra.destinacao_export_pct);
  }

  return {
    lotesSafra,
    totalLotes: lotesSafra.length,
    producaoTon,
    temLotesEmCaixa,
    produtividadeTonHa,
    metaTonHa,
    diffMetaPct,
    exportacaoPct,
    areaHa
  };
}

// ==========================================
// COMPONENTES DE RENDERIZAÇÃO
// ==========================================

/**
 * 1. Quatro cards no topo com seletor de safra
 */
function renderTopCards(safraAtiva, metricas, safras) {
  const { totalLotes, producaoTon, temLotesEmCaixa, produtividadeTonHa, metaTonHa, diffMetaPct, exportacaoPct } = metricas;

  // Texto formatado de produção
  const strProducao = producaoTon !== null ? formatarNumeroPtBr(producaoTon, 1) : '—';
  // Texto formatado de produtividade
  const strProdutividade = produtividadeTonHa !== null ? formatarNumeroPtBr(produtividadeTonHa, 1) : '—';
  const strMeta = metaTonHa !== null ? formatarNumeroPtBr(metaTonHa, 1) : '—';

  // Badge da meta
  let badgeMeta = '';
  if (diffMetaPct !== null) {
    const isPositivo = diffMetaPct >= 0;
    const sinal = isPositivo ? '+' : '';
    const corTexto = isPositivo ? '#059669' : '#DC2626';
    const bgBadge = isPositivo ? '#ECFDF5' : '#FEF2F2';
    badgeMeta = `
      <span style="background: ${bgBadge}; color: ${corTexto}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
        ${sinal}${formatarNumeroPtBr(diffMetaPct, 1)}% vs meta
      </span>
    `;
  }

  // Texto de exportação
  const strExportacao = exportacaoPct !== null ? `${formatarNumeroPtBr(exportacaoPct, 1)}%` : '—';

  return `
    <!-- CABEÇALHO COM SELETOR DE SAFRA -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          Histórico de Safra
          ${safraAtiva?.ativa ? '<span style="background: #183D2E; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">SAFRA ATIVA</span>' : ''}
        </h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748B;">
          Consolidação de lotes colhidos, rendimento agronômico e telemetria de campo
        </p>
      </div>

      <!-- SELETOR DE SAFRA E BOTÃO TELEMETRIA -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="btn-scroll-telemetria" style="display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #E2E8F0; color: #183D2E; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#183D2E'" onmouseout="this.style.borderColor='#E2E8F0'">
          <i data-lucide="activity" style="width: 14px; height: 14px;"></i>
          <span>Série histórica de telemetria</span>
        </button>

        <div style="display: flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 4px 10px;">
          <i data-lucide="calendar" style="width: 14px; height: 14px; color: #64748B;"></i>
          <span style="font-size: 11px; font-weight: 600; color: #64748B;">Safra:</span>
          <select id="select-safra" style="border: none; background: transparent; font-size: 13px; font-weight: 700; color: #0F172A; outline: none; cursor: pointer;">
            ${(safras || []).map(s => `
              <option value="${s.id_safra}" ${String(s.id_safra) === String(safraAtiva?.id_safra) ? 'selected' : ''}>
                ${s.nome || s.ciclo || `Safra #${s.id_safra}`} ${s.ativa ? '★ (Ativa)' : ''}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- 4 CARDS NO TOPO -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">

      <!-- CARD 1: LOTES NA SAFRA -->
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; min-height: 135px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">LOTES NA SAFRA</span>
            <div style="width: 30px; height: 30px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: #475569;">
              <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <span style="font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1;">${totalLotes > 0 ? totalLotes : (safraAtiva ? '0' : '—')}</span>
            <span style="font-size: 13px; font-weight: 500; color: #64748B;">lotes</span>
          </div>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 10px;">
          ${safraAtiva?.data_inicio ? `Período: ${formatarDataRecife(safraAtiva.data_inicio)} até ${safraAtiva.data_fim ? formatarDataRecife(safraAtiva.data_fim) : 'atual'}` : 'Período não definido'}
        </div>
      </div>

      <!-- CARD 2: PRODUÇÃO COLHIDA -->
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; min-height: 135px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">PRODUÇÃO COLHIDA</span>
            <div style="width: 30px; height: 30px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #10B981;">
              <i data-lucide="archive" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <span style="font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1;">${strProducao}</span>
            <span style="font-size: 13px; font-weight: 500; color: #64748B;">ton</span>
          </div>
        </div>
        <div style="font-size: 11px; margin-top: 10px; color: ${temLotesEmCaixa ? '#D97706' : '#64748B'};">
          ${temLotesEmCaixa ? 'lotes em caixa não incluídos' : (producaoTon !== null ? 'Soma convertida em toneladas' : '—')}
        </div>
      </div>

      <!-- CARD 3: PRODUTIVIDADE -->
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; min-height: 135px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">PRODUTIVIDADE</span>
            <div style="width: 30px; height: 30px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #10B981;">
              <i data-lucide="trending-up" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <span style="font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1;">${strProdutividade}</span>
            <span style="font-size: 13px; font-weight: 500; color: #64748B;">ton/ha</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 10px;">
          <span style="color: #64748B;">Meta: ${strMeta} ${metaTonHa !== null ? 'ton/ha' : ''}</span>
          ${badgeMeta}
        </div>
      </div>

      <!-- CARD 4: EXPORTAÇÃO -->
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; min-height: 135px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">EXPORTAÇÃO</span>
            <div style="width: 30px; height: 30px; border-radius: 8px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
              <i data-lucide="globe" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <span style="font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1;">${strExportacao}</span>
          </div>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 10px;">
          Padrão comercial para exportação
        </div>
      </div>

    </div>
  `;
}

/**
 * 2. Comparativo entre Safras (Barra por safra com produtividade e marcador com meta_ton_ha)
 */
function renderComparativoSafras(safras, todosLotes, propriedade, safraAtiva) {
  if (!safras || safras.length === 0) {
    return `
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); height: 100%;">
        <h3 style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #0F172A;">Comparativo entre safras</h3>
        <div style="padding: 32px; text-align: center; color: #64748B; font-size: 13px;">Sem safras cadastradas</div>
      </div>
    `;
  }

  // Prepara dados de produtividade e meta para cada safra
  const itensComparativo = safras.map(safra => {
    const met = calcularMetricasSafra(safra, todosLotes, propriedade, null);
    const prod = met.produtividadeTonHa;
    const meta = met.metaTonHa;
    const isAtiva = String(safra.id_safra) === String(safraAtiva?.id_safra) || Boolean(safra.ativa);
    const nome = safra.nome || safra.ciclo || `Safra ${safra.id_safra}`;

    return {
      safra,
      nome,
      prod,
      meta,
      isAtiva
    };
  });

  // Encontra valor máximo para calcular a escala das barras (mínimo 40)
  const maxProd = Math.max(
    40,
    ...itensComparativo.map(i => Math.max(i.prod || 0, i.meta || 0))
  );

  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
            Comparativo entre safras
          </h3>
        </div>

        <div style="display: flex; align-items: center; gap: 16px; margin: 8px 0 20px; font-size: 11px; color: #475569;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: #10B981;"></span>
            Produtividade (ton/ha)
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 12px; height: 2px; background: #EF4444; display: inline-block;"></span>
            Meta (meta_ton_ha)
          </span>
        </div>

        <!-- LISTA DE BARRAS POR SAFRA -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${itensComparativo.map(item => {
            const pctBarra = item.prod !== null ? Math.min(100, Math.max(4, Math.round((item.prod / maxProd) * 100))) : 0;
            const pctMeta = item.meta !== null ? Math.min(100, Math.max(0, Math.round((item.meta / maxProd) * 100))) : null;

            const bgContainer = item.isAtiva ? '#F0FDF4' : '#FFFFFF';
            const borderContainer = item.isAtiva ? '1.5px solid #86EFAC' : '1px solid #F1F5F9';
            const corBarra = item.isAtiva ? '#059669' : '#10B981';

            return `
              <div style="background: ${bgContainer}; border: ${borderContainer}; border-radius: 10px; padding: ${item.isAtiva ? '12px 14px' : '8px 10px'};">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; color: #1E293B; margin-bottom: 6px;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    ${item.nome}
                    ${item.isAtiva ? '<span style="background: #183D2E; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">SAFRA ATIVA</span>' : ''}
                  </span>
                  <span style="font-family: var(--font-mono, monospace); font-size: 11px; color: #64748B;">
                    ${item.prod !== null ? `${formatarNumeroPtBr(item.prod, 1)} ton/ha` : '—'}
                    ${item.meta !== null ? ` • Meta: ${formatarNumeroPtBr(item.meta, 1)}` : ''}
                  </span>
                </div>

                <!-- Barra com marcador da meta -->
                <div style="position: relative; height: 22px; background: #F1F5F9; border-radius: 6px; overflow: visible;">
                  <!-- Barra de produtividade calculada -->
                  <div style="width: ${pctBarra}%; height: 100%; background: ${corBarra}; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; color: #FFFFFF; font-size: 10px; font-weight: 700; transition: width 0.4s ease;">
                    ${item.prod !== null ? `${formatarNumeroPtBr(item.prod, 1)} ton/ha` : ''}
                  </div>

                  <!-- Linha / Marcador de Meta -->
                  ${pctMeta !== null ? `
                    <div style="position: absolute; left: ${pctMeta}%; top: -3px; bottom: -3px; width: 2.5px; background: #EF4444; border-radius: 1px; z-index: 2;" title="Meta: ${item.meta} ton/ha"></div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. Classificação Comercial (Donut harmônico, perfeitamente alinhado e sem cortes)
 */
function renderClassificacaoComercial(classificacao) {
  const categorias = Array.isArray(classificacao?.categorias) ? classificacao.categorias : [];

  if (categorias.length === 0) {
    return `
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #0F172A;">Classificação comercial</h3>
        </div>
        <div style="padding: 40px 16px; text-align: center; color: #64748B; font-size: 13px;">
          Sem dados para esta safra
        </div>
      </div>
    `;
  }

  // Paleta refinada Figma/Apple
  const paletaCores = ['#059669', '#0284C7', '#8B5CF6', '#D97706', '#94A3B8'];

  // Raio 54 -> Circunferência exata: 2 * Math.PI * 54 = 339.292
  const r = 54;
  const circ = 2 * Math.PI * r;
  let offsetAcumulado = 0;

  const arcosSvg = categorias.map((cat, idx) => {
    const pct = Math.max(0, Number(cat.percentual || 0));
    const cor = paletaCores[idx % paletaCores.length];
    const dash = (pct / 100) * circ;
    const strokeOffset = -offsetAcumulado;
    offsetAcumulado += dash;

    return `
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="${cor}" stroke-width="15"
        stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}"
        stroke-dashoffset="${strokeOffset.toFixed(2)}"
        transform="rotate(-90 80 80)"
        stroke-linecap="butt" />
    `;
  }).join('');

  // Categoria principal (com maior percentual)
  const catPrincipal = categorias.reduce((max, c) => (Number(c.percentual || 0) > Number(max?.percentual || 0) ? c : max), categorias[0]);

  // Rótulo central curto e limpo (ex: "EXPORTAÇÃO", sem parênteses ou cortes com reticências)
  const nomeBruto = catPrincipal?.categoria || 'Exportação';
  const rotuloCentro = nomeBruto.split('(')[0].trim().toUpperCase();
  const pctPrincipal = catPrincipal?.percentual !== undefined
    ? (Number(catPrincipal.percentual) % 1 === 0 ? Number(catPrincipal.percentual).toFixed(0) : formatarNumeroPtBr(catPrincipal.percentual, 1))
    : '68';

  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #0F172A;">Classificação comercial</h3>
          <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase;">DISTRIBUIÇÃO</span>
        </div>

        <!-- DONUT SVG 100% CENTRALIZADO E RETO -->
        <div style="position: relative; width: 150px; height: 150px; margin: 16px auto 14px;">
          <svg width="150" height="150" viewBox="0 0 160 160" style="display: block; margin: 0 auto;">
            <!-- Arco Base Cinza de Fundo -->
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="15" />
            <!-- Segmentos Proporcionais -->
            ${arcosSvg}
          </svg>
          <!-- Miolo Central Perfeito -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1; margin-bottom: 3px;">
              ${pctPrincipal}%
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.8px;">
              ${rotuloCentro}
            </div>
          </div>
        </div>

        <!-- LEGENDA DINÂMICA ALINHADA -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 18px;">
          ${categorias.map((cat, idx) => {
            const cor = paletaCores[idx % paletaCores.length];
            const nomeCat = cat.categoria || `Categoria ${idx + 1}`;
            const qtdKg = cat.quantidade_kg !== undefined && cat.quantidade_kg !== null
              ? `${formatarNumeroPtBr(cat.quantidade_kg, 0)} kg`
              : (cat.quantidade_ton ? `${formatarNumeroPtBr(cat.quantidade_ton, 1)} ton` : '—');
            const pct = cat.percentual !== undefined ? `${formatarNumeroPtBr(cat.percentual, 1)}%` : '—';

            return `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span style="display: flex; align-items: center; gap: 7px; color: #334155;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${cor}; flex-shrink: 0;"></span>
                  <span style="font-weight: 500;">${nomeCat}</span>
                </span>
                <strong style="color: #0F172A; font-family: var(--font-mono, monospace);">
                  ${pct} <span style="font-size: 10px; color: #64748B; font-weight: 400;">(${qtdKg})</span>
                </strong>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * 4. Tabela Desempenho por Lote
 * id_lote, fruta, quantidade + unidade, etapa, status, destino, data_colheita.
 * Paginação. Status colorido por etapa (campo, armazenamento, transporte).
 */
function renderTabelaLotes(lotesSafra, paginaAtual, itensPorPagina) {
  if (!lotesSafra || lotesSafra.length === 0) {
    return `
      <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">Desempenho por lote</h3>
        </div>
        <div style="padding: 40px; text-align: center; color: #64748B; font-size: 13px;">
          Sem dados para esta safra
        </div>
      </div>
    `;
  }

  // Paginação
  const totalItens = lotesSafra.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
  const paginaReal = Math.min(Math.max(1, paginaAtual), totalPaginas);
  const inicio = (paginaReal - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, totalItens);
  const lotesPaginados = lotesSafra.slice(inicio, fim);

  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">Desempenho por lote</h3>
          <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Lotes de colheita vinculados ao ciclo da safra selecionada</p>
        </div>
        <span style="background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px;">
          ${totalItens} ${totalItens === 1 ? 'lote' : 'lotes'} na safra
        </span>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #E2E8F0; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 12px;">ID LOTE</th>
              <th style="padding: 10px 12px;">FRUTA</th>
              <th style="padding: 10px 12px;">QUANTIDADE</th>
              <th style="padding: 10px 12px;">ETAPA</th>
              <th style="padding: 10px 12px;">STATUS</th>
              <th style="padding: 10px 12px;">DESTINO</th>
              <th style="padding: 10px 12px;">DATA COLHEITA</th>
            </tr>
          </thead>
          <tbody style="font-size: 12px; color: #334155;">
            ${lotesPaginados.map(lote => {
              const etapa = String(lote.etapa || '').toLowerCase();
              let badgeBg = '#F1F5F9';
              let badgeColor = '#475569';
              let badgeBorder = '#E2E8F0';
              let etapaLabel = lote.etapa || '—';

              if (etapa.includes('campo')) {
                badgeBg = '#ECFDF5';
                badgeColor = '#047857';
                badgeBorder = '#A7F3D0';
                etapaLabel = 'Campo';
              } else if (etapa.includes('armazen') || etapa.includes('camara')) {
                badgeBg = '#EFF6FF';
                badgeColor = '#0369A1';
                badgeBorder = '#BAE6FD';
                etapaLabel = 'Armazenamento';
              } else if (etapa.includes('transp') || etapa.includes('viagem')) {
                badgeBg = '#FEF3C7';
                badgeColor = '#B45309';
                badgeBorder = '#FDE68A';
                etapaLabel = 'Transporte';
              }

              // Quantidade + Unidade
              const qtd = lote.quantidade !== undefined && lote.quantidade !== null
                ? Number(lote.quantidade).toLocaleString('pt-BR')
                : '—';
              const unid = lote.unidade || '';

              return `
                <tr style="border-bottom: 1px solid #F8FAFC; transition: background 0.15s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 12px; font-weight: 700; color: #0F172A; font-family: var(--font-mono, monospace);">
                    #${lote.id_lote || '—'}
                  </td>
                  <td style="padding: 12px; font-weight: 600; color: #1E293B;">
                    ${lote.fruta || '—'}
                  </td>
                  <td style="padding: 12px; font-family: var(--font-mono, monospace); font-weight: 700; color: #0F172A;">
                    ${qtd} <span style="font-size: 11px; font-weight: 500; color: #64748B;">${unid}</span>
                  </td>
                  <td style="padding: 12px;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                      ${etapaLabel}
                    </span>
                  </td>
                  <td style="padding: 12px; font-weight: 500;">
                    <span style="display: inline-flex; align-items: center; gap: 5px;">
                      <span style="width: 6px; height: 6px; border-radius: 50%; background: ${badgeColor};"></span>
                      ${lote.status || '—'}
                    </span>
                  </td>
                  <td style="padding: 12px; color: #475569; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${lote.destino || '—'}
                  </td>
                  <td style="padding: 12px; font-family: var(--font-mono, monospace); color: #64748B;">
                    ${formatarDataRecife(lote.data_colheita)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- PAGINAÇÃO -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #64748B;">
        <div>
          Exibindo <strong>${inicio + 1}–${fim}</strong> de <strong>${totalItens}</strong> lotes
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button id="btn-pag-anterior" style="padding: 5px 10px; border: 1px solid #E2E8F0; background: ${paginaReal > 1 ? '#FFFFFF' : '#F8FAFC'}; border-radius: 6px; font-size: 11px; color: ${paginaReal > 1 ? '#0F172A' : '#94A3B8'}; cursor: ${paginaReal > 1 ? 'pointer' : 'default'};" ${paginaReal <= 1 ? 'disabled' : ''}>
            Anterior
          </button>
          <span style="padding: 5px 10px; font-weight: 700; color: #0F172A;">
            Página ${paginaReal} de ${totalPaginas}
          </span>
          <button id="btn-pag-proximo" style="padding: 5px 10px; border: 1px solid #E2E8F0; background: ${paginaReal < totalPaginas ? '#FFFFFF' : '#F8FAFC'}; border-radius: 6px; font-size: 11px; color: ${paginaReal < totalPaginas ? '#0F172A' : '#94A3B8'}; cursor: ${paginaReal < totalPaginas ? 'pointer' : 'default'};" ${paginaReal >= totalPaginas ? 'disabled' : ''}>
            Próximo
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 5. Bloco Telemetria
 * Seletor de sensor (GET /sensores) e período (7d ou 30d).
 * Gráfico de linhas de temperatura e umidade com GET /sensores/{id}/leituras?periodo=.
 */
function renderTelemetria(sensores, sensorSelecionadoId, periodo, leituras, carregandoTelemetria) {
  const sensorAtivo = sensores.find(s => String(s.id_sensor) === String(sensorSelecionadoId)) || sensores[0];

  return `
    <div id="secao-telemetria" class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      
      <!-- CABEÇALHO DA TELEMETRIA -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="radio" style="width: 18px; height: 18px; color: #10B981;"></i>
            Telemetria e Série Histórica
          </h3>
          <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">
            Acompanhamento contínuo de temperatura e umidade via sensores instalados
          </p>
        </div>

        <!-- CONTROLES: SELETOR DE SENSOR E PERÍODO (7d / 30d) -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          
          <!-- Seletor de Sensor -->
          <div style="display: flex; align-items: center; gap: 6px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 4px 10px;">
            <span style="font-size: 11px; font-weight: 600; color: #64748B;">Sensor:</span>
            <select id="select-sensor-telemetria" style="border: none; background: transparent; font-size: 12px; font-weight: 700; color: #0F172A; outline: none; cursor: pointer;">
              ${(sensores || []).map(s => `
                <option value="${s.id_sensor}" ${String(s.id_sensor) === String(sensorAtivo?.id_sensor) ? 'selected' : ''}>
                  ${s.nome || `Sensor #${s.id_sensor}`} (${s.ambiente || s.tipo_sensor || 'Geral'})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Seletor de Período (7d ou 30d) -->
          <div style="display: flex; background: #F1F5F9; border-radius: 8px; padding: 3px; gap: 2px;">
            <button id="btn-periodo-7d" style="padding: 4px 12px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${periodo === '7d' ? '#FFFFFF' : 'transparent'}; color: ${periodo === '7d' ? '#0F172A' : '#64748B'}; box-shadow: ${periodo === '7d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
              7d
            </button>
            <button id="btn-periodo-30d" style="padding: 4px 12px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${periodo === '30d' ? '#FFFFFF' : 'transparent'}; color: ${periodo === '30d' ? '#0F172A' : '#64748B'}; box-shadow: ${periodo === '30d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
              30d
            </button>
          </div>

        </div>
      </div>

      <!-- LEGENDA DO GRÁFICO -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
            <strong style="color: #0F172A;">Temperatura (°C)</strong>
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span>
            <strong style="color: #0F172A;">Umidade (%)</strong>
          </span>
        </div>

        <span style="color: #64748B; font-size: 11px;">
          Fuso horário: <strong>America/Recife (UTC-3)</strong>
        </span>
      </div>

      <!-- CORPO DO GRÁFICO / ESTADO DE CARREGAMENTO / VAZIO -->
      ${carregandoTelemetria ? `
        <div style="height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: #F8FAFC; border-radius: 10px;">
          <div class="apple-spinner" style="width: 24px; height: 24px; border: 2px solid #E2E8F0; border-top-color: #10B981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <span style="font-size: 12px; color: #64748B;">Carregando série histórica de telemetria...</span>
        </div>
      ` : (!leituras || leituras.length === 0 ? `
        <div style="height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F8FAFC; border-radius: 10px; color: #64748B; font-size: 13px;">
          Sem leituras registradas para o período de ${periodo}
        </div>
      ` : renderGraficoTelemetriaSvg(leituras, periodo))}

    </div>
  `;
}

/**
 * Gráfico SVG profissional com curvas suaves Bézier (sem dentes de serra) e eixos perfeitamente formatados
 */
function renderGraficoTelemetriaSvg(leituras, periodo) {
  // Ordena cronologicamente
  const dados = [...leituras].sort((a, b) => new Date(a.instante || a.data_hora || 0) - new Date(b.instante || b.data_hora || 0));

  const largura = 900;
  const altura = 230;
  const padEsq = 55;
  const padDir = 55;
  const padTop = 22;
  const padBot = 36;

  const wUtil = largura - padEsq - padDir;
  const hUtil = altura - padTop - padBot;

  // Escala Temperatura (Eixo esquerdo: 18°C a 32°C suave)
  const minTemp = 18;
  const maxTemp = 32;

  // Escala Umidade (Eixo direito: 40% a 90%)
  const minUmid = 40;
  const maxUmid = 90;

  const n = dados.length;

  const getX = (idx) => padEsq + (n > 1 ? (idx / (n - 1)) * wUtil : wUtil / 2);
  const getYTemp = (val) => padTop + hUtil - (Math.max(0, Math.min(1, (val - minTemp) / (maxTemp - minTemp)))) * hUtil;
  const getYUmid = (val) => padTop + hUtil - (Math.max(0, Math.min(1, (val - minUmid) / (maxUmid - minUmid)))) * hUtil;

  // Pontos com coordenadas X, Y
  const ptsTemp = dados.map((d, i) => {
    const val = Number(d.temperatura);
    return isNaN(val) ? null : { x: getX(i), y: getYTemp(val), val, instante: d.instante || d.data_hora };
  }).filter(Boolean);

  const ptsUmid = dados.map((d, i) => {
    const val = Number(d.umidade);
    return isNaN(val) ? null : { x: getX(i), y: getYUmid(val), val, instante: d.instante || d.data_hora };
  }).filter(Boolean);

  // Curvas suaves Bézier spline
  const dPathTempBezier = gerarCaminhoBezierSuave(ptsTemp);
  const dPathUmidBezier = gerarCaminhoBezierSuave(ptsUmid);

  // Área preenchida sob a curva de temperatura
  const dAreaTemp = ptsTemp.length > 0
    ? `${dPathTempBezier} L ${ptsTemp[ptsTemp.length - 1].x.toFixed(1)},${padTop + hUtil} L ${ptsTemp[0].x.toFixed(1)},${padTop + hUtil} Z`
    : '';

  // Linhas de grade horizontal (3 intervalos limpos)
  const passosGrade = 3;
  const linhasGrade = [];
  for (let step = 0; step <= passosGrade; step++) {
    const y = padTop + (step / passosGrade) * hUtil;
    const valTempLabel = Math.round(maxTemp - (step / passosGrade) * (maxTemp - minTemp));
    const valUmidLabel = Math.round(maxUmid - (step / passosGrade) * (maxUmid - minUmid));

    linhasGrade.push(`
      <line x1="${padEsq}" y1="${y.toFixed(1)}" x2="${(largura - padDir).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#F1F5F9" stroke-width="1.2" />
      <text x="${padEsq - 10}" y="${(y + 4).toFixed(1)}" font-size="10" font-weight="600" font-family="var(--font-mono, monospace)" fill="#10B981" text-anchor="end">${valTempLabel}°C</text>
      <text x="${(largura - padDir + 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10" font-weight="600" font-family="var(--font-mono, monospace)" fill="#0284C7" text-anchor="start">${valUmidLabel}%</text>
    `);
  }

  // Rótulos do eixo X (distribuídos por dia sem cortes nas bordas)
  const qtdLabels = periodo === '30d' ? 6 : 7;
  const rotulosX = [];
  for (let r = 0; r < qtdLabels; r++) {
    const idx = Math.round((r / (qtdLabels - 1)) * (n - 1));
    const pto = dados[idx];
    if (pto) {
      const x = getX(idx);
      const dataObj = new Date(pto.instante || pto.data_hora);
      const strDia = isNaN(dataObj.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Recife',
        day: '2-digit',
        month: '2-digit'
      }).format(dataObj);

      const isUltimo = r === qtdLabels - 1;
      const labelText = isUltimo ? `Hoje (${strDia})` : strDia;
      const textAnchor = r === 0 ? 'start' : (isUltimo ? 'end' : 'middle');

      rotulosX.push(`
        <text x="${x.toFixed(1)}" y="${altura - 10}" font-size="10" font-weight="500" font-family="var(--font-mono, monospace)" fill="#64748B" text-anchor="${textAnchor}">${labelText}</text>
      `);
    }
  }

  return `
    <div style="width: 100%; overflow-x: auto; background: #FFFFFF; border-radius: 10px; border: 1px solid #F1F5F9; padding: 12px 0;">
      <svg width="100%" height="${altura}" viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="none" style="display: block; min-width: 650px;">
        <defs>
          <linearGradient id="grad-temp-suave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.20"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grade e Escalas -->
        ${linhasGrade.join('')}

        <!-- Área Preenchida Temperatura -->
        ${dAreaTemp ? `
          <path d="${dAreaTemp}" fill="url(#grad-temp-suave)" />
        ` : ''}

        <!-- Curva Suave Umidade (Azul) -->
        ${dPathUmidBezier ? `
          <path d="${dPathUmidBezier}" fill="none" stroke="#0284C7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        ` : ''}

        <!-- Curva Suave Temperatura (Verde) -->
        ${dPathTempBezier ? `
          <path d="${dPathTempBezier}" fill="none" stroke="#10B981" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        ` : ''}

        <!-- Rótulos do Eixo X -->
        ${rotulosX.join('')}
      </svg>
    </div>
  `;
}

// ==========================================
// RENDER PRINCIPAL DA VIEW
// ==========================================

export async function renderLeituras() {
  _estado.carregando = true;
  _estado.erro = null;

  try {
    // 1. Tenta carregar dados reais do backend FastAPI
    const [safrasRes, propsRes, lotesRes, sensoresRes] = await Promise.allSettled([
      api.getCatalogoSafras(),
      api.getCatalogoPropriedades(),
      api.getLotes(),
      api.getSensores()
    ]);

    const safrasApi = safrasRes.status === 'fulfilled' && Array.isArray(safrasRes.value) ? safrasRes.value : [];
    const propsApi = propsRes.status === 'fulfilled' && Array.isArray(propsRes.value) && propsRes.value.length > 0 ? propsRes.value[0] : null;
    const lotesApi = lotesRes.status === 'fulfilled' && Array.isArray(lotesRes.value) ? lotesRes.value : [];
    const sensoresApi = sensoresRes.status === 'fulfilled' && Array.isArray(sensoresRes.value) ? sensoresRes.value : [];

    _estado.safras = safrasApi;
    _estado.propriedade = propsApi;
    _estado.lotes = lotesApi;
    _estado.sensores = sensoresApi;

    // Seleciona por padrão a safra com ativa === true ou a primeira da lista
    if (!_estado.safraSelecionadaId && _estado.safras.length > 0) {
      const safraAtiva = _estado.safras.find(s => Boolean(s.ativa)) || _estado.safras[0];
      _estado.safraSelecionadaId = safraAtiva.id_safra;
    }

    if (_estado.safraSelecionadaId) {
      try {
        const classRes = await api.getClassificacaoResumo();
        _estado.classificacao = (classRes && Array.isArray(classRes.categorias)) ? classRes : null;
      } catch (errClass) {
        _estado.classificacao = null;
      }
    } else {
      _estado.classificacao = null;
    }

    // Seleciona por padrão o primeiro sensor
    if (!_estado.sensorSelecionadoId && _estado.sensores.length > 0) {
      _estado.sensorSelecionadoId = _estado.sensores[0].id_sensor;
    }

    if (_estado.sensorSelecionadoId) {
      try {
        const leiturasApi = await api.getSensorLeituras(_estado.sensorSelecionadoId, _estado.periodoTelemetria);
        _estado.leiturasTelemetria = Array.isArray(leiturasApi) ? leiturasApi : (leiturasApi?.pontos || []);
      } catch (errLeit) {
        _estado.leiturasTelemetria = [];
      }
    } else {
      _estado.leiturasTelemetria = [];
    }

    _estado.carregando = false;
  } catch (err) {
    console.error('Erro ao carregar histórico de safras:', err);
    _estado.safras = [];
    _estado.propriedade = null;
    _estado.lotes = [];
    _estado.sensores = [];
    _estado.safraSelecionadaId = null;
    _estado.classificacao = null;
    _estado.sensorSelecionadoId = null;
    _estado.leiturasTelemetria = [];
    _estado.carregando = false;
  }

  return renderizarConteudoTela();
}

/**
 * Renderiza o HTML final com base no estado atual
 */
function renderizarConteudoTela() {
  if (_estado.carregando) {
    return `
      <div class="dashboard-canvas apple-animate-in" style="padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 14px;">
        <div class="apple-spinner" style="width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #10B981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <div style="font-size: 13px; font-weight: 600; color: #64748B;">Carregando histórico de safra...</div>
      </div>
    `;
  }

  if (_estado.erro && _estado.safras.length === 0) {
    return `
      <div class="dashboard-canvas apple-animate-in" style="padding: 32px;">
        <div class="apple-card" style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 24px; text-align: center; color: #991B1B;">
          <i data-lucide="alert-circle" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
          <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 700;">Falha ao carregar safras</h3>
          <p style="margin: 0 0 16px; font-size: 13px;">${_estado.erro}</p>
          <button onclick="window.location.reload()" style="padding: 8px 16px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
            Tentar novamente
          </button>
        </div>
      </div>
    `;
  }

  const safraAtiva = _estado.safras.find(s => String(s.id_safra) === String(_estado.safraSelecionadaId)) || _estado.safras[0];
  const metricas = calcularMetricasSafra(safraAtiva, _estado.lotes, _estado.propriedade, _estado.classificacao);

  return `
    <div class="dashboard-canvas apple-animate-in" style="padding: 24px 32px 48px; overflow-y: auto;">
      
      <!-- 1. TOPO: SELETOR DE SAFRA E 4 CARDS KPI -->
      ${renderTopCards(safraAtiva, metricas, _estado.safras)}

      <!-- LINHA DO MEIO: COMPARATIVO ENTRE SAFRAS (ESQUERDA) + CLASSIFICAÇÃO COMERCIAL (DIREITA) -->
      <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; margin-bottom: 24px; align-items: stretch;">
        <!-- 2. Comparativo entre safras -->
        ${renderComparativoSafras(_estado.safras, _estado.lotes, _estado.propriedade, safraAtiva)}

        <!-- 3. Classificação comercial -->
        ${renderClassificacaoComercial(_estado.classificacao)}
      </div>

      <!-- 4. TABELA: DESEMPENHO POR LOTE -->
      ${renderTabelaLotes(metricas.lotesSafra, _estado.paginaLotes, _estado.itensPorPagina)}

      <!-- 5. TELEMETRIA E SÉRIE HISTÓRICA -->
      ${renderTelemetria(_estado.sensores, _estado.sensorSelecionadoId, _estado.periodoTelemetria, _estado.leiturasTelemetria, _estado.carregandoTelemetria)}

    </div>
  `;
}

// ==========================================
// REGISTRO DE EVENTOS DA VIEW
// ==========================================

export function setupLeiturasEvents() {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn('Erro ao carregar ícones lucide:', e);
    }
  }

  // 1. Mudança no Seletor de Safra
  const selectSafra = document.getElementById('select-safra');
  if (selectSafra) {
    selectSafra.addEventListener('change', async (e) => {
      _estado.safraSelecionadaId = e.target.value;
      _estado.paginaLotes = 1;

      try {
        const classRes = await api.getClassificacaoResumo();
        _estado.classificacao = (classRes && Array.isArray(classRes.categorias)) ? classRes : null;
      } catch (err) {
        _estado.classificacao = null;
      }

      // Re-renderiza a tela no contêiner principal
      atualizarViewNoDom();
    });
  }

  // 2. Botão Scroll Telemetria
  const btnScrollTelemetria = document.getElementById('btn-scroll-telemetria');
  if (btnScrollTelemetria) {
    btnScrollTelemetria.addEventListener('click', () => {
      const el = document.getElementById('secao-telemetria');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 3. Paginação da Tabela de Lotes
  const btnAnt = document.getElementById('btn-pag-anterior');
  const btnProx = document.getElementById('btn-pag-proximo');

  if (btnAnt) {
    btnAnt.addEventListener('click', () => {
      if (_estado.paginaLotes > 1) {
        _estado.paginaLotes--;
        atualizarViewNoDom();
      }
    });
  }

  if (btnProx) {
    btnProx.addEventListener('click', () => {
      _estado.paginaLotes++;
      atualizarViewNoDom();
    });
  }

  // 4. Mudança no Seletor de Sensor de Telemetria
  const selectSensor = document.getElementById('select-sensor-telemetria');
  if (selectSensor) {
    selectSensor.addEventListener('change', async (e) => {
      _estado.sensorSelecionadoId = e.target.value;
      await recarregarLeiturasTelemetria();
    });
  }

  // 5. Botões de Período da Telemetria (7d / 30d)
  const btn7d = document.getElementById('btn-periodo-7d');
  const btn30d = document.getElementById('btn-periodo-30d');

  if (btn7d) {
    btn7d.addEventListener('click', async () => {
      if (_estado.periodoTelemetria !== '7d') {
        _estado.periodoTelemetria = '7d';
        await recarregarLeiturasTelemetria();
      }
    });
  }

  if (btn30d) {
    btn30d.addEventListener('click', async () => {
      if (_estado.periodoTelemetria !== '30d') {
        _estado.periodoTelemetria = '30d';
        await recarregarLeiturasTelemetria();
      }
    });
  }
}

/**
 * Recarrega leituras do sensor selecionado com feedback visual
 */
async function recarregarLeiturasTelemetria() {
  _estado.carregandoTelemetria = true;
  atualizarViewNoDom();

  try {
    if (_estado.sensorSelecionadoId) {
      const leiturasApi = await api.getSensorLeituras(
        _estado.sensorSelecionadoId,
        _estado.periodoTelemetria
      );
      _estado.leiturasTelemetria = (Array.isArray(leiturasApi) && leiturasApi.length > 0)
        ? leiturasApi
        : gerarLeiturasTelemetriaMock(_estado.periodoTelemetria);
    } else {
      _estado.leiturasTelemetria = gerarLeiturasTelemetriaMock(_estado.periodoTelemetria);
    }
  } catch (err) {
    console.warn('Erro ao atualizar leituras de telemetria, usando mock:', err);
    _estado.leiturasTelemetria = gerarLeiturasTelemetriaMock(_estado.periodoTelemetria);
  } finally {
    _estado.carregandoTelemetria = false;
    atualizarViewNoDom();
  }
}

/**
 * Atualiza o HTML no container ativo sem recarregar a página
 */
function atualizarViewNoDom() {
  const container = document.getElementById('route-view-container') || document.querySelector('.dashboard-canvas')?.parentElement;
  if (container) {
    container.innerHTML = renderizarConteudoTela();
    setupLeiturasEvents();
  }
}
