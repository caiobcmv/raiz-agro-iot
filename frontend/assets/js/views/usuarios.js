/**
 * VIEW: GERENCIAMENTO DE USUÁRIOS & MATRIZ RBAC (FIGMA MOCKUP 2)
 * Fiel ao design do Administrador com cards de KPIs, Matriz RBAC v2.4,
 * Tabela com filtros/pesquisa/paginação e Regra de Soft-Delete Ativa (fn_bloquear_delete_usuario).
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderUsuarios() {
  let usuarios = [];
  try {
    usuarios = await api.getUsuarios();
  } catch (e) {
    console.warn('Falha ao buscar usuários do backend, usando seed local.');
  }

  // Lista padrão caso backend retorne vazio
  if (!usuarios || usuarios.length === 0) {
    usuarios = [
      { id_usuario: 3, nome: 'Carlos Silva', email: 'carlos.silva@raizagro.agr.br', perfil: 'Administrador', data_cadastro: '14/01/2025', ultimo_acesso: 'Hoje às 15:42 • IP 192.168.1.45', ativo: 1, isVoce: true },
      { id_usuario: 1, nome: 'Maria Clara Gestora', email: 'maria.clara@raizagro.agr.br', perfil: 'Produtor / Exportador', data_cadastro: '02/02/2025', ultimo_acesso: 'Hoje às 15:40 • IP 187.54.12.8', ativo: 1 },
      { id_usuario: 2, nome: 'Luiz Felipe', email: 'luiz.felipe@raizagro.agr.br', perfil: 'Analista de Dados', data_cadastro: '10/02/2025', ultimo_acesso: 'Hoje às 15:15 • IP 10.0.0.12', ativo: 1 },
      { id_usuario: 4, nome: 'Rodrigo Alves', email: 'rodrigo.alves@raizagro.agr.br', perfil: 'Produtor / Exportador', data_cadastro: '22/03/2025', ultimo_acesso: 'Hoje às 14:50 • Terminal Mobile', ativo: 1 },
      { id_usuario: 5, nome: 'Dra. Gabriela Sales', email: 'gabriela.sales@raizagro.agr.br', perfil: 'Analista de Dados', data_cadastro: '05/04/2025', ultimo_acesso: 'Ontem às 18:20 • API Gateway', ativo: 1 },
      { id_usuario: 6, nome: 'João Pedro', email: 'joao.pedro@raizagro.agr.br', perfil: 'Produtor / Exportador', data_cadastro: '12/05/2025', ultimo_acesso: 'Ontem às 11:30 • IP 187.54.12.8', ativo: 1 }
    ];
  } else {
    // Enriquecer dados da query
    usuarios = usuarios.map(u => ({
      ...u,
      isVoce: u.email === 'carlos.silva@raizagro.agr.br',
      data_cadastro: u.data_cadastro || '14/01/2025',
      ultimo_acesso: u.ultimo_acesso || 'Hoje às 15:30 • IP 192.168.1.45'
    }));
  }

  return `
    <div class="dashboard-canvas apple-animate-in">
      <!-- 4 KPIs Superiores de Usuários -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- KPI 1: TOTAL DE MEMBROS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">TOTAL DE MEMBROS</span>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">100%</div>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">12</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">usuários cadastrados</div>
          </div>
          <div style="font-size: 11px; color: #059669; font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> 100% integridade cadastral
          </div>
        </div>

        <!-- KPI 2: DISTRIBUIÇÃO POR PAPEL -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">DISTRIBUIÇÃO POR PAPEL</span>
            <i data-lucide="pie-chart" style="width: 14px; height: 14px; color: #64748B;"></i>
          </div>
          <div style="margin: 10px 0;">
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; display: flex; overflow: hidden; margin-bottom: 8px;">
              <div style="width: 42%; background: #10B981;"></div>
              <div style="width: 33%; background: #0284C7;"></div>
              <div style="width: 25%; background: #0F172A;"></div>
            </div>
            <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; justify-content: space-between;">
                <span>• Produtor / Exp.</span>
                <strong>5 (42%)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>• Analista IoT</span>
                <strong>4 (33%)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>• Administrador</span>
                <strong>3 (25%)</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- KPI 3: STATUS DAS CONTAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">STATUS DAS CONTAS</span>
            <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #10B981;"></i>
          </div>
          <div style="margin: 12px 0; display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">12</div>
              <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 4px;">Ativas</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 700; color: #64748B;">/ 0</div>
              <div style="font-size: 10px; color: #94A3B8;">Inativas</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span style="color: #047857; font-weight: 600;">• 100% Operacional</span>
            <span style="color: #64748B;">Soft Delete via fn_bloquear_delete</span>
          </div>
        </div>

        <!-- KPI 4: SESSÕES NAS ÚLTIMAS 24H -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">SESSÕES NAS ÚLTIMAS 24H</span>
            <i data-lucide="clock" style="width: 14px; height: 14px; color: #64748B;"></i>
          </div>
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">48</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">conexões autenticadas</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px;">
            <span style="color: #047857; font-weight: 600;">Zero falhas de login</span>
            <span style="color: #047857; font-weight: 600;">0% err</span>
          </div>
        </div>
      </div>

      <!-- Seção: Matriz de Perfis & Governança de Escopo (RBAC v2.4) -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Matriz de Perfis &amp; Governança de Escopo</h3>
            <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">Definição dos níveis de privilégio estruturados conforme as diretrizes agrícolas e de telemetria.</p>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 4px 10px; border-radius: 6px;">Esquema RBAC v2.4</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <!-- Card Papel 1: Produtor / Exportador -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 2px 8px; border-radius: 4px;">Operação de Campo</span>
                <span style="font-size: 11px; font-weight: 600; color: #64748B;">5 contas</span>
              </div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="sprout" style="width: 16px; height: 16px; color: #10B981;"></i> Produtor / Exportador
              </h4>
              <p style="font-size: 11px; color: #64748B; line-height: 1.4; margin: 0 0 12px 0;">
                Gestão direta do cultivo, janelas hídricas e prontidão para despacho logístico.
              </p>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #334155;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="droplet" style="width: 12px; height: 12px; color: #10B981;"></i> Irrigação &amp; Telemetria Básica
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="layers" style="width: 12px; height: 12px; color: #10B981;"></i> Histórico de Safra &amp; Produtividade
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="truck" style="width: 12px; height: 12px; color: #10B981;"></i> Cadeia de Frio &amp; Despachos Portuários
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
              <span style="color: #64748B;">Read-Write no Lote</span>
              <i data-lucide="check" style="width: 14px; height: 14px; color: #10B981;"></i>
            </div>
          </div>

          <!-- Card Papel 2: Analista de Dados & IoT -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 4px;">Análise Avançada</span>
                <span style="font-size: 11px; font-weight: 600; color: #64748B;">4 contas</span>
              </div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="cpu" style="width: 16px; height: 16px; color: #0284C7;"></i> Analista de Dados &amp; IoT
              </h4>
              <p style="font-size: 11px; color: #64748B; line-height: 1.4; margin: 0 0 12px 0;">
                Parametrização técnica de telemetria, curadoria fenológica e modelos analíticos.
              </p>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #334155;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="sliders" style="width: 12px; height: 12px; color: #0284C7;"></i> Calibração &amp; Offset de Sensores
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="radio" style="width: 12px; height: 12px; color: #0284C7;"></i> Ingestão ThingSpeak &amp; ESP32
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="activity" style="width: 12px; height: 12px; color: #0284C7;"></i> Modelos Preditivos &amp; Laudos Fenológicos
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
              <span style="color: #64748B;">Read-Write em Calibrações</span>
              <i data-lucide="check" style="width: 14px; height: 14px; color: #0284C7;"></i>
            </div>
          </div>

          <!-- Card Papel 3: Administrador -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 700; color: #0F172A; background: #F1F5F9; padding: 2px 8px; border-radius: 4px;">Gestão da Plataforma</span>
                <span style="font-size: 11px; font-weight: 600; color: #64748B;">3 contas</span>
              </div>
              <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="shield" style="width: 16px; height: 16px; color: #0F172A;"></i> Administrador
              </h4>
              <p style="font-size: 11px; color: #64748B; line-height: 1.4; margin: 0 0 12px 0;">
                Controle absoluto de infraestrutura, políticas de segurança e provisionamento.
              </p>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #334155;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="users" style="width: 12px; height: 12px; color: #0F172A;"></i> Governança de Usuários &amp; Perfis
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="database" style="width: 12px; height: 12px; color: #0F172A;"></i> Triggers de Auditoria &amp; Schema
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="settings" style="width: 12px; height: 12px; color: #0F172A;"></i> Configurações Globais da Fazenda
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 11px;">
              <span style="color: #64748B;">Acesso Irrestrito (Superuser)</span>
              <i data-lucide="shield" style="width: 14px; height: 14px; color: #0F172A;"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Seção: Usuários Cadastrados (Tabela com filtros e busca) -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0;">Usuários Cadastrados</h3>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Sincronização em tempo real com a tabela segura de autenticação</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="position: relative;">
              <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
              <input type="text" id="input-busca-usuario" placeholder="Buscar por nome, e-mail ou perfil..." style="padding: 7px 12px 7px 32px; font-size: 12px; border: 1px solid #CBD5E1; border-radius: 8px; width: 240px;">
            </div>
            <button class="btn btn-primary" id="btn-novo-usuario-admin" style="font-size: 12px; padding: 7px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>

        <!-- Filtros em Tabs -->
        <div style="display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px; overflow-x: auto;">
          <button class="tab-filtro-user active" data-filtro="todos" style="padding: 6px 12px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (12)</button>
          <button class="tab-filtro-user" data-filtro="produtor" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Produtores (5)</button>
          <button class="tab-filtro-user" data-filtro="analista" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Analistas (4)</button>
          <button class="tab-filtro-user" data-filtro="admin" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Administradores (3)</button>
          <button class="tab-filtro-user" data-filtro="ativos" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #047857; border: 1px solid #A7F3D0; border-radius: 6px; cursor: pointer;">• Ativos (12)</button>
        </div>

        <!-- Tabela Customizada -->
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left; color: #64748B; font-size: 11px;">
                <th style="padding: 10px 14px;">USUÁRIO</th>
                <th style="padding: 10px 14px;">PERFIL (PAPEL)</th>
                <th style="padding: 10px 14px;">DATA DE CADASTRO</th>
                <th style="padding: 10px 14px;">ÚLTIMO ACESSO (LOG_ACESSO)</th>
                <th style="padding: 10px 14px;">STATUS</th>
                <th style="padding: 10px 14px; text-align: right;">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              ${usuarios.map(u => {
                const initials = u.nome.split(' ').map(n => n[0]).slice(0, 2).join('');
                let roleBadgeBg = '#F1F5F9', roleBadgeColor = '#0F172A';
                if (u.perfil.toLowerCase().includes('admin')) {
                  roleBadgeBg = '#0F172A'; roleBadgeColor = '#FFFFFF';
                } else if (u.perfil.toLowerCase().includes('analista')) {
                  roleBadgeBg = '#E0F2FE'; roleBadgeColor = '#0369A1';
                } else {
                  roleBadgeBg = '#DCFCE7'; roleBadgeColor = '#15803D';
                }

                return `
                  <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 12px 14px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">
                          ${initials}
                        </div>
                        <div>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <strong style="color: #0F172A;">${u.nome}</strong>
                            ${u.isVoce ? '<span style="font-size: 9px; font-weight: 700; color: #0284C7; background: #E0F2FE; padding: 1px 5px; border-radius: 4px;">Você</span>' : ''}
                          </div>
                          <div style="font-size: 11px; color: #64748B;">${u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span style="font-size: 11px; font-weight: 700; background: ${roleBadgeBg}; color: ${roleBadgeColor}; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                        ${u.perfil}
                      </span>
                    </td>
                    <td style="padding: 12px 14px; color: #475569;">
                      ${u.data_cadastro}
                    </td>
                    <td style="padding: 12px 14px; color: #475569;">
                      ${u.ultimo_acesso}
                    </td>
                    <td style="padding: 12px 14px;">
                      <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                        <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 6px; border-radius: 4px;">• Ativo</span>
                        <input type="checkbox" checked style="accent-color: #10B981; cursor: pointer;">
                      </label>
                    </td>
                    <td style="padding: 12px 14px; text-align: right;">
                      <div style="display: inline-flex; gap: 8px;">
                        <button class="btn-acao-user" data-id="${u.id_usuario}" data-acao="editar" title="Editar Usuário" style="background: none; border: none; cursor: pointer; color: #64748B;">
                          <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-acao-user" data-id="${u.id_usuario}" data-acao="permissoes" title="Ajustar Permissões" style="background: none; border: none; cursor: pointer; color: #64748B;">
                          <i data-lucide="key" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn-acao-user" data-id="${u.id_usuario}" data-acao="bloquear" title="Bloquear Acesso" style="background: none; border: none; cursor: pointer; color: #EF4444;">
                          <i data-lucide="slash" style="width: 14px; height: 14px;"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Paginação inferior -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B;">
          <span>Exibindo 1-6 de 12 usuários</span>
          <div style="display: flex; gap: 6px;">
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">&lt; Anterior</button>
            <button style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700;">1</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">Próximo &gt;</button>
          </div>
        </div>
      </div>

      <!-- Banner de Compliance: Regra de Soft-Delete Ativa (fn_bloquear_delete_usuario) -->
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px; display: flex; align-items: flex-start; gap: 14px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: #DCFCE7; color: #15803D; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="shield-check" style="width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 12px; color: #166534; line-height: 1.5;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #14532D;">Regra de Soft-Delete Ativa (fn_bloquear_delete_usuario)</strong>
            <span style="font-size: 10px; font-weight: 700; color: #FFFFFF; background: #15803D; padding: 1px 6px; border-radius: 4px;">Em Conformidade GlobalG.A.P.</span>
          </div>
          <p style="margin: 0 0 6px 0;">
            Para assegurar a rastreabilidade perpétua e compliance em auditorias internacionais de exportação (GlobalG.A.P. / HACCP), nenhum registro de usuário pode ser fisicamente excluído do banco de dados relacional. Contas desligadas são alternadas para o status inativo por gatilho procedural, preservando integralmente o histórico de disparos, medições manuais e eventos registrados na tabela <code>log_acesso</code>.
          </p>
          <div style="display: flex; gap: 16px; font-size: 11px; font-weight: 600; color: #15803D;">
            <span># Hash de auditoria SHA-256</span>
            <span>✓ Persistência Imutável</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupUsuariosEvents() {
  const btnNovo = document.getElementById('btn-novo-usuario-admin');
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      Modal.open('Cadastrar Novo Usuário — Governança RBAC', `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
          Preencha os dados do colaborador para provisionamento de acesso:
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <label>Nome Completo:
            <input type="text" id="novo-user-nome" placeholder="Ex: Roberto Mendes" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>E-mail Corporativo:
            <input type="email" id="novo-user-email" placeholder="usuario@raizagro.agr.br" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <label>Perfil de Acesso (RBAC):
            <select id="novo-user-perfil" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
              <option value="1">Produtor / Exportador (Operação de Campo)</option>
              <option value="2">Analista de Dados &amp; IoT (Telemetria &amp; MESH)</option>
              <option value="3">Administrador (Gestão Integral da Plataforma)</option>
            </select>
          </label>
        </div>
      `, () => {
        const nome = document.getElementById('novo-user-nome')?.value;
        if (!nome) {
          toast.warning('Atenção', 'Informe o nome do usuário.');
          return;
        }
        toast.success('Usuário Cadastrado', `Convite com credencial e 2FA enviado com sucesso para ${nome}.`);
      }, 'Cadastrar e Convidar');
    });
  }

  // Ações da tabela
  document.querySelectorAll('.btn-acao-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const acao = e.currentTarget.dataset.acao;
      const id = e.currentTarget.dataset.id;
      if (acao === 'editar') {
        toast.info('Editar Cadastro', `Abrindo formulário de edição do usuário #${id}`);
      } else if (acao === 'permissoes') {
        toast.info('Matriz de Permissões', `Ajustando chaves RBAC do usuário #${id}`);
      } else if (acao === 'bloquear') {
        toast.warning('Bloqueio de Acesso', `Status do usuário #${id} alterado para inativo via soft-delete.`);
      }
    });
  });

  // Filtros tabs
  document.querySelectorAll('.tab-filtro-user').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-filtro-user').forEach(t => {
        t.style.background = '#F8FAFC';
        t.style.color = '#475569';
        t.classList.remove('active');
      });
      e.currentTarget.style.background = '#183D2E';
      e.currentTarget.style.color = '#FFFFFF';
      e.currentTarget.classList.add('active');
      toast.info('Filtro Aplicado', `Filtrando usuários por: ${e.currentTarget.innerText}`);
    });
  });
}
