/* Crown Services ERP - Service Worker
   Caches static assets. Network-first for HTML/JS. */
const CACHE_VERSION = 'crown-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS.map((p) => new Request(p, { cache: 'reload' }))).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('crown-') && k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Do NOT cache API: same-origin /api/* or any cross-origin (e.g. https://api.crowncs.org/api/*)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        if (res.ok && (url.pathname === '/' || /^\/(login|pos|dashboard)(\/|$)/.test(url.pathname))) {
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, clone).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
