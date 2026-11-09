/**
 * VIEW: TELA DE LOGIN (Figma Pixel Perfect + MFA Flow)
 */

import { api } from '../api.js';
import { auth, USUARIOS } from '../auth.js';
import { toast } from '../components/toast.js';
import { isBloqueado, registrarFalha, limparTentativas } from './auth-flow.js';

export function renderLogin() {
  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem Agrícola com Curva Orgânica em Alta Resolução -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Formulário de Autenticação -->
      <div class="login-form-section">
        <div class="login-form-container">
          
          <div class="login-header">
            <div class="login-welcoming">Bem vindo (a)!</div>
            <h1 class="login-title">Acesse sua conta</h1>
          </div>

          <form id="login-form" class="login-form">
            <!-- E-mail / Matrícula -->
            <div class="login-input-group">
              <label class="login-label" for="login-email">E-MAIL</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input 
                  type="email" 
                  id="login-email" 
                  class="login-input" 
                  placeholder="exemplo@raizagro.agr.br" 
                  required
                >
              </div>
            </div>

            <!-- Senha -->
            <div class="login-input-group">
              <label class="login-label" for="login-password">SENHA</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input 
                  type="password" 
                  id="login-password" 
                  class="login-input" 
                  placeholder="••••••••••••" 
                  required
                >
                <button type="button" class="login-toggle-password" id="toggle-password" title="Alternar visibilidade">
                  <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Lembrar e Esqueci -->
            <div class="login-options-row">
              <label class="login-checkbox-label">
                <input type="checkbox" id="remember-me" class="login-checkbox" checked>
                <span>Lembrar desta conta</span>
              </label>
              <a href="#/recuperar-senha" id="forgot-password-link" class="login-forgot-link">Esqueceu?</a>
            </div>

            <!-- Botão Entrar -->
            <button type="submit" class="login-submit-btn" id="login-submit-btn">
              ENTRAR
            </button>

            <!-- Link Primeiro Acesso -->
            <div class="login-first-access">
              Primeiro acesso? <a href="#/primeiro-acesso" class="login-first-access-link"><strong>Ative sua conta</strong></a>
            </div>
          </form>

          <!-- Selo de Acesso MFA -->
          <div class="login-mfa-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Acesso via MFA (Multi-Factor Authentication)</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupLoginEvents() {
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('login-password');
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit-btn');
  const forgotLink = document.getElementById('forgot-password-link');

  // Alternar mostrar/ocultar senha
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
    });
  }

  // Esqueci minha senha (navega para recuperação sem toast)
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/recuperar-senha';
    });
  }

  // Submissão do formulário
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const senha = passwordInput.value;

      if (!email || !senha) {
        toast.warning('Atenção', 'Preencha o e-mail e a senha.');
        return;
      }

      // Validação estrita de e-mail por comparação exata via mapa de USUARIOS
      const usuarioAutorizado = USUARIOS[email];
      if (!usuarioAutorizado) {
        toast.error('Acesso Negado', 'E-mail não autorizado. Apenas usuários cadastrados podem acessar o sistema.');
        return;
      }

      // Verificação de bloqueio temporário
      if (isBloqueado(email)) {
        sessionStorage.setItem('conta_bloqueada_email', email);
        toast.warning('Acesso Bloqueado', 'Esta conta está temporariamente suspensa.');
        window.location.hash = '#/conta-bloqueada';
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'AUTENTICANDO...';

      try {
        const response = await api.login(email, senha);

        if (response.access_token) {
          limparTentativas(email);
          api.setTokens(response.access_token, response.refresh_token);
          auth.startSession(email);
          toast.success('Bem-vindo(a)!', `Acesso autorizado como ${usuarioAutorizado.nome}.`);
          window.location.hash = '#/dashboard';
        } else if (response.requer_2fa) {
          // Salva estado para a tela #/verificacao
          sessionStorage.setItem('mfa_contexto', 'login');
          sessionStorage.setItem('mfa_email', email);
          sessionStorage.setItem('mfa_token_temporario', response.token_temporario || ('demo_token_2fa_' + Date.now()));
          sessionStorage.setItem('mfa_metodo', response.metodo || 'email');
          window.location.hash = '#/verificacao';
        }
      } catch (err) {
        const resFalha = registrarFalha(email);
        if (resFalha.bloqueado) {
          sessionStorage.setItem('conta_bloqueada_email', email);
          toast.error('Conta Bloqueada', 'Número máximo de tentativas incorretas excedido.');
          window.location.hash = '#/conta-bloqueada';
        } else {
          toast.error('Falha de Login', err.message || 'E-mail ou senha incorretos.');
        }
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'ENTRAR';
      }
    });
  }
}
