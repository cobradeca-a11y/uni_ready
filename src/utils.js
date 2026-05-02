export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function extOf(file) {
  const name = typeof file === 'string' ? file : file?.name || '';
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'tamanho desconhecido';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function fileMeta(file) {
  return `${file.type || 'tipo não informado'} · ${formatBytes(file.size)}`;
}

export function waitForGlobal(name, timeout = 3500) {
  return new Promise((resolve, reject) => {
    if (window[name]) return resolve(window[name]);
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window[name]) {
        window.clearInterval(timer);
        resolve(window[name]);
      } else if (Date.now() - started > timeout) {
        window.clearInterval(timer);
        reject(new Error(`Biblioteca ${name} não carregou.`));
      }
    }, 80);
  });
}
