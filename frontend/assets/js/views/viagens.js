/**
 * VIEW: LOGÍSTICA DE EXPORTAÇÃO & VIAGENS REFRIGERADAS (MAPA LEAFLET)
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';

let leafletMap = null;

export async function renderViagens() {
  const viagens = await api.getViagens();

  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Cadeia do Frio & Rotas de Exportação</h2>
          <p style="color: #94A3B8; font-size: 14px;">Rastreamento de carretas frigoríficas em rota do Vale do São Francisco aos Portos (Pecém, Suape, Salvador, Natal).</p>
        </div>

        <span class="badge badge-success" style="font-size: 14px; padding: 8px 16px;">
          <span class="badge-dot"></span>${viagens.length} Viagens em Monitoramento
        </span>
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
}

