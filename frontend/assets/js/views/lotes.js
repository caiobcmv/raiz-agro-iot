/**
 * VIEW: GESTÃO DE LOTES AGRÍCOLAS
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderLotes() {
  const lotes = await api.getLotes();

  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Lotes de Frutas & Rastreabilidade</h2>
          <p style="color: #94A3B8; font-size: 14px;">Controle de lotes colhidos, armazenamento em câmara fria e despacho para exportação.</p>
        </div>

        <button class="btn btn-primary" id="btn-novo-lote">
          <i data-lucide="plus"></i>
          <span>Cadastrar Lote</span>
        </button>
      </div>

      <!-- Grid de Cartões de Lotes -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${lotes.map(l => `
          <div class="kpi-card" style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <span class="badge ${l.fruta === 'Manga' ? 'badge-warning' : (l.fruta === 'Uva' ? 'badge-info' : 'badge-success')}" style="font-size: 13px; font-weight: 700;">
                  ${l.fruta}
                </span>
                <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; color: #FFFFFF; margin-top: 6px;">
                  Lote #${l.id_lote}
                </h3>
              </div>
              <span class="badge ${l.selo === 'Atenção' ? 'badge-warning' : 'badge-success'}">
                <span class="badge-dot"></span>${l.selo || 'Saudável'}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin: 16px 0; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; color: #94A3B8;">
                <span>Volume / Quantidade:</span>
                <strong style="color: #FFFFFF;">${l.quantidade} ${l.unidade}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #94A3B8;">
                <span>Estágio Operacional:</span>
                <strong style="color: #4ADE80;">${l.status}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #94A3B8;">
                <span>Destino:</span>
                <strong style="color: #E2E8F0; text-align: right; max-width: 180px;">${l.destino || 'Não definido'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #94A3B8;">
                <span>Data da Colheita:</span>
                <strong style="color: #E2E8F0;">${l.data_colheita || 'Em cultivo'}</strong>
              </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: #64748B;">Etapa: ${l.etapa}</span>
              <a href="#/leituras" class="btn btn-secondary btn-sm">Telemetria</a>
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}

export function setupLotesEvents() {
  const btnNovo = document.getElementById('btn-novo-lote');
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      Modal.open(
        'Cadastrar Novo Lote de Frutas',
        `
          <form id="form-novo-lote" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group">
              <label class="form-label">Fruta</label>
              <select id="modal-lote-fruta" class="form-control">
                <option value="1">Manga (Tommy / Keitt / Palmer)</option>
                <option value="2">Uva (Crimson / Vitória / Thompson)</option>
                <option value="3">Melão (Amarelo / Cantaloupe)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Quantidade</label>
              <input type="number" id="modal-lote-qtd" class="form-control" placeholder="Ex: 2500" required>
            </div>
            <div class="form-group">
              <label class="form-label">Unidade de Medida</label>
              <select id="modal-lote-unidade" class="form-control">
                <option value="kg">Quilogramas (kg)</option>
                <option value="caixa">Caixas (cx)</option>
                <option value="t">Toneladas (t)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Destino do Lote</label>
              <input type="text" id="modal-lote-destino" class="form-control" placeholder="Ex: Porto de Pecém - CE (Exportação Holanda)" required>
            </div>
          </form>
        `,
        async (modalElement) => {
          const id_fruta = parseInt(modalElement.querySelector('#modal-lote-fruta').value);
          const quantidade = parseInt(modalElement.querySelector('#modal-lote-qtd').value);
          const unidade = modalElement.querySelector('#modal-lote-unidade').value;
          const destino = modalElement.querySelector('#modal-lote-destino').value.trim();

          if (!quantidade || !destino) {
            toast.warning('Atenção', 'Informe a quantidade e o destino do lote.');
            return false;
          }

          try {
            await api.createLote({
              id_fruta,
              quantidade,
              unidade,
              status: 'Em produção',
              destino
            });
            toast.success('Sucesso', 'Lote registrado com sucesso!');
            window.location.reload();
            return true;
          } catch (e) {
            toast.error('Erro', e.message);
            return false;
          }
        },
        'Criar Lote'
      );
    });
  }
}

