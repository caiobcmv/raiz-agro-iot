const fs = require('fs');

// Read alertas.js
const alertasJs = fs.readFileSync('frontend/assets/js/views/alertas.js', 'utf8');

// Extract renderGestoraAlertas() content
const match = alertasJs.match(/function renderGestoraAlertas\(\) \{\s*return `([\s\S]*?)`;\s*\n\}/);
if (!match) {
  console.error('Could not extract renderGestoraAlertas');
  process.exit(1);
}

let contentHtml = match[1];

// Save alertas.content.html
fs.writeFileSync('frontend/pages/alertas.content.html', contentHtml, 'utf8');
console.log('Saved alertas.content.html');

// Read existing alertas.html
let fullHtml = fs.readFileSync('frontend/pages/alertas.html', 'utf8');

// Replace view-container content
const regex = /<div id="view-container">[\s\S]*?<\/main>/;
const replacement = `<div id="view-container">\n${contentHtml}\n          </div>\n        </main>`;

if (regex.test(fullHtml)) {
  fullHtml = fullHtml.replace(regex, replacement);
  // Also update header subtitle if needed
  fullHtml = fullHtml.replace(
    /<h2>Central de Alertas & Incidentes[\s\S]*?<\/header>/,
    `<h2>Central de Alertas & Incidentes <span style="display:inline-block;width:7px;height:7px;background:#10B981;border-radius:2px;margin-left:6px;vertical-align:middle;"></span></h2>
            <p>Monitoramento em tempo real de desvios térmicos em contêineres reefer, estresse hídrico no campo e gatilhos automatizados.</p>
          </div>
          <div class="header-right-controls">
            <div class="date-selector-btn">
              <i data-lucide="calendar" style="width: 15px; height: 15px; color: #71807A;"></i>
              <span>22 de setembro de 2026</span>
            </div>
            <a href="/pages/alertas.html" class="header-bell-btn" title="Ver Alertas Ativos">
              <i data-lucide="bell" style="width: 18px; height: 18px; color: #71807A;"></i>
              <span class="header-bell-badge">2</span>
            </a>
            <div class="user-profile-header-pill">
              <div class="avatar-initials-pill" style="background:#D1FAE5; border:1.5px solid #10B981; color:#065F46;">MC</div>
              <div class="profile-name-role">
                <span class="profile-name">Maria Clara</span>
                <span class="profile-role">Gestora de Operações</span>
              </div>
            </div>
          </div>
        </header>`
  );
  fullHtml = fullHtml.replace(/alertas\.js\?v=[^"']*/g, 'alertas.js?v=20261119-live9');
  fs.writeFileSync('frontend/pages/alertas.html', fullHtml, 'utf8');
  console.log('Saved frontend/pages/alertas.html');
} else {
  console.error('Regex did not match in alertas.html');
}
