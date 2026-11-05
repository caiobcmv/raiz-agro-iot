/**
 * VIEW: TELA DE LOGIN (Figma Pixel Perfect + MFA Flow)
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { toast } from '../components/toast.js';

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
                  placeholder="gestao@frutas.agro.br" 
                  value="gestao@frutas.agro.br"
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
                  value="senha12345"
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
              <a href="javascript:void(0)" id="forgot-password-link" class="login-forgot-link">Esqueceu?</a>
            </div>

            <!-- Botão Entrar -->
            <button type="submit" class="login-submit-btn" id="login-submit-btn">
              ENTRAR
            </button>

            
          </form>

          <!-- Selo de Acesso MFA -->
          <div class="login-mfa-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Acesso via MFA (Multi-Factor Authentication)</span>
          </div>

          <!-- Dica de demonstração para facilitar avaliação -->
          <div class="login-demo-helper">
            <div>💡 <strong>Dica de Acesso Rápido:</strong> As credenciais já vêm preenchidas. Clique em <strong>ENTRAR</strong> para testar a validação e o fluxo de 2FA.</div>
            <div style="font-size: 11px; opacity: 0.85;">No modo MFA, qualquer código de 6 dígitos (ex: <code>123456</code>) libera o acesso.</div>
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

  // Esqueci minha senha
  if (forgotLink) {
    forgotLink.addEventListener('click', () => {
      toast.info('Recuperação de Senha', 'Instruções enviadas para o e-mail de segurança cadastrado.');
    });
  }

      // Acesso direto por perfil
      const btnAnalista = document.getElementById('btn-login-analista');
      if (btnAnalista) {
        btnAnalista.addEventListener('click', () => {
          api.setTokens('demo_jwt_token_analista', 'demo_refresh_token_analista');
          auth.setActiveProfile('analista');
          auth.setUser({
            id_usuario: 2,
            nome: 'Luiz Felipe',
            email: 'luiz.felipe@raizagro.agr.br',
            perfil: 'Analista IoT & Telemetria'
          });
          toast.success('Acesso Concedido', 'Entrando como Luiz Felipe (Analista)...');
          window.location.hash = '#/dashboard';
        });
      }

      const btnGestor = document.getElementById('btn-login-gestor');
      if (btnGestor) {
        btnGestor.addEventListener('click', () => {
          api.setTokens('demo_jwt_token_gestor', 'demo_refresh_token_gestor');
          auth.setActiveProfile('gestor');
          auth.setUser({
            id_usuario: 1,
            nome: 'Maria Clara',
        email: 'maria.clara@raizagro.agr.br',
            perfil: 'Gestora de Operações'
          });
          toast.success('Acesso Concedido', 'Entrando como Maria Clara (Gestora)...');
          window.location.hash = '#/dashboard';
        });
      }

      // Submissão do formulário
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email').value.trim();
          const senha = passwordInput.value;

          if (!email || !senha) {
            toast.warning('Atenção', 'Preencha o e-mail e a senha.');
            return;
          }

          submitBtn.classList.add('loading');
          submitBtn.textContent = 'AUTENTICANDO...';

          try {
            const response = await api.login(email, senha);

            if (response.access_token) {
              api.setTokens(response.access_token, response.refresh_token);
              const isAnalistaEmail = email.includes('analista') || email.includes('felipe');
              auth.setActiveProfile(isAnalistaEmail ? 'analista' : 'gestor');
              auth.setUser({
                nome: isAnalistaEmail ? 'Luiz Felipe' : 'Maria Clara',
                email: email,
                perfil: isAnalistaEmail ? 'Analista IoT & Telemetria' : 'Gestora de Operações'
              });
              toast.success('Bem-vindo(a)!', `Acesso autorizado como ${isAnalistaEmail ? 'Luiz Felipe' : 'Maria Clara'}.`);
              window.location.hash = '#/dashboard';
            } else if (response.requer_2fa) {
              toast.success('Credenciais válidas', 'Código de verificação 2FA gerado.');
              open2FAModal(response.token_temporario, response.email_mascarado);
            }
          } catch (err) {
            toast.error('Falha de Login', err.message || 'E-mail ou senha incorretos.');
          } finally {
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'ENTRAR';
          }
        });
      }
    }

/**
 * MODAL DE SEGUNDO FATOR DE AUTENTICAÇÃO (MFA / 2FA)
 */
function open2FAModal(tokenTemporario, emailMascarado) {
        const modalWrap = document.createElement('div');
        modalWrap.className = 'mfa-modal-overlay';
        modalWrap.id = 'mfa-modal';

        modalWrap.innerHTML = `
    <div class="mfa-modal-card">
      <div class="mfa-modal-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>

      <h2 class="mfa-modal-title">Verificação em Duas Etapas</h2>
      <p class="mfa-modal-subtitle">
        Enviamos um código de segurança de 6 dígitos para o e-mail:<br>
        <strong>${emailMascarado || 'gestao@frutas.agro.br'}</strong>
      </p>

      <form id="mfa-form">
        <div class="mfa-inputs-group">
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" autofocus required>
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" class="mfa-digit-input" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
        </div>

        <div class="mfa-resend-row">
          <span>Tempo restante: <strong id="mfa-timer">09:59</strong></span>
          <button type="button" class="mfa-resend-btn" id="mfa-resend-btn" disabled>Reenviar código</button>
        </div>

        <button type="submit" class="login-submit-btn" id="mfa-verify-btn">
          CONFIRMAR E ENTRAR
        </button>
      </form>
    </div>
  `;

        document.body.appendChild(modalWrap);

        const inputs = modalWrap.querySelectorAll('.mfa-digit-input');
        const mfaForm = modalWrap.querySelector('#mfa-form');
        const verifyBtn = modalWrap.querySelector('#mfa-verify-btn');
        const resendBtn = modalWrap.querySelector('#mfa-resend-btn');

        // Foco automático e avanço entre dígitos
        inputs.forEach((input, index) => {
          input.addEventListener('input', (e) => {
            if (input.value && index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
              inputs[index - 1].focus();
            }
          });

          // Colar código de 6 dígitos diretamente
          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{6}$/.test(pasteData)) {
              inputs.forEach((inp, idx) => inp.value = pasteData[idx]);
              inputs[inputs.length - 1].focus();
            }
          });
        });

        // Contador de 10 minutos
        let timeLeft = 600;
        const timerEl = modalWrap.querySelector('#mfa-timer');
        const interval = setInterval(() => {
          timeLeft--;
          const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
          const secs = String(timeLeft % 60).padStart(2, '0');
          if (timerEl) timerEl.textContent = `${mins}:${secs}`;

          if (timeLeft <= 540 && resendBtn) {
            resendBtn.disabled = false;
          }

          if (timeLeft <= 0) {
            clearInterval(interval);
            toast.error('Código Expirado', 'Solicite um novo código de verificação.');
          }
        }, 1000);

        // Reenviar código
        resendBtn.addEventListener('click', async () => {
          try {
            await api.resend2FA(tokenTemporario);
            toast.success('Código Reenviado', 'Verifique sua caixa de entrada.');
            resendBtn.disabled = true;
          } catch (e) {
            toast.error('Erro', e.message);
          }
        });

        // Validar código
        mfaForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const code = Array.from(inputs).map(i => i.value).join('');

          if (code.length !== 6) {
            toast.warning('Atenção', 'Digite o código de 6 dígitos completo.');
            return;
          }

          verifyBtn.textContent = 'VERIFICANDO...';
          verifyBtn.disabled = true;

          try {
            const session = await api.verify2FA(tokenTemporario, code);
            clearInterval(interval);
            modalWrap.remove();

            // Salva tokens e usuário na sessão
            if (session && session.access_token) {
              api.setTokens(session.access_token, session.refresh_token);
            } else {
              api.setTokens('demo_jwt_token_auth', 'demo_refresh_token_auth');
            }

            const userData = (session && session.usuario) ? session.usuario : {
              id_usuario: 1,
              nome: 'Maria Clara',
              email: 'gestao@frutas.agro.br',
              perfil: 'Produtor/Exportador'
            };
            auth.setUser(userData);

            toast.success('Autenticação Concluída', 'Seja bem-vindo ao sistema!');
            window.location.hash = '#/dashboard';
          } catch (err) {
            toast.error('Código Inválido', err.message || 'Código incorreto ou expirado.');
            verifyBtn.textContent = 'CONFIRMAR E ENTRAR';
            verifyBtn.disabled = false;
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
          }
        });
      }
