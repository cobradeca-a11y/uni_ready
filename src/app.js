import { $, escapeHtml, extOf, fileMeta, formatBytes } from './utils.js';
import { renderFile } from './file-router.js';
import { installAiPanel } from './ai-panel.js';
import { applyLayout, runLayoutAction, installLayoutShortcuts } from './layout-controller.js';

const state = {
  files: [],
  activeIndex: -1,
  activeResult: null,
  installPrompt: null
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
    return `
      <button class="file-item${active}" type="button" data-index="${index}">
        <span class="file-badge">${escapeHtml(ext.slice(0, 5).toUpperCase())}</span>
        <span class="file-label">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${formatBytes(file.size)}</small>
        </span>
      </button>`;
  }).join('');
}

async function openFile(index) {
  const file = state.files[index];
  if (!file) return;

  state.activeIndex = index;
  state.activeResult = null;
  renderList();
  els.emptyState.hidden = true;
  els.viewerBody.hidden = false;
  els.viewerBody.innerHTML = '<div class="preview-box media-preview"><div class="muted">Carregando prévia...</div></div>';
  els.currentName.textContent = file.name;
  els.currentMeta.textContent = fileMeta(file);
  els.downloadLink.href = URL.createObjectURL(file);
  els.downloadLink.download = file.name;
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
    files: state.files.map(item => ({ name: item.name, type: item.type, size: item.size, extension: extOf(item) })),
    layoutMode: document.body.dataset.mode || 'reader'
  };
}

function createAssistantButton() {
  const button = document.createElement('button');
  button.className = 'ghost-button ai-toggle';
  button.type = 'button';
  button.textContent = 'Assistente';
  button.addEventListener('click', () => runLayoutAction({ type: 'open_ai_panel', payload: {} }));
  document.querySelector('.top-actions')?.appendChild(button);
}

function registerEvents() {
  els.fileInput.addEventListener('change', event => addFiles(event.target.files));

  els.fileList.addEventListener('click', event => {
    const item = event.target.closest('[data-index]');
    if (!item) return;
    openFile(Number(item.dataset.index));
    els.sidebar.classList.remove('open');
  });

  els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open'));
  els.copyButton.addEventListener('click', copyCurrent);
  els.printButton.addEventListener('click', () => window.print());

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
createAssistantButton();
installAiPanel({ getContext: getAssistantContext, toast });
installLayoutShortcuts();
registerEvents();
registerPwaFileHandlers();
registerServiceWorker();
