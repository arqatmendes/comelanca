// Comelança offline: mostra a versão guardada na hora e atualiza em segundo plano
const CACHE = 'comelanca-v4';
const FILES = ['./', 'index.html', 'css/app.css', 'js/art.js', 'js/data.js', 'js/allergy.js', 'js/recipes.js', 'js/school.js', 'js/app.js', 'js/pwa.js',
  'vendor/pdf.min.js', 'vendor/xlsx.mini.min.js', 'templates/modelo-pratos-comelanca.xlsx', 'vendor/pdf.worker.min.js', 'fonts/fredoka.woff2', 'fonts/nunito.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const r = await network;
    return r || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
