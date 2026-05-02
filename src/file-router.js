import { escapeHtml, extOf, waitForGlobal } from './utils.js';

const textExtensions = new Set([
  'txt', 'log', 'ini', 'cfg', 'env', 'toml', 'yml', 'yaml', 'xml', 'svg', 'css', 'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'sql', 'r', 'tex', 'bat', 'sh'
]);

const limitedExtensions = new Set(['doc', 'ppt', 'pptx', 'odt', 'odp', 'rar', '7z', 'heic', 'heif', 'raw', 'cr2', 'nef', 'psd', 'ai', 'indd']);

export async function renderFile(file) {
  const ext = extOf(file);
  const type = file.type || '';

  if (type.startsWith('image/') && ext !== 'svg') return renderImage(file);
  if (type.startsWith('audio/')) return renderAudio(file);
  if (type.startsWith('video/')) return renderVideo(file);
  if (type === 'application/pdf' || ext === 'pdf') return renderPdf(file);
  if (ext === 'md' || ext === 'markdown') return renderMarkdown(file);
  if (ext === 'json' || type.includes('json')) return renderJson(file);
  if (ext === 'csv') return renderCsv(file);
  if (ext === 'html' || ext === 'htm' || type === 'text/html') return renderHtmlFile(file);
  if (ext === 'docx') return renderDocx(file);
  if (['xlsx', 'xls', 'ods'].includes(ext)) return renderSpreadsheet(file);
  if (ext === 'zip') return renderZip(file);
  if (textExtensions.has(ext) || type.startsWith('text/')) return renderText(file);
  if (limitedExtensions.has(ext)) return renderLimited(file, ext);

  return renderUnsupported(file, ext);
}

async function renderText(file) {
  const text = await file.text();
  return {
    kind: 'text',
    copyText: text,
    html: `<div class="preview-box preview-pad"><pre class="preview-text">${escapeHtml(text)}</pre></div>`
  };
}

async function renderMarkdown(file) {
  const text = await file.text();
  const marked = await waitForGlobal('marked');
  return {
    kind: 'markdown',
    copyText: text,
    html: `<article class="preview-box preview-pad preview-html">${marked.parse(text)}</article>`
  };
}

async function renderJson(file) {
  const raw = await file.text();
  let formatted = raw;
  try { formatted = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
  return {
    kind: 'json',
    copyText: formatted,
    html: `<div class="preview-box preview-pad"><pre class="preview-text">${escapeHtml(formatted)}</pre></div>`
  };
}

async function renderCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  const table = rows.slice(0, 500).map((row, rowIndex) => {
    const cells = row.map(cell => rowIndex === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return {
    kind: 'csv',
    copyText: text,
    html: `<div class="preview-box table-wrap"><table>${table}</table></div>`
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

async function renderHtmlFile(file) {
  const text = await file.text();
  const blob = new Blob([text], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  return {
    kind: 'html',
    copyText: text,
    html: `<div class="preview-box preview-frame"><iframe sandbox title="HTML: ${escapeHtml(file.name)}" src="${url}"></iframe></div>`
  };
}

function renderPdf(file) {
  const url = URL.createObjectURL(file);
  return {
    kind: 'pdf',
    html: `<div class="preview-box preview-frame"><iframe title="PDF: ${escapeHtml(file.name)}" src="${url}"></iframe></div>`
  };
}

function renderImage(file) {
  const url = URL.createObjectURL(file);
  return {
    kind: 'image',
    html: `<div class="preview-box media-preview"><img alt="${escapeHtml(file.name)}" src="${url}"></div>`
  };
}

function renderAudio(file) {
  const url = URL.createObjectURL(file);
  return {
    kind: 'audio',
    html: `<div class="preview-box media-preview"><audio controls src="${url}"></audio></div>`
  };
}

function renderVideo(file) {
  const url = URL.createObjectURL(file);
  return {
    kind: 'video',
    html: `<div class="preview-box media-preview"><video controls src="${url}"></video></div>`
  };
}

async function renderDocx(file) {
  const mammoth = await waitForGlobal('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    kind: 'docx',
    html: `<article class="preview-box preview-pad preview-html">${result.value || '<p>Documento sem conteúdo extraído.</p>'}</article>`
  };
}

async function renderSpreadsheet(file) {
  const XLSX = await waitForGlobal('XLSX');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  const html = firstSheet ? XLSX.utils.sheet_to_html(workbook.Sheets[firstSheet]) : '<p>Planilha vazia.</p>';
  return {
    kind: 'sheet',
    html: `<div class="preview-box preview-pad table-wrap"><h2>${escapeHtml(firstSheet || 'Planilha')}</h2>${html}</div>`
  };
}

async function renderZip(file) {
  const JSZip = await waitForGlobal('JSZip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const rows = Object.values(zip.files).map(entry => `<tr><td>${entry.dir ? 'Pasta' : 'Arquivo'}</td><td>${escapeHtml(entry.name)}</td></tr>`).join('');
  return {
    kind: 'zip',
    html: `<div class="preview-box preview-pad table-wrap"><h2>Conteúdo do ZIP</h2><table><thead><tr><th>Tipo</th><th>Caminho</th></tr></thead><tbody>${rows}</tbody></table></div>`
  };
}

function renderLimited(file, ext) {
  return {
    kind: 'limited',
    html: `<div class="preview-box unsupported"><div><strong>Prévia limitada para .${escapeHtml(ext)}</strong><p>Este formato costuma depender de conversores nativos ou bibliotecas pesadas. O arquivo foi carregado, mas a visualização direta pode não estar disponível neste navegador.</p></div></div>`
  };
}

function renderUnsupported(file, ext) {
  return {
    kind: 'unsupported',
    html: `<div class="preview-box unsupported"><div><strong>Formato não reconhecido</strong><p>${escapeHtml(ext ? '.' + ext : file.type || 'Tipo desconhecido')}. Use o botão Baixar para abrir em outro aplicativo.</p></div></div>`
  };
}
