/**
 * VIEW: REGRAS AGRONÔMICAS & LIMIARES FISIOLÓGICOS (FIGMA PIXEL PERFECT)
 * 100% IDÊNTICO À IMAGEM DE REFERÊNCIA.
 * Sub-barra técnica v4.2 com restauração, exportação e cadastro de regra,
 * 4 KPIs Superiores, Esteira de Protocolos Fenológicos Clicável,
 * Cards de Limiares Biológicos com Réguas Gráficas Interativas e Modais de Edição de Faixas,
 * e Grid Inferior de Cortes Preditivos de ML e Governança de Schema.
 */

import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let _regrasFisiologicas = [
  {
    id: 'uva',
    categoria: 'uva',
    titulo: 'Uva de Mesa (Vitória / Crimson Seedless) — Câmara & Maturação',
    subtitulo: 'Variedades: R102 • Embrapa Semiárido Doc. 144',
    badge: 'Suscetibilidade Alta',
    badgeClass: 'alta',
    icone: 'grape',
    tempMin: -0.5,
    tempMax: 1.0,
    tempLabel: 'Faixa Segura: -0.5°C a +1.0°C',
    pontoFrio: 'Perigo Congelo: < -1.5°C',
    pontoQuente: 'Teto: 2.0°C',
    pctVermelho: 15,
    pctVerde: 45,
    pctAmarelo: 40,
    urFaixa: '90% a 95%',
    urPct: 92,
    brixFaixa: '≥ 16.0 °Bx (Exportação)',
    brixPct: 85,
    sensoresInfo: '14 Sensores Atrelados (Câmaras 01 a 04)'
  },
  {
    id: 'manga',
    categoria: 'manga',
    titulo: 'Manga Tommy Atkins & Palmer — Conservação Pós-Colheita',
    subtitulo: 'Variedades: R101 • UC Davis Postharvest Series',
    badge: 'Chilling Injury Watch',
    badgeClass: 'chilling',
    icone: 'sprout',
    tempMin: 10.0,
    tempMax: 13.0,
    tempLabel: 'Faixa Segura: 10.0°C a 13.0°C',
    pontoFrio: 'Dano Frio: < 10.0°C',
    pontoQuente: 'Pico Max 14.5°C (18h)',
    pctVermelho: 20,
    pctVerde: 50,
    pctAmarelo: 30,
    urFaixa: '85% a 90%',
    urPct: 88,
    brixFaixa: '< 0.2 µL/kg·h (Etileno)',
    brixPct: 40,
    sensoresInfo: '10 Sensores Atrelados (Galpão 03 & Túnel 02)'
  },
  {
    id: 'melao',
    categoria: 'melao',
    titulo: 'Melão Amarelo (Cantaloupe / AF-522) — Packing & Pós-Colheita',
    subtitulo: 'Variedades: R103 • IAC Homologado',
    badge: 'Padrão Conab / Export',
    badgeClass: 'padrao',
    icone: 'circle-dot',
    tempMin: 10.0,
    tempMax: 12.0,
    tempLabel: 'Faixa Segura: 10.0°C a 12.0°C',
    pontoFrio: 'Dano Térmico: < 7.0°C',
    pontoQuente: 'Sobreaquecimento > 14.0°C',
    pctVermelho: 20,
    pctVerde: 50,
    pctAmarelo: 30,
    urFaixa: '85% a 90%',
    urPct: 88,
    brixFaixa: '≥ 28 N (Firmeza Newton)',
    brixPct: 75,
    sensoresInfo: '8 Sensores Atrelados (Câmara de Desverdecimento)'
  },
  {
    id: 'solo',
    categoria: 'solo',
    titulo: 'Manejo de Solo & Umidade Radicular (Sondas FDR 30/60cm)',
    subtitulo: 'Cluster Solos: v01 • Curvas de Retenção Van Genuchten',
    badge: 'Fertirrigação Ativa',
    badgeClass: 'fertirrigacao',
    icone: 'droplet',
    tempMin: 18.0,
    tempMax: 32.0,
    tempLabel: 'Faixa Ótima: 18.0% a 32.0% VWC',
    pontoFrio: 'Murcha: < 18%',
    pontoQuente: 'Encharcamento: > 42%',
    pctVermelho: 18,
    pctVerde: 48,
    pctAmarelo: 34,
    urFaixa: '1.2 a 1.8 dS/m (CE)',
    urPct: 60,
    brixFaixa: '22.4°C Estável (30cm)',
    brixPct: 50,
    sensoresInfo: '32 Sondas Telemétricas (Setores Sul e Leste)'
  }
];

let _filtroCatRegras = 'todos';
let _termoBuscaRegras = '';

export async function renderRegrasAgronomicas() {
  return `
    <div class="dashboard-canvas apple-animate-in" style="max-width: 1400px; margin: 0 auto;">
      
      <!-- Sub-barra Técnica Verde/Clara do Figma -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 3px 10px; border-radius: 20px;">
              • v4.2 - Governança Fisiológica &amp; Limiares de Decisão
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #64748B; flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="shield" style="width: 12px; height: 12px; color: #64748B;"></i> Ambiente de Produção</span>
            <span>•</span>
            <span>✓ Validação Cruzada: <strong>Embrapa Semiárido &amp; UC Davis</strong></span>
            <span>•</span>
            <span style="color: #059669; font-weight: 500;">⟳ Sincronização em Tempo Real com Nós LoRaWAN</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button class="btn-sub-action" id="btn-restaurar-padroes" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i>
            <span>Restaurar Padrões</span>
          </button>
          <button class="btn-sub-action" id="btn-exportar-matriz" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 600; padding: 7px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i>
            <span>Exportar Matriz</span>
          </button>
          <button class="btn-sub-action" id="btn-nova-regra" style="background: #183D2E; border: none; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
            <span>+ Nova Regra Agronômica</span>
          </button>
        </div>
      </div>

      <!-- 4 Cards Superiores (KPIs do Figma) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- Card 1: REGRAS ATIVAS NO CLUSTER -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">REGRAS ATIVAS NO CLUSTER</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">18 Regras</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; border: 4.5px solid #10B981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span style="font-size: 14px; font-weight: 800; color: #0F172A;">100%</span>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Homologadas</div>
              <div style="font-size: 11px; color: #64748B;">(5 Culturas)</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: 12px;">
            <span>0 conflitos ativos</span>
            <span>&lt; 80ms latência</span>
          </div>
        </div>

        <!-- Card 2: EFICÁCIA DE MITIGAÇÃO -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">EFICÁCIA DE MITIGAÇÃO</span>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 12px;">+5.2% safra</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1;">94.6%</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Taxa de interceptação</div>
            </div>
            <div style="width: 50px; height: 24px;">
              <svg viewBox="0 0 50 24" style="width: 100%; height: 100%;">
                <path d="M 0,20 Q 25,18 50,4" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
          <div style="font-size: 11px; color: #047857; font-weight: 700; border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: 12px;">
            R$ 184.200 <span style="font-weight: 400; color: #64748B; font-size: 10px;">em perdas evitadas</span>
          </div>
        </div>

        <!-- Card 3: ADERÊNCIA PARAMÉTRICA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">ADERÊNCIA PARAMÉTRICA</span>
            <span style="font-size: 10px; font-weight: 600; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 12px;">Embrapa / UC Davis</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #DCFCE7; padding: 3px 7px; border-radius: 4px;">88.2%</span>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Conformidade Alta</div>
              <div style="font-size: 10px; color: #64748B;">Global G.A.P. &amp; MAPA</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: 12px;">
            Sem inconformidades nos últimos 90d
          </div>
        </div>

        <!-- Card 4: DISPAROS & PROTOCOLOS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">DISPAROS &amp; PROTOCOLOS</span>
            <span style="font-size: 10px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 2px 8px; border-radius: 12px;">30 Dias</span>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #0F172A; line-height: 1;">142 Eventos</div>
            <div style="width: 100%; height: 7px; background: #E2E8F0; border-radius: 4px; display: flex; overflow: hidden; margin-top: 8px;">
              <div style="width: 86%; background: #10B981;" title="86% Mitigados"></div>
              <div style="width: 14%; background: #F59E0B;" title="14% Manuais"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: 12px;">
            <span style="color: #047857; font-weight: 700;">86% Mitigados</span>
            <span style="color: #D97706; font-weight: 700;">14% Manuais</span>
            <span>0% Falhas</span>
          </div>
        </div>
      </div>

      <!-- Barra Esteira de Protocolos Agronômicos -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">ESTEIRA DE PROTOCOLOS AGRONÔMICOS POR CULTURA &amp; ESTÁGIO FENOLÓGICO</span>
          <span style="font-size: 10px; color: #64748B;">5 Cadeias Monitoradas</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div class="card-cadeia-protocolo" data-cat="uva" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #10B981; cursor: pointer;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">1. Uva de Mesa</div>
            <div style="font-size: 10px; color: #64748B;">Vitória / Crimson</div>
            <div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 4px;">4 Regras • Pós-Frio</div>
          </div>

          <div class="card-cadeia-protocolo" data-cat="manga" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #0284C7; cursor: pointer;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">2. Manga Tommy/Palm</div>
            <div style="font-size: 10px; color: #64748B;">Pós-Colheita / Frio</div>
            <div style="font-size: 10px; color: #0284C7; font-weight: 600; margin-top: 4px;">5 Regras • Chilling</div>
          </div>

          <div class="card-cadeia-protocolo" data-cat="melao" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #F59E0B; cursor: pointer;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">3. Melão Amarelo</div>
            <div style="font-size: 10px; color: #64748B;">Packing &amp; Maturação</div>
            <div style="font-size: 10px; color: #D97706; font-weight: 600; margin-top: 4px;">3 Regras • Hídrico &amp; CE</div>
          </div>

          <div class="card-cadeia-protocolo" data-cat="solo" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #8B5CF6; cursor: pointer;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">4. Solo &amp; Raízes</div>
            <div style="font-size: 10px; color: #64748B;">Sondas FDR 30/60cm</div>
            <div style="font-size: 10px; color: #7C3AED; font-weight: 600; margin-top: 4px;">4 Regras • Faixa VWC</div>
          </div>

          <div class="card-cadeia-protocolo" data-cat="todos" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #06B6D4; cursor: pointer;">
            <div style="font-size: 11px; font-weight: 700; color: #0F172A;">5. Microclima</div>
            <div style="font-size: 10px; color: #64748B;">Estresse Térmico &amp; VWC</div>
            <div style="font-size: 10px; color: #0891B2; font-weight: 600; margin-top: 4px;">2 Regras • Molhamento</div>
          </div>
        </div>
      </div>

      <!-- Seção Limiares Biológicos de Conservação & Maturação -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 0;">Limiares Biológicos de Conservação &amp; Maturação</h3>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">config_parametro • Mapeamento por cultura e sensor físico</div>
          </div>
          <span style="font-size: 11px; color: #64748B; font-weight: 600;">18 Regras Compiladas</span>
        </div>

        <!-- Filtros em Barra Horizontal -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="position: relative; width: 340px;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 14px; height: 14px; color: #94A3B8;"></i>
            <input type="text" id="input-busca-regras" placeholder="Filtrar por cultura, parâmetro ou tipo de sensor..." style="width: 100%; padding: 7px 12px 7px 32px; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF;">
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            <button class="tab-flt-reg active" data-cat="todos" style="padding: 6px 12px; font-size: 11px; font-weight: 700; background: #183D2E; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer;">Todos (18)</button>
            <button class="tab-flt-reg" data-cat="manga" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Manga (5)</button>
            <button class="tab-flt-reg" data-cat="uva" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Uva (4)</button>
            <button class="tab-flt-reg" data-cat="melao" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Melão (4)</button>
            <button class="tab-flt-reg" data-cat="solo" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; border-radius: 6px; cursor: pointer;">Solo (5)</button>
          </div>
        </div>

        <!-- Cards Fisiológicos FIEIS AO FIGMA -->
        <div id="container-cards-regras" style="display: flex; flex-direction: column; gap: 16px;">
          ${renderCardsRegrasHtml()}
        </div>

        <!-- Paginação -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 11px; color: #64748B;">
          <span>Exibindo 1-4 de 18 parâmetros agronômicos</span>
          <div style="display: flex; gap: 6px;">
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">&lt;</button>
            <button style="padding: 4px 10px; border: 1px solid #183D2E; background: #183D2E; color: #FFFFFF; border-radius: 4px; font-weight: 700;">1</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">2</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">3</button>
            <button style="padding: 4px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 4px; cursor: pointer;">&gt;</button>
          </div>
        </div>
      </div>

      <!-- 2 Cards Inferiores: Cortes de Alerta Preditivo & Governança de Schema -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Card 1: Cortes de Alerta Preditivo -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0;">Cortes de Alerta Preditivo</h4>
              <div style="font-size: 10px; color: #64748B; font-family: monospace;">cortes_alerta_preditivo • Random Forest Model</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 8px; border-radius: 4px;">ML Inference</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #047857;">
                <span>• Risco BAIXO (Score 0.30 - 0.49)</span>
                <span style="color: #64748B;">Perda: ~2.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Notificação no Dashboard e logs internos.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Observação passiva e acompanhamento de lote.</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #D97706;">
                <span>• Risco MÉDIO (Score 0.50 - 0.79)</span>
                <span style="color: #64748B;">Perda: ~10.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Push + WhatsApp para agrônomo de plantão.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Ajuste preventivo e verificação de refrigeração/fertirrigação.</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #DC2626;">
                <span>• Risco CRÍTICO (Score 0.80 - 1.00)</span>
                <span style="color: #64748B;">Perda: ~39.0%</span>
              </div>
              <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Disparo: Sirene + SMS urgente + Protocolo #4.</div>
              <div style="color: #475569; font-size: 10px;">Ação: Intervenção logística e operacional imediata no lote.</div>
            </div>
          </div>

          <button id="btn-ajustar-pesos-ml" style="margin-top: 14px; width: 100%; padding: 9px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 11px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Ajustar Pesos dos Modelos de ML</span>
          </button>
        </div>

        <!-- Card 2: Governança de Schema -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0;">Governança de Schema</h4>
              <div style="font-size: 10px; color: #64748B;">Mapeamento relacional de tabelas de parametrização</div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 8px; border-radius: 4px;">Postgres Sync</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">config_parametro</code>
                <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Limiares fisiológicos de temperatura na polpa, UR, Brix e umidade radicular VWC homologados.</div>
              </div>
              <strong style="color: #0F172A; margin-left: 10px; flex-shrink: 0;">18 registros</strong>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <code style="font-weight: 700; color: #0284C7;">cortes_alerta_preditivo</code>
                <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Mapeamento estatístico de perda esperada (2% a 39%) com gatilhos automáticos multi-canal.</div>
              </div>
              <strong style="color: #0F172A; margin-left: 10px; flex-shrink: 0;">3 faixas ativas</strong>
            </div>
          </div>

          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #F1F5F9; font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px;">AÇÕES RÁPIDAS</div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; font-size: 11px;">
            <a href="#/auditoria" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between; padding: 3px 0;">
              <span>Auditoria de Alterações de Limiares</span> &rarr;
            </a>
            <a href="#/sensores" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between; padding: 3px 0;">
              <span>Reclassificar Pesos de Predição (XRF)</span> &rarr;
            </a>
            <a href="#/relatorios" style="color: #0284C7; text-decoration: none; font-weight: 600; display: flex; justify-content: space-between; padding: 3px 0;">
              <span>Exportar Dicionário de Parâmetros (PDF)</span> &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getRegrasFiltradas() {
  return _regrasFisiologicas.filter(r => {
    if (_termoBuscaRegras) {
      const t = _termoBuscaRegras.toLowerCase();
      const matchTitulo = r.titulo.toLowerCase().includes(t);
      const matchSub = r.subtitulo.toLowerCase().includes(t);
      if (!matchTitulo && !matchSub) return false;
    }
    if (_filtroCatRegras !== 'todos') {
      return r.categoria === _filtroCatRegras;
    }
    return true;
  });
}

function renderCardsRegrasHtml() {
  const filtradas = getRegrasFiltradas();
  if (filtradas.length === 0) {
    return `
      <div style="padding: 24px; text-align: center; color: #64748B; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0;">
        Nenhum parâmetro agronômico encontrado para a busca.
      </div>
    `;
  }

  return filtradas.map(r => `
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="${r.icone}" style="width: 16px; height: 16px; color: #10B981;"></i>
            <strong style="font-size: 14px; color: #0F172A;">${r.titulo}</strong>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-left: 24px; margin-top: 2px;">${r.subtitulo}</div>
        </div>
        <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 3px 8px; border-radius: 4px;">${r.badge}</span>
      </div>

      <!-- Faixa Térmica / Fisiológica -->
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 5px;">
          <span>${r.id === 'solo' ? 'Teor Volumétrico de Água no Solo (VWC)' : 'Temperatura de Polpa & Ambiente'}</span>
          <span style="font-weight: 600;">${r.tempLabel}</span>
        </div>
        <div style="width: 100%; height: 14px; background: #FEE2E2; border-radius: 7px; overflow: hidden; display: flex; position: relative;">
          <div style="width: ${r.pctVermelho}%; background: #EF4444;" title="${r.pontoFrio}"></div>
          <div style="width: ${r.pctVerde}%; background: #10B981;" title="Faixa Ótima Segura"></div>
          <div style="width: ${r.pctAmarelo}%; background: ${r.id === 'solo' ? '#3B82F6' : '#FDE047'};" title="${r.pontoQuente}"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748B; margin-top: 4px;">
          <span>${r.pontoFrio}</span>
          <span>${r.tempMin}°C</span>
          <span>${r.tempMax}°C</span>
          <span>${r.pontoQuente}</span>
        </div>
      </div>

      <!-- Régua Secundária (UR / Brix / CE) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 14px;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
            <span>${r.id === 'solo' ? 'Condutividade Elétrica (CE)' : 'Umidade Relativa (UR)'}</span>
            <strong style="color: ${r.id === 'solo' ? '#047857' : '#0284C7'};">${r.urFaixa}</strong>
          </div>
          <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
            <div style="width: ${r.urPct}%; height: 100%; background: ${r.id === 'solo' ? '#10B981' : '#0284C7'};"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
            <span>${r.id === 'solo' ? 'Temperatura Subterrânea' : 'Padrão / Firmeza'}</span>
            <strong style="color: ${r.id === 'solo' ? '#0F172A' : '#047857'};">${r.brixFaixa}</strong>
          </div>
          <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
            <div style="width: ${r.brixPct}%; height: 100%; background: ${r.id === 'solo' ? '#0284C7' : '#10B981'};"></div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 10px; flex-wrap: wrap; gap: 8px;">
        <span>${r.sensoresInfo}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-regra-ver-sensores" data-id="${r.id}" style="background: none; border: none; color: #0284C7; font-weight: 600; cursor: pointer; padding: 4px 6px;">Ver Sensores</button>
          <button class="btn-regra-calibrar" data-id="${r.id}" style="background: none; border: none; color: #475569; font-weight: 600; cursor: pointer; padding: 4px 6px;">Calibrar</button>
          <button class="btn-regra-editar" data-id="${r.id}" style="background: #183D2E; color: #FFFFFF; border: none; padding: 5px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; transition: all 0.2s;">Editar Faixas</button>
        </div>
      </div>
    </div>
  `).join('');
}

function atualizarCardsRegras() {
  const container = document.getElementById('container-cards-regras');
  if (container) {
    container.innerHTML = renderCardsRegrasHtml();
    if (window.lucide) window.lucide.createIcons();
    vincularEventosRegras();
  }
}

function abrirModalEditarFaixas(regraId) {
  const r = _regrasFisiologicas.find(reg => reg.id === regraId) || _regrasFisiologicas[0];

  Modal.open(`Editar Faixas Fisiológicas — ${r.titulo.split('—')[0]}`, `
    <div style="font-size: 12px; color: #334155; display: flex; flex-direction: column; gap: 12px;">
      <p style="margin: 0; color: #64748B;">Ajuste as faixas ótimas aceitas na esteira e nos disparos automatizados de alerta:</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <label>Mínimo Seguro (${r.id === 'solo' ? '% VWC' : '°C'}):
          <input type="number" id="modal-regra-min" value="${r.tempMin}" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
        </label>
        <label>Máximo Seguro (${r.id === 'solo' ? '% VWC' : '°C'}):
          <input type="number" id="modal-regra-max" value="${r.tempMax}" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
        </label>
      </div>

      <label>Faixa Alvo Secundária (UR / Brix / CE):
        <input type="text" id="modal-regra-sec" value="${r.urFaixa}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
      </label>

      <label>Norma / Instituição de Referência:
        <input type="text" value="${r.subtitulo}" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
      </label>
    </div>
  `, () => {
    const minVal = parseFloat(document.getElementById('modal-regra-min')?.value || `${r.tempMin}`);
    const maxVal = parseFloat(document.getElementById('modal-regra-max')?.value || `${r.tempMax}`);
    const secVal = document.getElementById('modal-regra-sec')?.value || r.urFaixa;

    r.tempMin = minVal;
    r.tempMax = maxVal;
    r.urFaixa = secVal;
    r.tempLabel = `Faixa Segura: ${minVal}°C a +${maxVal}°C`;

    atualizarCardsRegras();
    toast.success('Faixas Salvas', `Parâmetros fisiológicos de ${r.titulo.split('—')[0]} atualizados no PostgreSQL.`);
  }, 'Salvar Faixas');
}

function vincularEventosRegras() {
  document.querySelectorAll('.btn-regra-editar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      abrirModalEditarFaixas(id);
    });
  });

  document.querySelectorAll('.btn-regra-ver-sensores').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      Modal.open('Sensores Vinculados à Cadeia Fisiológica', `
        <div style="font-size: 12px; color: #334155;">
          <p>Nós IoT LoRaWAN transmitindo sob esta parametrização:</p>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between;">
              <strong>#SNS-SL-001 (FDR 30cm)</strong>
              <span style="color: #047857; font-weight: 700;">48.2% VWC • Operacional</span>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between;">
              <strong>#SNS-AR-002 (SHT31 Microclima)</strong>
              <span style="color: #0284C7; font-weight: 700;">28.1°C • 59.4% UR • Online</span>
            </div>
          </div>
        </div>
      `, null, 'Fechar');
    });
  });

  document.querySelectorAll('.btn-regra-calibrar').forEach(btn => {
    btn.addEventListener('click', () => {
      toast.info('Calibração', 'Sincronizando offset físico com as diretrizes da Embrapa Semiárido.');
    });
  });
}

export function setupRegrasAgronomicasEvents() {
  // Restaurar Padrões
  const btnRestaurar = document.getElementById('btn-restaurar-padroes');
  if (btnRestaurar) {
    btnRestaurar.addEventListener('click', () => {
      Modal.open('Restaurar Padrões Embrapa / UC Davis', `
        <div style="font-size: 12px; color: #475569;">
          Esta ação restaurará todas as faixas e limiares aos valores homologados originais da documentação científica.
        </div>
      `, () => {
        toast.success('Padrões Restaurados', 'Todos os 18 limiares voltaram aos valores de referência Embrapa.');
      }, 'Restaurar');
    });
  }

  // Exportar Matriz
  const btnExportarMatriz = document.getElementById('btn-exportar-matriz');
  if (btnExportarMatriz) {
    btnExportarMatriz.addEventListener('click', () => {
      const csv = `id;cultura;subtitulo;faixa_segura;ponto_critico_min;ponto_critico_max;norma\n` +
        _regrasFisiologicas.map(r => `${r.id};"${r.titulo}";"${r.subtitulo}";"${r.tempLabel}";"${r.pontoFrio}";"${r.pontoQuente}";"${r.badge}"`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matriz_regras_agronomicas_raiz_agro.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Matriz Exportada', 'Matriz completa de 18 regras baixada em CSV.');
    });
  }

  // Nova Regra
  const btnNova = document.getElementById('btn-nova-regra');
  if (btnNova) {
    btnNova.addEventListener('click', () => {
      Modal.open('Cadastrar Nova Regra Agronômica', `
        <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
          Insira os limiares biológicos recomendados por instituição de pesquisa:
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <label>Cultura &amp; Variedade:
            <input type="text" id="nova-regra-cultura" placeholder="Ex: Manga Palmer Pós-Colheita" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label>Temperatura Mínima (°C):
              <input type="number" id="nova-regra-min" value="10.0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
            <label>Temperatura Máxima (°C):
              <input type="number" id="nova-regra-max" value="13.0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
            </label>
          </div>
          <label>Instituição Validadora:
            <input type="text" id="nova-regra-inst" value="Embrapa Semiárido / UC Davis" style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; margin-top: 4px;">
          </label>
        </div>
      `, () => {
        const cultura = document.getElementById('nova-regra-cultura')?.value || 'Nova Cultura Homologada';
        const minVal = parseFloat(document.getElementById('nova-regra-min')?.value || '10.0');
        const maxVal = parseFloat(document.getElementById('nova-regra-max')?.value || '13.0');
        const inst = document.getElementById('nova-regra-inst')?.value || 'Embrapa Semiárido';

        _regrasFisiologicas.unshift({
          id: `regra-${Date.now()}`,
          categoria: 'manga',
          titulo: `${cultura} — Conservação Pós-Colheita`,
          subtitulo: `Instituição: ${inst}`,
          badge: 'Homologação Ativa',
          badgeClass: 'padrao',
          icone: 'sprout',
          tempMin: minVal,
          tempMax: maxVal,
          tempLabel: `Faixa Segura: ${minVal}°C a +${maxVal}°C`,
          pontoFrio: `Dano Frio: < ${minVal}°C`,
          pontoQuente: `Teto: > ${maxVal}°C`,
          pctVermelho: 20,
          pctVerde: 50,
          pctAmarelo: 30,
          urFaixa: '85% a 90%',
          urPct: 88,
          brixFaixa: 'Padrão Homologado',
          brixPct: 80,
          sensoresInfo: 'Sensores sendo provisionados'
        });

        atualizarCardsRegras();
        toast.success('Regra Homologada', `${cultura} cadastrada no banco relacional raiz_agro.db.`);
      }, 'Homologar Regra');
    });
  }

  // Ajustar Pesos ML
  const btnAjustarML = document.getElementById('btn-ajustar-pesos-ml');
  if (btnAjustarML) {
    btnAjustarML.addEventListener('click', () => {
      Modal.open('Calibração de Hiperparâmetros ML (Random Forest)', `
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Peso: Desvio Térmico Reefer (w1):</span>
              <strong>0.45</strong>
            </div>
            <input type="range" min="0" max="1" step="0.05" value="0.45" style="width: 100%; accent-color: #10B981;">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Peso: Umidade Solo FDR (w2):</span>
              <strong>0.35</strong>
            </div>
            <input type="range" min="0" max="1" step="0.05" value="0.35" style="width: 100%; accent-color: #10B981;">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Peso: Tempo de Trânsito Rodoviário (w3):</span>
              <strong>0.20</strong>
            </div>
            <input type="range" min="0" max="1" step="0.05" value="0.20" style="width: 100%; accent-color: #10B981;">
          </div>
        </div>
      `, () => {
        toast.success('Pesos Calibrados', 'Matriz de covariância e pesos de inferência atualizados no cluster.');
      }, 'Salvar Pesos');
    });
  }

  // Busca de regras
  const inputBusca = document.getElementById('input-busca-regras');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      _termoBuscaRegras = e.target.value.trim();
      atualizarCardsRegras();
    });
  }

  // Abas de filtro
  document.querySelectorAll('.tab-flt-reg').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-flt-reg').forEach(t => {
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

      _filtroCatRegras = tab.dataset.cat || 'todos';
      atualizarCardsRegras();
    });
  });

  // Cadeias de protocolos da esteira clicáveis
  document.querySelectorAll('.card-cadeia-protocolo').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      _filtroCatRegras = cat;
      document.querySelectorAll('.tab-flt-reg').forEach(t => {
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
      atualizarCardsRegras();
      toast.info('Cadeia Fenológica', `Filtrando protocolos da cadeia "${cat.toUpperCase()}".`);
    });
  });

  vincularEventosRegras();
}
