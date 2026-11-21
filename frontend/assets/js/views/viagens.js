/**
 * VIEW: LOGÍSTICA DE EXPORTAÇÃO E VIAGENS REFRIGERADAS (MAPA LEAFLET)
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { downloadCSV, downloadPDF, openExportChoiceModal } from '../utils/export-utils.js';

let leafletMap = null;

export async function renderViagens() {
  const viagens = await api.getViagens();

  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Cadeia do Frio e Rotas de Exportação</h2>
          <p style="color: #94A3B8; font-size: 14px;">Rastreamento de carretas frigoríficas em rota do Vale do São Francisco aos Portos (Pecém, Suape, Salvador, Natal).</p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="btn-exportar-viagens-pdf-csv" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 700; color: #0F172A; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="download" style="width: 14px; height: 14px; color: #059669;"></i>
            <span>Exportar Manifesto (PDF/CSV)</span>
          </button>
          <span class="badge badge-success" style="font-size: 14px; padding: 8px 16px;">
            <span class="badge-dot"></span>${viagens.length} Viagens em Monitoramento
          </span>
        </div>
      </div>

      <!-- Mapa Interativo Leaflet -->
      <div class="map-card-wrapper" style="margin-bottom: 28px;">
        <div id="logistics-map"></div>
      </div>

      <!-- Lista de Cargas em Trânsito -->
      <div class="table-container">
        <div class="table-toolbar">
          <h3 class="card-title">Manifestos de Transporte Refrigerado</h3>
          <span style="font-size: 13px; color: #94A3B8;">Tempo real</span>
        </div>

        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Carga / Lote</th>
                <th>Origem</th>
                <th>Destino (Porto)</th>
                <th>Distância</th>
                <th>Temp. Reefer</th>
                <th>Risco Financeiro Estimado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${viagens.map(v => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: #FFFFFF;">Viagem #${v.id_viagem}</div>
                    <div style="font-size: 12px; color: #94A3B8;">Lote #${v.id_lote} • ${v.quantidade} ${v.unidade}</div>
                  </td>
                  <td>${v.origem_nome}</td>
                  <td>
                    <strong style="color: #38BDF8;">Porto de ${v.porto_nome} (${v.porto_uf})</strong>
                  </td>
                  <td>${v.distancia_km} km</td>
                  <td>
                    <span style="font-weight: 700; color: #4ADE80; font-size: 15px;">
                      ${v.caminhao_temp}°C
                    </span>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: #FBBF24;">R$ ${v.risco_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div style="font-size: 11px; color: #94A3B8;">Probab: ${Math.round(v.risco_probabilidade * 100)}% (${v.nivel_risco})</div>
                  </td>
                  <td>
                    <span class="badge ${v.status_viagem === 'Em trânsito' ? 'badge-info' : 'badge-warning'}">
                      <span class="badge-dot"></span>${v.status_viagem}
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

export async function setupViagensEvents() {
  const mapEl = document.getElementById('logistics-map');
  if (!mapEl || typeof L === 'undefined') return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  // Coordenadas centrais do Nordeste / Vale do São Francisco
  leafletMap = L.map('logistics-map').setView([-8.5, -38.5], 6);

  // Cartografia dark mode elegante
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 18,
  }).addTo(leafletMap);

  const viagens = await api.getViagens();

  // Portos principais
  const portos = [
    { nome: 'Porto de Suape (PE)', lat: -8.3900, lng: -34.9600 },
    { nome: 'Porto do Pecém (CE)', lat: -3.5400, lng: -38.8000 },
    { nome: 'Porto de Salvador (BA)', lat: -12.9700, lng: -38.5100 },
    { nome: 'Porto de Natal (RN)', lat: -5.7800, lng: -35.2000 }
  ];

  // Adiciona marcadores de portos
  portos.forEach(p => {
    L.circleMarker([p.lat, p.lng], {
      color: '#38BDF8',
      fillColor: '#0284C7',
      fillOpacity: 0.9,
      radius: 9
    }).addTo(leafletMap).bindPopup(`<strong>${p.nome}</strong><br>Terminal Frutícola de Exportação`);
  });

  // Origem: Vale do São Francisco
  const origem = [-9.3891, -40.5027];
  L.circleMarker(origem, {
    color: '#16A34A',
    fillColor: '#22C55E',
    fillOpacity: 0.9,
    radius: 11
  }).addTo(leafletMap).bindPopup('<strong>Fazenda Vale Frutas / Packing House</strong><br>Petrolina - PE / Juazeiro - BA');

  // Desenha rotas e carretas
  viagens.forEach(v => {
    if (v.porto_lat && v.porto_lng) {
      const rota = [origem, [v.porto_lat, v.porto_lng]];
      L.polyline(rota, {
        color: '#16A34A',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8'
      }).addTo(leafletMap);

      // Posição estimada da carreta no trajeto (ponto médio)
      const latMid = (origem[0] + v.porto_lat) / 2;
      const lngMid = (origem[1] + v.porto_lng) / 2;

      L.marker([latMid, lngMid]).addTo(leafletMap)
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #15803D;">Carreta Reefer #${v.id_viagem}</strong><br>
            Carga: Lote #${v.id_lote} (${v.quantidade} ${v.unidade})<br>
            Temp. Atual: <strong>${v.caminhao_temp}°C</strong><br>
            Destino: Porto de ${v.porto_nome}
          </div>
        `);
    }
  });

  // Exportar Manifesto de Viagens (PDF & CSV dedicados)
  document.getElementById('btn-exportar-viagens-pdf-csv')?.addEventListener('click', () => {
    const headers = ['Viagem', 'Lote', 'Volume', 'Origem', 'Porto Destino', 'Distancia (km)', 'Temp Reefer (C)', 'Status'];
    const rows = (viagens || []).map(v => [
      `#${v.id_viagem}`,
      `Lote #${v.id_lote ?? v.lote?.id_lote ?? '-'}`,
      `${v.quantidade ?? v.lote?.quantidade ?? '-'} ${v.unidade ?? v.lote?.unidade ?? ''}`,
      v.origem_nome ?? v.origem ?? 'Petrolina - PE',
      `${v.porto_nome ?? v.destino?.nome ?? '-'} (${v.porto_uf ?? v.destino?.uf ?? ''})`,
      v.distancia_km ?? '-',
      v.caminhao_temp ?? '-',
      v.status_viagem ?? v.status ?? 'Em transito'
    ]);
    const dataTag = new Date().toISOString().slice(0, 10);
    openExportChoiceModal(
      Modal,
      'Exportar Manifesto de Logística & Cadeia Fria',
      () => {
        downloadCSV(`manifesto_viagens_cadeia_fria_${dataTag}.csv`, headers, rows);
        toast.success('CSV Exportado', `manifesto_viagens_cadeia_fria_${dataTag}.csv baixado.`);
      },
      () => {
        downloadPDF(`manifesto_viagens_cadeia_fria_${dataTag}.pdf`, {
          title: 'Manifesto de Logística & Cadeia do Frio',
          subtitle: 'Rotas Refrigeradas do Vale do São Francisco aos Portos de Exportação',
          headers,
          rows
        });
        toast.success('PDF Exportado', `manifesto_viagens_cadeia_fria_${dataTag}.pdf baixado.`);
      }
    );
  });
}

