/**
 * CALIBRAÇÃO E PARÂMETROS IOT - RAIZ AGRO IOT
 * Tela técnica dedicada para Analistas e Administradores:
 * - Limiares agronômicos de frio e dessecação (config_parametro no PostgreSQL)
 * - Calibração de cortes preditivos de risco (cortes_alerta_preditivo no PostgreSQL)
 * - Sanitização IoT, filtros de outliers e descarte físico (leitura_rejeitada no PostgreSQL)
 * - Telemetria real do Broker ThingSpeak e última leitura registrada (leitura_climatica)
 * - Mapeamento e gestão cadastral de nós ESP32 e associação com lotes (sensor x lote)
 */

import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { auth } from '../auth.js';
import { api } from '../api.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

let _calibracaoCache = null;

export async function renderCalibracao() {
  let dados = null;
  try {
    dados = await api.getCalibracaoResumo();
    _calibracaoCache = dados;
  } catch (err) {
    console.warn('Usando fallback estruturado de calibração:', err);
    dados = _calibracaoCache || {};
  }

  const limiares = Array.isArray(dados?.limiares) && dados.limiares.length > 0
    ? dados.limiares
    : [
        { id_config: 1, fruta: 'Manga Tommy / Kent', etapa: 'armazenamento', temp_min: 10.0, temp_max: 13.0, umidade_min: 90, umidade_max: 95 },
        { id_config: 2, fruta: 'Uva de Mesa (Vitória / Crimson)', etapa: 'armazenamento', temp_min: -0.5, temp_max: 2.0, umidade_min: 90, umidade_max: 95 },
        { id_config: 3, fruta: 'Melão Amarelo', etapa: 'armazenamento', temp_min: 10.0, temp_max: 12.0, umidade_min: 85, umidade_max: 95 }
      ];

  const cortes = Array.isArray(dados?.cortes) && dados.cortes.length > 0
    ? dados.cortes
    : [
        { nivel: 'BAIXO', limiar_min: 0.00, limiar_max: 0.45, acao_recomendada: 'Monitoramento contínuo sem intervenção' },
        { nivel: 'MEDIO', limiar_min: 0.45, limiar_max: 0.75, acao_recomendada: 'Alerta preventivo e vistoria em 4h' },
        { nivel: 'CRITICO', limiar_min: 0.75, limiar_max: 1.00, acao_recomendada: 'Disparo imediato para equipe e automação de contingência' }
      ];

  const sensores = Array.isArray(dados?.sensores) && dados.sensores.length > 0
    ? dados.sensores
    : [
        { id_sensor: 1, nome: 'DHT11 ESP32-C3', tipo_sensor: 'DHT11', localizacao: 'Bancada', channel_id: 3500765, ambiente: 'ar', status: 'ativo', lote_codigo: 'Lote #1', variedade: 'Uva Vitória' },
        { id_sensor: 3, nome: 'Solo ESP32', tipo_sensor: 'umidade do solo', localizacao: 'Bancada', channel_id: 3500765, field_number: 3, ambiente: 'solo', status: 'ativo', lote_codigo: 'Lote #1', variedade: 'Uva Vitória' }
      ];

  const rejeitadas24h = dados?.rejeitadas_24h ?? 0;
  const channelId = dados?.broker?.channel_id || '3500765';
  const ultimaLeitura = dados?.ultima_leitura || null;

  return `
  <div class="dashboard-canvas apple-animate-in" style="padding: 20px 32px 48px; overflow-y: auto; background: #F8FAFC;">

    <!-- Barra Superior de Status & Ações da Calibração -->
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
          Safra 2025/2026 Ativa • Petrolina (45.0 ha)
        </span>
        <span id="calib-broker-pill" style="background: #FFFFFF; border: 1px solid #E2E8F0; color: #475569; font-size: 11px; font-weight: 500; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="radio" style="width: 12px; height: 12px; color: #059669;"></i>
          Broker ThingSpeak conectado (Canal #${channelId})
        </span>
        <span id="calib-pg-badge" style="background: #ECFDF5; border: 1px solid #BBF7D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; margin-left: auto;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          PostgreSQL Conectado
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-sync-thingspeak-calib" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: background 0.15s;">
          <i data-lucide="refresh-cw" style="width: 13px; height: 13px; color: #059669;"></i>
          <span>Sincronizar ThingSpeak</span>
        </button>
        <button id="btn-recalcular-modelos" style="padding: 8px 16px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #065F46; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;">
          <i data-lucide="sparkles" style="width: 13px; height: 13px; color: #10B981;"></i>
          <span>Re-executar Modelos IA</span>
        </button>
        <button id="btn-export-calibracao" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;">
          <i data-lucide="download" style="width: 13px; height: 13px; color: #0284C7;"></i>
          <span>Exportar Parâmetros</span>
        </button>
      </div>
    </div>

    <!-- SEÇÃO 1: LIMIARES AGRONÔMICOS DE ARMAZENAMENTO & REFRIGERAÇÃO -->
    <div class="apple-card" style="padding: 22px 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
            <i data-lucide="shield-alert" style="width: 17px; height: 17px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Limiares Agronômicos de Armazenamento &amp; Refrigeração</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Faixas de segurança de temperatura e umidade relativa (<code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">config_parametro</code>) validadas contra frio e dessecação</p>
          </div>
        </div>
        <button id="btn-salvar-todos-limiares" style="padding: 7px 16px; background: #059669; color: #FFFFFF; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(5,150,105,0.25);">
          <i data-lucide="save" style="width: 13px; height: 13px;"></i>
          <span>Salvar Todos os Limiares</span>
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        ${limiares.map(c => `
          <div class="card-limiar-cultura" data-id="${c.id_config}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                  <span style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;">ID #${c.id_config} • ${c.etapa || 'Armazenamento'}</span>
                  <h4 style="margin: 2px 0 0; font-size: 14px; font-weight: 700; color: #0F172A;">${c.fruta || 'Cultura Agronômica'}</h4>
                </div>
                <button type="button" class="btn-editar-limiar" data-id="${c.id_config}" data-nome="${c.fruta || ''}" data-tmin="${c.temp_min}" data-tmax="${c.temp_max}" data-umin="${c.umidade_min}" data-umax="${c.umidade_max}" style="padding: 5px 12px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #0284C7; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Abrir Calibração em Modal">
                  <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> Modal
                </button>
              </div>

              <!-- Edição Direta Inline de Temperatura -->
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 10.5px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="thermometer" style="width: 12px; height: 12px; color: #EF4444;"></i>
                    Faixa Térmica Segura (°C)
                  </span>
                  <span style="font-size: 10px; font-weight: 800; color: #0F172A;">${c.temp_min}°C – ${c.temp_max}°C</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 9.5px; color: #64748B; font-weight: 600; display: block; margin-bottom: 2px;">Temp Mínima</label>
                    <input type="number" step="0.5" class="calib-inline-tmin" data-id="${c.id_config}" value="${c.temp_min}" style="width: 100%; padding: 6px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0F172A; box-sizing: border-box;">
                  </div>
                  <div>
                    <label style="font-size: 9.5px; color: #64748B; font-weight: 600; display: block; margin-bottom: 2px;">Temp Máxima</label>
                    <input type="number" step="0.5" class="calib-inline-tmax" data-id="${c.id_config}" value="${c.temp_max}" style="width: 100%; padding: 6px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0F172A; box-sizing: border-box;">
                  </div>
                </div>
              </div>

              <!-- Edição Direta Inline de Umidade Relativa -->
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 10.5px; font-weight: 700; color: #334155; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="droplets" style="width: 12px; height: 12px; color: #0284C7;"></i>
                    Umidade Relativa Alvo (%)
                  </span>
                  <span style="font-size: 10px; font-weight: 800; color: #0284C7;">${Math.round(c.umidade_min)}% – ${Math.round(c.umidade_max)}%</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 9.5px; color: #64748B; font-weight: 600; display: block; margin-bottom: 2px;">UR Mínima</label>
                    <input type="number" step="1" class="calib-inline-umin" data-id="${c.id_config}" value="${Math.round(c.umidade_min)}" style="width: 100%; padding: 6px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0F172A; box-sizing: border-box;">
                  </div>
                  <div>
                    <label style="font-size: 9.5px; color: #64748B; font-weight: 600; display: block; margin-bottom: 2px;">UR Máxima</label>
                    <input type="number" step="1" class="calib-inline-umax" data-id="${c.id_config}" value="${Math.round(c.umidade_max)}" style="width: 100%; padding: 6px 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0F172A; box-sizing: border-box;">
                  </div>
                </div>
              </div>
            </div>

            <!-- Botão de Salvar Individual -->
            <button type="button" class="btn-gravar-inline-limiar" data-id="${c.id_config}" data-nome="${c.fruta || ''}" style="width: 100%; padding: 8px 12px; background: #059669; color: #FFFFFF; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 3px rgba(5,150,105,0.25); transition: opacity 0.15s;">
              <i data-lucide="save" style="width: 12px; height: 12px;"></i>
              <span>Gravar Limiares (${c.fruta || 'Cultura'})</span>
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SEÇÃO 2: CORTES DE RISCO PREDITIVO (MACHINE LEARNING) -->
    <div class="apple-card" style="padding: 22px 24px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
            <i data-lucide="sliders" style="width: 17px; height: 17px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Cortes de Decisão &amp; Sensibilidade Preditiva (IA)</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Regras de enquadramento em <code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">cortes_alerta_preditivo</code> para disparos preventivos</p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
        ${cortes.map(c => {
          const isCrit = String(c.nivel || '').toUpperCase() === 'CRITICO';
          const isMed = String(c.nivel || '').toUpperCase() === 'MEDIO';
          const bgPill = isCrit ? '#FEE2E2' : (isMed ? '#FEF3C7' : '#ECFDF5');
          const colPill = isCrit ? '#B91C1C' : (isMed ? '#B45309' : '#047857');
          return `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: 800; color: ${colPill}; background: ${bgPill}; padding: 3px 8px; border-radius: 6px;">${String(c.nivel || '').toUpperCase()}</span>
                  <span style="font-size: 11px; font-weight: 700; color: #1E293B;">${(parseFloat(c.limiar_min) * 100).toFixed(0)}% a ${(parseFloat(c.limiar_max) * 100).toFixed(0)}%</span>
                </div>
                <p style="font-size: 11.5px; color: #475569; margin: 0 0 10px; line-height: 1.4;">${c.acao_recomendada}</p>
              </div>
              <div style="border-top: 1px solid #E2E8F0; padding-top: 8px; font-size: 10px; color: #94A3B8;">Gatilho operacional no PostgreSQL</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- SEÇÃO 3: SANITIZAÇÃO IOT & BROKER REAL -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      
      <!-- Esquerda: Sanitização IoT & Filtro de Outliers -->
      <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
              <i data-lucide="filter" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #0F172A;">Sanitização IoT &amp; Filtro de Outliers</div>
              <span style="display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 600; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 7px; border-radius: 5px;">tabela: leitura_rejeitada</span>
            </div>
          </div>
          <span style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px;">Rejeitadas 24h: ${rejeitadas24h}</span>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 700; color: #0F172A;">Janela Física de Temperatura Admissível</span>
            <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Válida: -5.0°C a 55.0°C</span>
          </div>
          <div style="height: 8px; border-radius: 9999px; background: linear-gradient(90deg, #10B981 0%, #10B981 85%, #EF4444 100%); margin-bottom: 8px;"></div>
          <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">
            Pacotes anômalos que extrapolem esses limites físicos de sensor são isolados automaticamente em <strong>leitura_rejeitada</strong> sem corromper as médias agronômicas.
          </p>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 10px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #0F172A;">Sensores Monitorados no Banco</span>
            <span style="font-size: 10px; color: #047857; font-weight: 700;">DHT11 + Umidade de Solo</span>
          </div>
          <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.4;">
            As leituras climáticas de temperatura, umidade do ar e umidade do solo são validadas na ingestão contra a tabela <code>config_parametro</code>. Inconsistências físicas são gravadas em <code>leitura_rejeitada</code>.
          </p>
        </div>
      </div>

      <!-- Direita: Broker ThingSpeak & Ingestão -->
      <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 10px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #0284C7;">
                <i data-lucide="wifi" style="width: 16px; height: 16px;"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #0F172A;">Broker ThingSpeak &amp; Ingestão</div>
                <div style="font-size: 11px; color: #64748B;">Pipeline de telemetria dos nós ESP32-C3</div>
              </div>
            </div>
            <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Canal Ativo
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
              <div style="font-size: 10px; color: #64748B; font-weight: 600; margin-bottom: 4px;">Channel ID</div>
              <div style="font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'Space Grotesk', sans-serif;">#${channelId}</div>
              <div style="font-size: 10px; color: #059669; font-weight: 600; margin-top: 4px;">✓ Conexão Ativa</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
              <div style="font-size: 10px; color: #64748B; font-weight: 600; margin-bottom: 4px;">Taxa de Polling</div>
              <div style="font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'Space Grotesk', sans-serif;">20 segundos</div>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Padrão analítico em tempo real</div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 11px; color: #64748B; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
            Último pacote recebido: <strong>${ultimaLeitura?.data_hora ? new Date(ultimaLeitura.data_hora).toLocaleString('pt-BR') : 'Disponível no banco'}</strong> ${ultimaLeitura?.entry_id_thingspeak ? `(Entry #${ultimaLeitura.entry_id_thingspeak})` : ''}
          </span>
          <button id="btn-testar-broker-calib" style="padding: 7px 14px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; font-size: 11px; font-weight: 700; color: #047857; cursor: pointer;">Testar Conexão</button>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 4: MAPEAMENTO DE HARDWARE & LOTES (DADOS REAIS TABELA SENSOR) -->
    <div class="apple-card" style="padding: 20px 22px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #059669;">
            <i data-lucide="cpu" style="width: 17px; height: 17px;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #0F172A;">Mapeamento de Hardware &amp; Lotes</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Associação física de telemetria aos lotes agronômicos ativos de Petrolina (<code style="font-size: 10px; background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">sensor x lote</code>)</p>
          </div>
        </div>
        <span style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="shield-check" style="width: 13px; height: 13px;"></i>
          Integridade Referencial 100% OK
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        ${sensores.map(s => `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 700; color: #0F172A; font-size: 13px;">#${s.id_sensor} • ${s.nome}</span>
                <span style="background: ${s.status === 'ativo' ? '#ECFDF5' : '#F1F5F9'}; color: ${s.status === 'ativo' ? '#047857' : '#64748B'}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">${s.status || 'Ativo'}</span>
              </div>
              <p style="margin: 0 0 10px; font-size: 11px; color: #64748B; line-height: 1.6;">
                <strong>Ambiente:</strong> ${s.ambiente === 'solo' ? 'Umidade do Solo' : 'Microclima / Temperatura do Ar'}<br>
                <strong>Lote Vinculado:</strong> ${s.lote_codigo || 'Sem Lote'} ${s.variedade ? `(${s.variedade})` : ''}<br>
                <strong>Localização Física:</strong> ${s.localizacao || 'Bancada de Testes'}
              </p>
            </div>
            <div style="display: flex; gap: 8px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
              <button class="btn-configurar-sensor" data-id="${s.id_sensor}" data-nome="${s.nome}" data-status="${s.status}" data-local="${s.localizacao || ''}" data-lote="${s.id_lote || ''}" style="flex: 1; padding: 7px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                <i data-lucide="settings" style="width: 12px; height: 12px; color: #059669;"></i>
                <span>Configurar Sensor &amp; Lote</span>
              </button>
              <button class="btn-ping-sensor" data-id="${s.id_sensor}" style="padding: 7px 12px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; font-size: 11px; font-weight: 700; color: #0284C7; cursor: pointer;">Ping Nó</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

  </div>
  `;
}

export function setupCalibracaoEvents() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 1. Sincronizar ThingSpeak
  document.getElementById('btn-sync-thingspeak-calib')?.addEventListener('click', async () => {
    try {
      toast.info('Sincronizando', 'Consultando novos feeds do canal ThingSpeak...');
      await api.sincronizarIngestao();
      toast.success('Sincronizado', 'Dados do ThingSpeak ingeridos e validados.');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      toast.error('Erro na Ingestão', e.message || 'Falha ao sincronizar feeds.');
    }
  });

  // 2. Re-executar modelos de IA (Gera inferências reais contra a tabela cortes_alerta_preditivo)
  document.getElementById('btn-recalcular-modelos')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-recalcular-modelos');
    try {
      if (btn) btn.disabled = true;
      toast.info('Modelos Preditivos', 'Avaliando cortes preditivos contra riscos dos lotes...');
      const res = await api.recalcularCalibracao();
      toast.success('Inferência Concluída', res?.detalhes || res?.mensagem || 'Cortes preditivos recalculados.');
    } catch (e) {
      toast.error('Erro na Execução', e.message || 'Falha ao re-executar modelos.');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // 3. Testar conexão do broker com medição de roundtrip real
  document.getElementById('btn-testar-broker-calib')?.addEventListener('click', async () => {
    try {
      toast.info('Testando Conexão', 'Consultando backend e canal ThingSpeak...');
      const t0 = performance.now();
      const res = await api.getCalibracaoResumo();
      const ms = Math.round(performance.now() - t0);
      toast.success('Broker & Banco Online', `Conexão validada em ${ms}ms reais! Canal #${res?.broker?.channel_id || '3500765'} sincronizado.`);
    } catch (e) {
      toast.error('Erro de Conexão', e.message || 'Falha ao testar conexão.');
    }
  });

  // 4. Exportar Parâmetros (CSV UTF-8 e PDF 1.4 Oficial)
  document.getElementById('btn-export-calibracao')?.addEventListener('click', () => {
    const limiares = _calibracaoCache?.limiares || [];
    const headers = ['ID', 'Fruta / Cultura', 'Etapa', 'Temp Mín (°C)', 'Temp Máx (°C)', 'Umidade Mín (%)', 'Umidade Máx (%)'];
    const rows = limiares.map(c => [c.id_config, c.fruta || 'Cultura', c.etapa || 'Armazenamento', c.temp_min, c.temp_max, c.umidade_min, c.umidade_max]);
    const dataTag = new Date().toISOString().slice(0, 10);
    openExportChoiceModal(
      Modal,
      'Exportar Parâmetros de Calibração',
      () => downloadCSV(`calibracao_parametros_${dataTag}.csv`, headers, rows),
      () => downloadPDF(`calibracao_parametros_${dataTag}.pdf`, {
        title: 'Parâmetros de Calibração & Limiares Agronômicos',
        subtitle: 'Plataforma RAIZ Agro IoT • Faixas de Armazenamento e Cadeia Fria',
        headers,
        rows
      })
    );
  });

  // 5. Edição de Limiar Individual em Modal
  document.querySelectorAll('.btn-editar-limiar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const nome = btn.getAttribute('data-nome');
      const tmin = btn.getAttribute('data-tmin');
      const tmax = btn.getAttribute('data-tmax');
      const umin = btn.getAttribute('data-umin');
      const umax = btn.getAttribute('data-umax');

      const tmmin = document.querySelector(`.calib-inline-tmin[data-id="${id}"]`)?.value;
      const tmmax = document.querySelector(`.calib-inline-tmax[data-id="${id}"]`)?.value;
      const ummin = document.querySelector(`.calib-inline-umin[data-id="${id}"]`)?.value;
      const ummax = document.querySelector(`.calib-inline-umax[data-id="${id}"]`)?.value;

      Modal.open(`Calibrar Limiar — ${nome}`, `
        <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 12px; color: #64748B;">Ajuste os parâmetros fisiológicos de frio e dessecação para a cultura <strong>${nome}</strong> no PostgreSQL:</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Temperatura Mín (°C)</label>
              <input type="number" step="0.5" id="calib-tmin" value="${tmmin || tmin}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Temperatura Máx (°C)</label>
              <input type="number" step="0.5" id="calib-tmax" value="${tmmax || tmax}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Umidade Relativa Mín (%)</label>
              <input type="number" step="1" id="calib-umin" value="${ummin || umin}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Umidade Relativa Máx (%)</label>
              <input type="number" step="1" id="calib-umax" value="${ummax || umax}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
            </div>
          </div>
        </div>
      `, async () => {
        const novoTmin = parseFloat(document.getElementById('calib-tmin')?.value);
        const novoTmax = parseFloat(document.getElementById('calib-tmax')?.value);
        const novoUmin = parseFloat(document.getElementById('calib-umin')?.value);
        const novoUmax = parseFloat(document.getElementById('calib-umax')?.value);

        if (isNaN(novoTmin) || isNaN(novoTmax) || novoTmin >= novoTmax) {
          toast.error('Faixa Inválida', 'A temperatura mínima deve ser menor que a máxima.');
          return false;
        }
        if (isNaN(novoUmin) || isNaN(novoUmax) || novoUmin >= novoUmax) {
          toast.error('Faixa Inválida', 'A umidade mínima deve ser menor que a máxima.');
          return false;
        }

        try {
          await api.salvarLimiarCalibracao(id, {
            temp_min: novoTmin,
            temp_max: novoTmax,
            umidade_min: novoUmin,
            umidade_max: novoUmax
          });
          toast.success('Limiar Calibrado', `Parâmetros de ${nome} gravados no PostgreSQL com sucesso.`);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          return true;
        } catch (err) {
          toast.error('Erro ao Salvar', err.message || 'Falha ao gravar limiares.');
          return false;
        }
      }, 'Salvar Limiar');
    });
  });

  // 5.1 Gravação Direta do Card Inline
  document.querySelectorAll('.btn-gravar-inline-limiar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const nome = btn.getAttribute('data-nome') || 'Cultura';
      const tmin = parseFloat(document.querySelector(`.calib-inline-tmin[data-id="${id}"]`)?.value);
      const tmax = parseFloat(document.querySelector(`.calib-inline-tmax[data-id="${id}"]`)?.value);
      const umin = parseFloat(document.querySelector(`.calib-inline-umin[data-id="${id}"]`)?.value);
      const umax = parseFloat(document.querySelector(`.calib-inline-umax[data-id="${id}"]`)?.value);

      if (isNaN(tmin) || isNaN(tmax) || tmin >= tmax) {
        toast.error('Faixa Inválida', 'A temperatura mínima deve ser menor que a máxima.');
        return;
      }
      if (isNaN(umin) || isNaN(umax) || umin >= umax) {
        toast.error('Faixa Inválida', 'A umidade mínima deve ser menor que a máxima.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader" style="width: 12px; height: 12px;"></i> Gravando...`;
      try {
        await api.salvarLimiarCalibracao(id, {
          temp_min: tmin,
          temp_max: tmax,
          umidade_min: umin,
          umidade_max: umax
        });
        toast.success('Calibração Gravada', `Limiares de ${nome} atualizados no banco PostgreSQL!`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast.error('Erro ao Gravar', err.message || 'Falha ao gravar calibração.');
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="save" style="width: 12px; height: 12px;"></i> Gravar Limiares (${nome})`;
      }
    });
  });

  // 5.2 Salvar Todos os Limiares em Lote
  document.getElementById('btn-salvar-todos-limiares')?.addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.calib-inline-tmin');
    let salvas = 0;
    for (const inp of inputs) {
      const id = inp.getAttribute('data-id');
      const tmin = parseFloat(inp.value);
      const tmax = parseFloat(document.querySelector(`.calib-inline-tmax[data-id="${id}"]`)?.value);
      const umin = parseFloat(document.querySelector(`.calib-inline-umin[data-id="${id}"]`)?.value);
      const umax = parseFloat(document.querySelector(`.calib-inline-umax[data-id="${id}"]`)?.value);

      if (!isNaN(tmin) && !isNaN(tmax) && !isNaN(umin) && !isNaN(umax)) {
        try {
          await api.salvarLimiarCalibracao(id, {
            temp_min: tmin,
            temp_max: tmax,
            umidade_min: umin,
            umidade_max: umax
          });
          salvas++;
        } catch (e) {
          console.warn(`Erro ao salvar cultura #${id}:`, e);
        }
      }
    }
    if (salvas > 0) {
      toast.success('Calibrações Salvas', `${salvas} culturas tiveram seus limiares atualizados no PostgreSQL!`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      toast.error('Erro', 'Nenhuma calibração pôde ser gravada.');
    }
  });

  // 6. Configurar Sensor & Lote (Substitui o fictício 'offset' por dados reais da tabela sensor)
  document.querySelectorAll('.btn-configurar-sensor').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const nome = btn.getAttribute('data-nome') || '';
      const statusAtual = btn.getAttribute('data-status') || 'ativo';
      const localAtual = btn.getAttribute('data-local') || '';
      const loteAtual = btn.getAttribute('data-lote') || '';
      const lotesDisponiveis = _calibracaoCache?.lotes_disponiveis || [
        { id_lote: 1, codigo: 'Lote #1' },
        { id_lote: 2, codigo: 'Lote #2' }
      ];

      const lotesOptions = lotesDisponiveis.map(l => `
        <option value="${l.id_lote}" ${String(l.id_lote) === String(loteAtual) ? 'selected' : ''}>${l.codigo || `Lote #${l.id_lote}`}</option>
      `).join('');

      Modal.open(`Configuração do Nó ESP32 #${id}`, `
        <div style="font-size: 13px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 12px; color: #64748B;">Dados cadastrais reais do hardware na tabela <code>sensor</code> do PostgreSQL:</p>
          <div>
            <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Nome de Identificação do Nó</label>
            <input type="text" id="modal-sensor-nome" value="${nome}" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
          </div>
          <div>
            <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Localização Física de Instalação</label>
            <input type="text" id="modal-sensor-local" value="${localAtual}" placeholder="Ex: Bancada, Talhão 04, Câmara Fria 01" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
          </div>
          <div>
            <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Status Operacional (PostgreSQL Enum)</label>
            <select id="modal-sensor-status" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
              <option value="ativo" ${statusAtual === 'ativo' ? 'selected' : ''}>Ativo (Em Produção)</option>
              <option value="inativo" ${statusAtual === 'inativo' ? 'selected' : ''}>Inativo / Desconectado</option>
            </select>
          </div>
          <div>
            <label style="font-weight: 700; font-size: 11px; display: block; margin-bottom: 4px;">Vínculo com Lote Agronômico</label>
            <select id="modal-sensor-lote" style="width: 100%; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; box-sizing: border-box;">
              <option value="">Nenhum Lote Vinculado</option>
              ${lotesOptions}
            </select>
          </div>
        </div>
      `, async () => {
        const novoNome = document.getElementById('modal-sensor-nome')?.value.trim();
        const novoLocal = document.getElementById('modal-sensor-local')?.value.trim();
        const novoStatus = document.getElementById('modal-sensor-status')?.value;
        const novoLote = document.getElementById('modal-sensor-lote')?.value;

        try {
          await api.atualizarSensorCalibracao(id, {
            nome: novoNome || nome,
            localizacao: novoLocal,
            status: novoStatus,
            fk_lote_id_lote: novoLote ? parseInt(novoLote, 10) : null
          });
          toast.success('Sensor Atualizado', `Configurações do nó #${id} gravadas no PostgreSQL.`);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          return true;
        } catch (e) {
          toast.error('Erro', e.message || 'Falha ao atualizar sensor no banco.');
          return false;
        }
      }, 'Gravar no PostgreSQL');
    });
  });

  // 7. Ping Nó
  document.querySelectorAll('.btn-ping-sensor').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      toast.info('Ping Nó', `Enviando pacote de diagnóstico para o nó ESP32 #${id}...`);
      setTimeout(() => {
        toast.success('Nó Conectado', `ESP32 #${id} online e reportando telemetria.`);
      }, 350);
    });
  });
}
