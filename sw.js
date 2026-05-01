// Hive Match service worker — offline-first cache for the static assets.
// Bump CACHE_VERSION whenever index.html or icons change to force update.
const CACHE_VERSION = 'hive-match-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network-first for HTML so users get fresh game logic when online
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Cache-first for assets
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
      return resp;
    }))
  );
});
