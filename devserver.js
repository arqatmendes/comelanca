// Servidor de desenvolvimento: serve www/ e um /proxy para testar a busca de receitas no navegador
const http = require('http'), fs = require('fs'), path = require('path'), https = require('https');
const root = path.join(__dirname, 'www');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/proxy') {
    const target = u.searchParams.get('url');
    https.get(target, { headers: { 'User-Agent': 'Mozilla/5.0 Comelanca', 'Accept-Language': 'pt-BR' } }, r => {
      res.writeHead(r.statusCode, { 'Content-Type': r.headers['content-type'] || 'text/html' }); r.pipe(res);
    }).on('error', e => { res.writeHead(502); res.end(e.message); });
    return;
  }
  const f = path.join(root, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(process.env.PORT || 8080, () => console.log('ok ' + (process.env.PORT || 8080)));
