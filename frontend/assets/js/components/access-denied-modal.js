/**
 * MODAL DE DIRETRIZES DE GOVERNANÇA (RBAC / CONTROLE DE ACESSO)
 * Exibido quando usuários sem permissão de escrita (Produtor/Exportador, Analista)
 * tentam editar dados cadastrais ou parâmetros do sistema.
 */

import { auth } from '../auth.js';
import { toast } from './toast.js';

export function showAccessDeniedModal(customProfileName = null) {
  const existing = document.getElementById('governance-access-denied-modal');
  if (existing) existing.remove();

  let perfilFormatado = customProfileName;
  if (!perfilFormatado) {
    const isAnalista = auth.getActiveProfile() === 'analista';
    perfilFormatado = isAnalista ? 'Analista' : 'Produtor / Exportador';
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'governance-access-denied-modal';
  backdrop.className = 'governance-modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    animation: fadeIn 0.18s ease-out;
  `;

  backdrop.innerHTML = `
    <div class="governance-modal-card" style="
      background: #FFFFFF;
      border: 1px solid #FEE2E2;
      border-left: 6px solid #EF4444;
      border-radius: 20px;
      width: 100%;
      max-width: 530px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(239, 68, 68, 0.08);
      padding: 24px 28px;
      box-sizing: border-box;
      animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <!-- Top Row: Ícone + Títulos -->
      <div style="display: flex; align-items: flex-start; gap: 14px;">
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #FEE2E2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <span style="font-size: 22px; font-weight: 800; color: #DC2626; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">!</span>
        </div>

        <div style="flex: 1; min-width: 0;">
          <h3 style="
            margin: 0;
            font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 17px;
            font-weight: 700;
            color: #0F172A;
            line-height: 1.3;
          ">Você não tem acesso a essa funcionalidade</h3>
          <p style="
            margin: 3px 0 0;
            font-size: 13px;
            color: #64748B;
            font-weight: 400;
            line-height: 1.4;
          ">Ação bloqueada pelas diretrizes de governança</p>
        </div>
      </div>

      <!-- Mensagem Descritiva -->
      <div style="margin-top: 16px; margin-bottom: 24px;">
        <p style="
          margin: 0;
          font-size: 14px;
          color: #334155;
          line-height: 1.55;
        ">
          Seu perfil atual (<strong>${perfilFormatado}</strong>) possui permissão apenas de leitura. Apenas o <strong>Administrador</strong> pode salvar ou redefinir esses dados.
        </p>
      </div>

      <!-- Ações: Pedir acesso (vermelho) + Fechar (neutro) -->
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button id="btn-governance-request-access" style="
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 11px 20px;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease, transform 0.1s ease;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.28);
        " onmouseover="this.style.background='#B91C1C'" onmouseout="this.style.background='#DC2626'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Pedir acesso ao Administrador</span>
        </button>

        <button id="btn-governance-close" style="
          background: #F8FAFC;
          color: #334155;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 11px 22px;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        " onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='#F8FAFC'">
          Fechar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.remove();
  };

  backdrop.querySelector('#btn-governance-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelector('#btn-governance-request-access').addEventListener('click', () => {
    close();
    toast.info('Solicitação Encaminhada', 'Seu pedido de elevação de permissão foi registrado e enviado ao Administrador.');
  });

  return backdrop;
}
