/**
 * VIEW: GESTÃO DE USUÁRIOS E PERFIS (RBAC)
 */

import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderUsuarios() {
  const usuarios = [
    { id: 1, nome: 'Carlos Gestor Agro', email: 'gestao@frutas.agro.br', perfil: 'Produtor/Exportador', status: 'ativo' },
    { id: 2, nome: 'Ana Paula Analista', email: 'ana.dados@agro.br', perfil: 'Analista de Dados', status: 'ativo' },
    { id: 3, nome: 'Marcos Administrador', email: 'admin@frutas.agro.br', perfil: 'Administrador', status: 'ativo' }
  ];

  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Controle de Usuários & Acessos (RBAC)</h2>
          <p style="color: #94A3B8; font-size: 14px;">Gerenciamento de credenciais, perfis de permissão e autenticação em dois fatores.</p>
        </div>

        <button class="btn btn-primary" id="btn-novo-usuario">
          <i data-lucide="user-plus"></i>
          <span>Novo Usuário</span>
        </button>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <h3 class="card-title">Usuários Cadastrados</h3>
          <span style="font-size: 13px; color: #94A3B8;">Total: <strong>${usuarios.length}</strong></span>
        </div>

        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>E-mail</th>
                <th>Perfil de Acesso</th>
                <th>MFA / 2FA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${usuarios.map(u => `
                <tr>
                  <td><strong>${u.nome}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge badge-info">${u.perfil}</span></td>
                  <td><span class="badge badge-success"><span class="badge-dot"></span>Habilitado (E-mail)</span></td>
                  <td>
                    <span class="badge ${u.status === 'ativo' ? 'badge-success' : 'badge-danger'}">
                      <span class="badge-dot"></span>${u.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function setupUsuariosEvents() {
  const btn = document.getElementById('btn-novo-usuario');
  if (btn) {
    btn.addEventListener('click', () => {
      Modal.open(
        'Cadastrar Novo Usuário',
        `
          <form id="form-novo-usuario" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group">
              <label class="form-label">Nome Completo</label>
              <input type="text" id="modal-user-nome" class="form-control" placeholder="Ex: Roberto Lima" required>
            </div>
            <div class="form-group">
              <label class="form-label">E-mail Corporativo</label>
              <input type="email" id="modal-user-email" class="form-control" placeholder="Ex: roberto@frutas.agro.br" required>
            </div>
            <div class="form-group">
              <label class="form-label">Perfil de Acesso</label>
              <select id="modal-user-perfil" class="form-control">
                <option value="Produtor/Exportador">Produtor/Exportador</option>
                <option value="Analista de Dados">Analista de Dados</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
          </form>
        `,
        async (modalElement) => {
          const nome = modalElement.querySelector('#modal-user-nome').value.trim();
          const email = modalElement.querySelector('#modal-user-email').value.trim();

          if (!nome || !email) {
            toast.warning('Atenção', 'Preencha o nome e o e-mail.');
            return false;
          }

          toast.success('Usuário Criado', 'Convite e instruções de 2FA enviados por e-mail.');
          return true;
        },
        'Cadastrar'
      );
    });
  }
}

