// Servidor de desenvolvimento (uso local): serve www/ e um /proxy para testar a busca de receitas no navegador
const http = require('http'), fs = require('fs'), path = require('path'), https = require('https');
const root = path.resolve(__dirname, 'www');
const ALLOWED = ['tudogostoso.com.br', 'receitas.globo.com', 'alimentandocomamor.com.br'];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const allowedHost = h => ALLOWED.some(d => h === d || h.endsWith('.' + d));
http.createServer((req, res) => {
  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  if (u.pathname === '/proxy') {
    let target;
    try { target = new URL(u.searchParams.get('url') || ''); } catch (e) { res.writeHead(400); return res.end('url inválida'); }
    if (target.protocol !== 'https:' || !allowedHost(target.hostname)) { res.writeHead(403); return res.end('site não permitido'); }
    https.get(target, { headers: { 'User-Agent': 'Mozilla/5.0 Comelanca-dev', 'Accept-Language': 'pt-BR' } }, r => {
      res.writeHead(r.statusCode, { 'Content-Type': r.headers['content-type'] || 'text/html' }); r.pipe(res);
    }).on('error', e => { res.writeHead(502); res.end(e.message); });
    return;
  }
  let rel;
  try { rel = decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  const f = path.resolve(root, '.' + rel);
  if (f !== root && !f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d);
  });
}).listen(process.env.PORT || 8080, '127.0.0.1', () => console.log('ok http://127.0.0.1:' + (process.env.PORT || 8080)));
