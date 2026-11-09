/**
 * VIEW: AUDITORIA & LOGS DO SISTEMA v4.2 (FIGMA MOCKUP ADM)
 * Trilha Criptográfica Imutável, Sincronização em Tempo Real (Syslog & PostgreSQL),
 * Hash SHA-256 Validado, 4 KPIs Superiores, Trilha de Eventos Auditados,
 * Painel Lateral de Conformidade & LGPD e Ações Rápidas de Auditoria.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderAuditoria() {
  const logs = [
    {
      id: 1,
      badge: 'DISPARO PROTOCOLO',
      badgeClass: 'badge-critico',
      codigo_ref: '#ALT-2026-084',
      lote: 'Lote #LT-2026-084',
      data: '22/09/2026 14:12:08',
      titulo: 'Disparo de Alerta Crítico #ALT-2026-084 — Desvio Térmico em Manga Tommy Atkins',
      origem: 'Regra Agronômica #R-04 • Local: Câmara Frigorífica 02',
      destino: 'SMS Emergência + Push Luiz Felipe',
      hash: 'sha256:a7f83b99120ce...9c1',
      assinatura: 'Assinatura Válida',
      btnAcao: 'Inspecionar Lote',
      btnPayload: 'Ver Payload Completo'
    },
    {
      id: 2,
      badge: 'LOGIN / ACESSO',
      badgeClass: 'badge-sucesso',
      codigo_ref: 'MFA TOTP Validado',
      lote: 'Petrolina/PE',
      data: '22/09/2026 13:45:20',
      titulo: 'Autenticação Bem-sucedida via MFA — Dra. Gabriela Sales (Analista Agronômica)',
      origem: 'IP: 187.54.210.12 • Navegador: Chrome 128 / macOS • Perfil: Analista Agronômico',
      destino: 'Status: Sessão Ativa (#SESS-8991)',
      hash: '',
      assinatura: '',
      btnAcao: '',
      btnPayload: 'Ver Detalhes da Sessão'
    },
    {
      id: 3,
      badge: 'ALTERAÇÃO DE PARÂMETRO',
      badgeClass: 'badge-info',
      codigo_ref: 'config_parametro',
      lote: 'Carlos Silva (Admin)',
      data: '22/09/2026 11:30:15',
      titulo: 'Edição de Limiar Fisiológico em Uva Vitória (Sem Semente)',
      origem: 'temp_min_segura: <span style="color:#DC2626; text-decoration:line-through;">-1.0°C</span> &rarr; <span style="color:#047857; font-weight:700;">-0.5°C</span>',
      destino: 'Justificativa: Homologação Embrapa Semiárido • Protocolo EMB-2026-V',
      hash: '',
      assinatura: '',
      btnAcao: 'Reverter Alteração',
      btnPayload: 'Ver Histórico'
    },
    {
      id: 4,
      badge: 'SANITIZAÇÃO IOT',
      badgeClass: 'badge-alerta',
      codigo_ref: 'leitura_rejeitada',
      lote: 'Sonda #SNS-SL-019',
      data: '22/09/2026 10:15:02',
      titulo: 'Descarte de Outlier Térmico — Sonda FDR Talhão C1 (Manga)',
      origem: 'Valor Detectado: 62.4°C (Teto físico de 55.0°C excedido) • Canal ThingSpeak: #3500765',
      destino: 'Ação: Isolamento preventivo de registro',
      hash: '',
      assinatura: '',
      btnAcao: 'Inspecionar Sonda',
      btnPayload: 'Log ThingSpeak'
    },
    {
      id: 5,
      badge: 'SEGURANÇA RBAC',
      badgeClass: 'badge-rbac',
      codigo_ref: 'Tabela usuario',
      lote: 'Ativado por Carlos Silva',
      data: '21/09/2026 17:40:00',
      titulo: 'Criação de Novo Operador de Campo — João Pedro (Irrigação)',
      origem: 'Perfil Concedido: Operador de Campo',
      destino: 'Permissões: Leitura em Talhões A1/B2 • Sem acesso a parâmetros',
      hash: '',
      assinatura: '',
      btnAcao: '',
      btnPayload: 'Ver Perfil RBAC'
    }
  ];

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- Sub-barra Técnica de Auditoria v4.2 -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 20px;">
            • v4.2 - Trilha Criptográfica Imutável
          </span>
          <span style="font-size: 11px; color: #64748B;">
            Ambiente de Produção • Petrolina / Juazeiro
          </span>
          <span style="font-size: 11px; color: #059669; font-weight: 600;">
            ✓ Sincronização em Tempo Real (Syslog &amp; PostgreSQL)
          </span>
          <span style="font-size: 11px; color: #0284C7; font-weight: 600;">
            ✓ Hash SHA-256 Validado
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; background: #F1F5F9; padding: 2px; border-radius: 8px; font-size: 11px;">
            <button class="btn-time-filter active" style="padding: 4px 10px; border: none; background: #FFFFFF; border-radius: 6px; font-weight: 700; color: #0F172A; cursor: pointer;">24 Horas</button>
            <button class="btn-time-filter" style="padding: 4px 10px; border: none; background: transparent; border-radius: 6px; color: #64748B; cursor: pointer;">7 Dias</button>
            <button class="btn-time-filter" style="padding: 4px 10px; border: none; background: transparent; border-radius: 6px; color: #64748B; cursor: pointer;">30 Dias</button>
          </div>
          <button class="btn btn-primary" id="btn-exportar-auditoria-csv" style="font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            <span>Exportar Relatório (CSV/PDF)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Superiores de Auditoria -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: TOTAL DE EVENTOS AUDITADOS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">TOTAL DE EVENTOS AUDITADOS (30D)</span>
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">99.9%</div>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">14.820</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Integridade de Logs</span>
            <strong style="color: #047857;">0 Corrompidos &lt; 45ms</strong>
          </div>
        </div>

        <!-- KPI 2: ACESSOS & SESSÕES -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">ACESSOS &amp; SESSÕES (LOG_ACESSO)</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">+4.2%</span>
          </div>
          <div style="margin: 10px 0; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">1.248</div>
            <div style="display: flex; gap: 3px; align-items: flex-end; height: 24px;">
              <span style="width: 4px; height: 12px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 4px; height: 18px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 4px; height: 24px; background: #10B981; border-radius: 2px;"></span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Autenticação Válida: <strong>1.240 (99.4%)</strong></span>
            <span style="color: #D97706;">8 Falhas Prevenidas</span>
          </div>
        </div>

        <!-- KPI 3: PROTOCOLOS & ALERTAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">PROTOCOLOS &amp; ALERTAS</span>
            <i data-lucide="bell" style="width: 14px; height: 14px; color: #10B981;"></i>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">142</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Ações Mitigadas: <strong>88% Automático</strong></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Canais Notificados</span>
            <strong>Push, SMS &amp; Webhook</strong>
          </div>
        </div>

        <!-- KPI 4: GOVERNANÇA & REGRAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">GOVERNANÇA &amp; REGRAS</span>
            <i data-lucide="shield" style="width: 14px; height: 14px; color: #0284C7;"></i>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">38 <span style="font-size: 13px; font-weight: 600; color: #64748B;">ações</span></div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Rastreabilidade Total: <strong>100% Auditável</strong></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span>Distribuição</span>
            <strong>22 Agron • 11 IoT • 5 RBAC</strong>
          </div>
        </div>
      </div>

      <!-- Barra de Categorias de Auditoria -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 18px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 11px;">
        <span style="font-weight: 700; color: #0284C7; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
          1. Acessos &amp; Sessões (log_acesso) • 1.248
        </span>
        <span style="font-weight: 600; color: #D97706; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #D97706;"></span>
          2. Disparos &amp; Protocolos • 142
        </span>
        <span style="font-weight: 600; color: #0F172A; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #0F172A;"></span>
          3. Parâmetros Agronômicos • 22
        </span>
        <span style="font-weight: 600; color: #8B5CF6; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6;"></span>
          4. Sanitização IoT (leitura_rejeitada) • 16
        </span>
        <span style="font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          5. Governança RBAC &amp; Senhas • 14
        </span>
      </div>

      <!-- Layout 2 Colunas: Feed de Logs (70%) + Painel de Conformidade e Ações Rápidas (30%) -->
      <div style="display: grid; grid-template-columns: 2.3fr 1fr; gap: 20px;">
        <!-- Coluna Esquerda: Feed de Logs de Auditoria -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="position: relative; flex: 1; max-width: 380px;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-log" placeholder="Filtrar por usuário, IP, entidade (ex: config_parametro), lote..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px;">
            </div>
            <div style="display: flex; gap: 6px; overflow-x: auto;">
              <button class="tab-filtro-log active" style="padding: 5px 10px; font-size: 10px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (14.820)</button>
              <button class="tab-filtro-log" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Acessos (1.248)</button>
              <button class="tab-filtro-log" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Disparos (142)</button>
              <button class="tab-filtro-log" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Agronomia (22)</button>
              <button class="tab-filtro-log" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Hardware (16)</button>
              <button class="tab-filtro-log" style="padding: 5px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Segurança (14)</button>
            </div>
          </div>

          <!-- Cards de Eventos Auditados -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${logs.map(l => `
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; ${
                      l.badge.includes('DISPARO') ? 'background: #FEE2E2; color: #DC2626;' :
                      l.badge.includes('LOGIN') ? 'background: #DCFCE7; color: #15803D;' :
                      l.badge.includes('ALTERAÇÃO') ? 'background: #E0F2FE; color: #0284C7;' :
                      l.badge.includes('SANITIZAÇÃO') ? 'background: #FEF3C7; color: #D97706;' :
                      'background: #F1F5F9; color: #0F172A;'
                    }">
                      ${l.badge}
                    </span>
                    <span style="font-size: 10px; font-weight: 600; color: #64748B;">${l.codigo_ref}</span>
                    <span style="font-size: 10px; color: #94A3B8;">${l.lote}</span>
                  </div>
                  <span style="font-size: 10px; color: #64748B;">${l.data}</span>
                </div>

                <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 4px 0 6px 0;">
                  ${l.titulo}
                </h4>

                <div style="font-size: 11px; color: #475569; line-height: 1.4; margin-bottom: 8px;">
                  <div>${l.origem}</div>
                  <div>${l.destino}</div>
                </div>

                ${l.hash ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; font-size: 10px; margin-bottom: 8px;">
                    <code style="color: #64748B;">Hash Criptográfico: ${l.hash}</code>
                    <span style="color: #047857; font-weight: 700;">${l.assinatura}</span>
                  </div>
                ` : ''}

                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding-top: 6px;">
                  ${l.btnPayload ? `
                    <button class="btn-log-action" data-id="${l.id}" data-action="payload" style="background: none; border: none; font-size: 11px; font-weight: 600; color: #0284C7; cursor: pointer;">
                      ${l.btnPayload}
                    </button>
                  ` : ''}
                  ${l.btnAcao ? `
                    <button class="btn-log-action" data-id="${l.id}" data-action="inspecionar" style="background: #183D2E; color: #FFFFFF; border: none; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer;">
                      ${l.btnAcao}
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Paginação -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B;">
            <span>Exibindo 1-5 de 14.820 registros</span>
            <div style="display: flex; gap: 6px;">
              <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Anterior</button>
              <button style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700;">1</button>
              <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
              <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
              <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo</button>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Conformidade & LGPD + Ações Rápidas -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Card: Conformidade & LGPD -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="shield-check" style="width: 16px; height: 16px; color: #10B981;"></i>
                Conformidade &amp; LGPD
              </h4>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">100% VÁLIDO</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px; color: #475569;">
              <div>
                <strong style="color: #0F172A; display: block; margin-bottom: 2px;">Selo Fitossanitário &amp; Logístico</strong>
                <p style="margin: 0; font-size: 10px; color: #64748B;">Auditoria MAPA • GlobalG.A.P. Módulo Rastreabilidade Semiárido Exportação.</p>
              </div>

              <div>
                <strong style="color: #0F172A; display: block; margin-bottom: 2px;">Política de Retenção</strong>
                <p style="margin: 0; font-size: 10px; color: #64748B;">5 Anos garantidos em storage imutável (WORM).</p>
              </div>

              <div>
                <strong style="color: #0F172A; display: block; margin-bottom: 2px;">Criptografia &amp; Trânsito</strong>
                <p style="margin: 0; font-size: 10px; color: #64748B;">AES-256 em Repouso • TLS 1.3 ponta a ponta com certificados mTLS ativos.</p>
              </div>

              <div>
                <strong style="color: #0F172A; display: block; margin-bottom: 2px;">Encarregado de Dados (DPO)</strong>
                <p style="margin: 0; font-size: 10px; color: #64748B;">Dr. Roberto Mendes • CREA-PE 48291 / DPO Certificado.</p>
              </div>
            </div>
          </div>

          <!-- Card: Ações Rápidas de Auditoria -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
            <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0;">
              Ações Rápidas de Auditoria
            </h4>

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
              <button class="btn-acao-rapida" id="btn-acao-laudo" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                  <strong style="color: #0F172A; display: block;">Gerar Laudo Pericial</strong>
                  <span style="font-size: 10px; color: #64748B;">PDF Assinado com carimbo do tempo</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-retencao" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                  <strong style="color: #0F172A; display: block;">Configurar Regras de Retenção</strong>
                  <span style="font-size: 10px; color: #64748B;">Políticas de expurgo e arquivamento</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-suspeitos" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                  <strong style="color: #0F172A; display: block;">Acessos Suspeitos (0 ativos)</strong>
                  <span style="font-size: 10px; color: #047857; font-weight: 600;">Nenhum ataque ou brute-force</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-exportar-auditor" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div>
                  <strong style="color: #0F172A; display: block;">Exportar p/ Auditor Externo</strong>
                  <span style="font-size: 10px; color: #64748B;">Pacote criptográfico (PwC / SGS)</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupAuditoriaEvents() {
  const btnExportar = document.getElementById('btn-exportar-auditoria-csv');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      const csv = `timestamp;tipo_evento;entidade_referencia;usuario_agente;ip_origem;status;hash_sha256\n` +
                  `2026-09-22 14:12:08;DISPARO_PROTOCOLO;#ALT-2026-084;Sistema Automatico;10.0.0.1;ATIVO;a7f83b99120ce9c1\n` +
                  `2026-09-22 13:45:20;LOGIN_MFA;usuario_5;Dra. Gabriela Sales;187.54.210.12;SUCESSO;e8c22fa1090123\n` +
                  `2026-09-22 11:30:15;ALTERACAO_PARAMETRO;config_parametro;Carlos Silva;192.168.1.45;HOMOLOGADO;91283fa0123cb\n` +
                  `2026-09-22 10:15:02;SANITIZACAO_IOT;leitura_rejeitada;Gateway LoRaWAN;10.0.0.25;ISOLADO;192803acbbef\n`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_forense_raiz_agro_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Auditoria Exportada', 'Dump de 14.820 logs com assinaturas SHA-256 baixado em CSV.');
    });
  }

  document.querySelectorAll('.btn-log-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      if (action === 'inspecionar') {
        toast.info('Lote & Telemetria', `Abrindo inspeção detalhada do evento de auditoria #${id}`);
      } else {
        Modal.open(`Payload Criptográfico — Evento #${id}`, `
          <div style="font-family: monospace; font-size: 11px; background: #0F172A; color: #38BDF8; padding: 14px; border-radius: 8px; line-height: 1.6;">
            {<br>
            &nbsp;&nbsp;"event_id": ${id},<br>
            &nbsp;&nbsp;"source": "syslog_relational_worker",<br>
            &nbsp;&nbsp;"cipher": "AES-256-GCM",<br>
            &nbsp;&nbsp;"signature_valid": true,<br>
            &nbsp;&nbsp;"storage_tier": "WORM_IMMUTABLE_5Y",<br>
            &nbsp;&nbsp;"compliance": ["GlobalG.A.P.", "MAPA", "LGPD"]<br>
            }
          </div>
        `, () => {
          toast.success('Cópia do Payload', 'Dados exportados para verificação externa.');
        }, 'Fechar');
      }
    });
  });

  document.querySelectorAll('.btn-acao-rapida').forEach(btn => {
    btn.addEventListener('click', (e) => {
      toast.info('Ação de Auditoria', `Executando rotina selecionada com autenticação de Superuser.`);
    });
  });
}
