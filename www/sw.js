// Funciona offline: guarda os arquivos do app no aparelho
const CACHE = 'comelanca-v1';
const FILES = ['./', 'index.html', 'css/app.css', 'js/art.js', 'js/data.js', 'js/recipes.js', 'js/app.js',
  'fonts/fredoka.woff2', 'fonts/nunito.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (new URL(e.request.url).origin !== location.origin) return;
  // rede primeiro (pega atualizações), cache se estiver offline
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
