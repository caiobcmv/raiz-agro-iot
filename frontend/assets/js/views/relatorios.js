/**
 * VIEW: RELATÓRIOS & AUDITORIA DE ACESSO
 */

import { toast } from '../components/toast.js';

export async function renderRelatorios() {
  const logs = [
    { id: 1, usuario: 'Carlos Gestor', acao: 'login_ok', ip: '192.168.1.45', data: '2026-11-02 14:28:10', resultado: 'sucesso' },
    { id: 2, usuario: 'Carlos Gestor', acao: 'login_senha_ok_codigo_enviado', ip: '192.168.1.45', data: '2026-11-02 14:27:55', resultado: 'sucesso' },
    { id: 3, usuario: 'Sensor ESP32', acao: 'leitura_climatica_ingestao', ip: '187.54.12.90', data: '2026-11-02 14:25:00', resultado: 'sucesso' },
    { id: 4, usuario: 'Admin Sistema', acao: 'sensor_update_config', ip: '10.0.0.12', data: '2026-11-02 11:15:22', resultado: 'sucesso' },
    { id: 5, usuario: 'Desconhecido', acao: 'login_falha', ip: '201.88.42.10', data: '2026-11-02 09:40:12', resultado: 'falha' }
  ];

  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Relatórios & Trilha de Auditoria</h2>
          <p style="color: #94A3B8; font-size: 14px;">Geração de laudos de conformidade pós-colheita e log de segurança (RNF09).</p>
        </div>

        <button class="btn btn-primary" id="btn-gerar-relatorio">
          <i data-lucide="file-plus"></i>
          <span>Gerar Laudo de Conformidade</span>
        </button>
      </div>

      <!-- Tabela de Auditoria de Acesso -->
      <div class="table-container">
        <div class="table-toolbar">
          <h3 class="card-title">Registros de Auditoria (log_acesso)</h3>
          <span style="font-size: 13px; color: #94A3B8;">Eventos recentes</span>
        </div>

        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Usuário / Origem</th>
                <th>Ação Executada</th>
                <th>Endereço IP</th>
                <th>Data e Hora</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td><strong>${l.usuario}</strong></td>
                  <td><code style="color: #86EFAC;">${l.acao}</code></td>
                  <td>${l.ip}</td>
                  <td>${l.data}</td>
                  <td>
                    <span class="badge ${l.resultado === 'sucesso' ? 'badge-success' : 'badge-danger'}">
                      <span class="badge-dot"></span>${l.resultado}
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

export function setupRelatoriosEvents() {
  const btn = document.getElementById('btn-gerar-relatorio');
  if (btn) {
    btn.addEventListener('click', () => {
      toast.success('Relatório Gerado', 'O Laudo de Certificação Fitossanitária e Cadeia Fria foi emitido.');
    });
  }
}

