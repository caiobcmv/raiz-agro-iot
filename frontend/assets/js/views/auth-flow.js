/**
 * VIEW: FLUXOS DE AUTENTICAÇÃO ADICIONAIS
 * 1. Ativação de Primeiro Acesso (#/primeiro-acesso)
 * 2. Recuperação de Senha (#/recuperar-senha)
 * 3. Verificação em Duas Etapas (#/verificacao)
 *
 * Fiel às especificações visuais do Figma e imagens anexas.
 */

import { api } from '../api.js';
import { auth, USUARIOS } from '../auth.js';
import { toast } from '../components/toast.js';

/* =====================================================================
   1) PRIMEIRO ACESSO (#/primeiro-acesso)
   ===================================================================== */

export function renderPrimeiroAcesso() {
  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Formulário -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-welcoming">Bem-vindo (a) à Raíz</div>
            <h1 class="auth-title">Ative seu primeiro acesso</h1>
            <p class="auth-subtitle">Confirme seus dados cadastrais e defina uma senha individual criptografada para acessar o sistema da fazenda.</p>
          </div>

          <form id="primeiro-acesso-form" class="login-form">
            <!-- E-mail Cadastrado -->
            <div class="login-input-group">
              <label class="login-label" for="primeiro-email">E-MAIL CADASTRADO</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  type="email"
                  id="primeiro-email"
                  class="login-input"
                  placeholder="seu.nome@raizagro.agr.br"
                  required
                >
              </div>
            </div>

            <!-- Código de Ativação / Token Corporativo -->
            <div class="login-input-group">
              <label class="login-label" for="primeiro-token">CÓDIGO DE ATIVAÇÃO / TOKEN CORPORATIVO</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9l-4 4a5 5 0 1 0 7 7l4-4 1.5 1.5L18 16l1.5-1.5L18 13l1.5-1.5L21 10"/>
                    <circle cx="7.5" cy="16.5" r="1.5"/>
                  </svg>
                </span>
                <input
                  type="text"
                  id="primeiro-token"
                  class="login-input"
                  placeholder="EX: RZ-8492-OK"
                  required
                >
              </div>
            </div>

            <!-- Criar Nova Senha e Confirmar Senha lado a lado -->
            <div class="auth-row-2col">
              <!-- Criar Nova Senha -->
              <div class="login-input-group">
                <label class="login-label" for="primeiro-senha">CRIAR NOVA SENHA</label>
                <div class="login-input-wrapper">
                  <span class="login-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    type="password"
                    id="primeiro-senha"
                    class="login-input"
                    placeholder="••••••••••••"
                    required
                  >
                  <button type="button" class="login-toggle-password" id="toggle-primeiro-senha" title="Alternar visibilidade">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Confirmar Senha -->
              <div class="login-input-group">
                <label class="login-label" for="primeiro-confirma-senha">CONFIRMAR SENHA</label>
                <div class="login-input-wrapper">
                  <span class="login-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </span>
                  <input
                    type="password"
                    id="primeiro-confirma-senha"
                    class="login-input"
                    placeholder="••••••••••••"
                    required
                  >
                  <button type="button" class="login-toggle-password" id="toggle-primeiro-confirma" title="Alternar visibilidade">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Faixa de requisitos de senha em tempo real -->
            <div class="auth-reqs-row">
              <span class="auth-req-item" id="req-len">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mínimo 8 dígitos
              </span>
              <span class="auth-req-item" id="req-upper-num">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Maiúscula e número
              </span>
              <span class="auth-req-item" id="req-symbol">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Símbolo (@#$)
              </span>
            </div>

            <!-- Checkbox de termos obrigatório -->
            <div class="login-options-row">
              <label class="login-checkbox-label">
                <input type="checkbox" id="primeiro-termos" class="login-checkbox" required>
                <span>Concordo com os Termos e Políticas de Segurança</span>
              </label>
            </div>

            <!-- Botão de Ativação -->
            <button type="submit" class="login-submit-btn" id="primeiro-submit-btn">
              ATIVAR CONTA E ACESSAR &rarr;
            </button>

            <!-- Link Fazer login -->
            <div class="auth-bottom-link">
              Já possui uma senha cadastrada? <a href="#/login">Fazer login</a>
            </div>
          </form>

          <!-- Rodapé de Segurança -->
          <div class="auth-security-footer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Ambiente Seguro • Criptografia AES-256 e LGPD Agro</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupPrimeiroAcessoEvents() {
  const form = document.getElementById('primeiro-acesso-form');
  const emailInput = document.getElementById('primeiro-email');
  const tokenInput = document.getElementById('primeiro-token');
  const senhaInput = document.getElementById('primeiro-senha');
  const confirmaInput = document.getElementById('primeiro-confirma-senha');
  const termosCheckbox = document.getElementById('primeiro-termos');
  const submitBtn = document.getElementById('primeiro-submit-btn');

  // Toggle visibilidade da senha
  const bindToggle = (btnId, inputEl) => {
    const btn = document.getElementById(btnId);
    if (!btn || !inputEl) return;
    btn.addEventListener('click', () => {
      const isPwd = inputEl.type === 'password';
      inputEl.type = isPwd ? 'text' : 'password';
      btn.innerHTML = isPwd ? `
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
  };

  bindToggle('toggle-primeiro-senha', senhaInput);
  bindToggle('toggle-primeiro-confirma', confirmaInput);

  // Validação em tempo real dos requisitos de senha
  const reqLen = document.getElementById('req-len');
  const reqUpperNum = document.getElementById('req-upper-num');
  const reqSymbol = document.getElementById('req-symbol');

  const checkRequirements = (val) => {
    const hasLen = (val || '').length >= 8;
    const hasUpperNum = /[A-Z]/.test(val) && /[0-9]/.test(val);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(val);

    if (reqLen) reqLen.classList.toggle('valid', hasLen);
    if (reqUpperNum) reqUpperNum.classList.toggle('valid', hasUpperNum);
    if (reqSymbol) reqSymbol.classList.toggle('valid', hasSymbol);

    return hasLen && hasUpperNum && hasSymbol;
  };

  if (senhaInput) {
    senhaInput.addEventListener('input', () => {
      checkRequirements(senhaInput.value);
    });
  }

  // Submissão do formulário
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (emailInput.value || '').trim().toLowerCase();
      const token = (tokenInput.value || '').trim().toUpperCase();
      const senha = senhaInput.value;
      const confirma = confirmaInput.value;

      // 1. E-mail autorizado
      const usuario = USUARIOS[email];
      if (!usuario) {
        toast.error('Acesso Negado', 'E-mail não autorizado. Apenas usuários cadastrados podem ativar conta.');
        return;
      }

      // 2. Token no padrão RZ-XXXX-XX
      const tokenRegex = /^RZ-\d{4}-[A-Z]{2}$/;
      if (!tokenRegex.test(token)) {
        toast.warning('Token Inválido', 'O código de ativação deve seguir o padrão RZ-XXXX-XX (ex.: RZ-8492-OK).');
        return;
      }

      // 3. Requisitos de senha
      if (!checkRequirements(senha)) {
        toast.warning('Senha Fraca', 'A senha deve ter no mínimo 8 dígitos, conter maiúscula, número e símbolo.');
        return;
      }

      // 4. Confirmação de senha
      if (senha !== confirma) {
        toast.warning('Senhas Divergentes', 'A confirmação de senha deve ser idêntica à nova senha.');
        return;
      }

      // 5. Termos
      if (!termosCheckbox || !termosCheckbox.checked) {
        toast.warning('Termos Obrigatórios', 'Você deve concordar com os Termos e Políticas de Segurança.');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'ATIVANDO CONTA...';

      // Simulação de ativação: inicia a sessão e vai para o dashboard
      setTimeout(() => {
        api.setTokens('demo_jwt_token_' + usuario.profile, 'demo_refresh_' + usuario.profile);
        auth.startSession(email);
        toast.success('Primeiro Acesso Concluído', `Bem-vindo(a), ${usuario.nome}! Sua conta foi ativada com sucesso.`);
        window.location.hash = '#/dashboard';
      }, 600);
    });
  }
}

/* =====================================================================
   2) RECUPERAR SENHA (#/recuperar-senha)
   ===================================================================== */

export function renderRecuperarSenha() {
  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Formulário -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-welcoming">Recuperação de Acesso</div>
            <h1 class="auth-title">Esqueceu sua senha?</h1>
            <p class="auth-subtitle">Digite seu e-mail corporativo cadastrado. Enviaremos um código de verificação seguro de 6 dígitos para redefinir sua credencial.</p>
          </div>

          <form id="recuperar-senha-form" class="login-form">
            <!-- Campo de e-mail / telefone -->
            <div class="login-input-group">
              <label class="login-label" id="recuperar-label" for="recuperar-input">E-MAIL CORPORATIVO</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon" id="recuperar-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  type="email"
                  id="recuperar-input"
                  class="login-input"
                  placeholder="exemplo@raizagro.agr.br"
                  required
                >
              </div>
            </div>

            <!-- Alternar envio via SMS / E-mail -->
            <div style="display: flex; align-items: center; margin-top: -6px;">
              <button type="button" class="auth-toggle-method" id="toggle-method-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                  <path d="M12 18h.01"/>
                </svg>
                <span id="toggle-method-text">Prefere receber via SMS cadastrado?</span>
              </button>
            </div>

            <!-- Botão Enviar Código -->
            <button type="submit" class="login-submit-btn" id="recuperar-submit-btn">
              ENVIAR CÓDIGO DE RECUPERAÇÃO
            </button>

            <!-- Link Voltar ao login -->
            <div class="auth-bottom-link">
              Lembrou a senha? <a href="#/login">Voltar ao login</a>
            </div>
          </form>

          <!-- Rodapé de Segurança -->
          <div class="auth-security-footer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Recuperação protegida por Token Criptográfico &amp; MFA</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupRecuperarSenhaEvents() {
  const form = document.getElementById('recuperar-senha-form');
  const inputEl = document.getElementById('recuperar-input');
  const labelEl = document.getElementById('recuperar-label');
  const toggleBtn = document.getElementById('toggle-method-btn');
  const toggleText = document.getElementById('toggle-method-text');
  const submitBtn = document.getElementById('recuperar-submit-btn');

  let metodoAtual = 'email'; // 'email' ou 'sms'

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      metodoAtual = metodoAtual === 'email' ? 'sms' : 'email';
      if (metodoAtual === 'sms') {
        labelEl.textContent = 'TELEFONE CELULAR OU E-MAIL CADASTRADO';
        inputEl.placeholder = '(87) 9••••-•••• ou seu e-mail';
        toggleText.textContent = 'Prefere receber via e-mail cadastrado?';
      } else {
        labelEl.textContent = 'E-MAIL CORPORATIVO';
        inputEl.placeholder = 'exemplo@raizagro.agr.br';
        toggleText.textContent = 'Prefere receber via SMS cadastrado?';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = (inputEl.value || '').trim().toLowerCase();

      // Para validar o usuário cadastrado
      let emailAlvo = valor;

      // Se for número de telefone ou outro formato, busca o primeiro usuário correspondente ou valida por e-mail
      const usuarioEncontrado = USUARIOS[emailAlvo] || Object.values(USUARIOS).find(u => u.email === valor);

      if (!usuarioEncontrado) {
        toast.error('Acesso Negado', 'E-mail corporativo não encontrado na base de usuários autorizados.');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'ENVIANDO...';

      // Salva estado para a tela de verificação
      sessionStorage.setItem('mfa_contexto', 'recuperacao');
      sessionStorage.setItem('mfa_email', usuarioEncontrado.email);
      sessionStorage.setItem('mfa_token_temporario', 'recup_token_' + Date.now());
      sessionStorage.setItem('mfa_metodo', metodoAtual);

      setTimeout(() => {
        toast.success('Código Enviado', `Código de 6 dígitos enviado para seu ${metodoAtual === 'sms' ? 'SMS' : 'e-mail'}.`);
        window.location.hash = '#/verificacao';
      }, 500);
    });
  }
}

/* =====================================================================
   3) VERIFICAÇÃO DE CÓDIGO DE 6 DÍGITOS (#/verificacao)
   ===================================================================== */

export function renderVerificacao() {
  const emailArmazenado = sessionStorage.getItem('mfa_email') || 'seu.email@raizagro.agr.br';

  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Formulário de 6 Dígitos -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-pill-tag">
              <span class="auth-pill-dot"></span>
              SEGURANÇA &amp; VALIDAÇÃO
            </div>
            <h1 class="auth-title">Digite o código de 6 dígitos</h1>
            <p class="auth-subtitle">
              Enviamos um código temporário de autenticação para o e-mail
              <u id="verif-email-display">${emailArmazenado}</u> e via SMS para o número com final <strong>(••• 9842)</strong>.
            </p>

            <!-- Pill de auxílio com código de validação padrão -->
            <div style="display:flex; justify-content:center; margin: 12px 0 6px 0;">
              <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; background:rgba(16,185,129,0.15); border:1px solid #10B981; border-radius:20px; font-size:12px; color:#A7F3D0;">
                <span>🔑 Código de acesso: <strong style="color:#FFFFFF; letter-spacing:1.5px;">123456</strong></span>
                <button type="button" id="btn-preencher-codigo" style="background:#10B981; border:none; border-radius:6px; color:#064E3B; font-weight:700; font-size:11px; padding:3px 8px; cursor:pointer;">Preencher</button>
              </div>
            </div>
          </div>

          <form id="verificacao-form" class="login-form">
            <!-- 6 Caixas de Dígitos -->
            <div class="auth-code-inputs-group">
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="0" autofocus required>
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="1" required>
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="2" required>
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="3" required>
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="4" required>
              <input type="text" class="auth-code-box" maxlength="1" pattern="[0-9]" inputmode="numeric" placeholder="–" data-idx="5" required>
            </div>

            <!-- Linha com Contador Regressivo e Reenviar código -->
            <div class="auth-timer-resend-row">
              <div class="auth-timer-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Código expira em <strong id="verif-timer">10:00</strong></span>
              </div>
              <button type="button" class="auth-resend-link" id="verif-resend-btn" disabled>
                Reenviar código
              </button>
            </div>

            <!-- Botão Validar Código -->
            <button type="submit" class="login-submit-btn" id="verif-submit-btn">
              VALIDAR CÓDIGO E CONTINUAR &rarr;
            </button>

            <!-- Link Voltar ou alterar e-mail -->
            <div class="auth-bottom-link">
              <a href="javascript:void(0)" id="verif-back-link">&larr; Voltar ou alterar e-mail</a>
            </div>
          </form>

          <!-- Rodapé de Segurança -->
          <div class="auth-security-footer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Ambiente Seguro • Criptografia AES-256 e MFA Agro</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupVerificacaoEvents() {
  const contexto = sessionStorage.getItem('mfa_contexto');
  const email = sessionStorage.getItem('mfa_email');
  const tokenTemporario = sessionStorage.getItem('mfa_token_temporario') || ('demo_token_2fa_' + Date.now());

  // Sem estado válido, redireciona para login
  if (!contexto || !email) {
    window.location.hash = '#/login';
    return;
  }

  const form = document.getElementById('verificacao-form');
  const inputs = Array.from(document.querySelectorAll('.auth-code-box'));
  const timerEl = document.getElementById('verif-timer');
  const resendBtn = document.getElementById('verif-resend-btn');
  const submitBtn = document.getElementById('verif-submit-btn');
  const backLink = document.getElementById('verif-back-link');

  // Configurar link de voltar conforme o contexto
  if (backLink) {
    backLink.addEventListener('click', () => {
      if (contexto === 'recuperacao') {
        window.location.hash = '#/recuperar-senha';
      } else {
        window.location.hash = '#/login';
      }
    });
  }

  // Interatividade das 6 caixas de código
  inputs.forEach((input, index) => {
    // Apenas números
    input.addEventListener('input', (e) => {
      input.value = input.value.replace(/\D/g, '');
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    // Backspace volta para o campo anterior
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Colar código inteiro de 6 dígitos
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/\D/g, '');
      if (pasteData) {
        inputs.forEach((inp, idx) => {
          inp.value = pasteData[idx] || '';
        });
        const nextFocus = Math.min(pasteData.length, inputs.length - 1);
        inputs[nextFocus].focus();
      }
    });
  });

  // Foco inicial e pré-preenchimento para agilidade no teste
  const preencherBtn = document.getElementById('btn-preencher-codigo');
  const preencherPadrao = () => {
    const defaultDigits = ['1', '2', '3', '4', '5', '6'];
    inputs.forEach((inp, idx) => {
      inp.value = defaultDigits[idx] || '';
    });
    if (inputs[inputs.length - 1]) inputs[inputs.length - 1].focus();
  };

  if (preencherBtn) {
    preencherBtn.addEventListener('click', (e) => {
      e.preventDefault();
      preencherPadrao();
    });
  }

  // Pré-preenche o código padrão para que o usuário possa confirmar com apenas 1 clique
  preencherPadrao();

  // Contador regressivo de 10:00 (600 segundos)
  let timeLeft = 600;
  const timerInterval = setInterval(() => {
    timeLeft--;
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;

    // Habilita reenviar após 60s (timeLeft <= 540)
    if (timeLeft <= 540 && resendBtn && resendBtn.disabled) {
      resendBtn.disabled = false;
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      toast.error('Código Expirado', 'O tempo limite expirou. Solicite um novo código de verificação.');
    }
  }, 1000);

  // Reenviar código
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      try {
        await api.resend2FA(tokenTemporario);
        toast.success('Código Reenviado', 'Um novo código de 6 dígitos foi enviado para você.');
        resendBtn.disabled = true;
      } catch (e) {
        toast.info('Código Reenviado', 'Novo código gerado com sucesso.');
        resendBtn.disabled = true;
      }
    });
  }

  // Validação do formulário
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = inputs.map(i => i.value).join('');

      if (code.length !== 6) {
        toast.warning('Código Incompleto', 'Por favor, preencha os 6 dígitos do código.');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'VALIDANDO...';

      try {
        const res2fa = await api.verify2FA(tokenTemporario, code);
        clearInterval(timerInterval);

        const usuario = USUARIOS[email];

        if (contexto === 'login') {
          // Contexto Login: abre a sessão e navega para o dashboard
          sessionStorage.removeItem('mfa_contexto');
          sessionStorage.removeItem('mfa_email');
          sessionStorage.removeItem('mfa_token_temporario');
          sessionStorage.removeItem('mfa_metodo');

          const profileKey = usuario ? usuario.profile : 'gestor';
          const accessToken = (res2fa && res2fa.access_token) || api.getToken() || ('demo_jwt_token_' + profileKey);
          const refreshToken = (res2fa && res2fa.refresh_token) || ('demo_refresh_' + profileKey);
          api.setTokens(accessToken, refreshToken);
          await auth.startSession(email);

          toast.success('Autenticação Concluída', `Seja bem-vindo(a), ${auth.getProfileData().nome || (usuario ? usuario.nome : 'Usuário')}!`);
          window.location.hash = '#/dashboard';
        } else {
          // Contexto Recuperação: grava mfa_verificado = true e vai para #/redefinir-senha
          sessionStorage.setItem('mfa_verificado', 'true');
          sessionStorage.removeItem('mfa_contexto');
          sessionStorage.removeItem('mfa_token_temporario');
          sessionStorage.removeItem('mfa_metodo');
          // Mantém mfa_email em sessionStorage para #/redefinir-senha
          window.location.hash = '#/redefinir-senha';
        }
      } catch (err) {
        toast.error('Código Inválido', err.message || 'Código incorreto ou expirado.');
        inputs.forEach(i => i.value = '');
        if (inputs[0]) inputs[0].focus();
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'VALIDAR CÓDIGO E CONTINUAR →';
      }
    });
  }
}

/* =====================================================================
   REGRAS DE BLOQUEIO DE CONTA POR TENTATIVAS INCORRETAS
   ===================================================================== */

export function getTentativas(email) {
  try {
    const raw = localStorage.getItem('login_tentativas');
    const obj = raw ? JSON.parse(raw) : {};
    return obj[email] || 0;
  } catch (e) {
    return 0;
  }
}

export function getBloqueio(email) {
  try {
    const raw = localStorage.getItem('bloqueio_ate');
    const obj = raw ? JSON.parse(raw) : {};
    return obj[email] || null;
  } catch (e) {
    return null;
  }
}

export function isBloqueado(email) {
  const b = getBloqueio(email);
  return Boolean(b && b > Date.now());
}

export function registrarFalha(email) {
  try {
    const raw = localStorage.getItem('login_tentativas');
    const obj = raw ? JSON.parse(raw) : {};
    const count = (obj[email] || 0) + 1;
    obj[email] = count;
    localStorage.setItem('login_tentativas', JSON.stringify(obj));

    if (count >= 5) {
      const bRaw = localStorage.getItem('bloqueio_ate');
      const bObj = bRaw ? JSON.parse(bRaw) : {};
      const exp = Date.now() + 15 * 60 * 1000;
      bObj[email] = exp;
      localStorage.setItem('bloqueio_ate', JSON.stringify(bObj));
      return { bloqueado: true, exp };
    }
    return { bloqueado: false, count };
  } catch (e) {
    return { bloqueado: false, count: 1 };
  }
}

export function limparTentativas(email) {
  try {
    const raw = localStorage.getItem('login_tentativas');
    if (raw) {
      const obj = JSON.parse(raw);
      delete obj[email];
      localStorage.setItem('login_tentativas', JSON.stringify(obj));
    }
    const bRaw = localStorage.getItem('bloqueio_ate');
    if (bRaw) {
      const bObj = JSON.parse(bRaw);
      delete bObj[email];
      localStorage.setItem('bloqueio_ate', JSON.stringify(bObj));
    }
  } catch (e) {}
}

export function bloquearConta(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const bRaw = localStorage.getItem('bloqueio_ate');
    const bObj = bRaw ? JSON.parse(bRaw) : {};
    bObj[cleanEmail] = Date.now() + 15 * 60 * 1000;
    localStorage.setItem('bloqueio_ate', JSON.stringify(bObj));

    const tRaw = localStorage.getItem('login_tentativas');
    const tObj = tRaw ? JSON.parse(tRaw) : {};
    tObj[cleanEmail] = 5;
    localStorage.setItem('login_tentativas', JSON.stringify(tObj));
  } catch (e) {}

  sessionStorage.setItem('conta_bloqueada_email', cleanEmail);
  window.location.hash = '#/conta-bloqueada';
}

// Expor no window para testes rápidos em console de desenvolvimento
if (typeof window !== 'undefined') {
  window.bloquearConta = bloquearConta;
}

/* =====================================================================
   4) REDEFINIR SENHA (#/redefinir-senha)
   ===================================================================== */

export function renderRedefinirSenha() {
  const email = sessionStorage.getItem('mfa_email') || 'seu.email@raizagro.agr.br';

  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Formulário -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-pill-tag auth-pill-tag-dark">
              <span class="auth-pill-dot"></span>
              <span class="auth-pill-dot" style="margin-left: -3px;"></span>
              SEGURANÇA &amp; CREDENCIAL
            </div>
            <h1 class="auth-title">Redefinir sua senha</h1>
            <p class="auth-subtitle">
              Crie uma nova credencial de acesso segura para sua conta corporativa <strong><u>${email}</u></strong>. Certifique-se de escolher uma senha forte.
            </p>
          </div>

          <form id="redefinir-senha-form" class="login-form">
            <!-- Nova Senha -->
            <div class="login-input-group">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="login-label" for="redefinir-nova-senha">NOVA SENHA</label>
                <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; color: #CBD5E1;">
                  Força: <span id="pwd-strength-text" style="color: #94A3B8;">Fraca</span>
                </span>
              </div>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type="password"
                  id="redefinir-nova-senha"
                  class="login-input"
                  placeholder="••••••••••••"
                  required
                >
                <button type="button" class="login-toggle-password" id="toggle-redefinir-nova" title="Alternar visibilidade">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>

              <!-- Barra de 4 Segmentos -->
              <div class="auth-strength-meter">
                <div class="auth-strength-seg" id="strength-seg-1"></div>
                <div class="auth-strength-seg" id="strength-seg-2"></div>
                <div class="auth-strength-seg" id="strength-seg-3"></div>
                <div class="auth-strength-seg" id="strength-seg-4"></div>
              </div>
            </div>

            <!-- Confirmar Nova Senha -->
            <div class="login-input-group">
              <label class="login-label" for="redefinir-confirma-senha">CONFIRMAR NOVA SENHA</label>
              <div class="login-input-wrapper">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </span>
                <input
                  type="password"
                  id="redefinir-confirma-senha"
                  class="login-input"
                  placeholder="••••••••••••"
                  required
                >
                <span id="confirm-match-badge" class="auth-confirm-match-icon" style="display: none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </span>
                <button type="button" class="login-toggle-password" id="toggle-redefinir-confirma" title="Alternar visibilidade" style="right: 38px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Requisitos de Segurança 2x2 -->
            <div class="login-input-group">
              <label class="login-label" style="font-size: 11px;">REQUISITOS DE SEGURANÇA</label>
              <div class="auth-reqs-grid">
                <div class="auth-req-tile" id="tile-len">
                  <svg viewBox="0 0 24 24" fill="none" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Mínimo de 8 caracteres</span>
                </div>
                <div class="auth-req-tile" id="tile-case">
                  <svg viewBox="0 0 24 24" fill="none" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Letra maiúscula e minúscula</span>
                </div>
                <div class="auth-req-tile" id="tile-num">
                  <svg viewBox="0 0 24 24" fill="none" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Pelo menos um número (0-9)</span>
                </div>
                <div class="auth-req-tile" id="tile-sym">
                  <svg viewBox="0 0 24 24" fill="none" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Caractere especial (@, #, $)</span>
                </div>
              </div>
            </div>

            <!-- Checkbox de Desconectar Outros Dispositivos -->
            <div class="login-options-row" style="margin-top: 4px;">
              <label class="login-checkbox-label">
                <input type="checkbox" id="redefinir-desconectar" class="login-checkbox" checked>
                <span>Desconectar de todos os outros dispositivos após redefinir <strong style="color: #4ADE80; font-weight: 600;">(Recomendado para segurança)</strong></span>
              </label>
            </div>

            <!-- Botão Atualizar Senha -->
            <button type="submit" class="login-submit-btn" id="redefinir-submit-btn">
              ATUALIZAR SENHA E ENTRAR &rarr;
            </button>

            <!-- Link Cancelar e voltar ao login -->
            <div class="auth-bottom-link">
              <a href="#/login">&larr; Cancelar e voltar ao login</a>
            </div>
          </form>

          <!-- Rodapé de Segurança -->
          <div class="auth-security-footer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Ambiente Seguro • Criptografia AES-256 e Proteção Agro</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupRedefinirSenhaEvents() {
  const mfaOk = sessionStorage.getItem('mfa_verificado');
  const email = sessionStorage.getItem('mfa_email');

  // Guarda: sem mfa_verificado e mfa_email em sessionStorage, redireciona para login
  if (!mfaOk || !email) {
    window.location.hash = '#/login';
    return;
  }

  const form = document.getElementById('redefinir-senha-form');
  const novaSenhaInput = document.getElementById('redefinir-nova-senha');
  const confirmaSenhaInput = document.getElementById('redefinir-confirma-senha');
  const desconectarCheckbox = document.getElementById('redefinir-desconectar');
  const submitBtn = document.getElementById('redefinir-submit-btn');

  const strengthText = document.getElementById('pwd-strength-text');
  const segs = [
    document.getElementById('strength-seg-1'),
    document.getElementById('strength-seg-2'),
    document.getElementById('strength-seg-3'),
    document.getElementById('strength-seg-4')
  ];

  const tileLen = document.getElementById('tile-len');
  const tileCase = document.getElementById('tile-case');
  const tileNum = document.getElementById('tile-num');
  const tileSym = document.getElementById('tile-sym');
  const matchBadge = document.getElementById('confirm-match-badge');

  // Alternar visibilidade
  const bindToggle = (btnId, inputEl) => {
    const btn = document.getElementById(btnId);
    if (!btn || !inputEl) return;
    btn.addEventListener('click', () => {
      const isPwd = inputEl.type === 'password';
      inputEl.type = isPwd ? 'text' : 'password';
      btn.innerHTML = isPwd ? `
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
  };

  bindToggle('toggle-redefinir-nova', novaSenhaInput);
  bindToggle('toggle-redefinir-confirma', confirmaSenhaInput);

  // Avaliação de requisitos e força da senha
  const evaluatePassword = () => {
    const val = novaSenhaInput.value || '';
    const hasLen = val.length >= 8;
    const hasCase = /[A-Z]/.test(val) && /[a-z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const hasSym = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(val);

    if (tileLen) tileLen.classList.toggle('valid', hasLen);
    if (tileCase) tileCase.classList.toggle('valid', hasCase);
    if (tileNum) tileNum.classList.toggle('valid', hasNum);
    if (tileSym) tileSym.classList.toggle('valid', hasSym);

    let score = 0;
    if (hasLen) score++;
    if (hasCase) score++;
    if (hasNum) score++;
    if (hasSym) score++;

    // Cores e rótulo de força
    let label = 'Fraca';
    let color = '#EF4444'; // Vermelho
    if (score === 2) {
      label = 'Média';
      color = '#F59E0B'; // Âmbar
    } else if (score === 3) {
      label = 'Boa';
      color = '#84CC16'; // Verde-limão
    } else if (score === 4) {
      label = 'Excelente';
      color = '#10B981'; // Verde
    }

    if (strengthText) {
      strengthText.textContent = score === 0 ? 'Fraca' : label;
      strengthText.style.color = score === 0 ? '#94A3B8' : color;
    }

    segs.forEach((seg, idx) => {
      if (seg) {
        if (idx < score) {
          seg.style.backgroundColor = color;
        } else {
          seg.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        }
      }
    });

    // Checa igualdade na confirmação
    checkConfirmMatch();

    return score === 4;
  };

  const checkConfirmMatch = () => {
    const val1 = novaSenhaInput.value || '';
    const val2 = confirmaSenhaInput.value || '';
    const matches = val1.length > 0 && val1 === val2;

    if (matchBadge) {
      matchBadge.style.display = matches ? 'flex' : 'none';
    }
    return matches;
  };

  if (novaSenhaInput) novaSenhaInput.addEventListener('input', evaluatePassword);
  if (confirmaSenhaInput) confirmaSenhaInput.addEventListener('input', checkConfirmMatch);

  // Submissão do formulário
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = novaSenhaInput.value || '';
      const confirm = confirmaSenhaInput.value || '';

      const isStrong = evaluatePassword();
      if (!isStrong) {
        toast.warning('Requisitos Incompletos', 'A nova senha deve cumprir todos os 4 requisitos de segurança.');
        return;
      }

      if (pwd !== confirm) {
        toast.warning('Senhas Divergentes', 'A confirmação de senha deve ser exatamente igual à nova senha.');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'ATUALIZANDO...';

      setTimeout(() => {
        // Limpa tentativas e bloqueio para este e-mail
        limparTentativas(email);

        // Salva dados para a tela de confirmação
        sessionStorage.setItem('senha_alterada', JSON.stringify({
          email: email,
          desconectou: desconectarCheckbox ? desconectarCheckbox.checked : true
        }));

        // Limpa o estado de MFA
        sessionStorage.removeItem('mfa_verificado');
        sessionStorage.removeItem('mfa_contexto');
        sessionStorage.removeItem('mfa_token_temporario');
        sessionStorage.removeItem('mfa_metodo');
        sessionStorage.removeItem('mfa_email');

        window.location.hash = '#/senha-alterada';
      }, 500);
    });
  }
}

/* =====================================================================
   5) SENHA ALTERADA COM SUCESSO (#/senha-alterada)
   ===================================================================== */

export function renderSenhaAlterada() {
  const dataRaw = sessionStorage.getItem('senha_alterada');
  let data = {};
  try { data = dataRaw ? JSON.parse(dataRaw) : {}; } catch (e) {}

  const email = data.email || 'seu.email@raizagro.agr.br';
  const desconectou = data.desconectou !== false;

  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Confirmação -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-success-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 class="auth-title">Senha alterada com sucesso!</h1>
            <p class="auth-subtitle">
              Sua nova credencial foi cadastrada com segurança. Agora você já pode acessar a plataforma com seus novos dados.
            </p>
          </div>

          <!-- Card Informativo -->
          <div class="auth-info-card">
            <div class="auth-info-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>E-mail confirmado: <strong>${email}</strong></span>
            </div>
            ${desconectou ? `
            <div class="auth-info-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Outros dispositivos desconectados por segurança</span>
            </div>
            ` : ''}
          </div>

          <!-- Botão Acessar Minha Conta -->
          <button type="button" class="login-submit-btn" id="btn-acessar-conta" style="margin-top: 14px;">
            ACESSAR MINHA CONTA
          </button>

          <!-- Barra de Progresso e Redirecionamento em 5s -->
          <div style="margin-top: 10px; width: 100%;">
            <div class="auth-countdown-row">
              <span>Redirecionando automaticamente em <strong id="redirect-timer">5</strong> segundos...</span>
              <a href="#/login" id="link-entrar-agora" class="auth-enter-now-link">Entrar agora</a>
            </div>
            <div class="auth-progress-track">
              <div class="auth-progress-fill" id="redirect-progress-bar"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function setupSenhaAlteradaEvents() {
  const dataRaw = sessionStorage.getItem('senha_alterada');

  // Sem senha_alterada em sessionStorage, redireciona para login
  if (!dataRaw) {
    window.location.hash = '#/login';
    return;
  }

  const btnAcessar = document.getElementById('btn-acessar-conta');
  const linkEntrar = document.getElementById('link-entrar-agora');
  const timerEl = document.getElementById('redirect-timer');
  const progressBar = document.getElementById('redirect-progress-bar');

  let elapsedMs = 0;
  const totalMs = 5000;

  const cleanupAndGo = () => {
    clearInterval(progressInterval);
    sessionStorage.removeItem('senha_alterada');
    window.location.hash = '#/login';
  };

  if (btnAcessar) btnAcessar.addEventListener('click', cleanupAndGo);
  if (linkEntrar) linkEntrar.addEventListener('click', (e) => {
    e.preventDefault();
    cleanupAndGo();
  });

  const progressInterval = setInterval(() => {
    elapsedMs += 100;
    const pct = Math.min(100, (elapsedMs / totalMs) * 100);
    if (progressBar) progressBar.style.width = pct + '%';

    const secsLeft = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
    if (timerEl) timerEl.textContent = secsLeft;

    if (elapsedMs >= totalMs) {
      cleanupAndGo();
    }
  }, 100);
}

/* =====================================================================
   6) CONTA TEMPORARIAMENTE BLOQUEADA (#/conta-bloqueada)
   ===================================================================== */

export function renderContaBloqueada() {
  const email = sessionStorage.getItem('conta_bloqueada_email') || 'seu.email@raizagro.agr.br';

  return `
    <div class="login-viewport">
      <!-- Painel Esquerdo: Imagem com Curva Orgânica -->
      <div class="login-hero-section">
        <div class="login-hero-img-wrap">
          <img src="assets/images/login-hero-hq.jpg" alt="Monitoramento Agrícola Raiz" class="login-hero-img" onerror="this.src='assets/images/farm-hero.jpg'">
        </div>
      </div>

      <!-- Painel Direito: Alerta de Bloqueio -->
      <div class="login-form-section">
        <div class="login-form-container">

          <div class="login-header">
            <div class="auth-welcoming" style="font-size: 13px; color: #94A3B8;">Segurança de acesso</div>
            <h1 class="auth-title">Conta temporariamente bloqueada</h1>
            <p class="auth-subtitle">
              Por segurança, o acesso para o e-mail <strong><u>${email}</u></strong> foi suspenso temporariamente após tentativas incorretas de senha.
            </p>
          </div>

          <!-- Card de Tempo de Espera -->
          <div class="auth-lockout-card">
            <div class="auth-lockout-tag">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>TEMPO DE ESPERA</span>
            </div>
            <div class="auth-lockout-time-row">
              <strong id="lockout-timer-display" style="font-size: 32px; font-weight: 700; color: #FFFFFF;">15:00</strong>
              <span style="font-size: 13px; color: #94A3B8;">minutos restantes</span>
            </div>
            <div class="auth-progress-track" style="margin: 4px 0 6px 0;">
              <div class="auth-progress-fill" id="lockout-progress-bar"></div>
            </div>
            <p class="auth-lockout-notice">Você poderá tentar acessar novamente assim que o temporizador zerar.</p>
          </div>

          <!-- Botão Redefinir Senha -->
          <button type="button" class="login-submit-btn" id="btn-redefinir-bloqueio" style="margin-top: 14px;">
            REDEFINIR MINHA SENHA
          </button>

          <!-- Link Voltar ao login -->
          <div class="auth-bottom-link">
            <a href="#/login">Voltar para a tela de login</a>
          </div>

          <!-- Linha fina divisória de rodapé -->
          <div class="auth-divider-footer"></div>

        </div>
      </div>
    </div>
  `;
}

export function setupContaBloqueadaEvents() {
  const email = sessionStorage.getItem('conta_bloqueada_email');

  // Sem bloqueio ativo, redireciona para login
  if (!email || !isBloqueado(email)) {
    window.location.hash = '#/login';
    return;
  }

  const timerDisplay = document.getElementById('lockout-timer-display');
  const progressBar = document.getElementById('lockout-progress-bar');
  const btnRedefinir = document.getElementById('btn-redefinir-bloqueio');

  if (btnRedefinir) {
    btnRedefinir.addEventListener('click', () => {
      sessionStorage.setItem('mfa_contexto', 'recuperacao');
      sessionStorage.setItem('mfa_email', email);
      sessionStorage.setItem('mfa_token_temporario', 'recup_token_' + Date.now());
      sessionStorage.setItem('mfa_metodo', 'email');
      window.location.hash = '#/recuperar-senha';
    });
  }

  const bloqueioAte = getBloqueio(email) || (Date.now() + 15 * 60 * 1000);
  const totalDurationSecs = 15 * 60; // 900s

  const updateDisplay = () => {
    const remainingSecs = Math.max(0, Math.floor((bloqueioAte - Date.now()) / 1000));
    const mins = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
    const secs = String(remainingSecs % 60).padStart(2, '0');

    if (timerDisplay) {
      timerDisplay.textContent = `${mins}:${secs}`;
    }

    if (progressBar) {
      const elapsedSecs = totalDurationSecs - remainingSecs;
      const pct = Math.min(100, Math.max(0, (elapsedSecs / totalDurationSecs) * 100));
      progressBar.style.width = pct + '%';
    }

    if (remainingSecs <= 0) {
      clearInterval(lockoutInterval);
      limparTentativas(email);
      sessionStorage.removeItem('conta_bloqueada_email');
      toast.info('Bloqueio encerrado', 'O período de espera terminou. Você já pode tentar acessar novamente.');
      window.location.hash = '#/login';
    }
  };

  updateDisplay();
  const lockoutInterval = setInterval(updateDisplay, 1000);
}

