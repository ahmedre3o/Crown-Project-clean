/* Crown Services ERP - Service Worker
   Only precaches icons/manifest. Does NOT cache HTML/JS (avoids stale UI after deploy). */
/* Icon query must match app/lib/branding.ts ICON_ASSET_VERSION */
const CACHE_VERSION = 'crown-v7';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png?v=20260208',
  '/icons/icon-256.png?v=20260208',
  '/icons/icon-384.png?v=20260208',
  '/icons/icon-512.png?v=20260208',
];

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
      Promise.all(
        keys
          .filter((k) => k.includes('crown-') && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  // Always network for app routes — never cache HTML/JS/CSS chunks (fixes stale landing after deploy).
  if (
    url.pathname === '/' ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
