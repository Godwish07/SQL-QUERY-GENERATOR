/**
 * SQLForge - Universal Node.js HTTP / Express Server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Services and Controllers
const sqlController = require('./src/controllers/sqlController');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Request handler
 */
async function handleRequest(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = reqUrl.pathname;

  // JSON helper
  res.json = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  res.status = (code) => ({
    json: (data) => res.json(data, code)
  });

  // Body parser helper
  const parseRequestBody = () => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        if (!body || body.trim() === '') {
          return resolve({});
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          try {
            // Attempt to unescape if wrapped
            const clean = body.replace(/^["']|["']$/g, '');
            resolve(JSON.parse(clean));
          } catch (e2) {
            resolve({});
          }
        }
      });
      req.on('error', () => resolve({}));
    });
  };

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      if (req.method === 'POST') {
        req.body = await parseRequestBody();
      }

      if (pathname === '/api/health' && req.method === 'GET') {
        return res.json({
          status: 'online',
          service: 'SQL Query Generator API',
          timestamp: new Date().toISOString()
        });
      }

      if (pathname === '/api/schemas' && req.method === 'GET') {
        return sqlController.getSchemas(req, res);
      }

      if (pathname === '/api/templates' && req.method === 'GET') {
        return sqlController.getTemplates(req, res);
      }

      if (pathname === '/api/generate/builder' && req.method === 'POST') {
        return await sqlController.generateFromBuilder(req, res);
      }

      if (pathname === '/api/generate/nl' && req.method === 'POST') {
        return await sqlController.generateFromNl(req, res);
      }

      if (pathname === '/api/explain' && req.method === 'POST') {
        return await sqlController.explainQuery(req, res);
      }

      if (pathname === '/api/format' && req.method === 'POST') {
        return await sqlController.formatQuery(req, res);
      }

      if (pathname === '/api/execute' && req.method === 'POST') {
        return await sqlController.executeQuery(req, res);
      }

      return res.status(404).json({ error: `API endpoint ${pathname} not found` });
    }

    // Static Files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading static resource.');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });

  } catch (err) {
    console.error('Server error on request:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

const server = http.createServer(handleRequest);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 SQLForge Server is running!`);
    console.log(`📡 Web Dashboard: http://localhost:${PORT}`);
    console.log(`📚 API Health:    http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });
}

module.exports = server;
