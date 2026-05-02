const CACHE_NAME = 'uniread-v4.3.0';
const APP_SHELL = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './styles/app.css',
  './styles/fixes.css',
  './src/app.js',
  './src/file-router.js',
  './src/utils.js',
  './src/ai-client.js',
  './src/ai-panel.js',
  './src/layout-controller.js',
  './src/media-player.js',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname.endsWith('/app.html')) {
    event.respondWith(handleShareTarget(event));
    return;
  }

  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate';
  const isCDN = url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  const isLocal = url.origin === self.location.origin;

  if (isNavigation) {
    event.respondWith(networkFirst(request, './app.html'));
    return;
  }

  if (isCDN) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isLocal) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw error;
  }
}

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const files = formData.getAll('file').filter(Boolean);
    const client = await self.clients.get(event.resultingClientId || event.clientId);
    if (client && files.length) client.postMessage({ type: 'share-files', files });
  } catch (error) {
    console.warn('Share target failed:', error);
  }
  return Response.redirect('./app.html', 303);
}
