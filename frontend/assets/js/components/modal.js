/**
 * GERENCIADOR DE MODAIS
 */

export class Modal {
  static open(title, contentHtml, onConfirm = null, confirmText = 'Salvar') {
    const existing = document.getElementById('active-dynamic-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'active-dynamic-modal';
    backdrop.className = 'modal-backdrop';

    backdrop.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" id="modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
          ${onConfirm ? `<button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();

    backdrop.querySelector('#modal-close-btn').addEventListener('click', close);
    backdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    if (onConfirm) {
      const confirmBtn = backdrop.querySelector('#modal-confirm-btn');
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processando...';
        try {
          const success = await onConfirm(backdrop);
          if (success !== false) close();
        } catch (err) {
          console.error(err);
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmText;
        }
      });
    }

    return backdrop;
  }
}

