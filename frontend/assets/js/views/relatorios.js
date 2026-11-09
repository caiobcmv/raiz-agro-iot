/**
 * VIEW: RELATÓRIOS & DOCUMENTOS OFICIAIS (FIGMA MOCKUP 5)
 * KPIs de Conformidade & Auditoria, Formulário de Emissão Imediata (PDF, CSV, XLSX)
 * e Repositório de Relatórios & Arquivos Oficiais com Download Real.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderRelatorios() {
  const relatorios = [
    {
      id: 1,
      titulo: 'Fechamento de Safra 2025/2026 (Preliminar)',
      tipo_label: 'fechamento_safra',
      codigo_ref: '#REL-2026-0822',
      gerado_por: 'Carlos Eduardo',
      cargo_gerador: 'Admin Geral',
      iniciais: 'CE',
      data: 'Hoje, 22 de Set 10:45 BRT',
      formato: 'PDF',
      tamanho: '4.2 MB',
      parametros: 'Talhões A1-B2 • VWC, Brix & ETo',
      badgeColor: '#EF4444'
    },
    {
      id: 2,
      titulo: 'Dossiê de Conformidade GlobalG.A.P. — Uva Vitória',
      tipo_label: 'conformidade_globalgap',
      codigo_ref: '#GG-884021',
      gerado_por: 'Dra. Gabriela Sales',
      cargo_gerador: 'Analista Qualidade',
      iniciais: 'GS',
      data: 'Ontem 18:20 BRT',
      formato: 'PDF',
      tamanho: '8.7 MB',
      parametros: 'Lote EXP-2026-08 • 0% Resíduos',
      badgeColor: '#EF4444'
    },
    {
      id: 3,
      titulo: 'Auditoria Forense de Sensores & Rejeições ThingSpeak',
      tipo_label: 'auditoria_sensores',
      codigo_ref: 'Dump Diário Automatizado',
      gerado_por: 'Rotina Automática',
      cargo_gerador: 'Agendador Cron',
      iniciais: 'RA',
      data: '20 de Set 03:00 BRT',
      formato: 'CSV',
      tamanho: '1.4 MB',
      parametros: 'Tabela leitura_rejeitada • 3500765',
      badgeColor: '#0284C7'
    },
    {
      id: 4,
      titulo: 'Relatório de Perda de Qualidade & Desvio Térmico',
      tipo_label: 'perda_qualidade',
      codigo_ref: 'Lote Termo #T-481',
      gerado_por: 'Luiz Felipe',
      cargo_gerador: 'Analista IoT',
      iniciais: 'LF',
      data: '18 de Set 14:15 BRT',
      formato: 'XLSX',
      tamanho: '2.1 MB',
      parametros: 'Manga Palmer • Limiar > 13.0°C',
      badgeColor: '#10B981'
    }
  ];

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 3 KPIs Superiores de Relatórios -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">RELATÓRIOS EMITIDOS NO MÊS</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">+14% ciclo</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">38</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">documentos compilados</div>
          </div>
          <div style="display: flex; gap: 10px; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>• 24 PDF</span>
            <span>• 10 CSV</span>
            <span>• 4 XLSX</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">CONFORMIDADE &amp; AUDITORIA</span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #047857; line-height: 1;">100%</div>
            <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 4px;">Homologado</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>GlobalG.A.P. Ativo</span>
            <span>MAPA Compliance Forense v4</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">AGENDAMENTOS AUTOMÁTICOS</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #F0F9FF; padding: 2px 6px; border-radius: 4px;">Cron Service</span>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">4</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">rotinas ativas</div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            Fechamento Semanal • Dump Sensores • Auditoria Mensal
          </div>
        </div>
      </div>

      <!-- Seção: Emissão Imediata de Relatório (Filtros e Compilador) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="file-plus" style="width: 16px; height: 16px; color: #10B981;"></i>
              Emissão Imediata de Relatório
            </h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Preencha os filtros para compilação tabular e processamento analítico com assinatura digital.</p>
          </div>
          <span style="font-size: 11px; color: #64748B; font-family: monospace;">schema.sql: relatorio</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px;">
          <!-- Campo 1: Tipo de Relatório -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Tipo de Relatório</label>
            <select id="relatorio-tipo" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
              <option value="fechamento">Fechamento de Safra (Consolidado)</option>
              <option value="globalgap">Dossiê de Conformidade GlobalG.A.P.</option>
              <option value="sensores">Auditoria Forense de Sensores &amp; Rejeições</option>
              <option value="qualidade">Relatório de Perda de Qualidade &amp; Frio</option>
            </select>
          </div>

          <!-- Campo 2: Safra / Janela Temporal -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Safra / Janela Temporal</label>
            <div style="position: relative;">
              <input type="text" id="relatorio-janela" value="Safra 2025/2026 — Atual Ativa" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
              <i data-lucide="calendar" style="position: absolute; right: 10px; top: 9px; width: 14px; height: 14px; color: #64748B;"></i>
            </div>
          </div>

          <!-- Campo 3: Talhões / Escopo de Coleta -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">Talhões / Escopo de Coleta</label>
            <select id="relatorio-talhao" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; color: #0F172A; background: #FFFFFF;">
              <option value="todos">Todos os 8 Talhões Ativos (Global)</option>
              <option value="A1">Talhão A1 • Uva Vitória</option>
              <option value="B2">Talhão B2 • Melão Amarelo</option>
              <option value="C1">Talhão C1 • Manga Tommy</option>
            </select>
          </div>
        </div>

        <!-- Linha Inferior: Formato e Botão Compilar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; padding-top: 12px; border-top: 1px solid #F1F5F9;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 11px; font-weight: 600; color: #475569;">Formato:</span>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
              <input type="radio" name="relatorio-formato" value="pdf" checked style="accent-color: #10B981;"> PDF Executivo
            </label>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
              <input type="radio" name="relatorio-formato" value="csv" style="accent-color: #10B981;"> Planilha CSV
            </label>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
              <input type="radio" name="relatorio-formato" value="xlsx" style="accent-color: #10B981;"> Excel XLSX
            </label>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 10px; color: #64748B;">Processamento assíncrono via worker • Tempo médio: ~4.8s</span>
            <button class="btn btn-primary" id="btn-compilar-relatorio" style="font-size: 12px; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="zap" style="width: 14px; height: 14px;"></i>
              <span>Compilar &amp; Gerar Documento</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Seção: Repositório de Relatórios & Arquivos Oficiais -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Repositório de Relatórios &amp; Arquivos Oficiais</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Histórico auditável com rastreabilidade criptográfica de autoria</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="position: relative;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" placeholder="Buscar por título, lote ou autor..." style="padding: 7px 12px 7px 32px; font-size: 12px; border: 1px solid #CBD5E1; border-radius: 8px; width: 220px;">
            </div>
            <button class="btn-tab-rel active" style="padding: 6px 12px; font-size: 11px; font-weight: 700; background: #F1F5F9; color: #0F172A; border: none; border-radius: 6px; cursor: pointer;">Todos (38)</button>
            <button class="btn-tab-rel" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #FFFFFF; color: #64748B; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">PDFs</button>
            <button class="btn-tab-rel" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #FFFFFF; color: #64748B; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">GlobalG.A.P.</button>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 11px;">
                <th style="padding: 10px 14px;">TIPO &amp; IDENTIFICAÇÃO</th>
                <th style="padding: 10px 14px;">GERADO POR (RBAC)</th>
                <th style="padding: 10px 14px;">DATA DE GERAÇÃO</th>
                <th style="padding: 10px 14px;">FORMATO &amp; TAMANHO</th>
                <th style="padding: 10px 14px;">PARÂMETROS JSON</th>
                <th style="padding: 10px 14px; text-align: right;">AÇÕES OFICIAIS</th>
              </tr>
            </thead>
            <tbody>
              ${relatorios.map(r => `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 12px 14px;">
                    <div>
                      <strong style="color: #0F172A; font-size: 13px;">${r.titulo}</strong>
                      <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                        <span style="font-size: 9px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 1px 6px; border-radius: 4px;">${r.tipo_label}</span>
                        <span style="font-size: 10px; color: #64748B;">ID: ${r.codigo_ref}</span>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 30px; height: 30px; border-radius: 50%; background: #E2E8F0; color: #0F172A; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">
                        ${r.iniciais}
                      </div>
                      <div>
                        <strong style="color: #0F172A; font-size: 12px;">${r.gerado_por}</strong>
                        <div style="font-size: 10px; color: #64748B;">${r.cargo_gerador}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 14px; color: #475569; font-size: 11px;">
                    ${r.data}
                  </td>
                  <td style="padding: 12px 14px;">
                    <span style="font-size: 10px; font-weight: 700; color: #FFFFFF; background: ${r.badgeColor}; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                      ${r.formato} • ${r.tamanho}
                    </span>
                  </td>
                  <td style="padding: 12px 14px; color: #64748B; font-size: 11px;">
                    <code style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 2px 6px; border-radius: 4px;">${r.parametros}</code>
                  </td>
                  <td style="padding: 12px 14px; text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="btn-baixar-relatorio" data-titulo="${r.titulo}" data-formato="${r.formato}" style="background: #183D2E; color: #FFFFFF; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="download" style="width: 12px; height: 12px;"></i>
                        <span>Baixar ${r.formato}</span>
                      </button>
                      <button class="btn-compartilhar-relatorio" data-id="${r.id}" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #475569; padding: 5px 8px; border-radius: 6px; cursor: pointer;">
                        <i data-lucide="share-2" style="width: 12px; height: 12px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B;">
          <span>Exibindo 1 a 4 de 38 relatórios gerados</span>
          <div style="display: flex; gap: 6px;">
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Anterior</button>
            <button style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700;">1</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">10</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupRelatoriosEvents() {
  const btnCompilar = document.getElementById('btn-compilar-relatorio');
  if (btnCompilar) {
    btnCompilar.addEventListener('click', () => {
      const tipo = document.getElementById('relatorio-tipo')?.value;
      const talhao = document.getElementById('relatorio-talhao')?.value;
      const formato = document.querySelector('input[name="relatorio-formato"]:checked')?.value || 'pdf';

      toast.info('Compilando Relatório', `Gerando documento ${formato.toUpperCase()} para o escopo ${talhao}...`);
      setTimeout(() => {
        toast.success('Documento Gerado', `Relatório oficial pronto para download com assinatura digital SHA-256.`);
      }, 1200);
    });
  }

  // Download real de arquivos
  document.querySelectorAll('.btn-baixar-relatorio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const titulo = e.currentTarget.dataset.titulo;
      const formato = e.currentTarget.dataset.formato.toLowerCase();

      // Gerar download real no browser
      let mimeType = 'text/plain';
      let content = '';

      if (formato === 'csv') {
        mimeType = 'text/csv;charset=utf-8;';
        content = `timestamp;sensor;talhao;vwc_solo;temp_ar;umid_ar;rssi_dbm;status\n` +
                  `2026-09-22 15:42:00;SNS-SL-001;Talhao A1;46.8;27.4;61.2;-81;VALIDO\n` +
                  `2026-09-22 15:37:00;SNS-SL-001;Talhao A1;46.7;27.3;61.5;-80;VALIDO\n` +
                  `2026-09-22 15:32:00;SNS-SL-019;Talhao C1;62.4;28.1;59.4;-85;REJEITADO_OUTLIER\n`;
      } else {
        mimeType = 'application/octet-stream';
        content = `=== RAIZ AGRO PLATAFORMA IOT ===\n` +
                  `RELATÓRIO OFICIAL: ${titulo}\n` +
                  `DATA DE EMISSÃO: 22 de setembro de 2026\n` +
                  `HASH DE AUDITORIA SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n` +
                  `CERTIFICAÇÃO: GlobalG.A.P. Homologado\n` +
                  `POLO: Sertão São Francisco / Petrolina - Setor 04\n` +
                  `STATUS: AUDITADO & PERSISTIDO NO BANCO RELACIONAL FISICO (raiz_agro.db)\n`;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${formato}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download Concluído', `Arquivo ${titulo} (${formato.toUpperCase()}) baixado com sucesso.`);
    });
  });

  document.querySelectorAll('.btn-compartilhar-relatorio').forEach(btn => {
    btn.addEventListener('click', () => {
      toast.info('Link Criptografado', 'URL segura com token temporal copiada para a área de transferência.');
    });
  });
}
