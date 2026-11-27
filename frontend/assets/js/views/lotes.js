/**
 * VIEW: LOTES E SAFRA (PERFIL ADMINISTRADOR)
 * Dados reais das rotas: GET /safras, GET /propriedades, GET /lotes, GET /variedades, GET /sensores.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

let _lotesReais = [];
let _safraVigente = null;
let _filtroAtivoLotes = 'todos';
let _termoBuscaLotes = '';
let _limiteExibicaoLotes = 20;

function formatarDataBr(isoStr) {
  if (!isoStr) return '—';
  const parteData = String(isoStr).split('T')[0];
  const partes = parteData.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return parteData;
}

function loteParaToneladas(lote) {
  const qtd = Number(lote?.quantidade || 0);
  if (isNaN(qtd) || qtd <= 0) return 0;
  const unidade = String(lote?.unidade || '').toLowerCase();
  if (unidade === 'kg') return qtd / 1000;
  if (unidade === 't') return qtd;
  return 0;
}

function formatarToneladas(ton) {
  return Number(ton || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatarQuantidadeLote(lote) {
  const qtd = Number(lote?.quantidade || 0);
  const unidade = lote?.unidade || '';
  return `${qtd.toLocaleString('pt-BR')} ${unidade}`.trim();
}

function loteNaSafraVigente(lote, safra) {
  if (!safra || !lote?.data_colheita) return false;
  const dataLote = String(lote.data_colheita).split('T')[0];
  const inicio = safra.data_inicio ? String(safra.data_inicio).split('T')[0] : null;
  const fim = safra.data_fim ? String(safra.data_fim).split('T')[0] : null;
  if (inicio && dataLote < inicio) return false;
  if (fim && dataLote > fim) return false;
  return true;
}

export async function renderLotes() {
  let safras = [];
  let propriedades = [];
  let lotes = [];
  let variedades = [];
  let sensores = [];
  let erroSafras = false;
  let erroLotes = false;
  let erroSensores = false;

  const [resSafras, resProps, resLotes, resVar, resSensores] = await Promise.allSettled([
    api.getCatalogoSafras(),
    api.getCatalogoPropriedades(),
    api.getLotes(),
    api.request('/variedades'),
    api.getSensores()
  ]);

  if (resSafras.status === 'fulfilled' && Array.isArray(resSafras.value)) {
    safras = resSafras.value;
  } else {
    erroSafras = true;
  }

  if (resProps.status === 'fulfilled' && Array.isArray(resProps.value)) {
    propriedades = resProps.value;
  }

  if (resLotes.status === 'fulfilled') {
    const val = resLotes.value;
    lotes = Array.isArray(val) ? val : (Array.isArray(val?.lotes) ? val.lotes : []);
  } else {
    erroLotes = true;
  }

  if (resVar.status === 'fulfilled' && Array.isArray(resVar.value)) {
    variedades = resVar.value;
  }

  if (resSensores.status === 'fulfilled') {
    const val = resSensores.value;
    sensores = Array.isArray(val) ? val : (Array.isArray(val?.sensores) ? val.sensores : []);
  } else {
    erroSensores = true;
  }

  // Ordenar lotes mais recentes primeiro (data_colheita desc, depois id_lote desc)
  _lotesReais = [...lotes].sort((a, b) => {
    const da = a?.data_colheita ? String(a.data_colheita).split('T')[0] : '';
    const db = b?.data_colheita ? String(b.data_colheita).split('T')[0] : '';
    if (db !== da) return db.localeCompare(da);
    return Number(b?.id_lote || 0) - Number(a?.id_lote || 0);
  });

  _filtroAtivoLotes = 'todos';
  _termoBuscaLotes = '';
  _limiteExibicaoLotes = 20;

  _safraVigente = safras.find(s => s && s.ativa === true) || null;

  const areasValidas = propriedades.map(p => Number(p?.area_ha)).filter(v => !isNaN(v) && v > 0);
  const areaTotalHa = areasValidas.length > 0 ? areasValidas.reduce((acc, v) => acc + v, 0) : 0;
  const areaTexto = areaTotalHa > 0
    ? `${areaTotalHa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
    : '—';

  // Card 1: Ciclo Safra
  const metaTonHa = _safraVigente?.meta_ton_ha != null ? Number(_safraVigente.meta_ton_ha) : null;
  const dataInicioTxt = _safraVigente?.data_inicio ? formatarDataBr(_safraVigente.data_inicio) : '—';
  const dataFimTxt = _safraVigente ? (_safraVigente.data_fim ? formatarDataBr(_safraVigente.data_fim) : 'em aberto') : '—';

  // KPI 1: Meta de Produtividade (só exibe se houver meta_ton_ha e areaTotalHa > 0)
  const mostrarKpiMeta = metaTonHa != null && !isNaN(metaTonHa) && areaTotalHa > 0;
  const metaProjetadaTon = mostrarKpiMeta ? metaTonHa * areaTotalHa : 0;
  const lotesSafraVigente = _safraVigente ? _lotesReais.filter(l => loteNaSafraVigente(l, _safraVigente)) : [];
  const volumeSafraTon = lotesSafraVigente.reduce((acc, l) => acc + loteParaToneladas(l), 0);

  // KPI 2: Volume monitorado
  const volumeTotalTon = _lotesReais.reduce((acc, l) => acc + loteParaToneladas(l), 0);
  const porCulturaMap = new Map();
  for (const l of _lotesReais) {
    const nomeFruta = l?.fruta || 'Não informada';
    const atual = porCulturaMap.get(nomeFruta) || { ton: 0, count: 0 };
    atual.ton += loteParaToneladas(l);
    atual.count += 1;
    porCulturaMap.set(nomeFruta, atual);
  }
  const culturasLista = Array.from(porCulturaMap.entries()).map(([nome, info]) => ({
    nome,
    ton: info.ton,
    count: info.count,
    pct: volumeTotalTon > 0 ? Math.round((info.ton / volumeTotalTon) * 100) : Math.round((info.count / Math.max(1, _lotesReais.length)) * 100)
  })).sort((a, b) => b.ton - a.ton || b.count - a.count);

  const coresCultura = ['#10B981', '#0284C7', '#F59E0B', '#8B5CF6', '#EC4899'];

  // KPI 3: Destino dos lotes (só exibe se houver destino preenchido em GET /lotes)
  const porDestinoMap = new Map();
  let volumeComDestinoTon = 0;
  let lotesComDestinoCount = 0;
  for (const l of _lotesReais) {
    const dest = l?.destino ? String(l.destino).trim() : '';
    if (!dest) continue;
    const ton = loteParaToneladas(l);
    volumeComDestinoTon += ton;
    lotesComDestinoCount += 1;
    const atual = porDestinoMap.get(dest) || { ton: 0, count: 0 };
    atual.ton += ton;
    atual.count += 1;
    porDestinoMap.set(dest, atual);
  }
  const destinosLista = Array.from(porDestinoMap.entries()).map(([nome, info]) => ({
    nome,
    ton: info.ton,
    count: info.count,
    pct: volumeComDestinoTon > 0 ? Math.round((info.ton / volumeComDestinoTon) * 100) : Math.round((info.count / Math.max(1, lotesComDestinoCount)) * 100)
  })).sort((a, b) => b.ton - a.ton || b.count - a.count);
  const mostrarKpiDestino = destinosLista.length > 0;

  // Esteira: Status dos lotes (agrupado pelos status que existem nos dados)
  const porStatusMap = new Map();
  for (const l of _lotesReais) {
    const st = l?.status ? String(l.status).trim() : 'Sem status';
    const atual = porStatusMap.get(st) || { count: 0, ton: 0 };
    atual.count += 1;
    atual.ton += loteParaToneladas(l);
    porStatusMap.set(st, atual);
  }
  const statusExistentes = Array.from(porStatusMap.entries()).map(([status, info]) => ({
    status,
    count: info.count,
    ton: info.ton
  }));

  const coresStatus = {
    'Em produção': '#10B981',
    'Pronto para colheita': '#3B82F6',
    'Colhido': '#0284C7',
    'Em transporte': '#8B5CF6',
    'Armazenado': '#06B6D4',
    'Finalizado': '#64748B',
    'Sem status': '#94A3B8'
  };

  // Padrões Mínimos de Qualidade (padrao_qualidade via GET /variedades)
  const variedadesComPadrao = variedades.filter(v => v && (v.brix_min != null || v.calibre_min != null));
  const mostrarPadroesQualidade = variedadesComPadrao.length > 0;

  const numKpis = 1 + (mostrarKpiMeta ? 1 : 0) + (mostrarKpiDestino ? 1 : 0);

  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- Sub-barra: Ciclo Safra -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 10px; font-weight: 800; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px;">CICLO SAFRA</span>
            ${metaTonHa != null ? `<span style="font-size: 11px; color: #64748B;">Meta: <strong style="color: #0F172A; font-weight: 700;">${metaTonHa.toLocaleString('pt-BR')} ton/ha</strong></span>` : ''}
          </div>
          <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 4px 0 2px 0;">
            ${_safraVigente ? _safraVigente.nome : (erroSafras ? 'Não foi possível carregar a safra vigente.' : 'Nenhuma safra vigente encontrada.')}
          </h3>
        </div>

        <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
          <div style="display: flex; gap: 18px; font-size: 11px; color: #64748B; line-height: 1.4;">
            <div>
              <div>Período</div>
              <div>Vigente:</div>
            </div>
            <div style="font-weight: 700; color: #0F172A;">
              <div>${dataInicioTxt} -</div>
              <div>${dataFimTxt}</div>
            </div>
            <div>
              <div>Área</div>
              <div>Cadastrada:</div>
            </div>
            <div style="font-weight: 700; color: #0F172A;">
              <div>${areaTexto}</div>
              <div>propriedades</div>
            </div>
          </div>
          <button class="btn" id="btn-exportar-lotes-pdf-csv" style="background: #F8FAFC; color: #334155; border: 1px solid #CBD5E1; font-size: 11px; font-weight: 700; padding: 8px 13px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 13px; height: 13px; color: #059669;"></i>
            <span>PDF / CSV</span>
          </button>
        </div>
      </div>

      <!-- KPIs Reais do Ciclo de Safra -->
      <div class="admin-kpi-grid-4" style="grid-template-columns: repeat(${numKpis}, minmax(0, 1fr));">
        ${mostrarKpiMeta ? `
          <!-- KPI: META DE PRODUTIVIDADE -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">META DE PRODUTIVIDADE</span>
              <span style="font-size: 10px; font-weight: 600; color: #64748B;">${_safraVigente.nome}</span>
            </div>
            <div style="margin: 12px 0;">
              <div style="font-size: 20px; font-weight: 800; color: #0F172A;">${formatarToneladas(metaProjetadaTon)} t</div>
              <div style="font-size: 11px; color: #64748B;">Meta projetada (${metaTonHa.toLocaleString('pt-BR')} ton/ha × ${areaTexto})</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              <span>Volume registrado na safra</span>
              <strong style="color: #0F172A;">${formatarToneladas(volumeSafraTon)} t</strong>
            </div>
          </div>
        ` : ''}

        <!-- KPI: VOLUME MONITORADO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">VOLUME MONITORADO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">${_lotesReais.length} lotes</span>
          </div>
          <div style="margin: 10px 0;">
            ${erroLotes ? `
              <div style="font-size: 12px; color: #64748B;">Não foi possível carregar os lotes.</div>
            ` : `
              <div style="font-size: 20px; font-weight: 800; color: #0F172A;">${formatarToneladas(volumeTotalTon)} toneladas</div>
              ${culturasLista.length > 0 ? `
                <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; display: flex; overflow: hidden; margin: 10px 0 8px 0;">
                  ${culturasLista.map((c, idx) => `<div style="width: ${c.pct}%; background: ${coresCultura[idx % coresCultura.length]};" title="${c.nome} ${c.pct}%"></div>`).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 10px; color: #64748B;">
                  ${culturasLista.map((c, idx) => `<span><span style="color:${coresCultura[idx % coresCultura.length]};">•</span> ${c.nome} ${c.pct}%</span>`).join('')}
                </div>
              ` : '<div style="font-size: 11px; color: #64748B; margin-top: 6px;">Nenhum lote registrado.</div>'}
            `}
          </div>
        </div>

        ${mostrarKpiDestino ? `
          <!-- KPI: DESTINO DOS LOTES -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DESTINO DOS LOTES</span>
              <span style="font-size: 10px; font-weight: 600; color: #64748B;">${lotesComDestinoCount} lotes</span>
            </div>
            <div style="font-size: 11px; color: #475569; display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
              ${destinosLista.slice(0, 4).map((d, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: ${coresCultura[idx % coresCultura.length]};"></span> ${d.nome}</span>
                  <strong>${d.pct}% <span style="font-size: 10px; color: #94A3B8;">(${formatarToneladas(d.ton)}t)</span></strong>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Seção: Status dos lotes -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="git-commit" style="width: 16px; height: 16px; color: #10B981;"></i>
              Status dos lotes
            </h3>
          </div>
        </div>

        ${erroLotes ? `
          <div style="padding: 16px; text-align: center; color: #64748B; font-size: 12px;">Não foi possível carregar os lotes.</div>
        ` : (statusExistentes.length === 0 ? `
          <div style="padding: 16px; text-align: center; color: #64748B; font-size: 12px;">Nenhum lote cadastrado.</div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
            ${statusExistentes.map(st => {
              const cor = coresStatus[st.status] || '#64748B';
              return `
                <div class="card-estagio-esteira" data-estagio="${st.status}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; border-top: 3px solid ${cor}; cursor: pointer; transition: all 0.2s;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; font-weight: 700; color: #0F172A;">${st.status}</span>
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${cor};"></span>
                  </div>
                  <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 4px 0;">${st.count}</div>
                  <div style="font-size: 10px; color: #64748B;">${formatarToneladas(st.ton)} ton</div>
                </div>
              `;
            }).join('')}
          </div>
        `)}
      </div>

      <!-- Seção: Lista de Lotes -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;">Lotes em Monitoramento</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;" id="subtitulo-contagem-lotes">${Math.min(_limiteExibicaoLotes, _lotesReais.length)} de ${_lotesReais.length} lotes cadastrados</p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; width: 220px;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-lote" placeholder="Buscar por lote, fruta, destino..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
            </div>

            <div style="display: flex; gap: 6px; overflow-x: auto;">
              <button class="btn-filter-lote active" data-filter="todos" style="padding: 6px 14px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (${_lotesReais.length})</button>
              ${statusExistentes.map(st => `
                <button class="btn-filter-lote" data-filter="${st.status}" style="padding: 6px 14px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">${st.status} (${st.count})</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="container-cards-lotes" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          ${erroLotes ? `
            <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #64748B; font-size: 13px;">
              Não foi possível carregar os lotes.
            </div>
          ` : renderCardsLotesHtml(_lotesReais.slice(0, _limiteExibicaoLotes))}
        </div>

        <div id="container-ver-mais-lotes" style="margin-top: 16px; text-align: center; display: ${_lotesReais.length > _limiteExibicaoLotes ? 'block' : 'none'};">
          <button id="btn-ver-mais-lotes" style="padding: 8px 20px; font-size: 12px; font-weight: 700; background: #F8FAFC; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 8px; cursor: pointer;">
            Ver mais
          </button>
        </div>
      </div>

      ${mostrarPadroesQualidade ? `
        <!-- Seção: Padrões Mínimos de Qualidade (padrao_qualidade) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="bar-chart-2" style="width: 16px; height: 16px; color: #15803D;"></i>
              Padrões Mínimos de Qualidade (padrao_qualidade)
            </h3>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${variedadesComPadrao.map(v => `
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; flex-wrap: wrap; gap: 8px;">
                  <strong style="color: #0F172A;">${v.fruta || ''} — ${v.nome || ''}</strong>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${v.brix_min != null ? `<span style="font-size: 10px; color: #64748B; font-family: monospace;">brix_min: ${v.brix_min}°Bx</span>` : ''}
                    ${v.calibre_min != null ? `<span style="background: #DCFCE7; color: #047857; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">calibre_min: ${v.calibre_min}</span>` : ''}
                    ${v.classe ? `<span style="font-size: 10px; color: #334155; font-weight: 600;">Classe: ${v.classe}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${!erroSensores ? `
        <!-- Rodapé com contagem real de sensores -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;">
              <i data-lucide="radio" style="width: 17px; height: 17px;"></i>
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #0F172A;">${sensores.length} sensores cadastrados</div>
            </div>
          </div>
        </div>
      ` : ''}
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

  return lotes.map(l => {
    const statusTxt = l?.status ? String(l.status) : 'Sem status';
    const dataColheita = formatarDataBr(l?.data_colheita);
    const destinoTxt = l?.destino ? String(l.destino) : '—';
    const frutaTxt = l?.fruta ? String(l.fruta) : 'Fruta não informada';
    const qtdTxt = formatarQuantidadeLote(l);

    return `
      <div class="card-lote-monitorado" data-id="${l.id_lote}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; cursor: pointer;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <i data-lucide="package" style="width: 14px; height: 14px; color: #059669;"></i>
                <strong style="font-size: 13px; color: #0F172A;">#Lote ${l.id_lote}</strong>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${frutaTxt}</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #E2E8F0; color: #334155;">
              ${statusTxt}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 1px solid #E2E8F0;">
            <span style="color: #64748B;">Colheita: ${dataColheita}</span>
            <strong style="color: #0F172A;">${qtdTxt}</strong>
          </div>
          <div style="font-size: 10px; color: #64748B; text-align: right; margin-top: 4px;">
            Destino: <strong>${destinoTxt}</strong>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
          <button class="btn-ver-lote" data-id="${l.id_lote}" title="Inspecionar ficha do lote" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #0F172A; cursor: pointer;">
            <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getLotesFiltrados() {
  return _lotesReais.filter(l => {
    if (_termoBuscaLotes) {
      const termo = _termoBuscaLotes.toLowerCase();
      const matchId = String(l?.id_lote || '').toLowerCase().includes(termo);
      const matchFruta = String(l?.fruta || '').toLowerCase().includes(termo);
      const matchDestino = String(l?.destino || '').toLowerCase().includes(termo);
      const matchStatus = String(l?.status || '').toLowerCase().includes(termo);
      if (!matchId && !matchFruta && !matchDestino && !matchStatus) return false;
    }

    if (_filtroAtivoLotes !== 'todos') {
      const statusAtual = l?.status ? String(l.status).trim() : 'Sem status';
      return statusAtual === _filtroAtivoLotes;
    }
    return true;
  });
}

function atualizarListaLotes() {
  const container = document.getElementById('container-cards-lotes');
  if (!container) return;

  const filtrados = getLotesFiltrados();
  const visiveis = filtrados.slice(0, _limiteExibicaoLotes);

  container.innerHTML = renderCardsLotesHtml(visiveis);
  if (window.lucide) window.lucide.createIcons();
  vincularEventosCards();

  const subtitulo = document.getElementById('subtitulo-contagem-lotes');
  if (subtitulo) {
    subtitulo.textContent = `${visiveis.length} de ${filtrados.length} lotes cadastrados`;
  }

  const wrapVerMais = document.getElementById('container-ver-mais-lotes');
  if (wrapVerMais) {
    wrapVerMais.style.display = filtrados.length > _limiteExibicaoLotes ? 'block' : 'none';
  }
}

function abrirModalInspecaoLote(loteId) {
  const lote = _lotesReais.find(l => String(l.id_lote) === String(loteId));
  if (!lote) return;

  Modal.open(`Ficha do Lote — #${lote.id_lote}`, `
    <div style="font-size: 12px; color: #334155;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div>
          <span style="font-size: 10px; color: #64748B;">Fruta:</span>
          <div style="font-weight: 700; color: #0F172A; font-size: 13px;">${lote.fruta || '—'}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Data de Colheita:</span>
          <div style="font-weight: 700; color: #0F172A;">${formatarDataBr(lote.data_colheita)}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Quantidade:</span>
          <div style="font-weight: 700; color: #0F172A;">${formatarQuantidadeLote(lote)}</div>
        </div>
        <div>
          <span style="font-size: 10px; color: #64748B;">Destino:</span>
          <div style="font-weight: 700; color: #047857;">${lote.destino || '—'}</div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <label style="font-size: 11px; font-weight: 700; color: #0F172A; display: block; margin-bottom: 6px;">
          Status do lote:
        </label>
        <select id="modal-select-status-lote" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF;">
          <option value="Em produção" ${lote.status === 'Em produção' ? 'selected' : ''}>Em produção</option>
          <option value="Pronto para colheita" ${lote.status === 'Pronto para colheita' ? 'selected' : ''}>Pronto para colheita</option>
          <option value="Colhido" ${lote.status === 'Colhido' ? 'selected' : ''}>Colhido</option>
          <option value="Em transporte" ${lote.status === 'Em transporte' ? 'selected' : ''}>Em transporte</option>
          <option value="Armazenado" ${lote.status === 'Armazenado' ? 'selected' : ''}>Armazenado</option>
          <option value="Finalizado" ${lote.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
        </select>
      </div>
    </div>
  `, async () => {
    const novoStatus = document.getElementById('modal-select-status-lote')?.value;
    if (novoStatus && novoStatus !== lote.status) {
      try {
        await api.request(`/lotes/${encodeURIComponent(lote.id_lote)}`, {
          method: 'PUT',
          body: JSON.stringify({ status: novoStatus })
        });
        lote.status = novoStatus;
        atualizarListaLotes();
        toast.success('Lote Atualizado', `Status do lote #${lote.id_lote} atualizado para "${novoStatus}".`);
      } catch (err) {
        toast.error('Erro ao Atualizar', err.message || 'Não foi possível atualizar o status do lote.');
      }
    }
  }, 'Salvar Alterações');
}

function vincularEventosCards() {
  document.querySelectorAll('.btn-ver-lote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModalInspecaoLote(e.currentTarget.dataset.id);
    });
  });

  document.querySelectorAll('.card-lote-monitorado').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      abrirModalInspecaoLote(card.dataset.id);
    });
  });
}

export function setupLotesEvents() {
  const inputBusca = document.getElementById('input-busca-lote');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaLotes = e.target.value.trim();
      _limiteExibicaoLotes = 20;
      atualizarListaLotes();
    });
  }

  document.querySelectorAll('.btn-filter-lote').forEach(tab => {
    tab.addEventListener('click', () => {
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
      _limiteExibicaoLotes = 20;
      atualizarListaLotes();
    });
  });

  document.querySelectorAll('.card-estagio-esteira').forEach(card => {
    card.addEventListener('click', () => {
      const estagio = card.dataset.estagio;
      _filtroAtivoLotes = estagio;
      _limiteExibicaoLotes = 20;
      document.querySelectorAll('.btn-filter-lote').forEach(t => {
        const isMatch = t.dataset.filter === estagio;
        t.classList.toggle('active', isMatch);
        t.style.background = isMatch ? '#183D2E' : '#F8FAFC';
        t.style.color = isMatch ? '#FFFFFF' : '#475569';
        t.style.border = isMatch ? 'none' : '1px solid #E2E8F0';
        t.style.fontWeight = isMatch ? '700' : '600';
      });
      atualizarListaLotes();
    });
  });

  document.getElementById('btn-ver-mais-lotes')?.addEventListener('click', () => {
    _limiteExibicaoLotes += 20;
    atualizarListaLotes();
  });

  document.getElementById('btn-exportar-lotes-pdf-csv')?.addEventListener('click', () => {
    const headers = ['ID Lote', 'Fruta', 'Status', 'Data Colheita', 'Quantidade', 'Unidade', 'Destino'];
    const rows = _lotesReais.map(l => [
      l.id_lote,
      l.fruta || '—',
      l.status || 'Sem status',
      formatarDataBr(l.data_colheita),
      l.quantidade ?? 0,
      l.unidade || '',
      l.destino || '—'
    ]);
    const dataTag = new Date().toISOString().slice(0, 10);
    const nomeSafra = _safraVigente?.nome || 'Safra';
    openExportChoiceModal(
      Modal,
      'Exportar Lotes',
      () => {
        downloadCSV(`lotes_${dataTag}.csv`, headers, rows);
        toast.success('CSV Exportado', `lotes_${dataTag}.csv baixado.`);
      },
      () => {
        downloadPDF(`lotes_${dataTag}.pdf`, {
          title: `Relatório de Lotes — ${nomeSafra}`,
          subtitle: 'Dados cadastrados em GET /lotes',
          headers,
          rows
        });
        toast.success('PDF Exportado', `lotes_${dataTag}.pdf baixado.`);
      }
    );
  });

  vincularEventosCards();
}
