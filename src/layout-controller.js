const DEFAULT_LAYOUT = {
  mode: 'reader',
  sidebar: true,
  support: true,
  aiPanel: false,
  fontSize: 16,
  lineHeight: 1.72,
  readerWidth: 'normal',
  theme: 'dark'
};

const STORAGE_KEY = 'uniread.layout.v1';

export function getLayout() {
  try {
    return { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function saveLayout(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function applyLayout(partial = {}) {
  const layout = { ...getLayout(), ...partial };
  saveLayout(layout);
  document.body.dataset.mode = layout.mode;
  document.body.dataset.theme = layout.theme;
  document.documentElement.style.setProperty('--reader-font-size', `${layout.fontSize}px`);
  document.documentElement.style.setProperty('--reader-line-height', String(layout.lineHeight));
  document.body.classList.toggle('sidebar-collapsed', !layout.sidebar);
  document.body.classList.toggle('support-hidden', !layout.support);
  document.body.classList.toggle('ai-panel-open', Boolean(layout.aiPanel));
  document.body.dataset.readerWidth = layout.readerWidth;
  window.dispatchEvent(new CustomEvent('uniread:layout-change', { detail: layout }));
  return layout;
}

export function runLayoutAction(action) {
  const type = action?.type;
  const payload = action?.payload || {};
  switch (type) {
    case 'set_layout': return applyLayout(payload);
    case 'set_theme': return applyLayout({ theme: payload.theme || 'dark' });
    case 'set_font': return applyLayout({ fontSize: clamp(Number(payload.fontSize) || getLayout().fontSize, 12, 28), lineHeight: clamp(Number(payload.lineHeight) || getLayout().lineHeight, 1.25, 2.2) });
    case 'toggle_sidebar': return applyLayout({ sidebar: payload.open ?? !getLayout().sidebar });
    case 'toggle_support': return applyLayout({ support: payload.open ?? !getLayout().support });
    case 'open_ai_panel': return applyLayout({ aiPanel: true });
    case 'close_ai_panel': return applyLayout({ aiPanel: false });
    default: throw new Error(`Ação de layout desconhecida: ${type}`);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function installLayoutShortcuts() {
  window.addEventListener('keydown', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === 'b') {
      event.preventDefault();
      runLayoutAction({ type: 'toggle_sidebar', payload: {} });
    }
    if (event.key === 'j') {
      event.preventDefault();
      runLayoutAction({ type: 'open_ai_panel', payload: {} });
    }
  });
}
