/**
 * VIEW: AUDITORIA & LOGS DO SISTEMA v4.2 (FIGMA MOCKUP ADM)
 * Trilha Criptográfica Imutável, Sincronização em Tempo Real (Syslog & PostgreSQL),
 * Hash SHA-256 Validado, 4 KPIs Superiores, Trilha de Eventos Auditados com busca e filtros,
 * Painel Lateral de Conformidade & LGPD e Ações Rápidas de Auditoria com download e modais funcionais.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let _logsAuditoria = [
  {
    id: 1,
    categoria: 'disparos',
    badge: 'DISPARO PROTOCOLO',
    badgeColor: '#DC2626',
    badgeBg: '#FEE2E2',
    codigo_ref: '#ALT-2026-084',
    lote: 'Lote #LT-2026-084',
    data: '22/09/2026 14:12:08',
    titulo: 'Disparo de Alerta Crítico #ALT-2026-084 — Desvio Térmico em Manga Tommy Atkins',
    origem: 'Origem: Regra Agronômica #R-04 • Local: Câmara Frigorífica 02',
    destino: 'Destino: SMS Emergência + Push Luiz Felipe',
    hash: 'sha256:a7f83b99120ce...9c1',
    assinatura: 'Assinatura Válida',
    btnAcao: 'Inspecionar Lote',
    btnPayload: 'Ver Payload Completo'
  },
  {
    id: 2,
    categoria: 'acessos',
    badge: 'LOGIN / ACESSO',
    badgeColor: '#15803D',
    badgeBg: '#DCFCE7',
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
    categoria: 'agronomia',
    badge: 'ALTERAÇÃO DE PARÂMETRO',
    badgeColor: '#0284C7',
    badgeBg: '#E0F2FE',
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
    categoria: 'hardware',
    badge: 'SANITIZAÇÃO IOT',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
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
    categoria: 'seguranca',
    badge: 'SEGURANÇA RBAC',
    badgeColor: '#0F172A',
    badgeBg: '#F1F5F9',
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

let _filtroCatLog = 'todos';
let _termoBuscaLog = '';
let _periodoLog = '24h';

export async function renderAuditoria() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      <!-- Sub-barra Técnica de Auditoria v4.2 -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11px;">
          <span style="font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 3px 10px; border-radius: 20px;">
            • v4.2 - Trilha Criptográfica Imutável
          </span>
          <span style="color: #64748B;">
            Ambiente de Produção • Petrolina / Juazeiro
          </span>
          <span style="color: #059669; font-weight: 600;">
            ✓ Sincronização em Tempo Real (Syslog &amp; PostgreSQL)
          </span>
          <span style="color: #0284C7; font-weight: 600;">
            ✓ Hash SHA-256 Validado
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; background: #F1F5F9; padding: 3px; border-radius: 8px; font-size: 11px;">
            <button class="btn-time-filter active" data-periodo="24h" style="padding: 5px 12px; border: none; background: #FFFFFF; border-radius: 6px; font-weight: 700; color: #0F172A; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">24 Horas</button>
            <button class="btn-time-filter" data-periodo="7d" style="padding: 5px 12px; border: none; background: transparent; border-radius: 6px; color: #64748B; cursor: pointer;">7 Dias</button>
            <button class="btn-time-filter" data-periodo="30d" style="padding: 5px 12px; border: none; background: transparent; border-radius: 6px; color: #64748B; cursor: pointer;">30 Dias</button>
          </div>
          <button class="btn btn-primary" id="btn-exportar-auditoria-csv" style="background: #183D2E; color: #FFFFFF; border: none; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i>
            <span>Exportar Relatório (CSV/PDF)</span>
          </button>
        </div>
      </div>

      <!-- 4 KPIs Superiores de Auditoria -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: TOTAL DE EVENTOS AUDITADOS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">TOTAL DE EVENTOS AUDITADOS (30D)</span>
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">99.9%</div>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">14.820</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Integridade de Logs</span>
            <strong style="color: #047857;">0 Corrompidos &lt; 45ms</strong>
          </div>
        </div>

        <!-- KPI 2: ACESSOS & SESSÕES -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">ACESSOS &amp; SESSÕES (LOG_ACESSO)</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+4.2%</span>
          </div>
          <div style="margin: 10px 0; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">1.248</div>
            <div style="display: flex; gap: 3px; align-items: flex-end; height: 24px;">
              <span style="width: 4px; height: 12px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 4px; height: 18px; background: #10B981; border-radius: 2px;"></span>
              <span style="width: 4px; height: 24px; background: #10B981; border-radius: 2px;"></span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Autenticação Válida: <strong>1.240 (99.4%)</strong></span>
            <span style="color: #D97706;">8 Falhas Prevenidas</span>
          </div>
        </div>

        <!-- KPI 3: PROTOCOLOS & ALERTAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">PROTOCOLOS &amp; ALERTAS</span>
            <i data-lucide="bell" style="width: 14px; height: 14px; color: #10B981;"></i>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">142</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Ações Mitigadas: <strong>88% Automático</strong></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Canais Notificados</span>
            <strong>Push, SMS &amp; Webhook</strong>
          </div>
        </div>

        <!-- KPI 4: GOVERNANÇA & REGRAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">GOVERNANÇA &amp; REGRAS</span>
            <i data-lucide="shield" style="width: 14px; height: 14px; color: #0284C7;"></i>
          </div>
          <div style="margin: 10px 0;">
            <div style="font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1;">38 <span style="font-size: 13px; font-weight: 600; color: #64748B;">ações</span></div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Rastreabilidade Total: <strong>100% Auditável</strong></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px;">
            <span>Distribuição</span>
            <strong>22 Agron • 11 IoT • 5 RBAC</strong>
          </div>
        </div>
      </div>

      <!-- Barra de Categorias de Auditoria -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <span class="cat-pill-audit" data-cat="acessos" style="font-weight: 700; color: #0284C7; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
          1. Acessos &amp; Sessões (log_acesso) • 1.248
        </span>
        <span class="cat-pill-audit" data-cat="disparos" style="font-weight: 600; color: #D97706; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #D97706;"></span>
          2. Disparos &amp; Protocolos • 142
        </span>
        <span class="cat-pill-audit" data-cat="agronomia" style="font-weight: 600; color: #0F172A; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #0F172A;"></span>
          3. Parâmetros Agronômicos • 22
        </span>
        <span class="cat-pill-audit" data-cat="hardware" style="font-weight: 600; color: #8B5CF6; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6;"></span>
          4. Sanitização IoT (leitura_rejeitada) • 16
        </span>
        <span class="cat-pill-audit" data-cat="seguranca" style="font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          5. Governança RBAC &amp; Senhas • 14
        </span>
      </div>

      <!-- Layout 2 Colunas: Feed de Logs (70%) + Painel de Conformidade e Ações Rápidas (30%) -->
      <div style="display: grid; grid-template-columns: 2.3fr 1fr; gap: 20px;">
        <!-- Coluna Esquerda: Feed de Logs de Auditoria -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="position: relative; flex: 1; max-width: 380px;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-log" placeholder="Filtrar por usuário, IP, entidade (ex: config_parametro), lote..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
            </div>
            <div style="display: flex; gap: 6px; overflow-x: auto;">
              <button class="tab-filtro-log active" data-cat="todos" style="padding: 6px 10px; font-size: 10px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (14.820)</button>
              <button class="tab-filtro-log" data-cat="acessos" style="padding: 6px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Acessos (1.248)</button>
              <button class="tab-filtro-log" data-cat="disparos" style="padding: 6px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Disparos (142)</button>
              <button class="tab-filtro-log" data-cat="agronomia" style="padding: 6px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Agronomia (22)</button>
              <button class="tab-filtro-log" data-cat="hardware" style="padding: 6px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Hardware (16)</button>
              <button class="tab-filtro-log" data-cat="seguranca" style="padding: 6px 10px; font-size: 10px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Segurança (14)</button>
            </div>
          </div>

          <!-- Cards de Eventos Auditados -->
          <div id="container-feed-logs" style="display: flex; flex-direction: column; gap: 14px;">
            ${renderFeedLogsHtml()}
          </div>

          <!-- Paginação -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B; flex-wrap: wrap; gap: 8px;">
            <span>Exibindo 1-5 de 14.820 registros</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn-pag-audit" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Anterior</button>
              <button class="btn-pag-audit active" style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700; cursor: pointer;">1</button>
              <button class="btn-pag-audit" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
              <button class="btn-pag-audit" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
              <button class="btn-pag-audit" style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo</button>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Conformidade & LGPD + Ações Rápidas -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Card: Conformidade & LGPD -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="shield-check" style="width: 16px; height: 16px; color: #10B981;"></i>
                Conformidade &amp; LGPD
              </h4>
              <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">100% VÁLIDO</span>
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
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0;">
              Ações Rápidas de Auditoria
            </h4>

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
              <button class="btn-acao-rapida" id="btn-acao-laudo" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;">
                <div>
                  <strong style="color: #0F172A; display: block;">Gerar Laudo Pericial (PDF Assinado)</strong>
                  <span style="font-size: 10px; color: #64748B;">PDF Assinado com carimbo do tempo</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-retencao" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;">
                <div>
                  <strong style="color: #0F172A; display: block;">Configurar Regras de Retenção &amp; Purge</strong>
                  <span style="font-size: 10px; color: #64748B;">Políticas de expurgo e arquivamento</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-suspeitos" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;">
                <div>
                  <strong style="color: #0F172A; display: block;">Acessos Suspeitos (0 ativos)</strong>
                  <span style="font-size: 10px; color: #047857; font-weight: 600;">Nenhum ataque ou brute-force</span>
                </div>
                <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: #94A3B8;"></i>
              </button>

              <button class="btn-acao-rapida" id="btn-acao-exportar-auditor" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;">
                <div>
                  <strong style="color: #0F172A; display: block;">Exportar p/ Auditor Externo [PwC/SGS]</strong>
                  <span style="font-size: 10px; color: #64748B;">Pacote criptográfico de auditoria</span>
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

function getLogsFiltrados() {
  return _logsAuditoria.filter(l => {
    if (_termoBuscaLog) {
      const t = _termoBuscaLog.toLowerCase();
      const matchTitulo = l.titulo.toLowerCase().includes(t);
      const matchRef = l.codigo_ref.toLowerCase().includes(t);
      const matchLote = l.lote.toLowerCase().includes(t);
      const matchOrigem = l.origem.toLowerCase().includes(t);
      if (!matchTitulo && !matchRef && !matchLote && !matchOrigem) return false;
    }
    if (_filtroCatLog !== 'todos') {
      return l.categoria === _filtroCatLog;
    }
    return true;
  });
}

function renderFeedLogsHtml() {
  const filtrados = getLogsFiltrados();
  if (filtrados.length === 0) {
    return `
      <div style="padding: 24px; text-align: center; color: #64748B; background: #F8FAFC; border-radius: 8px;">
        Nenhum evento registrado para o filtro informado.
      </div>
    `;
  }

  return filtrados.map(l => `
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; transition: all 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: ${l.badgeBg}; color: ${l.badgeColor};">
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

      <div style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 8px;">
        <div>${l.origem}</div>
        <div>${l.destino}</div>
      </div>

      ${l.hash ? `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; font-size: 10px; margin-bottom: 8px;">
          <code style="color: #64748B; font-family: monospace;">Hash Criptográfico: ${l.hash}</code>
          <span style="color: #047857; font-weight: 700;">${l.assinatura}</span>
        </div>
      ` : ''}

      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 6px;">
        ${l.btnPayload ? `
          <button class="btn-log-action" data-id="${l.id}" data-action="payload" style="background: none; border: none; font-size: 11px; font-weight: 600; color: #0284C7; cursor: pointer;">
            ${l.btnPayload}
          </button>
        ` : ''}
        ${l.btnAcao ? `
          <button class="btn-log-action" data-id="${l.id}" data-action="${l.btnAcao.includes('Reverter') ? 'reverter' : 'inspecionar'}" style="${
            l.btnAcao.includes('Reverter') 
              ? 'background: none; border: none; font-size: 11px; font-weight: 600; color: #DC2626; cursor: pointer;' 
              : 'background: #183D2E; color: #FFFFFF; border: none; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer;'
          }">
            ${l.btnAcao}
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function atualizarFeedLogs() {
  const container = document.getElementById('container-feed-logs');
  if (container) {
    container.innerHTML = renderFeedLogsHtml();
    vincularEventosLogs();
  }
}

function vincularEventosLogs() {
  document.querySelectorAll('.btn-log-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      const l = _logsAuditoria.find(log => log.id === parseInt(id, 10));

      if (action === 'inspecionar') {
        Modal.open(`Inspeção de Lote & Telemetria — Evento #${id}`, `
          <div style="font-size: 12px; color: #334155;">
            <p><strong>Evento:</strong> ${l?.titulo}</p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px; margin-top: 8px;">
              <div><strong>Lote:</strong> ${l?.lote}</div>
              <div><strong>Origem:</strong> ${l?.origem}</div>
              <div><strong>Horário:</strong> ${l?.data}</div>
              <div><strong>Hash:</strong> <code>${l?.hash || 'sha256:d82910fae120...'}</code></div>
            </div>
          </div>
        `, () => {
          window.location.hash = '#/lotes';
        }, 'Ir para Lotes e Safra');
      } else if (action === 'reverter') {
        Modal.open(`Reverter Alteração de Parâmetro`, `
          <div style="font-size: 12px; color: #475569;">
            <p>Deseja reverter o valor de <code>temp_min_segura</code> de volta para <strong>-1.0°C</strong>?</p>
            <div style="background: #FFF1F2; border: 1px solid #FECDD3; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <strong>Atenção:</strong> Uma nova entrada de auditoria será gerada registrando este rollback sob seu usuário.
            </div>
          </div>
        `, () => {
          toast.success('Rollback Executado', 'Limiar fisiológico restabelecido para -1.0°C com assinatura digital.');
        }, 'Confirmar Reversão');
      } else {
        Modal.open(`Payload Criptográfico — ${l?.titulo}`, `
          <div style="font-family: monospace; font-size: 11px; background: #0F172A; color: #38BDF8; padding: 14px; border-radius: 8px; line-height: 1.6; max-height: 300px; overflow-y: auto;">
            {<br>
            &nbsp;&nbsp;"audit_id": "${l?.id}",<br>
            &nbsp;&nbsp;"timestamp": "${l?.data}",<br>
            &nbsp;&nbsp;"event_category": "${l?.categoria}",<br>
            &nbsp;&nbsp;"code_reference": "${l?.codigo_ref}",<br>
            &nbsp;&nbsp;"raw_details": "${l?.origem.replace(/<[^>]*>?/gm, '')}",<br>
            &nbsp;&nbsp;"cipher_algorithm": "AES-256-GCM",<br>
            &nbsp;&nbsp;"sha256_checksum": "${l?.hash || 'sha256:4a8b79e102f91c98a3b82710'}",<br>
            &nbsp;&nbsp;"storage_worm_tier": "IMMUTABLE_5Y",<br>
            &nbsp;&nbsp;"compliance_certifications": ["GlobalG.A.P.", "MAPA-PE", "LGPD-BR"]<br>
            }
          </div>
        `, () => {
          toast.success('Copiado', 'Hash e payload copiados para a área de transferência.');
        }, 'Copiar Payload');
      }
    });
  });
}

export function setupAuditoriaEvents() {
  // Exportar CSV
  const btnExportar = document.getElementById('btn-exportar-auditoria-csv');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      const csv = `timestamp;tipo_evento;entidade_referencia;usuario_agente;origem;status;hash_sha256\n` +
        _logsAuditoria.map(l => `"${l.data}";"${l.badge}";"${l.codigo_ref}";"${l.lote}";"${l.origem.replace(/<[^>]*>?/gm, '')}";"VALIDO";"${l.hash || 'sha256:valid'}"`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_forense_raiz_agro_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Auditoria Exportada', 'Dump de 14.820 logs com assinaturas SHA-256 baixado em CSV.');
    });
  }

  // Seletor de período 24h, 7d, 30d
  document.querySelectorAll('.btn-time-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-time-filter').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#64748B';
        b.style.fontWeight = '400';
        b.style.boxShadow = 'none';
      });
      btn.classList.add('active');
      btn.style.background = '#FFFFFF';
      btn.style.color = '#0F172A';
      btn.style.fontWeight = '700';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';

      _periodoLog = btn.dataset.periodo;
      toast.info('Janela Temporal', `Filtrando logs dos últimos ${_periodoLog}.`);
    });
  });

  // Busca de logs
  const inputBusca = document.getElementById('input-busca-log');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaLog = e.target.value.trim();
      atualizarFeedLogs();
    });
  }

  // Abas de categorias no feed
  document.querySelectorAll('.tab-filtro-log').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-filtro-log').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#F8FAFC';
        t.style.color = '#475569';
        t.style.border = '1px solid #E2E8F0';
        t.style.fontWeight = '600';
      });
      tab.classList.add('active');
      tab.style.background = '#183D2E';
      tab.style.color = '#FFFFFF';
      tab.style.border = 'none';
      tab.style.fontWeight = '700';

      _filtroCatLog = tab.dataset.cat || 'todos';
      atualizarFeedLogs();
    });
  });

  // Categorias horizontais clicáveis
  document.querySelectorAll('.cat-pill-audit').forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat;
      _filtroCatLog = cat;
      document.querySelectorAll('.tab-filtro-log').forEach(t => {
        if (t.dataset.cat === cat) {
          t.classList.add('active');
          t.style.background = '#183D2E';
          t.style.color = '#FFFFFF';
          t.style.border = 'none';
        } else {
          t.classList.remove('active');
          t.style.background = '#F8FAFC';
          t.style.color = '#475569';
          t.style.border = '1px solid #E2E8F0';
        }
      });
      atualizarFeedLogs();
      toast.info('Categoria de Auditoria', `Filtrando eventos: "${cat.toUpperCase()}".`);
    });
  });

  // Ações Rápidas de Auditoria (Painel Lateral)
  const btnLaudo = document.getElementById('btn-acao-laudo');
  if (btnLaudo) {
    btnLaudo.addEventListener('click', () => {
      const laudo = `%PDF-1.4\n` +
                    `=== LAUDO PERICIAL FORENSE RAIZ AGRO ===\n` +
                    `EMITIDO EM: 22 de setembro de 2026\n` +
                    `CARIMBO DO TEMPO ICP-BRASIL: 2026-09-22T14:15:00-03:00\n` +
                    `CERTIFICADO DIGITAL: DPO Roberto Mendes CREA-PE 48291\n` +
                    `CONFORMIDADE: GlobalG.A.P. IFA v6 & MAPA Compliance 100% Homologado\n` +
                    `HASH SHA-256 DO RELATORIO: 8f4a10c283991abde37c7890123fabc109283\n`;
      const blob = new Blob([laudo], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laudo_pericial_assinado_raiz_agro_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Laudo Gerado', 'Laudo pericial com assinatura digital e carimbo de tempo baixado.');
    });
  }

  const btnRetencao = document.getElementById('btn-acao-retencao');
  if (btnRetencao) {
    btnRetencao.addEventListener('click', () => {
      Modal.open('Regras de Retenção WORM & Purge', `
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 10px;">
          <div>
            <strong>Período Mínimo de Retenção Imutável:</strong>
            <select style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="5" selected>5 Anos (Exigência MAPA & GlobalG.A.P.)</option>
              <option value="10">10 Anos (Auditoria Completa)</option>
            </select>
          </div>
          <div>
            <strong>Política de Criptografia:</strong>
            <input type="text" value="AES-256-GCM com rotação semestral de chaves" disabled style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px; background: #F1F5F9;">
          </div>
        </div>
      `, () => {
        toast.success('Retenção Configurada', 'Política de retenção WORM de 5 anos confirmada no bucket seguro.');
      }, 'Salvar Política');
    });
  }

  const btnSuspeitos = document.getElementById('btn-acao-suspeitos');
  if (btnSuspeitos) {
    btnSuspeitos.addEventListener('click', () => {
      Modal.open('Monitor de Segurança & Acessos Suspeitos', `
        <div style="font-size: 12px; color: #334155;">
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <strong>Status do Cluster: Seguro</strong><br>
            Nenhum IP bloqueado por brute-force ou anomalia comportamental nas últimas 24 horas.
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #F1F5F9; text-align: left;">
                <th style="padding: 6px 10px;">Origem</th>
                <th style="padding: 6px 10px;">Tentativas</th>
                <th style="padding: 6px 10px;">MFA Status</th>
                <th style="padding: 6px 10px;">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 6px 10px;">187.54.210.12 (Petrolina)</td>
                <td style="padding: 6px 10px;">1</td>
                <td style="padding: 6px 10px; color: #047857; font-weight: 700;">Aprovado</td>
                <td style="padding: 6px 10px;">Sessão Ativa</td>
              </tr>
            </tbody>
          </table>
        </div>
      `, null, 'Fechar');
    });
  }

  const btnExportarAuditor = document.getElementById('btn-acao-exportar-auditor');
  if (btnExportarAuditor) {
    btnExportarAuditor.addEventListener('click', () => {
      Modal.open('Pacote de Auditoria Externa (PwC / SGS)', `
        <div style="font-size: 12px; color: #475569;">
          <p>Deseja compilar o pacote forense completo para homologação de safra e auditoria internacional?</p>
          <ul style="padding-left: 20px; line-height: 1.6;">
            <li>Registros brutos de telemetria IoT (14.820 logs)</li>
            <li>Certificados de conformidade GlobalG.A.P.</li>
            <li>Assinaturas criptográficas SHA-256 e chaves públicas mTLS</li>
          </ul>
        </div>
      `, () => {
        const pacote = `=== RAIZ AGRO PACOTE FORENSE DE AUDITORIA EXTERNA (PwC / SGS) ===\n` +
                       `Data de Emissão: 22 de setembro de 2026\n` +
                       `Assinatura Digital Raiz: 0x8a92f00bc192847aef\n` +
                       `Hash de Validação: 9812a0fbc9876543210123456789abcdef\n` +
                       `Total de Registros: 14.820 auditados sem corrupção\n`;
        const blob = new Blob([pacote], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pacote_auditoria_externa_raiz_agro_pwc_sgs.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Pacote Gerado', 'Pacote forense criptografado baixado com sucesso.');
      }, 'Compilar Pacote');
    });
  }

  vincularEventosLogs();
}
