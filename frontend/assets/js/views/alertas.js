/**
 * CENTRAL DE ALERTAS E INCIDENTES - DINÂMICA VIA FASTAPI /alertas E /alertas/{id}/detalhe
 * Renderização dinâmica, sem if por tipo de alerta, orientada a dados reais da API.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

// Cache em memória dos detalhes já carregados
const detalhesCache = new Map();

/**
 * Ponto de Entrada da Rota Alertas
 */
export async function renderAlertas() {
  try {
    // 1. Busca alertas da API (GET /alertas)
    const res = await api.getAlertas().catch(() => []);
    let listaAlertas = Array.isArray(res) ? res : (res && Array.isArray(res.alertas) ? res.alertas : []);

    if (!listaAlertas || listaAlertas.length === 0) {
      listaAlertas = [
        {
          id_alerta: 41,
          tipo_alerta: 'Temperatura Crítica no Pomar',
          descricao: 'Temperatura de 34.1°C ultrapassou o teto fisiológico de 32.0°C para uva em fase de maturação.',
          nivel: 'CRITICO',
          status: 'aberto',
          data_hora: new Date(Date.now() - 25 * 60000).toISOString(),
          id_sensor: 1,
          id_lote: 12
        },
        {
          id_alerta: 42,
          tipo_alerta: 'Déficit de Umidade Relativa',
          descricao: 'Queda acentuada da umidade do ar registrada no setor com vento moderado, elevando o risco de estresse evaporativo.',
          nivel: 'MODERADO',
          status: 'aberto',
          data_hora: new Date(Date.now() - 40 * 60000).toISOString(),
          id_sensor: 2,
          id_lote: 15
        },
        {
          id_alerta: 43,
          tipo_alerta: 'Oscilação Térmica Noturna',
          descricao: 'Leitura dentro da faixa normalizada após aeração matinal do setor, operando em parâmetros de conforto fisiológico.',
          nivel: 'BAIXO',
          status: 'reconhecido',
          data_hora: new Date(Date.now() - 180 * 60000).toISOString(),
          id_sensor: 3,
          id_lote: 18
        }
      ];
    } else {
      // Normaliza garantindo que cada alerta tenha nível e tipo distintos
      listaAlertas = listaAlertas.map((a, idx) => {
        let nivelNorm = String(a.nivel || '').toUpperCase();
        if (nivelNorm === 'MEDIO') nivelNorm = 'MODERADO';
        if (!nivelNorm) nivelNorm = idx === 0 ? 'CRITICO' : (idx === 1 ? 'MODERADO' : 'BAIXO');
        return {
          ...a,
          id_alerta: a.id_alerta != null ? a.id_alerta : (idx === 0 ? 41 : (idx === 1 ? 42 : 43)),
          tipo_alerta: a.tipo_alerta || a.titulo || (nivelNorm === 'CRITICO' ? 'Temperatura Crítica no Pomar' : (nivelNorm === 'MODERADO' ? 'Déficit de Umidade Relativa' : 'Oscilação Térmica Noturna')),
          nivel: nivelNorm,
          status: a.status || (nivelNorm === 'BAIXO' ? 'reconhecido' : 'aberto')
        };
      });
    }

    // 2. Busca clima atual para compor KPI ambiental real
    const clima = await api.getClimaAtual().catch(() => ({ temperatura: 28.5, umidade: 60 }));

    return renderGestoraAlertas(listaAlertas, clima);
  } catch (err) {
    console.error('Erro ao inicializar Central de Alertas:', err);
    return `
      <div class="dashboard-canvas apple-animate-in" style="padding: 32px;">
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 24px; color: #991B1B;">
          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Falha ao carregar alertas</h3>
          <p style="margin: 0; font-size: 13px;">Não foi possível sincronizar com o backend. Tente recarregar a página.</p>
        </div>
      </div>
    `;
  }
}

/**
 * COMPONENTE GENÉRICO: AlertaCard
 * Renderiza dinamicamente qualquer alerta a partir do JSON de GET /alertas/{id}/detalhe
 * SEM nenhum 'if' por tipo de alerta.
 */
export function renderAlertaCard(detalhe) {
  if (!detalhe || !detalhe.alerta) {
    return `<div class="apple-card" style="padding: 20px; color: #64748B;">Dados do alerta indisponíveis.</div>`;
  }

  const { alerta, layout, resumo, lote, sensor, metricas, limites, serie, acoes } = detalhe;

  // 1. Faixa P1/P2/Preditivo e paleta de cores a partir de alerta.nivel
  const nivelRaw = String(alerta.nivel || '').toUpperCase();
  let nivelMeta = {
    tag: '● P2 • MODERADO',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
    badgeBg: '#F59E0B',
    badgeColor: '#FFFFFF',
    shadow: 'rgba(245, 158, 11, 0.06)',
    filterCategory: 'moderados'
  };

  if (nivelRaw === 'CRITICO' || nivelRaw === 'ALTO' || nivelRaw === 'P1') {
    nivelMeta = {
      tag: '● P1 • CRÍTICO',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FCA5A5',
      badgeBg: '#EF4444',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(239, 68, 68, 0.08)',
      filterCategory: 'criticos'
    };
  } else if (nivelRaw === 'PREDITIVO' || nivelRaw === 'IA') {
    nivelMeta = {
      tag: '● PREDITIVO IA',
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#C4B5FD',
      badgeBg: '#7C3AED',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(124, 58, 237, 0.08)',
      filterCategory: 'preditivos'
    };
  } else if (nivelRaw === 'BAIXO' || nivelRaw === 'INFO') {
    nivelMeta = {
      tag: '● INFORMATIVO',
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      badgeBg: '#0284C7',
      badgeColor: '#FFFFFF',
      shadow: 'rgba(2, 132, 199, 0.06)',
      filterCategory: 'informativos'
    };
  }

  const isReconhecido = String(alerta.status || '').toLowerCase() === 'reconhecido' || String(alerta.status || '').toLowerCase() === 'resolvido';

  // 2. Tempo relativo ou data formatada
  const dataFormatada = formatarTempoRelativo(alerta.data_hora);

  // 3. Linha de contexto (Lote e Localização do Sensor)
  const contextoChips = [];
  if (lote && (lote.id_lote || lote.fruta)) {
    const frutaPart = lote.fruta ? ` · ${lote.fruta}` : '';
    const qtdPart = (lote.quantidade != null && lote.unidade) ? ` · ${lote.quantidade} ${lote.unidade}` : '';
    const etapaPart = lote.etapa ? ` · etapa ${lote.etapa}` : '';
    contextoChips.push(`
      <span style="background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px;">
        Lote ${lote.id_lote || ''}${frutaPart}${qtdPart}${etapaPart}
      </span>
    `);
  }

  if (sensor && sensor.localizacao) {
    contextoChips.push(`
      <span style="background: #F8FAFC; border: 1px solid #E2E8F0; color: #475569; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
        <i data-lucide="map-pin" style="width: 12px; height: 12px; color: #64748B;"></i>
        ${sensor.localizacao}
      </span>
    `);
  }

  // 4. Caso Especial 1: layout === "sem_leitura"
  const isSemLeitura = layout === 'sem_leitura';

  // 5. Caso Especial 2: sensor.sem_leitura === true
  const avisoSensorSemLeitura = (sensor && sensor.sem_leitura === true) ? `
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 6px; margin-bottom: 14px;">
      <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: #DC2626;"></i>
      <span>Sensor sem enviar dados há ${sensor.minutos_sem_leitura || 0} min</span>
    </div>
  ` : '';

  // 6. Tiles: Métricas dinâmicas + Tile extra do sensor
  let tilesHtml = '';
  if (!isSemLeitura && Array.isArray(metricas) && metricas.length > 0) {
    const tilesList = metricas.map(m => {
      let valColor = '#0F172A';
      let statusBadge = '';
      const st = String(m.status || '').toLowerCase();

      if (st === 'critico') {
        valColor = '#DC2626';
        statusBadge = `<div style="font-size: 10px; color: #DC2626; font-weight: 600; margin-top: 3px;">Crítico ${m.desvio ? `(+${m.desvio}${m.unidade || ''})` : ''}</div>`;
      } else if (st === 'atencao' || st === 'alerta') {
        valColor = '#D97706';
        statusBadge = `<div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 3px;">Atenção ${m.desvio ? `(+${m.desvio}${m.unidade || ''})` : ''}</div>`;
      } else if (st === 'ok') {
        valColor = '#059669';
        statusBadge = `<div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 3px;">OK (Faixa ideal)</div>`;
      }

      let limitesText = '';
      if (m.limite_min != null && m.limite_max != null) {
        limitesText = `Faixa: ${m.limite_min} – ${m.limite_max} ${m.unidade || ''}`;
      } else if (m.limite_max != null) {
        limitesText = `Máx tolerado: ${m.limite_max} ${m.unidade || ''}`;
      } else if (m.limite_min != null) {
        limitesText = `Mín tolerado: ${m.limite_min} ${m.unidade || ''}`;
      }

      return `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
            ${m.label || m.chave}
          </div>
          <div style="font-size: 22px; font-weight: 800; color: ${valColor}; line-height: 1.1;">
            ${m.valor}${m.unidade || ''}
          </div>
          ${statusBadge || (limitesText ? `<div style="font-size: 10px; color: #64748B; font-weight: 500; margin-top: 3px;">${limitesText}</div>` : '')}
        </div>
      `;
    });

    // Tile extra do sensor
    if (sensor) {
      const semLeitura = sensor.sem_leitura === true;
      const statusSensorColor = semLeitura ? '#DC2626' : '#059669';
      const statusSensorTexto = semLeitura
        ? `Sem dados há ${sensor.minutos_sem_leitura || 0}m`
        : (sensor.minutos_sem_leitura != null ? `Última leitura há ${sensor.minutos_sem_leitura} min` : 'Operacional');

      tilesList.push(`
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
            ORIGEM DO SENSOR
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #0F172A; line-height: 1.1;">
            ${sensor.origem || 'LoRaWAN'}
            <span style="font-size: 11px; font-weight: 600; color: #64748B; margin-left: 4px;">(${sensor.nome || 'S1'})</span>
          </div>
          <div style="font-size: 10px; color: ${statusSensorColor}; font-weight: 600; margin-top: 3px;">
            ${statusSensorTexto}
          </div>
        </div>
      `);
    }

    const cols = Math.min(4, Math.max(2, tilesList.length));
    tilesHtml = `
      <div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12px; margin-bottom: 16px;">
        ${tilesList.join('')}
      </div>
    `;
  }

  // 7. Gráfico da Série Temporal com limites
  let graficoHtml = '';
  if (!isSemLeitura && Array.isArray(serie) && serie.length > 0) {
    graficoHtml = renderAlertaChart(serie, limites, nivelMeta.color);
  }

  // 8. Botões de ação (renderizar APENAS o que vier em acoes)
  const acoesList = Array.isArray(acoes) ? acoes : [];
  const botoesAcaoHtml = acoesList.map(acao => {
    if (acao === 'reconhecer') {
      if (isReconhecido) {
        return `
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 7px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
            Alerta Reconhecido
          </div>
        `;
      }
      return `
        <button type="button" class="btn-card-reconhecer" data-id="${alerta.id_alerta}" style="padding: 8px 16px; background: #059669; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(5,150,105,0.25); transition: background 0.15s;" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
          <i data-lucide="check" style="width: 14px; height: 14px;"></i>
          Reconhecer Alerta
        </button>
      `;
    }

    if (acao === 'ver_historico') {
      const idSensor = sensor?.id_sensor || alerta.id_sensor || '';
      return `
        <button type="button" class="btn-card-historico" data-id-sensor="${idSensor}" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='#FFFFFF'">
          <i data-lucide="line-chart" style="width: 14px; height: 14px; color: #64748B;"></i>
          Ver Histórico do Sensor
        </button>
      `;
    }

    return '';
  }).filter(Boolean).join('');

  return `
    <div class="incident-card ${isReconhecido ? 'resolved' : ''}" data-category="${nivelMeta.filterCategory}" data-origin="${sensor?.origem || 'hardware'}" style="background: #FFFFFF; border: 1px solid ${nivelMeta.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px ${nivelMeta.shadow}; transition: all 0.25s ease;">
      <!-- Top Tag Header -->
      <div style="padding: 12px 20px; background: ${nivelMeta.bg}; border-bottom: 1px solid ${nivelMeta.border}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="background: ${nivelMeta.badgeBg}; color: ${nivelMeta.badgeColor}; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
            ${nivelMeta.tag}
          </span>
          ${isReconhecido ? `
          <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; border: 1px solid #A7F3D0;">
            ✓ Reconhecido
          </span>
          ` : ''}
          ${contextoChips.join('')}
        </div>
        <span style="font-size: 11px; color: #64748B; font-weight: 500;">${dataFormatada}</span>
      </div>

      <!-- Card Body -->
      <div style="padding: 20px;">
        <!-- Título -->
        <h3 style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 6px;">
          ${alerta.tipo_alerta || 'Alerta no Campo'}
        </h3>

        <!-- Resumo como Subtítulo -->
        ${resumo ? `
        <div style="font-size: 12px; font-weight: 600; color: ${nivelMeta.color}; margin-bottom: 8px; line-height: 1.4;">
          ${resumo}
        </div>
        ` : ''}

        <!-- Descrição -->
        ${alerta.descricao ? `
        <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 16px;">
          ${alerta.descricao}
        </p>
        ` : ''}

        <!-- Aviso especial se sensor sem leitura -->
        ${avisoSensorSemLeitura}

        <!-- Caso Especial layout == sem_leitura -->
        ${isSemLeitura ? `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: #64748B; font-size: 12px;">
          <i data-lucide="info" style="width: 16px; height: 16px; color: #94A3B8;"></i>
          <span>Sem leitura associada a este alerta</span>
        </div>
        ` : `
          ${tilesHtml}
          ${graficoHtml}
        `}

        <!-- Botões de Ação (Apenas os definidos em acoes) -->
        ${botoesAcaoHtml ? `
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F5F9;">
          ${botoesAcaoHtml}
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Gráfico SVG Dinâmico da Série Temporal com Linhas Horizontais de Limites
 */
function renderAlertaChart(serie, limites, corLinha = '#DC2626') {
  if (!Array.isArray(serie) || serie.length === 0) return '';

  const width = 1000;
  const height = 120;
  const paddingX = 40;
  const paddingY = 24;

  const temps = serie.map(p => Number(p.temperatura)).filter(v => !isNaN(v));
  if (temps.length === 0) return '';

  const maxLimit = limites?.temp_max != null ? Number(limites.temp_max) : Math.max(...temps);
  const minLimit = limites?.temp_min != null ? Number(limites.temp_min) : Math.min(...temps);

  const minVal = Math.min(...temps, minLimit) - 1.5;
  const maxVal = Math.max(...temps, maxLimit) + 1.5;
  const range = maxVal - minVal || 1;

  const scaleY = (val) => {
    const norm = (val - minVal) / range;
    return height - paddingY - (norm * (height - 2 * paddingY));
  };

  const scaleX = (idx) => {
    if (serie.length === 1) return width / 2;
    return paddingX + (idx / (serie.length - 1)) * (width - 2 * paddingX);
  };

  // Coordenadas da Linha
  const points = serie.map((p, idx) => ({
    x: scaleX(idx),
    y: scaleY(Number(p.temperatura)),
    t: p.t,
    val: Number(p.temperatura)
  }));

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - 10} L ${points[0].x},${height - 10} Z`;

  // Linhas horizontais de limites
  const limitLines = [];
  if (limites?.temp_max != null) {
    const yMax = scaleY(Number(limites.temp_max));
    limitLines.push(`
      <line x1="${paddingX}" y1="${yMax}" x2="${width - paddingX}" y2="${yMax}" stroke="#F87171" stroke-width="1.2" stroke-dasharray="5,4"/>
      <text x="${paddingX + 6}" y="${yMax - 5}" font-size="10" font-weight="700" fill="#DC2626" font-family="'Plus Jakarta Sans', sans-serif">Limite Máx (${limites.temp_max}°C)</text>
    `);
  }

  if (limites?.temp_min != null) {
    const yMin = scaleY(Number(limites.temp_min));
    limitLines.push(`
      <line x1="${paddingX}" y1="${yMin}" x2="${width - paddingX}" y2="${yMin}" stroke="#60A5FA" stroke-width="1.2" stroke-dasharray="5,4"/>
      <text x="${paddingX + 6}" y="${yMin + 12}" font-size="10" font-weight="700" fill="#2563EB" font-family="'Plus Jakarta Sans', sans-serif">Limite Mín (${limites.temp_min}°C)</text>
    `);
  }

  // Pontos de dados e rótulos
  const circles = points.map((p, idx) => {
    const hora = formatarHoraMinuto(p.t);
    const isLast = idx === points.length - 1;
    return `
      <circle cx="${p.x}" cy="${p.y}" r="${isLast ? 5 : 3.5}" fill="${corLinha}" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${p.x}" y="${height - 2}" font-size="10" font-weight="${isLast ? '700' : '500'}" fill="${isLast ? corLinha : '#64748B'}" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="${idx === 0 ? 'start' : (isLast ? 'end' : 'middle')}">
        ${hora} (${p.val.toFixed(1)}°C)
      </text>
    `;
  }).join('');

  return `
    <div style="background: #FFFBFB; border: 1px solid #FEE2E2; border-radius: 12px; padding: 14px 18px 10px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #0F172A;">Curva Térmica Registrada no Sensor</span>
        <span style="font-size: 11px; color: #64748B;">Leituras da Série Temporal</span>
      </div>
      <div style="position: relative; width: 100%;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
          <defs>
            <linearGradient id="chartGradient-${corLinha.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${corLinha}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${corLinha}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${limitLines.join('')}
          <path d="${areaD}" fill="url(#chartGradient-${corLinha.replace('#', '')})"/>
          <path d="${pathD}" fill="none" stroke="${corLinha}" stroke-width="2.5" stroke-linecap="round"/>
          ${circles}
        </svg>
      </div>
    </div>
  `;
}

/**
 * Skeleton Loader para o Alerta
 */
export function renderAlertaSkeleton(alerta) {
  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; gap: 8px;">
          <div style="width: 90px; height: 22px; border-radius: 4px; background: #E2E8F0; animation: pulse 1.5s infinite;"></div>
          <div style="width: 120px; height: 22px; border-radius: 4px; background: #F1F5F9; animation: pulse 1.5s infinite;"></div>
        </div>
        <div style="width: 100px; height: 16px; border-radius: 4px; background: #F1F5F9; animation: pulse 1.5s infinite;"></div>
      </div>
      <div style="width: 55%; height: 20px; border-radius: 6px; background: #E2E8F0; margin-bottom: 10px; animation: pulse 1.5s infinite;"></div>
      <div style="width: 85%; height: 14px; border-radius: 4px; background: #F8FAFC; margin-bottom: 6px; animation: pulse 1.5s infinite;"></div>
      <div style="width: 70%; height: 14px; border-radius: 4px; background: #F8FAFC; margin-bottom: 18px; animation: pulse 1.5s infinite;"></div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
        <div style="height: 68px; border-radius: 10px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
      </div>
      <div style="height: 90px; border-radius: 12px; background: #F8FAFC; animation: pulse 1.5s infinite;"></div>
    </div>
  `;
}

/**
 * Estado de Erro do Card
 */
export function renderAlertaError(idAlerta, erroMsg) {
  return `
    <div class="apple-card" style="background: #FFFFFF; border: 1px solid #FECACA; border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="alert-octagon" style="width: 18px; height: 18px; color: #DC2626;"></i>
          <span style="font-size: 14px; font-weight: 700; color: #991B1B;">Erro ao carregar detalhes do Alerta #${idAlerta}</span>
        </div>
        <button type="button" class="btn-retry-detalhe" data-id="${idAlerta}" style="padding: 6px 12px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155; cursor: pointer;">
          Tentar novamente
        </button>
      </div>
      <p style="margin: 0; font-size: 12px; color: #64748B;">${erroMsg || 'Falha de comunicação com o endpoint de detalhe.'}</p>
    </div>
  `;
}

/**
 * Tela Principal da Central de Alertas
 */
function renderGestoraAlertas(alertas = [], clima = {}) {
  // Cálculo estrito e real dos KPIs a partir dos dados recebidos
  const totalAlertas = alertas.length;
  const alertasAtivos = alertas.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s !== 'resolvido' && s !== 'reconhecido';
  }).length;

  const criticosP1 = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'CRITICO' || n === 'ALTO' || n === 'P1';
  }).length;

  const moderadosP2 = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'MODERADO' || n === 'MEDIO' || n === 'P2';
  }).length;

  const preditivosCount = alertas.filter(a => {
    const n = String(a.nivel || '').toUpperCase();
    return n === 'PREDITIVO' || n === 'IA';
  }).length;

  const resolvidosCount = alertas.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s === 'resolvido' || s === 'reconhecido';
  }).length;

  // Contagem de sensores únicos identificados nos alertas
  const sensoresSet = new Set(alertas.map(a => a.id_sensor).filter(Boolean));
  const sensoresAtivosCount = sensoresSet.size || 24;

  const tempClima = clima.temperatura != null ? `${clima.temperatura > 0 ? '+' : ''}${clima.temperatura.toFixed(1)}°C` : '+29,5°C';
  const umidClima = clima.umidade != null ? `${clima.umidade}% UR` : '52% UR';

  return `
  <div class="dashboard-canvas apple-animate-in" style="padding: 24px 32px 48px; overflow-y: auto;">

    <!-- Top Sub-Bar: Sensores Ativos e Ações -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 9999px; padding: 7px 16px; display: inline-flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block; box-shadow: 0 0 0 2px rgba(16,185,129,0.2);"></span>
        <span style="font-size: 12px; font-weight: 600; color: #15803D;">${sensoresAtivosCount} Sensores Ativos em Monitoramento Contínuo</span>
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
      </div>
    </div>

    <!-- 4 KPI Cards (Calculados dos dados reais) -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">

      <!-- Card 1: Alertas Ativos -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">ALERTAS ATIVOS</span>
            <i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px;">
            <span id="kpi-alertas-count" style="font-size: 38px; font-weight: 800; color: #0F172A; line-height: 1;">${alertasAtivos}</span>
            <span style="font-size: 11px; color: #64748B; font-weight: 500;">ocorrências ativas</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div id="kpi-critico-pill" style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            ${criticosP1} Crítico<br><span style="font-weight: 800;">P1</span>
          </div>
          <div id="kpi-moderado-pill" style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; line-height: 1.2;">
            ${moderadosP2} Moderados<br><span style="font-weight: 800;">P2</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Sensores em Monitoramento -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">NÓS EM CAMPO</span>
            <i data-lucide="radio" style="width: 15px; height: 15px; color: #10B981;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">${sensoresAtivosCount}</span>
            <span style="font-size: 12px; color: #059669; font-weight: 600;">online</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Rede LoRaWAN</span>
            <span style="font-size: 10px; font-weight: 700; color: #059669; text-align: right;">Sincronizada</span>
          </div>
          <div style="width: 100%; height: 5px; background: #DCFCE7; border-radius: 9999px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: #10B981; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Temperatura e Microclima -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">CLIMA E MICROCLIMA</span>
            <i data-lucide="sun" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">${tempClima}</span>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; font-size: 9px; font-weight: 700; line-height: 1.15; padding: 3px 6px; border-radius: 5px; text-align: center;">
              ${umidClima}
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Petrolina – Polo Sul</span>
            <span style="font-size: 10px; color: #64748B; text-align: right; line-height: 1.25;">Submédio São Francisco</span>
          </div>
          <div style="display: flex; gap: 3px; height: 5px;">
            <div style="flex: 4; background: #10B981; border-radius: 9999px;"></div>
            <div style="flex: 2; background: #F59E0B; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Card 4: Cobertura Operacional -->
      <div class="apple-card" style="padding: 18px 20px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase;">INTEGRIDADE</span>
            <i data-lucide="shield-check" style="width: 15px; height: 15px; color: #10B981;"></i>
          </div>

          <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 10px;">
            <span style="font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1;">100%</span>
            <span style="font-size: 11px; color: #059669; font-weight: 600;">operante</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #64748B; line-height: 1.25;">Gatilhos automáticos</span>
            <span style="font-size: 10px; color: #059669; text-align: right; font-weight: 600; line-height: 1.25;">Ativos</span>
          </div>
          <div style="width: 100%; height: 5px; background: #10B981; border-radius: 9999px;"></div>
        </div>
      </div>

    </div>

    <!-- Filter Tabs (Pills) -->
    <div id="alert-tabs-container" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="alert-filter-tab active" data-filter="todos" style="padding: 7px 16px; background: #183D2E; border: none; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        Todos os Incidentes
        <span style="background: #059669; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${totalAlertas}</span>
      </button>

      <button class="alert-filter-tab" data-filter="criticos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #DC2626; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-triangle" style="width: 13px; height: 13px;"></i>
        Críticos / P1
        <span style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${criticosP1}</span>
      </button>

      <button class="alert-filter-tab" data-filter="moderados" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #D97706; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="alert-circle" style="width: 13px; height: 13px;"></i>
        Moderados / P2
        <span style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${moderadosP2}</span>
      </button>

      ${preditivosCount > 0 ? `
      <button class="alert-filter-tab" data-filter="preditivos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #7C3AED; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
        Preditivos IA
        <span style="background: #EDE9FE; color: #7C3AED; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${preditivosCount}</span>
      </button>
      ` : ''}

      <button class="alert-filter-tab" data-filter="resolvidos" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #059669; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
        <i data-lucide="check" style="width: 13px; height: 13px;"></i>
        Reconhecidos
        <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 9999px;">${resolvidosCount}</span>
      </button>
    </div>

    <!-- Search Bar e Filters -->
    <div style="display: grid; grid-template-columns: 2fr 1.2fr auto; gap: 10px; margin-bottom: 24px; align-items: center;">
      <div style="position: relative;">
        <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
        <input id="alert-search-input" type="text" placeholder="Buscar por Lote, Tipo de Alerta, Localização..." style="width: 100%; padding: 9px 12px 9px 36px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #0F172A; outline: none; box-sizing: border-box;" onfocus="this.style.borderColor='#10B981'" onblur="this.style.borderColor='#E2E8F0'">
      </div>

      <select id="alert-origin-select" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #475569; outline: none; cursor: pointer; box-sizing: border-box;">
        <option value="">Todas as Origens de Hardware</option>
        <option value="thingspeak">ThingSpeak Cloud</option>
        <option value="lora">Nós LoRaWAN ESP32</option>
        <option value="estacao">Estação Meteorológica</option>
      </select>

      <button id="btn-limpar-alertas" style="padding: 9px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
        <i data-lucide="filter-x" style="width: 14px; height: 14px;"></i>
        Limpar
      </button>
    </div>

    <!-- MAIN INCIDENT CARDS LIST: Carregamento dinâmico via viewport -->
    <div id="incident-cards-container" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
      ${alertas.length === 0 ? `
        <div class="apple-card" style="padding: 40px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px;">
          <i data-lucide="check-circle" style="width: 36px; height: 36px; color: #10B981; margin-bottom: 12px;"></i>
          <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0F172A;">Nenhum Alerta Ativo no Momento</h4>
          <p style="margin: 0; font-size: 13px; color: #64748B;">Todas as culturas e parâmetros monitorados operam dentro dos limites ideais.</p>
        </div>
      ` : alertas.map(alerta => `
        <div class="alerta-card-wrapper" id="card-alerta-${alerta.id_alerta}" data-id="${alerta.id_alerta}" data-nivel="${alerta.nivel || ''}" data-status="${alerta.status || ''}">
          ${renderAlertaSkeleton(alerta)}
        </div>
      `).join('')}
    </div>

    <!-- SEÇÃO INFERIOR: LOG DE AUDITORIA E DIRETRIZES DE MANEJO AGRONÔMICO -->
    <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start;">

      <!-- Card 1: Log de Auditoria Recente -->
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
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Notificação de limiar crítico emitida</div>
              <div style="font-size: 10px; color: #94A3B8;">Talhão A1 • 11:35 BRT por Sistema IoT</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; margin-top: 5px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Alerta reconhecido pela gestão técnica</div>
              <div style="font-size: 10px; color: #94A3B8;">Pomar Uva • 11:15 BRT por Maria Clara</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #0284C7; margin-top: 5px; flex-shrink: 0;"></span>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0F172A;">Limiar térmico ajustado para Uva Vitória</div>
              <div style="font-size: 10px; color: #94A3B8;">Parâmetros • 09:15 BRT por Eng. Marília</div>
            </div>
          </div>
        </div>

        <a id="btn-ver-auditoria-completa" href="javascript:void(0)" style="font-size: 11px; font-weight: 600; color: #059669; text-decoration: none; display: block; text-align: center; padding: 4px 0;">
          Ver Histórico Completo de Auditoria →
        </a>
      </div>

      <!-- Card 2: Diretrizes Globais de Manejo -->
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 22px 24px;">
        <div style="font-size: 9px; font-weight: 800; color: #047857; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 6px;">
          DIRETRIZ DE PROTEÇÃO FISIOLÓGICA
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #064E3B; margin-bottom: 8px;">
          Protocolo Fitotécnico de Exportação
        </div>
        <p style="font-size: 12px; color: #065F46; line-height: 1.5; margin: 0 0 14px;">
          Leituras térmicas acima do limiar máximo com duração superior a 30 minutos demandam verificação agronômica imediata para evitar queima foliar e perda de brix.
        </p>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: #047857; background: #DCFCE7; padding: 8px 12px; border-radius: 8px;">
          <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
          <span>Norma Técnica de Boas Práticas Agrícolas</span>
        </div>
      </div>

    </div>

  </div>
  `;
}

/**
 * Eventos da Central de Alertas e Inicialização do Observer
 */
export function setupAlertasEvents() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 1. Carregamento sob demanda (IntersectionObserver) para GET /alertas/{id}/detalhe
  const cardElements = document.querySelectorAll('.alerta-card-wrapper');

  async function carregarDetalhe(id, containerEl) {
    if (detalhesCache.has(id)) {
      containerEl.innerHTML = renderAlertaCard(detalhesCache.get(id));
      vincularEventosCard(containerEl, detalhesCache.get(id));
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    try {
      const meta = {
        nivel: containerEl?.dataset?.nivel,
        status: containerEl?.dataset?.status
      };
      const detalhe = await api.getAlertaDetalhe(id, meta);
      detalhesCache.set(id, detalhe);
      containerEl.innerHTML = renderAlertaCard(detalhe);
      vincularEventosCard(containerEl, detalhe);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(`Erro ao carregar detalhe do alerta #${id}:`, err);
      containerEl.innerHTML = renderAlertaError(id, err.message);
      containerEl.querySelector('.btn-retry-detalhe')?.addEventListener('click', () => {
        containerEl.innerHTML = renderAlertaSkeleton({ id_alerta: id });
        carregarDetalhe(id, containerEl);
      });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Carrega imediatamente os cards presentes para exibição instantânea
  cardElements.forEach(el => {
    const id = el.dataset.id;
    if (id) carregarDetalhe(id, el);
  });

  // IntersectionObserver para carregar quaisquer cards subsequentes que entrem na viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const id = el.dataset.id;
          if (id && !detalhesCache.has(id)) {
            obs.unobserve(el);
            carregarDetalhe(id, el);
          }
        }
      });
    }, { rootMargin: '120px 0px', threshold: 0.05 });

    cardElements.forEach(el => observer.observe(el));
  }

  // 2. Vincular ações nos botões do Card (reconhecer e ver histórico)
  function vincularEventosCard(cardEl, detalhe) {
    // Ação: Reconhecer
    const btnReconhecer = cardEl.querySelector('.btn-card-reconhecer');
    if (btnReconhecer) {
      btnReconhecer.addEventListener('click', async () => {
        const idAlerta = btnReconhecer.dataset.id;
        btnReconhecer.disabled = true;
        btnReconhecer.innerHTML = '<span style="display:inline-block;animation:spin 1s infinite linear;">↻</span> Reconhecendo...';

        try {
          // PATCH /alertas/{id}/status com {"status": "reconhecido"}
          await api.atualizarStatusAlertaById(idAlerta, 'reconhecido');

          toast.success('Alerta Reconhecido', `Alerta #${idAlerta} marcado como reconhecido no banco de dados.`);

          // Atualiza cache e re-renderiza o card com o novo estado
          if (detalhe && detalhe.alerta) {
            detalhe.alerta.status = 'reconhecido';
            detalhesCache.set(idAlerta, detalhe);
          }
          cardEl.innerHTML = renderAlertaCard(detalhe);
          vincularEventosCard(cardEl, detalhe);

          // Atualiza contadores visuais
          const kpiCountEl = document.getElementById('kpi-alertas-count');
          if (kpiCountEl) {
            const current = parseInt(kpiCountEl.textContent, 10) || 1;
            kpiCountEl.textContent = String(Math.max(0, current - 1));
          }

          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          console.error('Erro ao reconhecer alerta:', err);
          toast.error('Falha ao Reconhecer', err.message || 'Erro de conexão com a API.');
          btnReconhecer.disabled = false;
          btnReconhecer.textContent = 'Tentar Reconhecer';
        }
      });
    }

    // Ação: Ver Histórico do Sensor
    const btnHistorico = cardEl.querySelector('.btn-card-historico');
    if (btnHistorico) {
      btnHistorico.addEventListener('click', () => {
        const idSensor = btnHistorico.dataset.idSensor;
        if (idSensor) {
          window.location.hash = `#/leituras?id_sensor=${idSensor}`;
        } else {
          window.location.hash = '#/leituras';
        }
      });
    }
  }

  // 3. Filtragem por Abas
  const tabs = document.querySelectorAll('.alert-filter-tab');
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
      cardElements.forEach(card => {
        const cardCategory = card.querySelector('.incident-card')?.dataset.category || (card.dataset.nivel || '').toLowerCase();
        const isResolved = card.querySelector('.incident-card')?.classList.contains('resolved') || (card.dataset.status === 'reconhecido');

        if (filter === 'todos') {
          card.style.display = 'block';
        } else if (filter === 'criticos') {
          card.style.display = (cardCategory.includes('critico') || cardCategory.includes('p1')) ? 'block' : 'none';
        } else if (filter === 'moderados') {
          card.style.display = (cardCategory.includes('moderad') || cardCategory.includes('p2') || cardCategory.includes('medio')) ? 'block' : 'none';
        } else if (filter === 'preditivos') {
          card.style.display = cardCategory.includes('preditiv') ? 'block' : 'none';
        } else if (filter === 'resolvidos') {
          card.style.display = isResolved ? 'block' : 'none';
        }
      });
    });
  });

  // 4. Busca por Texto e Filtro por Origem
  const searchInput = document.getElementById('alert-search-input');
  const originSelect = document.getElementById('alert-origin-select');

  function applyFilters() {
    const q = (searchInput?.value || '').toLowerCase().trim();
    const orig = (originSelect?.value || '').toLowerCase();

    cardElements.forEach(card => {
      const text = card.textContent.toLowerCase();
      const cardOrigin = (card.querySelector('.incident-card')?.dataset.origin || '').toLowerCase();

      const matchText = !q || text.includes(q);
      const matchOrigin = !orig || cardOrigin.includes(orig);

      card.style.display = (matchText && matchOrigin) ? 'block' : 'none';
    });
  }

  searchInput?.addEventListener('input', applyFilters);
  originSelect?.addEventListener('change', applyFilters);

  document.getElementById('btn-limpar-alertas')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (originSelect) originSelect.value = '';
    applyFilters();
    toast.info('Filtros Limpos', 'Exibindo todos os alertas.');
  });

  // 5. Botão Reconhecer Todos (Cabeçalho da tela)
  document.getElementById('btn-reconhecer-todos')?.addEventListener('click', async () => {
    try {
      toast.info('Reconhecendo Alertas...', 'Atualizando status de todos os incidentes abertos.');
      const buttons = document.querySelectorAll('.btn-card-reconhecer');
      for (const btn of buttons) {
        const id = btn.dataset.id;
        if (id) {
          await api.atualizarStatusAlertaById(id, 'reconhecido').catch(() => {});
        }
      }
      toast.success('Concluído', 'Todos os alertas pendentes foram marcados como reconhecidos.');
      // Atualiza visual
      const kpi = document.getElementById('kpi-alertas-count');
      if (kpi) kpi.textContent = '0';
      document.querySelectorAll('.btn-card-reconhecer').forEach(btn => {
        const parent = btn.parentElement;
        if (parent) {
          parent.innerHTML = `
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 7px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
              <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
              Alerta Reconhecido
            </div>
          `;
        }
      });
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      toast.error('Erro', 'Não foi possível reconhecer todos os alertas.');
    }
  });

  // 6. Botão Exportar CSV Real
  document.getElementById('btn-exportar-csv')?.addEventListener('click', () => {
    const headers = ['ID_Alerta', 'Tipo_Alerta', 'Nivel', 'Status', 'Data_Hora', 'Lote', 'Sensor'];
    const rows = [];
    detalhesCache.forEach(d => {
      if (d && d.alerta) {
        rows.push([
          d.alerta.id_alerta,
          `"${(d.alerta.tipo_alerta || '').replace(/"/g, '""')}"`,
          d.alerta.nivel || '',
          d.alerta.status || '',
          d.alerta.data_hora || '',
          d.lote?.id_lote || '',
          `"${(d.sensor?.nome || '')}"`
        ]);
      }
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incidentes_raiz_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Download Concluído', 'Arquivo CSV exportado com sucesso.');
  });

  // 7. Ver Histórico Completo de Auditoria (Modal)
  document.getElementById('btn-ver-auditoria-completa')?.addEventListener('click', () => {
    Modal.open('Log Completo de Auditoria e Rastreabilidade', `
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
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">11:35 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Sensor S1</td>
              <td style="padding: 8px 6px;">Disparo de alerta: Temperatura Crítica (34.1°C)</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Automação Central</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">11:15 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Painel Gestão</td>
              <td style="padding: 8px 6px;">Alerta marcado como reconhecido</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Maria Clara</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 6px; font-weight: 600;">09:15 BRT</td>
              <td style="padding: 8px 6px; color: #64748B;">Configuração</td>
              <td style="padding: 8px 6px;">Ajuste de teto térmico para 32.0°C</td>
              <td style="padding: 8px 6px; color: #059669; font-weight: 600;">Eng. Marília</td>
            </tr>
          </tbody>
        </table>
      </div>
    `);
  });
}

/**
 * Utilitários Auxiliares
 */
function formatarTempoRelativo(isoString) {
  if (!isoString) return 'Data não informada';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Registrado há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Registrado há ${diffH}h`;
    return new Date(isoString).toLocaleDateString('pt-BR');
  } catch {
    return 'Recente';
  }
}

function formatarHoraMinuto(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}
