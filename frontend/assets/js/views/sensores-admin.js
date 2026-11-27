/**
 * VIEW: SENSORES E TELEMETRIA DE CAMPO (ADMINISTRADOR)
 * Dados reais carregados via api.getSensores() e api.getSensorLeituras().
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

let _sensoresList = [];
let _leiturasSolo = [];
let _leiturasAr = [];
let _erroSensores = false;
let _filtroAmbienteSensor = 'todos';
let _termoBuscaSensor = '';
let _paginaAtualSensores = 1;
const _itensPorPagina = 10;

function extrairArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    if (Array.isArray(val.sensores)) return val.sensores;
    if (Array.isArray(val.pontos)) return val.pontos;
    if (Array.isArray(val.leituras)) return val.leituras;
    if (Array.isArray(val.itens)) return val.itens;
    if (Array.isArray(val.data)) return val.data;
  }
  return [];
}

function formatarDataHoraBr(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return String(iso);
  }
}

function formatarHoraBr(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife'
    }).format(d);
  } catch (e) {
    return '';
  }
}

function formatarLeituraSensor(s) {
  const amb = String(s?.ambiente || '').toLowerCase();
  if (amb === 'solo') {
    return s?.umidade != null ? `${Number(s.umidade).toFixed(1)}% umidade` : 'Sem leitura';
  }
  const temp = s?.temperatura != null ? `${Number(s.temperatura).toFixed(1)}°C` : null;
  const umid = s?.umidade != null ? `${Number(s.umidade).toFixed(1)}% UR` : null;
  if (temp && umid) return `${temp} • ${umid}`;
  if (temp) return temp;
  if (umid) return umid;
  return 'Sem leitura';
}

export async function renderSensoresAdmin() {
  _sensoresList = [];
  _leiturasSolo = [];
  _leiturasAr = [];
  _erroSensores = false;
  _filtroAmbienteSensor = 'todos';
  _termoBuscaSensor = '';
  _paginaAtualSensores = 1;

  try {
    const res = await api.getSensores();
    _sensoresList = extrairArray(res);
  } catch (err) {
    console.warn('[SensoresAdmin] Falha ao buscar sensores:', err);
    _erroSensores = true;
  }

  const sensorSolo = _sensoresList.find(s => String(s?.ambiente || '').toLowerCase() === 'solo');
  const sensorAr = _sensoresList.find(s => String(s?.ambiente || '').toLowerCase() === 'ar');

  const [resSolo, resAr] = await Promise.allSettled([
    sensorSolo ? api.getSensorLeituras(sensorSolo.id_sensor, '24h') : Promise.resolve([]),
    sensorAr ? api.getSensorLeituras(sensorAr.id_sensor, '24h') : Promise.resolve([])
  ]);

  if (resSolo.status === 'fulfilled') {
    _leiturasSolo = extrairArray(resSolo.value);
  }
  if (resAr.status === 'fulfilled') {
    _leiturasAr = extrairArray(resAr.value);
  }

  const total = _sensoresList.length;
  const totalSolo = _sensoresList.filter(s => String(s?.ambiente || '').toLowerCase() === 'solo').length;
  const totalAr = _sensoresList.filter(s => String(s?.ambiente || '').toLowerCase() === 'ar').length;
  const totalAtivos = _sensoresList.filter(s => String(s?.status || '').toLowerCase() === 'ativo').length;
  const pctSolo = total > 0 ? Math.round((totalSolo / total) * 100) : 0;
  const pctAr = total > 0 ? Math.round((totalAr / total) * 100) : 0;

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra de Ações -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="font-size: 13px; font-weight: 700; color: #0F172A;">
          Sensores e Telemetria
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-analista-sync" id="btn-export-leituras" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i>
            <span>Exportar Sensores (CSV / PDF)</span>
          </button>
          <button class="btn btn-primary" id="btn-provisionar-sensor" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            <span>Cadastrar Sensor</span>
          </button>
        </div>
      </div>

      <!-- Card Distribuição de Sensores (100% da largura, alinhado aos blocos abaixo) -->
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; width: 100%;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISTRIBUIÇÃO DE SENSORES</span>
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 3px 10px; border-radius: 12px;">${totalAtivos} de ${total} ativos</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin: 14px 0 10px 0;">
            <div>
              <div style="font-size: 22px; font-weight: 800; color: #0F172A;">${total}</div>
              <div style="font-size: 11px; color: #64748B;">Total de sensores</div>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 800; color: #059669;">${totalSolo}</div>
              <div style="font-size: 11px; color: #64748B;">Umidade do Solo (${pctSolo}%)</div>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 800; color: #0284C7;">${totalAr}</div>
              <div style="font-size: 11px; color: #64748B;">Ar / Microclima (${pctAr}%)</div>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 800; color: #0F172A;">${totalAtivos}</div>
              <div style="font-size: 11px; color: #64748B;">Ativos no sistema</div>
            </div>
          </div>
          <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; display: flex; overflow: hidden;">
            <div style="width: ${pctSolo}%; background: #10B981;" title="Solo ${pctSolo}%"></div>
            <div style="width: ${pctAr}%; background: #0284C7;" title="Ar ${pctAr}%"></div>
          </div>
        </div>
      </div>

      <!-- Lista de Sensores Cadastrados -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="position: relative; flex: 1; min-width: 220px; max-width: 380px;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" id="input-busca-sensor" placeholder="Filtrar por nome, tipo, localização ou status..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="tab-sensor-admin active" data-cat="todos" style="padding: 6px 12px; font-size: 10px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (${total})</button>
            <button class="tab-sensor-admin" data-cat="solo" style="padding: 6px 12px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (${totalSolo})</button>
            <button class="tab-sensor-admin" data-cat="ar" style="padding: 6px 12px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Ar (${totalAr})</button>
          </div>
        </div>

        <div id="container-lista-sensores" style="display: flex; flex-direction: column; gap: 12px;">
          ${renderLinhasSensoresHtml()}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B; flex-wrap: wrap; gap: 8px;">
          <span id="texto-paginacao-sensores"></span>
          <div style="display: flex; gap: 6px;" id="controles-paginacao-sensores"></div>
        </div>
      </div>

      <!-- Correlação Térmica e Hídrica (24h) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0;">Correlação Térmica e Hídrica (24h)</h4>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Leituras reais registradas nas últimas 24 horas</p>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; font-size: 11px; color: #64748B;">
            <span style="display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span> Umidade Solo (%)
            </span>
            <span style="display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #0284C7;"></span> Temp. Ar (°C)
            </span>
          </div>
        </div>

        ${renderGraficoCorrelacaoRealHtml()}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
            <span style="font-size: 11px; color: #64748B;">Umidade Solo:</span>
            <strong style="font-size: 13px; color: #0F172A; margin-left: 4px;">${sensorSolo?.umidade != null ? `${Number(sensorSolo.umidade).toFixed(1)}%` : 'Sem dados'}</strong>
            <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
              Última leitura: ${sensorSolo?.ultima_leitura ? formatarDataHoraBr(sensorSolo.ultima_leitura) : 'Sem dados'}
            </div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
            <span style="font-size: 11px; color: #64748B;">Temp. Ar:</span>
            <strong style="font-size: 13px; color: #0F172A; margin-left: 4px;">${sensorAr?.temperatura != null ? `${Number(sensorAr.temperatura).toFixed(1)}°C` : 'Sem dados'}</strong>
            <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
              Umidade Ar (UR): <strong>${sensorAr?.umidade != null ? `${Number(sensorAr.umidade).toFixed(1)}%` : 'Sem dados'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGraficoCorrelacaoRealHtml() {
  const ptsSolo = _leiturasSolo
    .filter(p => p && p.umidade != null)
    .map(p => ({ t: p.data_hora || p.instante || p.created_at, v: Number(p.umidade) }))
    .filter(p => !isNaN(p.v));

  const ptsAr = _leiturasAr
    .filter(p => p && p.temperatura != null)
    .map(p => ({ t: p.data_hora || p.instante || p.created_at, v: Number(p.temperatura) }))
    .filter(p => !isNaN(p.v));

  if (ptsSolo.length === 0 && ptsAr.length === 0) {
    return `
      <div style="width: 100%; height: 220px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 13px; font-weight: 600;">
        Sem dados
      </div>
    `;
  }

  const W = 800;
  const H = 220;
  const padLeft = 48;
  const padRight = 48;
  const padTop = 18;
  const padBottom = 18;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const calcRange = (pts, minClamp, maxClamp) => {
    if (pts.length === 0) return { min: 0, max: 1 };
    const vals = pts.map(p => p.v);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo;
    const pad = span === 0 ? 5 : Math.max(1, span * 0.12);
    let minV = lo - pad;
    let maxV = hi + pad;
    if (minClamp != null) minV = Math.max(minClamp, minV);
    if (maxClamp != null) maxV = Math.min(maxClamp, maxV);
    if (maxV <= minV) maxV = minV + 1;
    return { min: minV, max: maxV };
  };

  const rangeSolo = calcRange(ptsSolo, 0, 100);
  const rangeAr = calcRange(ptsAr, null, null);

  const mapPoints = (pts, range) => {
    if (pts.length === 0) return [];
    const span = Math.max(0.001, range.max - range.min);
    return pts.map((p, idx) => {
      const x = pts.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (pts.length - 1)) * plotW;
      const norm = (p.v - range.min) / span;
      const y = padTop + plotH - Math.max(0, Math.min(1, norm)) * plotH;
      return { ...p, x, y };
    });
  };

  const soloCoords = mapPoints(ptsSolo, rangeSolo);
  const arCoords = mapPoints(ptsAr, rangeAr);
  const soloPointsStr = soloCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const arPointsStr = arCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const ticks = [0, 1 / 3, 2 / 3, 1];
  const gridAndAxesHtml = ticks.map(frac => {
    const y = padTop + plotH * (1 - frac);
    const soloVal = rangeSolo.min + (rangeSolo.max - rangeSolo.min) * frac;
    const arVal = rangeAr.min + (rangeAr.max - rangeAr.min) * frac;
    const soloLabel = ptsSolo.length > 0 ? `${soloVal.toFixed((rangeSolo.max - rangeSolo.min) < 5 ? 1 : 0)}%` : '';
    const arLabel = ptsAr.length > 0 ? `${arVal.toFixed((rangeAr.max - rangeAr.min) < 5 ? 1 : 0)}°C` : '';
    return `
      <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${W - padRight}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>
      ${soloLabel ? `<text x="${padLeft - 6}" y="${(y + 3).toFixed(1)}" fill="#047857" font-size="10" font-weight="600" text-anchor="end">${soloLabel}</text>` : ''}
      ${arLabel ? `<text x="${W - padRight + 6}" y="${(y + 3).toFixed(1)}" fill="#0284C7" font-size="10" font-weight="600" text-anchor="start">${arLabel}</text>` : ''}
    `;
  }).join('');

  const soloDotsHtml = soloCoords.map(c => `
    <circle class="correlacao-ponto" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#10B981" stroke="#FFFFFF" stroke-width="1.5" style="cursor: pointer;" data-serie="Umidade Solo" data-valor="${c.v.toFixed(1)}%" data-hora="${formatarDataHoraBr(c.t)}" />
  `).join('');

  const arDotsHtml = arCoords.map(c => `
    <circle class="correlacao-ponto" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5" style="cursor: pointer;" data-serie="Temp. Ar" data-valor="${c.v.toFixed(1)}°C" data-hora="${formatarDataHoraBr(c.t)}" />
  `).join('');

  const labelsSource = ptsAr.length >= ptsSolo.length ? ptsAr : ptsSolo;
  const horaInicio = labelsSource.length > 0 ? formatarHoraBr(labelsSource[0].t) : '';
  const horaMeio = labelsSource.length > 2 ? formatarHoraBr(labelsSource[Math.floor(labelsSource.length / 2)].t) : '';
  const horaFim = labelsSource.length > 1 ? formatarHoraBr(labelsSource[labelsSource.length - 1].t) : '';

  return `
    <div id="correlacao-chart-wrap" style="position: relative; width: 100%; height: 220px; background: #FAFDFB; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; padding: 8px 12px;">
      <svg viewBox="0 0 ${W} ${H}" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="none">
        ${gridAndAxesHtml}
        ${soloPointsStr ? `<polyline points="${soloPointsStr}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        ${arPointsStr ? `<polyline points="${arPointsStr}" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        ${soloDotsHtml}
        ${arDotsHtml}
      </svg>
      <div id="correlacao-tooltip" style="display: none; position: absolute; pointer-events: none; background: #0F172A; color: #FFFFFF; padding: 6px 10px; border-radius: 6px; font-size: 11px; line-height: 1.4; box-shadow: 0 4px 12px rgba(15,23,42,0.2); z-index: 10; white-space: nowrap;"></div>
    </div>
    ${(horaInicio || horaFim) ? `
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 6px; padding: 0 48px;">
        <span>${horaInicio}</span>
        <span>${horaMeio}</span>
        <span>${horaFim}</span>
      </div>
    ` : ''}
  `;
}

function getSensoresFiltrados() {
  return _sensoresList.filter(s => {
    if (_termoBuscaSensor) {
      const t = _termoBuscaSensor.toLowerCase();
      const texto = `${s.id_sensor || ''} ${s.nome || ''} ${s.tipo_sensor || ''} ${s.ambiente || ''} ${s.localizacao || ''} ${s.status || ''}`.toLowerCase();
      if (!texto.includes(t)) return false;
    }
    const amb = String(s.ambiente || '').toLowerCase();
    if (_filtroAmbienteSensor === 'solo') return amb === 'solo';
    if (_filtroAmbienteSensor === 'ar') return amb === 'ar';
    return true;
  });
}

function renderLinhasSensoresHtml() {
  if (_erroSensores) {
    return `
      <div style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
        Não foi possível carregar os sensores.
      </div>
    `;
  }

  const filtrados = getSensoresFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / _itensPorPagina));
  if (_paginaAtualSensores > totalPaginas) _paginaAtualSensores = totalPaginas;
  const inicio = (_paginaAtualSensores - 1) * _itensPorPagina;
  const paginaItens = filtrados.slice(inicio, inicio + _itensPorPagina);

  if (paginaItens.length === 0) {
    return `
      <div style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; background: #F8FAFC; border-radius: 8px;">
        Nenhum sensor encontrado.
      </div>
    `;
  }

  return paginaItens.map(s => {
    const amb = String(s.ambiente || '').toLowerCase();
    const isSolo = amb === 'solo';
    const icone = isSolo ? 'droplet' : 'thermometer';
    const corIcone = isSolo ? '#10B981' : '#0284C7';
    const statusStr = String(s.status || 'inativo').toLowerCase();
    const isAtivo = statusStr === 'ativo';
    const leituraTexto = formatarLeituraSensor(s);
    const dataTexto = s.ultima_leitura ? formatarDataHoraBr(s.ultima_leitura) : '—';

    return `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; color: ${corIcone}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="${icone}" style="width: 18px; height: 18px;"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 14px; color: #0F172A;">${s.nome || `Sensor #${s.id_sensor}`}</strong>
              <span style="font-size: 11px; color: #64748B;">${s.tipo_sensor || (isSolo ? 'Sensor de Umidade do Solo' : 'Sensor de Ar')}</span>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${isAtivo ? 'background: #DCFCE7; color: #15803D;' : 'background: #F1F5F9; color: #64748B;'}">
                • ${s.status || '—'}
              </span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
              ${s.localizacao || 'Sem localização'}${s.id_lote ? ` • Lote #${s.id_lote}` : ''}
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 4px;">
              ${leituraTexto} <span style="font-weight: 500; color: #64748B; font-size: 11px; margin-left: 8px;">• Última leitura: ${dataTexto}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="btn-sn-act" data-id="${s.id_sensor}" data-action="editar" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Editar</button>
          <button class="btn-sn-act" data-id="${s.id_sensor}" data-action="leituras" style="background: #183D2E; color: #FFFFFF; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ver Leituras</button>
        </div>
      </div>
    `;
  }).join('');
}

function atualizarPaginacaoSensores() {
  const filtrados = getSensoresFiltrados();
  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / _itensPorPagina));
  if (_paginaAtualSensores > totalPaginas) _paginaAtualSensores = totalPaginas;
  const inicio = (_paginaAtualSensores - 1) * _itensPorPagina;
  const fim = Math.min(inicio + _itensPorPagina, total);

  const textoPag = document.getElementById('texto-paginacao-sensores');
  if (textoPag) {
    textoPag.textContent = total > 0
      ? `Mostrando ${inicio + 1}–${fim} de ${total}`
      : 'Mostrando 0–0 de 0';
  }

  const controles = document.getElementById('controles-paginacao-sensores');
  if (controles) {
    const prevDisabled = _paginaAtualSensores <= 1;
    const nextDisabled = _paginaAtualSensores >= totalPaginas;
    let html = `<button class="btn-pag-sensor" data-pag="prev" ${prevDisabled ? 'disabled' : ''} style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; color: ${prevDisabled ? '#94A3B8' : '#475569'}; border-radius: 4px; cursor: ${prevDisabled ? 'not-allowed' : 'pointer'};">Anterior</button>`;
    for (let p = 1; p <= totalPaginas; p++) {
      const ativo = p === _paginaAtualSensores;
      html += `<button class="btn-pag-sensor${ativo ? ' active' : ''}" data-pag="${p}" style="padding: 4px 10px; border: 1px solid ${ativo ? '#183D2E' : '#CBD5E1'}; background: ${ativo ? '#183D2E' : '#FFFFFF'}; color: ${ativo ? '#FFFFFF' : '#475569'}; border-radius: 4px; font-weight: ${ativo ? '700' : '400'}; cursor: pointer;">${p}</button>`;
    }
    html += `<button class="btn-pag-sensor" data-pag="next" ${nextDisabled ? 'disabled' : ''} style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; color: ${nextDisabled ? '#94A3B8' : '#475569'}; border-radius: 4px; cursor: ${nextDisabled ? 'not-allowed' : 'pointer'};">Próxima</button>`;
    controles.innerHTML = html;
  }
}

function atualizarTabelaSensores() {
  const container = document.getElementById('container-lista-sensores');
  if (container) {
    container.innerHTML = renderLinhasSensoresHtml();
    if (window.lucide) window.lucide.createIcons();
    vincularEventosSensores();
  }
  atualizarPaginacaoSensores();
}

function vincularEventosSensores() {
  document.querySelectorAll('.btn-sn-act').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const act = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      const sensor = _sensoresList.find(s => String(s.id_sensor) === String(id));
      if (!sensor) return;

      if (act === 'editar') {
        Modal.open(`Editar Sensor — ${sensor.nome || '#' + id}`, `
          <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
            <label>Nome do Sensor:
              <input type="text" id="edit-sensor-nome" value="${String(sensor.nome || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Tipo do Sensor:
              <input type="text" id="edit-sensor-tipo" value="${String(sensor.tipo_sensor || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Localização:
              <input type="text" id="edit-sensor-loc" value="${String(sensor.localizacao || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Status:
              <select id="edit-sensor-status" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
                <option value="ativo" ${String(sensor.status || '').toLowerCase() === 'ativo' ? 'selected' : ''}>Ativo</option>
                <option value="inativo" ${String(sensor.status || '').toLowerCase() === 'inativo' ? 'selected' : ''}>Inativo</option>
              </select>
            </label>
          </div>
        `, async () => {
          const nome = document.getElementById('edit-sensor-nome')?.value?.trim() || sensor.nome;
          const tipo_sensor = document.getElementById('edit-sensor-tipo')?.value?.trim() || sensor.tipo_sensor;
          const localizacao = document.getElementById('edit-sensor-loc')?.value?.trim() || sensor.localizacao;
          const status = document.getElementById('edit-sensor-status')?.value || sensor.status;

          try {
            await api.updateSensor(id, { nome, tipo_sensor, localizacao, status });
            sensor.nome = nome;
            sensor.tipo_sensor = tipo_sensor;
            sensor.localizacao = localizacao;
            sensor.status = status;
            atualizarTabelaSensores();
            toast.success('Sensor Atualizado', `Dados de ${nome} salvos no servidor.`);
          } catch (err) {
            toast.error('Erro ao Atualizar', err.message || 'Não foi possível atualizar o sensor.');
          }
        }, 'Salvar Alterações');
      } else if (act === 'leituras') {
        try {
          const res = await api.getSensorLeituras(id, '24h');
          const lista = extrairArray(res).slice(-10).reverse();
          const linhas = lista.length === 0
            ? '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #64748B;">Sem leituras nas últimas 24h.</td></tr>'
            : lista.map(l => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;">${formatarDataHoraBr(l.data_hora || l.instante || l.created_at)}</td>
                <td style="padding: 6px 10px; font-weight: 700;">${l.temperatura != null ? `${Number(l.temperatura).toFixed(1)}°C` : '—'}</td>
                <td style="padding: 6px 10px; font-weight: 700;">${l.umidade != null ? `${Number(l.umidade).toFixed(1)}%` : '—'}</td>
              </tr>
            `).join('');

          Modal.open(`Leituras (24h) — ${sensor.nome || '#' + id}`, `
            <div style="max-height: 280px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #F1F5F9; text-align: left;">
                    <th style="padding: 6px 10px;">Data / Hora</th>
                    <th style="padding: 6px 10px;">Temperatura</th>
                    <th style="padding: 6px 10px;">Umidade</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
          `, null, 'Fechar');
        } catch (err) {
          toast.error('Erro ao Carregar Leituras', err.message || 'Falha ao consultar leituras do sensor.');
        }
      }
    });
  });
}

export function setupSensoresAdminEvents() {
  const btnExport = document.getElementById('btn-export-leituras');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const headers = ['ID', 'Nome', 'Tipo', 'Ambiente', 'Localização', 'Status', 'Última Leitura'];
      const rows = _sensoresList.map(s => [
        s.id_sensor,
        s.nome || '',
        s.tipo_sensor || '',
        s.ambiente || '',
        s.localizacao || '',
        s.status || '',
        formatarLeituraSensor(s)
      ]);
      const dataTag = new Date().toISOString().slice(0, 10);
      openExportChoiceModal(
        Modal,
        'Exportar Sensores',
        () => {
          downloadCSV(`sensores_${dataTag}.csv`, headers, rows);
          toast.success('Download CSV Concluído', `sensores_${dataTag}.csv baixado.`);
        },
        () => {
          downloadPDF(`sensores_${dataTag}.pdf`, {
            title: 'Relatório de Sensores',
            subtitle: 'Sensores cadastrados no sistema',
            headers,
            rows
          });
          toast.success('Download PDF Concluído', `sensores_${dataTag}.pdf baixado.`);
        }
      );
    });
  }

  const btnProvisionar = document.getElementById('btn-provisionar-sensor');
  if (btnProvisionar) {
    btnProvisionar.addEventListener('click', () => {
      Modal.open('Cadastrar Novo Sensor', `
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
          <label>Nome do Sensor:
            <input type="text" id="novo-sensor-nome" placeholder="Ex: Sensor Solo Talhão A1" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Tipo do Sensor:
            <select id="novo-sensor-tipo" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="Sensor de Umidade do Solo">Sensor de Umidade do Solo</option>
              <option value="Sensor DHT11 (Temp/Umid Ar)">Sensor DHT11 (Temp/Umid Ar)</option>
            </select>
          </label>
          <label>Ambiente:
            <select id="novo-sensor-ambiente" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="solo">Solo</option>
              <option value="ar">Ar</option>
            </select>
          </label>
          <label>Localização:
            <input type="text" id="novo-sensor-loc" placeholder="Ex: Setor 01" style="width: 100%; padding: 7px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
        </div>
      `, async () => {
        const nome = document.getElementById('novo-sensor-nome')?.value?.trim();
        const tipo_sensor = document.getElementById('novo-sensor-tipo')?.value || 'Sensor de Umidade do Solo';
        const ambiente = document.getElementById('novo-sensor-ambiente')?.value || 'solo';
        const localizacao = document.getElementById('novo-sensor-loc')?.value?.trim() || '';
        if (!nome) {
          toast.warning('Atenção', 'Informe o nome do sensor.');
          return;
        }
        try {
          await api.criarSensor({ nome, tipo_sensor, ambiente, localizacao, status: 'ativo' });
          toast.success('Sensor Cadastrado', `Sensor ${nome} salvo no sistema.`);
          if (window.router && typeof window.router.handleRoute === 'function') {
            window.router.handleRoute();
          }
        } catch (err) {
          toast.error('Erro ao Cadastrar', err.message || 'Não foi possível cadastrar o sensor.');
        }
      }, 'Cadastrar');
    });
  }

  const inputBusca = document.getElementById('input-busca-sensor');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaSensor = e.target.value.trim();
      _paginaAtualSensores = 1;
      atualizarTabelaSensores();
    });
  }

  document.querySelectorAll('.tab-sensor-admin').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-sensor-admin').forEach(t => {
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

      _filtroAmbienteSensor = tab.dataset.cat || 'todos';
      _paginaAtualSensores = 1;
      atualizarTabelaSensores();
    });
  });

  const pagControls = document.getElementById('controles-paginacao-sensores');
  if (pagControls) {
    pagControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-pag-sensor');
      if (!btn || btn.disabled) return;
      const pag = btn.dataset.pag;
      const totalPaginas = Math.max(1, Math.ceil(getSensoresFiltrados().length / _itensPorPagina));
      if (pag === 'prev') _paginaAtualSensores = Math.max(1, _paginaAtualSensores - 1);
      else if (pag === 'next') _paginaAtualSensores = Math.min(totalPaginas, _paginaAtualSensores + 1);
      else _paginaAtualSensores = parseInt(pag || '1', 10);
      atualizarTabelaSensores();
    });
  }

  const chartWrap = document.getElementById('correlacao-chart-wrap');
  const tooltipEl = document.getElementById('correlacao-tooltip');
  if (chartWrap && tooltipEl) {
    const showTooltip = (pt, clientX, clientY) => {
      const rect = chartWrap.getBoundingClientRect();
      const left = Math.min(Math.max(8, clientX - rect.left + 10), Math.max(8, rect.width - 150));
      const top = Math.max(8, clientY - rect.top - 42);
      tooltipEl.innerHTML = `<strong>${pt.dataset.serie}: ${pt.dataset.valor}</strong><br><span style="color:#CBD5E1;">${pt.dataset.hora}</span>`;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.display = 'block';
    };

    chartWrap.addEventListener('mousemove', (e) => {
      const pt = e.target.closest('.correlacao-ponto');
      if (pt) showTooltip(pt, e.clientX, e.clientY);
      else tooltipEl.style.display = 'none';
    });

    chartWrap.addEventListener('mouseleave', () => {
      tooltipEl.style.display = 'none';
    });

    chartWrap.addEventListener('touchstart', (e) => {
      const pt = e.target.closest('.correlacao-ponto');
      if (pt && e.touches && e.touches[0]) {
        showTooltip(pt, e.touches[0].clientX, e.touches[0].clientY);
      } else {
        tooltipEl.style.display = 'none';
      }
    }, { passive: true });
  }

  atualizarPaginacaoSensores();
  vincularEventosSensores();
}
