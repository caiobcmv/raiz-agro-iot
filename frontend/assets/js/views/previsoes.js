/**
 * VIEW: PREVISÕES, MODELOS DE IA E MERCADO (100% REAL - FASTAPI + POSTGRESQL)
 */

import { api } from '../api.js';

export async function renderPrevisoes() {
  let janelas = [];
  let mercado = [];
  let recomendacoes = null;
  let modelos = [];

  const [janRes, mercRes, recRes, modRes] = await Promise.allSettled([
    api.request('/previsoes/janela-colheita'),
    api.request('/dados-mercado'),
    api.request('/recomendacoes'),
    api.request('/ia/modelos')
  ]);

  if (janRes.status === 'fulfilled' && Array.isArray(janRes.value)) janelas = janRes.value;
  if (mercRes.status === 'fulfilled' && Array.isArray(mercRes.value)) mercado = mercRes.value;
  if (recRes.status === 'fulfilled' && recRes.value) recomendacoes = recRes.value;
  if (modRes.status === 'fulfilled' && Array.isArray(modRes.value)) modelos = modRes.value;

  const modelosAtivos = modelos.filter(m => String(m.status || '').toLowerCase() === 'ativo').length;
  const primeiraJanela = janelas[0] || null;
  const recsLista = Array.isArray(recomendacoes?.recomendacoes) ? recomendacoes.recomendacoes : (Array.isArray(recomendacoes) ? recomendacoes : []);

  const cardsMercado = mercado.length > 0
    ? mercado.slice(0, 2).map(m => `
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">${m.fruta || m.cultura || 'Cultura'} (${m.mercado || 'Mercado'})</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value">R$ ${m.preco_kg != null ? Number(m.preco_kg).toFixed(2).replace('.', ',') : '—'} <span style="font-size: 16px; color: #94A3B8;">/ kg</span></div>
          <div class="kpi-footer">
            <span style="color: #64748B;">${m.demanda || m.tendencia || 'Atualizado via banco'}</span>
          </div>
        </div>
      `).join('')
    : `
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Cotações de Mercado</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value">—</div>
          <div class="kpi-footer"><span style="color: #94A3B8;">Nenhum dado de mercado cadastrado</span></div>
        </div>
      `;

  const recsHtml = recsLista.length > 0
    ? recsLista.map(r => `
        <div style="background: rgba(255,255,255,0.03); border-left: 4px solid #4ADE80; border-radius: 8px; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #0F172A; font-size: 15px;">${r.titulo || r.categoria || 'Recomendação Agronômica'}</strong>
            <span class="badge badge-info">${r.prioridade || r.nivel || 'Ativo'}</span>
          </div>
          <p style="color: #475569; font-size: 13px; margin: 0;">${r.descricao || r.mensagem || r.texto || ''}</p>
        </div>
      `).join('')
    : `<div style="padding: 20px; text-align: center; color: #64748B; font-size: 13px;">Nenhuma recomendação agronômica registrada no momento.</div>`;

  return `
    <div class="content-body">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Inteligência Preditiva e Mercado</h2>
          <p style="color: #64748B; font-size: 14px;">Previsões de janela de colheita, modelos ativos e cotações de mercado do PostgreSQL.</p>
        </div>

        <span class="badge badge-info" style="font-size: 13px; padding: 8px 16px;">
          <i data-lucide="sparkles"></i> ${modelosAtivos} Modelo(s) Ativo(s)
        </span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Janela de Colheita (${primeiraJanela?.fruta || 'Lotes'})</span>
            <div class="kpi-icon-wrap green"><i data-lucide="calendar"></i></div>
          </div>
          <div class="kpi-value">${primeiraJanela ? `${primeiraJanela.n_dias || '—'} dias` : '—'}</div>
          <div class="kpi-footer">
            <span style="color: #64748B;">${primeiraJanela ? `${primeiraJanela.janela_inicio || ''} a ${primeiraJanela.janela_fim || ''}` : 'Nenhuma previsão de colheita gerada'}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Modelos Preditivos</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="cpu"></i></div>
          </div>
          <div class="kpi-value">${modelos.length}</div>
          <div class="kpi-footer">
            <span style="color: #64748B;">${modelos.map(m => m.nome).slice(0, 2).join(', ') || 'Nenhum modelo cadastrado'}</span>
          </div>
        </div>

        ${cardsMercado}
      </div>

      <div class="chart-card" style="margin-bottom: 28px;">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">Recomendações Agronômicas e Logísticas</h3>
            <p class="card-subtitle">Sugestões geradas pelo backend com base nos dados reais de telemetria e safra</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${recsHtml}
        </div>
      </div>
    </div>
  `;
}
