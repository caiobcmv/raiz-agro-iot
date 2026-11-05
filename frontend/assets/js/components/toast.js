/**
 * NOTIFICAÇÕES TOAST FLUTUANTES (SISTEMA RAIZ)
 * Seguro para importação em qualquer estágio do DOM
 */

class ToastManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!document.body) return null;
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
    this.container = el;
    return this.container;
  }

  show(title, message, type = 'info', duration = 4000) {
    const container = this.ensureContainer();
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toastEl.innerHTML = `
      <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(40px)';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  }

  success(title, message, duration) {
    this.show(title, message, 'success', duration);
  }

  error(title, message, duration) {
    this.show(title, message, 'error', duration);
  }

  warning(title, message, duration) {
    this.show(title, message, 'warning', duration);
  }

  info(title, message, duration) {
    this.show(title, message, 'info', duration);
  }
}

export const toast = new ToastManager();
