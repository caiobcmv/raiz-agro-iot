import fs from 'fs';
import path from 'path';

const alertasJsPath = path.resolve('frontend/assets/js/views/alertas.js');
const alertasJsContent = fs.readFileSync(alertasJsPath, 'utf8');

const regex = /function renderGestoraAlertas\(\) \{\s*return `([\s\S]*?)`;\s*\}/;
const match = alertasJsContent.match(regex);

if (!match) {
  console.error('Não encontrou renderGestoraAlertas em alertas.js');
  process.exit(1);
}

const contentHtml = match[1].trim();

// 1. Salva em frontend/pages/alertas.content.html
const contentPath = path.resolve('frontend/pages/alertas.content.html');
fs.writeFileSync(contentPath, contentHtml + '\n', 'utf8');
console.log('alertas.content.html atualizado!');

// 2. Atualiza em frontend/pages/alertas.html
const alertasHtmlPath = path.resolve('frontend/pages/alertas.html');
let alertasHtml = fs.readFileSync(alertasHtmlPath, 'utf8');

const startMarker = '<div id="view-container">';
const endMarker = '</main>';

const startIndex = alertasHtml.indexOf(startMarker);
const endIndex = alertasHtml.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const afterStart = startIndex + startMarker.length;
  const updated = alertasHtml.substring(0, afterStart) + '\n\n' + contentHtml + '\n\n        </div>\n      ' + alertasHtml.substring(endIndex);
  
  // Limpa possíveis imports duplicados no final
  const cleanUpdated = updated.replace(/import\s*\{\s*setupAlertasEvents\s*\}\s*from[^\n]+;(\s*import\s*\{\s*setupAlertasEvents\s*\}\s*from[^\n]+;)?/g, 
    "import { setupAlertasEvents } from '/assets/js/views/alertas.js?v=20261120-live3';");

  fs.writeFileSync(alertasHtmlPath, cleanUpdated, 'utf8');
  console.log('alertas.html atualizado perfeitamente!');
} else {
  console.error('Marcadores não encontrados');
}
