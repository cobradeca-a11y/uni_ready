const CACHE_NAME = 'uniread-v2.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for app assets, network-first for CDN libs
  const url = new URL(e.request.url);
  const isCDN = url.hostname.includes('cdnjs') || url.hostname.includes('fonts');
  
  if (isCDN) {
    // Network-first with cache fallback for CDN
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for local assets
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            return res;
          })
          .catch(() => caches.match('./index.html'))
        )
    );
  }
});

// Handle share target
self.addEventListener('fetch', e => {
  if (e.request.method === 'POST' && e.request.url.includes('index.html')) {
    e.respondWith(
      (async () => {
        const data = await e.request.formData();
        const client = await self.clients.get(e.resultingClientId || e.clientId);
        const files = data.getAll('file');
        if (client && files.length) {
          client.postMessage({ type: 'share-files', files });
        }
        return Response.redirect('./index.html', 303);
      })()
    );
  }
});
