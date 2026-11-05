/**
 * VIEW: PREVISÕES, MODELOS DE IA & RISCO FINANCEIRO
 */

export async function renderPrevisoes() {
  return `
    <div class="content-body">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700;">Inteligência Preditiva & Mercado</h2>
          <p style="color: #94A3B8; font-size: 14px;">Estimativa de vida útil (shelf-life), cálculo de quebra financeira por temperatura e cotações de mercado.</p>
        </div>

        <span class="badge badge-info" style="font-size: 14px; padding: 8px 16px;">
          <i data-lucide="sparkles"></i> Modelos Machine Learning Ativos
        </span>
      </div>

      <!-- Cards de Modelos de IA -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Shelf-Life Estimado (Manga)</span>
            <div class="kpi-icon-wrap green"><i data-lucide="clock"></i></div>
          </div>
          <div class="kpi-value">21 <span style="font-size: 16px; color: #94A3B8;">dias restantes</span></div>
          <div class="kpi-footer">
            <span style="color: #4ADE80;">Câmara fria mantida a 11.4°C</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Risco Financeiro Médio</span>
            <div class="kpi-icon-wrap blue"><i data-lucide="dollar-sign"></i></div>
          </div>
          <div class="kpi-value">2.4% <span style="font-size: 16px; color: #94A3B8;">perda estimada</span></div>
          <div class="kpi-footer">
            <span style="color: #38BDF8;">Risco Baixo (&lt; 5% benchmark)</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Cotação Manga Tommy (CEAGESP)</span>
            <div class="kpi-icon-wrap amber"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value">R$ 5,80 <span style="font-size: 16px; color: #94A3B8;">/ kg</span></div>
          <div class="kpi-footer">
            <span style="color: #FBBF24;">+4.2% nesta semana</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Cotação Uva Vitória</span>
            <div class="kpi-icon-wrap green"><i data-lucide="bar-chart"></i></div>
          </div>
          <div class="kpi-value">R$ 11,20 <span style="font-size: 16px; color: #94A3B8;">/ kg</span></div>
          <div class="kpi-footer">
            <span style="color: #4ADE80;">Alta demanda Europa</span>
          </div>
        </div>
      </div>

      <!-- Recomendações Automáticas do Sistema -->
      <div class="chart-card" style="margin-bottom: 28px;">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">Recomendações Agronômicas & Logísticas</h3>
            <p class="card-subtitle">Sugestões geradas por algoritmos preditivos baseados na correlação clima x fisiologia pós-colheita</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255,255,255,0.03); border-left: 4px solid #4ADE80; border-radius: 8px; padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #FFFFFF; font-size: 15px;">Ajuste do Setpoint Reefer na Rota Petrolina-Suape</strong>
              <span class="badge badge-success">Prioridade Alta</span>
            </div>
            <p style="color: #CBD5E1; font-size: 13px;">
              Devido à onda térmica de 34°C prevista para o sertão pernambucano, recomenda-se diminuir o setpoint do container para 10.8°C antes da saída da carreta para compensar a dissipação solar na lataria.
            </p>
          </div>

          <div style="background: rgba(255,255,255,0.03); border-left: 4px solid #38BDF8; border-radius: 8px; padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #FFFFFF; font-size: 15px;">Janela Ótima de Colheita de Uva (Talhão 04)</strong>
              <span class="badge badge-info">Oportunidade</span>
            </div>
            <p style="color: #CBD5E1; font-size: 13px;">
              A previsão de umidade do ar nos próximos 3 dias indica índice favorável de sólidos solúveis (Brix &gt; 17°). Recomenda-se colheita matutina até as 10h para evitar quebra térmica precoce.
            </p>
          </div>
        </div>
      </div>

    </div>
  `;
}

