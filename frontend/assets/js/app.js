/**
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO (SPA)
 * Inicialização robusta contra problemas de tempo de carregamento do DOM
 */

import { Router } from './router.js?v=20261104-5';

let isAppStarted = false;

function startApplication() {
  if (isAppStarted) return;
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('Container #app não encontrado no DOM!');
    return;
  }
  isAppStarted = true;
  try {
    const router = new Router(appContainer);
    router.init().catch(err => {
      console.error('Erro na inicialização do Router:', err);
      mostrarErro(appContainer, err);
    });
  } catch (errSync) {
    console.error('Erro síncrono na inicialização:', errSync);
    mostrarErro(appContainer, errSync);
  }
}

function mostrarErro(container, err) {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #183D2E; color: #fff; font-family: sans-serif; padding: 20px; text-align: center;">
      <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; max-width: 500px;">
        <h2 style="color: #EF4444; margin-top: 0;">Diagnóstico de Inicialização</h2>
        <p style="color: #A7F3D0; font-size: 14px; margin: 12px 0;">${err.message || err}</p>
        <button onclick="localStorage.clear(); window.location.reload();" style="padding: 10px 20px; background: #10B981; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 600;">
          Limpar Sessão e Recarregar
        </button>
      </div>
    </div>
  `;
}

// Inicia imediatamente se o DOM já estiver pronto, com fallback rápido
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication);
  setTimeout(startApplication, 80);
} else {
  startApplication();
}
