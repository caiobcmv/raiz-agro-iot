/**
 * COMPONENTE REUTILIZÁVEL: PARECER AGRONÔMICO (IA)
 * Visível para PRODUTOR e ANALISTA (mesmo registro de parecer_agronomico).
 * - Suporta estados: sem parecer, gerando (com polling automático), rascunho, assinado e erro.
 * - Botão "Gerar parecer" vira "Gerar novamente" após concluído.
 * - Em caso de erro: exibe "Tentar novamente" chamando com forcar=true.
 * - Lock anti-duplicação: desabilita botão e exibe spinner durante processamento.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from './toast.js';
import { Modal } from './modal.js';

const _pollingTimers = {};

export async function carregarErenderizarParecerCard(containerId, idLote) {
  const container = document.getElementById(containerId);
  if (!container || !idLote) return;

  container.innerHTML = `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center; color: #64748B; font-size: 12px;">
      <span class="inline-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #CBD5E1; border-top-color: #047857; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 6px;"></span>
      Carregando parecer agronômico...
    </div>
  `;

  try {
    const parecer = await api.getUltimoParecerLote(idLote);
    renderizarParecerCardNoElemento(container, idLote, parecer);
  } catch (err) {
    console.error('Erro ao carregar parecer do lote:', err);
    container.innerHTML = `
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; font-size: 12px; color: #991B1B;">
        Não foi possível consultar os pareceres deste lote.
      </div>
    `;
  }
}

export function renderizarParecerCardNoElemento(container, idLote, parecer) {
  // Limpa polling anterior deste lote se houver
  if (_pollingTimers[idLote]) {
    clearInterval(_pollingTimers[idLote]);
    delete _pollingTimers[idLote];
  }

  const isGerando = Boolean(parecer && (parecer.em_geracao === true || parecer.status === 'gerando'));
  const isErro = Boolean(parecer && (parecer.status === 'erro' || (parecer.erro_geracao && !parecer.texto_final)));
  const isAssinado = Boolean(parecer && parecer.status === 'assinado');
  const isRascunho = Boolean(parecer && parecer.status === 'rascunho' && !isGerando && !isErro);
  const temParecer = Boolean(parecer && (isAssinado || isRascunho));

  const role = auth.getActiveProfile();
  const podeAssinar = (role === 'analista' || role === 'admin') && isRascunho;

  let badgeHtml = '<span style="background: #F1F5F9; color: #64748B; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">NÃO GERADO</span>';
  if (isGerando) {
    badgeHtml = '<span style="background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #D97706; animation: pulse 1.5s infinite;"></span> PROCESSANDO IA</span>';
  } else if (isAssinado) {
    badgeHtml = '<span style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">✓ ASSINADO COM CREA</span>';
  } else if (isRascunho) {
    badgeHtml = '<span style="background: #EFF6FF; color: #0369A1; border: 1px solid #BAE6FD; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">RASCUNHO TÉCNICO</span>';
  } else if (isErro) {
    badgeHtml = '<span style="background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">FALHA NA GERAÇÃO</span>';
  }

  let conteudoHtml = '';
  if (isGerando) {
    conteudoHtml = `
      <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 8px; padding: 16px; text-align: center; margin: 10px 0;">
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; width: 22px; height: 22px; border: 3px solid #FDE68A; border-top-color: #D97706; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
        </div>
        <div style="font-weight: 700; color: #92400E; font-size: 13px;">Gerando Parecer Fitossanitário...</div>
        <div style="font-size: 11px; color: #B45309; margin-top: 4px;">Processando leituras da telemetria e validando conformidade. A tela atualizará automaticamente.</div>
      </div>
    `;

    // Polling a cada 3s para atualizar sozinho quando concluir
    _pollingTimers[idLote] = setInterval(async () => {
      try {
        const atualizado = await api.getUltimoParecerLote(idLote);
        if (atualizado && atualizado.em_geracao === false && atualizado.status !== 'gerando') {
          clearInterval(_pollingTimers[idLote]);
          delete _pollingTimers[idLote];
          renderizarParecerCardNoElemento(container, idLote, atualizado);
          toast.success('Parecer Concluído', 'Novo parecer agronômico gerado com sucesso.');
        }
      } catch (e) {
        console.warn('Polling de parecer falhou:', e);
      }
    }, 3000);

  } else if (isErro) {
    conteudoHtml = `
      <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 14px; margin: 10px 0;">
        <div style="font-weight: 700; color: #991B1B; font-size: 12px; margin-bottom: 4px;">Não foi possível concluir o laudo</div>
        <div style="font-size: 11px; color: #B91C1C;">${parecer.erro_geracao || 'Ocorreu uma instabilidade transitória na chamada à IA.'}</div>
      </div>
    `;
  } else if (temParecer) {
    const textoExibicao = (parecer.texto_final || parecer.texto_gerado || '').trim();
    const dataHoraStr = parecer.gerado_em ? new Date(parecer.gerado_em).toLocaleString('pt-BR') : '—';
    const origemBadge = parecer.origem_texto === 'template'
      ? '<span style="font-size: 9px; color: #B45309; background: #FEF3C7; padding: 2px 6px; border-radius: 3px;">Template de Contingência</span>'
      : '<span style="font-size: 9px; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 3px;">Gerado por IA</span>';

    conteudoHtml = `
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; color: #64748B;">
          <span>Emitido em: <strong style="color: #0F172A;">${dataHoraStr}</strong></span>
          ${origemBadge}
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; font-size: 12px; color: #1E293B; line-height: 1.6; max-height: 260px; overflow-y: auto; white-space: pre-line;">
${textoExibicao}
        </div>
        ${isAssinado ? `
          <div style="margin-top: 8px; padding: 8px 12px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; font-size: 11px; color: #047857;">
            Assinado por: <strong>${parecer.assinante_nome}</strong> • CREA: <strong>${parecer.crea}</strong>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    conteudoHtml = `
      <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 20px; text-align: center; margin: 10px 0; color: #64748B; font-size: 12px;">
        <i data-lucide="file-text" style="width: 28px; height: 28px; color: #94A3B8; margin-bottom: 6px; display: inline-block;"></i>
        <div style="font-weight: 600; color: #334155;">Nenhum parecer técnico emitido ainda</div>
        <p style="font-size: 11px; margin: 4px 0 0 0;">Clique no botão abaixo para gerar uma análise fitossanitária e agronômica completa com IA.</p>
      </div>
    `;
  }

  // Definição dos botões de ação
  let botoesAcaoHtml = '';
  if (isGerando) {
    botoesAcaoHtml = `
      <button type="button" disabled style="padding: 8px 16px; background: #E2E8F0; color: #94A3B8; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: not-allowed; display: inline-flex; align-items: center; gap: 6px;">
        <span class="inline-spinner" style="width: 12px; height: 12px; border: 2px solid #94A3B8; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
        Gerando parecer...
      </button>
    `;
  } else if (isErro) {
    botoesAcaoHtml = `
      <button type="button" class="btn-tentar-parecer" style="padding: 8px 16px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
        Tentar novamente
      </button>
    `;
  } else if (temParecer) {
    botoesAcaoHtml = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn-gerar-parecer-novamente" style="padding: 8px 14px; background: #FFFFFF; color: #047857; border: 1px solid #10B981; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
          Gerar novamente
        </button>
        ${podeAssinar ? `
          <button type="button" class="btn-assinar-parecer" style="padding: 8px 14px; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
            Assinar com CREA
          </button>
        ` : ''}
      </div>
    `;
  } else {
    botoesAcaoHtml = `
      <button type="button" class="btn-gerar-parecer" style="padding: 8px 16px; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
        Gerar parecer
      </button>
    `;
  }

  container.innerHTML = `
    <div class="parecer-agronomico-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: #ECFDF5; color: #047857; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="file-check-2" style="width: 16px; height: 16px;"></i>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #0F172A;">Parecer Agronômico & Fitossanitário (IA)</h4>
            <span style="font-size: 10px; color: #64748B;">Análise técnica de risco, microclima e integridade do lote</span>
          </div>
        </div>
        <div>
          ${badgeHtml}
        </div>
      </div>

      ${conteudoHtml}

      <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
        ${botoesAcaoHtml}
      </div>
    </div>
  `;

  // Renderiza ícones Lucide se disponíveis
  if (typeof window !== 'undefined' && window.lucide) {
    window.lucide.createIcons({ root: container });
  }

  // Handlers dos botões
  const btnGerar = container.querySelector('.btn-gerar-parecer');
  const btnNovamente = container.querySelector('.btn-gerar-parecer-novamente');
  const btnTentar = container.querySelector('.btn-tentar-parecer');
  const btnAssinar = container.querySelector('.btn-assinar-parecer');

  const dispararGeracao = async (forcar) => {
    // Imediatamente coloca em estado visual 'gerando' para travar novo clique
    renderizarParecerCardNoElemento(container, idLote, { em_geracao: true, status: 'gerando' });
    try {
      const res = await api.gerarParecer({ id_lote: idLote, tipo: 'agronomico', dias: 30, forcar });
      if (res.reaproveitado && !isGerando) {
        toast.info('Parecer Atualizado', 'Dados climáticos idênticos: parecer existente foi reaproveitado.');
      } else {
        toast.success('Parecer Concluído', 'Parecer gerado com sucesso.');
      }
      renderizarParecerCardNoElemento(container, idLote, res);
    } catch (err) {
      console.error('Falha ao disparar parecer:', err);
      toast.error('Erro ao Gerar Parecer', err.message || 'Falha ao contatar a inteligência artificial.');
      renderizarParecerCardNoElemento(container, idLote, {
        em_geracao: false,
        status: 'erro',
        erro_geracao: err.message || 'Falha de conexão com o servidor'
      });
    }
  };

  btnGerar?.addEventListener('click', () => dispararGeracao(false));
  btnNovamente?.addEventListener('click', () => dispararGeracao(true));
  btnTentar?.addEventListener('click', () => dispararGeracao(true));

  btnAssinar?.addEventListener('click', () => {
    if (!parecer?.id_parecer) return;
    const profile = auth.getProfileData();
    Modal.open('Assinatura Técnica de Parecer Agronômico', `
      <div style="font-size: 12px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
        <p style="margin: 0; color: #64748B;">Informe seus dados de registro profissional para assinar o parecer do Lote #${idLote}:</p>
        <div>
          <label style="font-weight: 700; display: block; margin-bottom: 4px;">Nome do Responsável Técnico:</label>
          <input type="text" id="campo-assinante-nome" value="${profile.nome || ''}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px;">
        </div>
        <div>
          <label style="font-weight: 700; display: block; margin-bottom: 4px;">Número do CREA:</label>
          <input type="text" id="campo-assinante-crea" placeholder="Ex: CREA-PE 12345/D" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px;">
        </div>
      </div>
    `, async () => {
      const nome = document.getElementById('campo-assinante-nome')?.value?.trim();
      const crea = document.getElementById('campo-assinante-crea')?.value?.trim();
      if (!nome || !crea) {
        toast.error('Dados Incompletos', 'Preencha o nome e o CREA para assinar.');
        return;
      }
      try {
        const assinado = await api.assinarParecer(parecer.id_parecer, { assinante_nome: nome, crea });
        toast.success('Parecer Assinado', `Parecer assinado com sucesso sob o registro CREA ${crea}.`);
        renderizarParecerCardNoElemento(container, idLote, assinado);
      } catch (err) {
        toast.error('Erro na Assinatura', err.message || 'Falha ao assinar o parecer.');
      }
    }, 'Assinar e Homologar');
  });
}
