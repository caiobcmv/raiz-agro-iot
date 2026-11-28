/**
 * UTILITÁRIOS UNIFICADOS DO PERFIL ANALISTA (100% DADOS REAIS)
 * Centraliza cálculo de status da coleta, intervalo real, origem e contagem/classificação de alertas.
 */

export function parseUtcIso(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function formatarDataHoraRecife(raw, comSegundos = false) {
  const d = parseUtcIso(raw);
  if (!d) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(comSegundos ? { second: '2-digit' } : {}),
    hour12: false,
    timeZone: 'America/Recife'
  }).format(d);
}

export function formatarIntervaloColeta(intervaloSeg) {
  const n = Number(intervaloSeg);
  if (intervaloSeg == null || isNaN(n) || n <= 0) return null;
  const s = Math.round(n);
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600}h`;
  if (s >= 60 && s % 60 === 0) return `${s / 60} min`;
  return `${s} s`;
}

export function calcularStatusColeta(ultimaLeituraIso, intervaloSeg) {
  const d = parseUtcIso(ultimaLeituraIso);
  if (!d) {
    return {
      estado: 'offline',
      label: 'Offline',
      coletaLabel: 'Sem leitura',
      ativo: false,
      atrasado: true,
      badgeClass: 'red',
      cor: '#DC2626',
      diffMin: null,
      tempoRelativo: 'Sem leitura'
    };
  }

  const diffSeg = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const diffMin = Math.floor(diffSeg / 60);
  const intervaloReal = (intervaloSeg != null && !isNaN(Number(intervaloSeg)) && Number(intervaloSeg) > 0)
    ? Number(intervaloSeg)
    : 300;
  const limiteAtrasoSeg = Math.max(intervaloReal * 3, 900);   // >= 3x intervalo (mín 15 min)
  const limiteOfflineSeg = Math.max(limiteAtrasoSeg * 4, 7200); // >= 2 horas

  const tempoRelativo = diffMin < 1
    ? 'agora'
    : (diffMin < 60
      ? `há ${diffMin} min`
      : `há ${Math.floor(diffMin / 60)}h ${diffMin % 60}min`);

  if (diffSeg > limiteOfflineSeg) {
    return {
      estado: 'offline',
      label: 'Offline',
      coletaLabel: 'Offline',
      ativo: false,
      atrasado: true,
      badgeClass: 'red',
      cor: '#DC2626',
      diffMin,
      tempoRelativo
    };
  }

  if (diffSeg > limiteAtrasoSeg) {
    return {
      estado: 'atrasado',
      label: 'Atrasado',
      coletaLabel: 'Atrasado',
      ativo: false,
      atrasado: true,
      badgeClass: 'yellow',
      cor: '#D97706',
      diffMin,
      tempoRelativo
    };
  }

  return {
    estado: 'ativo',
    label: 'Ativo',
    coletaLabel: 'Coleta ativa',
    ativo: true,
    atrasado: false,
    badgeClass: 'green',
    cor: '#059669',
    diffMin,
    tempoRelativo
  };
}

export function sensorEstaAtivoRecente(sensor, statusColetaGlobal, intervaloSeg) {
  if (!sensor) return false;
  const statusCadastral = String(sensor.status || sensor.estado_mapa || '').toLowerCase();
  if (statusCadastral && statusCadastral !== 'ativo' && statusCadastral !== 'atencao') return false;

  const ult = sensor.ultima_leitura?.data_hora || sensor.ultima_leitura || sensor.data_hora_ultima_leitura;
  if (ult) {
    return calcularStatusColeta(ult, intervaloSeg).ativo;
  }
  return Boolean(statusColetaGlobal?.ativo);
}

export function contarSensoresAtivosReais(sensoresList, statusColetaGlobal, intervaloSeg) {
  if (!Array.isArray(sensoresList) || sensoresList.length === 0) return 0;
  return sensoresList.filter(s => sensorEstaAtivoRecente(s, statusColetaGlobal, intervaloSeg)).length;
}

export function obterLabelOrigem(origem) {
  const o = String(origem || '').trim().toLowerCase();
  if (o === 'simulado') return 'Simulado';
  if (o === 'real' || o === 'thingspeak') return 'Real';
  return '';
}

export function isPrevisaoVencida(alerta) {
  if (!alerta) return false;
  const origem = String(alerta.origem || '').toLowerCase();
  const ehPreditivo = origem === 'preditivo' || alerta.previsao_data_hora != null || alerta.id_alerta_preditivo != null;
  if (!ehPreditivo) return false;
  const prazo = alerta.previsao_data_hora || alerta.periodo_fim;
  if (!prazo) return false;
  const d = parseUtcIso(prazo);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export function normalizarNivelPadrao(bruto) {
  const v = String(bruto || '').trim().toLowerCase();
  if (v === 'critico' || v === 'crítico' || v === 'alto' || v === 'alta') return 'CRITICO';
  if (v === 'medio' || v === 'médio' || v === 'moderado' || v === 'moderada') return 'MEDIO';
  if (v === 'baixo' || v === 'baixa') return 'BAIXO';
  return null;
}

export function classificarPorCortes(probabilidade, nivelFallback, cortes = []) {
  let nivel = null;
  if (probabilidade != null && !isNaN(Number(probabilidade)) && Array.isArray(cortes) && cortes.length > 0) {
    const pRaw = Number(probabilidade);
    const p = pRaw > 1 ? pRaw / 100 : pRaw;
    const ordenados = [...cortes].sort((a, b) => Number(a.limiar_min ?? 0) - Number(b.limiar_min ?? 0));
    for (const c of ordenados) {
      const min = Number(c.limiar_min ?? 0);
      const max = Number(c.limiar_max ?? 1);
      if (p >= min && p <= max) {
        nivel = normalizarNivelPadrao(c.nivel);
        break;
      }
    }
    if (!nivel && ordenados.length > 0) {
      const ultimo = ordenados[ordenados.length - 1];
      if (p > Number(ultimo.limiar_max ?? 1)) nivel = normalizarNivelPadrao(ultimo.nivel);
      else nivel = normalizarNivelPadrao(ordenados[0].nivel);
    }
  }
  if (!nivel) {
    nivel = normalizarNivelPadrao(nivelFallback) || 'BAIXO';
  }
  return {
    nivel,
    label: nivel === 'CRITICO' ? 'Alta' : (nivel === 'MEDIO' ? 'Moderada' : 'Baixa'),
    labelCurto: nivel === 'CRITICO' ? 'Crítico' : (nivel === 'MEDIO' ? 'Médio' : 'Baixo')
  };
}

/**
 * Fonte única de contagem e classificação de alertas para todas as telas do Analista.
 * Remove previsões vencidas e evita "Baixo 100%" quando total === 0.
 */
export function resumirAlertasAnalista(itens = [], cortes = []) {
  const lista = Array.isArray(itens) ? itens : [];
  const ativos = lista.filter(a => !isPrevisaoVencida(a));

  let critico = 0;
  let medio = 0;
  let baixo = 0;
  let reativos = 0;
  let preditivos = 0;

  const normalizados = ativos.map(a => {
    const ehPreditivo = String(a.origem || '').toLowerCase() === 'preditivo' || a.id_alerta_preditivo != null || a.probabilidade_risco != null;
    if (ehPreditivo) preditivos++;
    else reativos++;

    const prob = a.probabilidade_risco != null ? a.probabilidade_risco : a.probabilidade;
    const clas = classificarPorCortes(prob, a.nivel_severidade || a.nivel, cortes);
    if (clas.nivel === 'CRITICO') critico++;
    else if (clas.nivel === 'MEDIO') medio++;
    else baixo++;

    return {
      ...a,
      _nivel_padrao: clas.nivel,
      _nivel_label: clas.label,
      _nivel_curto: clas.labelCurto,
      _eh_preditivo: ehPreditivo
    };
  });

  const total = normalizados.length;
  const pctCritico = total > 0 ? Math.round((critico / total) * 100) : 0;
  const pctMedio = total > 0 ? Math.round((medio / total) * 100) : 0;
  const pctBaixo = total > 0 ? Math.max(0, 100 - pctCritico - pctMedio) : 0;

  return {
    ativos: normalizados,
    total,
    reativos,
    preditivos,
    critico,
    medio,
    baixo,
    pctCritico,
    pctMedio,
    pctBaixo
  };
}
