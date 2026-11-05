/**
 * RAIZ Agro IoT - Servidor Unificado (Frontend SPA + Backend API Integrado)
 * Usa apenas Node.js nativo (sem dependências externas).
 * - Serve os arquivos estáticos e as páginas HTML em: http://localhost:5173
 * - Fornece API REST FastAPI-compatível na porta 8000 e via /api/* na porta 5173
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

// Inicia também o Backend API na porta 8000
try {
  require('./backend-node/server-api.js');
} catch (e) {
  console.warn('Aviso ao iniciar backend 8000:', e.message);
}

const PORT    = 5173;
const ROOTDIR = path.resolve(__dirname, 'frontend');

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css; charset=utf-8',
  '.js'   : 'application/javascript; charset=utf-8',
  '.mjs'  : 'application/javascript; charset=utf-8',
  '.json' : 'application/json; charset=utf-8',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.png'  : 'image/png',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff' : 'font/woff',
  '.ttf'  : 'font/ttf',
  '.map'  : 'application/json',
};

// Endpoints da API integrados para fácil acesso também na porta 5173
function handleApiProxy(req, res, targetPath) {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 8000,
    path: targetPath,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Backend API temporariamente indisponível' }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let rawPath = decodeURIComponent(url.parse(req.url).pathname || '/');
  let cleanPath = rawPath.replace(/\/+/g, '/');

  // Roteamento para API integrada
  if (cleanPath.startsWith('/api/')) {
    const apiTarget = cleanPath.replace('/api', '') + (url.parse(req.url).search || '');
    return handleApiProxy(req, res, apiTarget);
  }

  // Normaliza caminhos que comecem com /frontend
  if (cleanPath.startsWith('/frontend/')) {
    cleanPath = cleanPath.slice('/frontend'.length);
  } else if (cleanPath === '/frontend') {
    cleanPath = '/';
  }

  // Redireciona rotas SPA sem extensão (ex: /dashboard, /sensores) para a página HTML dedicada
  const ext = path.extname(cleanPath).toLowerCase();
  if (!ext && cleanPath !== '/' && cleanPath !== '') {
    const routeName = cleanPath.replace(/^\/+/, '');
    const pageFile = path.join(ROOTDIR, 'pages', `${routeName}.html`);
    if (fs.existsSync(pageFile)) {
      res.writeHead(302, { 'Location': `/pages/${routeName}.html` });
      res.end();
      return;
    }
    res.writeHead(302, { 'Location': `/#/${routeName}` });
    res.end();
    return;
  }

  let filePath;
  if (cleanPath === '/' || cleanPath === '') {
    filePath = path.join(ROOTDIR, 'index.html');
  } else {
    const safePath = cleanPath.replace(/^\/+/, '');
    filePath = path.join(ROOTDIR, safePath);
  }

  // Previne Directory Traversal
  if (!filePath.startsWith(ROOTDIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      if (ext && ext !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Asset não encontrado: ${cleanPath}`);
        return;
      }

      // Rota SPA -> fallback index.html
      const fallback = path.join(ROOTDIR, 'index.html');
      fs.readFile(fallback, (e2, data) => {
        if (e2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('index.html não encontrado');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
      });
      return;
    }

    const fileExt = path.extname(filePath).toLowerCase();
    const mime = MIME[fileExt] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[AVISO] A porta ${PORT} já está sendo utilizada.`);
  } else {
    console.error('Erro no servidor:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  =============================================================');
  console.log('   RAÍZ Agro IoT — Frontend & Backend Integrados Iniciados!    ');
  console.log('  =============================================================');
  console.log('');
  console.log('   Frontend (SPA):      http://localhost:5173/#/dashboard');
  console.log('   Páginas HTML puras:  http://localhost:5173/pages/dashboard.html');
  console.log('   Backend API:         http://localhost:8000/ (e http://localhost:5173/api/)');
  console.log('');
});
