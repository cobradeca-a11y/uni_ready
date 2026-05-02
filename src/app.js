import { $, escapeHtml, extOf, fileMeta, formatBytes } from './utils.js';
import { renderFile } from './file-router.js';
import { installAiPanel } from './ai-panel.js';
import { applyLayout, runLayoutAction, installLayoutShortcuts } from './layout-controller.js';
import { installMediaPlayer } from './media-player.js';

const state = {
  files: [],
  activeIndex: -1,
  activeResult: null,
  installPrompt: null,
  mediaPlayer: null
};

const els = {
  sidebar: $('#sidebar'),
  menuButton: $('#menuButton'),
  installButton: $('#installButton'),
  fileInput: $('#fileInput'),
  fileList: $('#fileList'),
  dropZone: $('#dropZone'),
  emptyState: $('#emptyState'),
  viewerBody: $('#viewerBody'),
  currentName: $('#currentName'),
  currentMeta: $('#currentMeta'),
  copyButton: $('#copyButton'),
  printButton: $('#printButton'),
  downloadLink: $('#downloadLink'),
  toast: $('#toast')
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 2800);
}

function addFiles(fileList) {
  const files = [...fileList].filter(Boolean);
  if (!files.length) return;
  state.files.push(...files);
  if (state.activeIndex < 0) state.activeIndex = 0;
  renderList();
  openFile(state.activeIndex);
  toast(files.length === 1 ? 'Arquivo carregado.' : `${files.length} arquivos carregados.`);
}

function renderList() {
  if (!state.files.length) {
    els.fileList.innerHTML = '<p class="muted compact">Nenhum arquivo aberto.</p>';
    return;
  }

  els.fileList.innerHTML = state.files.map((file, index) => {
    const ext = extOf(file) || 'file';
    const active = index === state.activeIndex ? ' active' : '';
    const isMedia = state.mediaPlayer?.isMediaFile(file);
    return `
      <button class="file-item${active}${isMedia ? ' media-file' : ''}" type="button" data-index="${index}">
        <span class="file-badge">${escapeHtml(ext.slice(0, 5).toUpperCase())}</span>
        <span class="file-label">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${formatBytes(file.size)}${isMedia ? ' · mini player' : ''}</small>
        </span>
      </button>`;
  }).join('');
}

async function openFile(index) {
  const file = state.files[index];
  if (!file) return;

  state.activeIndex = index;
  renderList();
  els.currentName.textContent = file.name;
  els.currentMeta.textContent = fileMeta(file);
  els.downloadLink.href = URL.createObjectURL(file);
  els.downloadLink.download = file.name;

  if (state.mediaPlayer?.isMediaFile(file)) {
    state.mediaPlayer.load(file);
    setActionVisibility(true, false);
    toast('Mídia enviada para o mini player. A leitura à direita continua livre.');
    return;
  }

  state.activeResult = null;
  els.emptyState.hidden = true;
  els.viewerBody.hidden = false;
  els.viewerBody.innerHTML = '<div class="preview-box media-preview"><div class="muted">Carregando prévia...</div></div>';
  setActionVisibility(false);

  try {
    const result = await renderFile(file);
    state.activeResult = result;
    els.viewerBody.innerHTML = result.html;
    setActionVisibility(true, Boolean(result.copyText));
  } catch (error) {
    console.error(error);
    els.viewerBody.innerHTML = `<div class="preview-box unsupported"><div><strong>Falha ao abrir</strong><p>${escapeHtml(error.message || String(error))}</p></div></div>`;
    setActionVisibility(true, false);
  }
}

function setActionVisibility(show, canCopy = false) {
  els.downloadLink.hidden = !show;
  els.printButton.hidden = !show;
  els.copyButton.hidden = !show || !canCopy;
}

function copyCurrent() {
  const text = state.activeResult?.copyText;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => toast('Conteúdo copiado.'))
    .catch(() => toast('Não foi possível copiar neste navegador.'));
}

function getAssistantContext() {
  const file = state.files[state.activeIndex];
  const visibleText = state.activeResult?.copyText || els.viewerBody?.innerText || '';
  return {
    activeFile: file ? { name: file.name, type: file.type, size: file.size, extension: extOf(file) } : null,
    activeText: visibleText.slice(0, 24000),
    media: state.mediaPlayer?.getState?.() || null,
    files: state.files.map(item => ({ name: item.name, type: item.type, size: item.size, extension: extOf(item) })),
    layoutMode: document.body.dataset.mode || 'reader'
  };
}

function createTopButtons() {
  const actions = document.querySelector('.top-actions');
  if (!actions) return;

  const menuWrap = document.createElement('div');
  menuWrap.className = 'mode-menu-wrap';

  const modeButton = document.createElement('button');
  modeButton.className = 'ghost-button mode-menu-button';
  modeButton.type = 'button';
  modeButton.textContent = 'Modos';
  modeButton.setAttribute('aria-expanded', 'false');

  const menu = document.createElement('div');
  menu.className = 'mode-menu';
  menu.hidden = true;

  const items = [
    ['Claro/Escuro', () => {
      const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      runLayoutAction({ type: 'set_theme', payload: { theme: next } });
    }],
    ['Estudo', () => runLayoutAction({ type: 'set_layout', payload: { mode: 'media-study', sidebar: true, support: false, aiPanel: false, readerWidth: 'comfortable', fontSize: 18, lineHeight: 1.8 } })],
    ['Foco', () => runLayoutAction({ type: 'set_layout', payload: { mode: 'focus', sidebar: false, support: false, aiPanel: false, readerWidth: 'wide', fontSize: 18, lineHeight: 1.82 } })],
    ['Leitor', () => runLayoutAction({ type: 'set_layout', payload: { mode: 'reader', sidebar: true, support: true, aiPanel: false, readerWidth: 'normal', fontSize: 16, lineHeight: 1.72 } })],
    ['Assistente', () => runLayoutAction({ type: 'open_ai_panel', payload: {} })]
  ];

  items.forEach(([label, handler]) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = label;
    item.addEventListener('click', () => {
      handler();
      menu.hidden = true;
      modeButton.setAttribute('aria-expanded', 'false');
    });
    menu.appendChild(item);
  });

  modeButton.addEventListener('click', event => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
    modeButton.setAttribute('aria-expanded', String(!menu.hidden));
  });

  window.addEventListener('click', event => {
    if (!menuWrap.contains(event.target)) {
      menu.hidden = true;
      modeButton.setAttribute('aria-expanded', 'false');
    }
  });

  menuWrap.append(modeButton, menu);
  actions.append(menuWrap);
}

function toggleSidebarMenu() {
  runLayoutAction({ type: 'toggle_sidebar', payload: { open: true } });
  els.sidebar.classList.toggle('open');
  if (els.sidebar.classList.contains('open')) toast('Painel aberto.');
}

function registerEvents() {
  els.fileInput.addEventListener('change', event => addFiles(event.target.files));

  els.fileList.addEventListener('click', event => {
    const item = event.target.closest('[data-index]');
    if (!item) return;
    openFile(Number(item.dataset.index));
    els.sidebar.classList.remove('open');
  });

  els.menuButton.addEventListener('click', toggleSidebarMenu);
  els.copyButton.addEventListener('click', copyCurrent);
  els.printButton.addEventListener('click', () => window.print());

  window.addEventListener('uniread:media-mark', event => {
    console.info('Media mark:', event.detail);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    window.addEventListener(eventName, event => {
      event.preventDefault();
      els.dropZone.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, event => {
      event.preventDefault();
      if (eventName === 'drop') addFiles(event.dataTransfer.files);
      els.dropZone.classList.remove('dragging');
    });
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    els.installButton.hidden = true;
  });
}

function registerPwaFileHandlers() {
  if ('launchQueue' in window && 'LaunchParams' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files?.length) return;
      const files = [];
      for (const handle of launchParams.files) files.push(await handle.getFile());
      addFiles(files);
    });
  }

  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'share-files') addFiles(event.data.files || []);
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker não registrado:', error);
    });
  });
}

applyLayout();
state.mediaPlayer = installMediaPlayer({ sidebar: els.sidebar, toast });
createTopButtons();
installAiPanel({ getContext: getAssistantContext, toast });
installLayoutShortcuts();
registerEvents();
registerPwaFileHandlers();
registerServiceWorker();
