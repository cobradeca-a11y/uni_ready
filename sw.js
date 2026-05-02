const CACHE_NAME = 'uniread-v3.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
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
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname.endsWith('/index.html')) {
    event.respondWith(handleShareTarget(event));
    return;
  }

  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate';
  const isIndex = url.origin === self.location.origin && /\/index\.html$/.test(url.pathname);
  const isCDN = url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  const isLocal = url.origin === self.location.origin;

  if (isNavigation || isIndex) {
    event.respondWith(networkFirstHtml(request, './index.html'));
    return;
  }

  if (isCDN) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isLocal) event.respondWith(cacheFirst(request));
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

async function networkFirst(request) {
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
    throw error;
  }
}

async function networkFirstHtml(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const decorated = await decorateHtml(response.clone());
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, decorated.clone());
      return decorated;
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request) || await caches.match(fallbackUrl);
    if (cached) return decorateHtml(cached);
    throw error;
  }
}

async function decorateHtml(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  let html = await response.text();
  if (html.includes('data-uniread-polish="v3.2.0"')) {
    return new Response(html, responseOptions(response));
  }

  const polish = `
<style data-uniread-polish="v3.2.0">
:root{--ur-glass:rgba(15,23,42,.72);--ur-line:rgba(148,163,184,.18);--ur-shadow:0 24px 80px rgba(0,0,0,.38)}
body{background:radial-gradient(circle at 12% 5%,rgba(108,71,255,.28),transparent 32rem),radial-gradient(circle at 86% 0%,rgba(255,71,163,.18),transparent 30rem),linear-gradient(135deg,#020617,#090a18 48%,#111827)!important}
body::before{opacity:.16!important;background-size:56px 56px!important}
header{margin:14px auto 0!important;width:min(1180px,calc(100% - 20px))!important;border:1px solid var(--ur-line)!important;border-radius:22px!important;background:rgba(2,6,23,.64)!important;box-shadow:var(--ur-shadow)!important;position:sticky!important;top:10px!important}
.logo-icon{border-radius:15px!important;box-shadow:0 18px 42px rgba(108,71,255,.28)!important}
.logo-text{font-size:22px!important;letter-spacing:-.06em!important}
.btn{min-height:40px!important;border-radius:14px!important;background:rgba(15,23,42,.68)!important;border-color:var(--ur-line)!important;backdrop-filter:blur(16px)!important}
.btn-primary{background:linear-gradient(135deg,#38bdf8,#a78bfa,#ff47a3)!important;border:0!important;color:#020617!important;font-weight:900!important}
main{width:min(1180px,calc(100% - 20px))!important;margin:14px auto 28px!important;gap:14px!important;min-height:calc(100dvh - 130px)!important}
#sidebar,#viewer-area{border:1px solid var(--ur-line)!important;border-radius:26px!important;background:linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.58))!important;box-shadow:var(--ur-shadow)!important;overflow:hidden!important;backdrop-filter:blur(22px)!important}
#sidebar{width:300px!important}
.sidebar-section{border-bottom:1px solid var(--ur-line)!important;padding:18px!important}
.sidebar-title{color:#bae6fd!important;font-size:11px!important;letter-spacing:.16em!important}
.file-item{border-radius:16px!important;padding:11px 12px!important;background:rgba(2,6,23,.22)!important;border:1px solid transparent!important}
.file-item:hover,.file-item.active{border-color:rgba(56,189,248,.5)!important;background:rgba(56,189,248,.1)!important;color:#e0f2fe!important}
#viewer-toolbar,#search-wrap,#stats-bar{background:rgba(2,6,23,.28)!important;border-bottom:1px solid var(--ur-line)!important}
#current-filename{font-size:15px!important;letter-spacing:-.02em!important}
#drop-zone{margin:18px!important;border:1px dashed rgba(148,163,184,.25)!important;border-radius:24px!important;background:rgba(2,6,23,.22)!important}
.drop-ring{border-radius:32px!important;border-color:rgba(56,189,248,.35)!important;background:linear-gradient(135deg,rgba(56,189,248,.12),rgba(167,139,250,.1))!important}
.drop-title{font-size:clamp(2rem,6vw,4.5rem)!important;line-height:.9!important;letter-spacing:-.08em!important;max-width:760px!important}
.drop-sub{font-size:1rem!important;color:#a8b6d1!important;max-width:680px!important}
#content-area{border-radius:0 0 26px 26px!important}
#content-area.view-text pre,#content-area.view-code pre,.md-body,.docx-body{font-size:14px!important;line-height:1.75!important}
.format-tag{border-radius:999px!important;padding:5px 9px!important;background:rgba(2,6,23,.3)!important}
#install-banner{width:min(1180px,calc(100% - 20px))!important;margin:12px auto 0!important;border:1px solid rgba(108,71,255,.32)!important;border-radius:18px!important;background:rgba(15,23,42,.72)!important;box-shadow:var(--ur-shadow)!important}
#toast{border-radius:18px!important;background:rgba(15,23,42,.94)!important;box-shadow:var(--ur-shadow)!important}
@media(max-width:760px){header,main,#install-banner{width:calc(100% - 14px)!important;margin-left:7px!important;margin-right:7px!important}main{display:flex!important}.header-actions{gap:6px!important}.btn{padding:8px 10px!important}#sidebar{width:min(86vw,320px)!important;border-radius:0 24px 24px 0!important}#viewer-area{border-radius:22px!important}.drop-ring{width:128px!important;height:128px!important}.drop-title{font-size:2.45rem!important}.drop-sub{font-size:.94rem!important}}
</style>
<script data-uniread-polish="v3.2.0">
(() => {
  const toast = message => {
    const existing = document.getElementById('toast');
    if (existing) {
      existing.textContent = message;
      existing.classList.add('show');
      setTimeout(() => existing.classList.remove('show'), 2800);
    }
  };

  const deliverFilesToExistingApp = files => {
    if (!files || !files.length) return false;
    const input = document.getElementById('file-input') || document.querySelector('input[type="file"]');
    if (!input || typeof DataTransfer === 'undefined') return false;
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    toast(files.length === 1 ? 'Arquivo recebido pelo UniRead.' : files.length + ' arquivos recebidos pelo UniRead.');
    return true;
  };

  const queueDelivery = files => {
    const run = () => {
      if (!deliverFilesToExistingApp(files)) {
        window.__unireadPendingFiles = files;
        setTimeout(() => deliverFilesToExistingApp(window.__unireadPendingFiles || []), 600);
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  };

  if ('launchQueue' in window && 'LaunchParams' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files || !launchParams.files.length) return;
      const files = [];
      for (const handle of launchParams.files) files.push(await handle.getFile());
      queueDelivery(files);
    });
  }

  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'share-files') queueDelivery(event.data.files || []);
  });
})();
</script>`;

  html = html.replace('</head>', `${polish}\n</head>`);
  return new Response(html, responseOptions(response));
}

function responseOptions(response) {
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return { status: response.status, statusText: response.statusText, headers };
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
  return Response.redirect('./index.html', 303);
}
