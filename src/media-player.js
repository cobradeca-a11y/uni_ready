import { escapeHtml, extOf, formatBytes } from './utils.js';

const TRANSCRIBE_CONFIG_KEY = 'uniread.transcribe.config.v1';

export function installMediaPlayer({ sidebar, toast }) {
  const section = document.createElement('section');
  section.className = 'panel-section media-section';
  section.innerHTML = `
    <div class="section-title">Mini player</div>
    <div class="mini-player empty" id="miniPlayer">
      <div class="mini-empty">Abra um áudio ou vídeo para tocar enquanto lê.</div>
    </div>
  `;

  const support = sidebar.querySelector('.panel-section:nth-of-type(2)');
  sidebar.insertBefore(section, support || null);

  const root = section.querySelector('#miniPlayer');
  let media = null;
  let currentUrl = null;
  let currentFile = null;
  let loopA = null;
  let loopB = null;
  let transcribing = false;
  let speechRecognition = null;
  let speechActive = false;
  const marks = [];

  function isMediaFile(file) {
    const ext = extOf(file);
    return file.type.startsWith('audio/') || file.type.startsWith('video/') || ['mp3','wav','ogg','flac','aac','m4a','opus','mp4','webm','mov','mkv','avi','ogv','m4v','3gp'].includes(ext);
  }

  function load(file) {
    currentFile = file;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);

    const isVideo = file.type.startsWith('video/') || ['mp4','webm','mov','mkv','avi','ogv','m4v','3gp'].includes(extOf(file));
    const config = getTranscribeConfig();
    root.className = 'mini-player active' + (isVideo ? ' video-mode' : ' audio-mode');
    root.innerHTML = `
      <div class="mini-title">
        <strong>${escapeHtml(file.name)}</strong>
        <small>${escapeHtml(file.type || extOf(file) || 'mídia')} · ${formatBytes(file.size)}</small>
      </div>
      <div class="mini-stage ${isVideo ? '' : 'audio-art'}">
        ${isVideo ? `<video id="miniMedia" src="${currentUrl}" playsinline controls></video>` : `<div class="audio-symbol">♪</div><audio id="miniMedia" src="${currentUrl}" controls></audio>`}
      </div>
      <div class="mini-time"><span id="miniCurrent">0:00</span><span id="miniDuration">0:00</span></div>
      <input class="mini-range" id="miniSeek" type="range" min="0" max="100" value="0" />
      <div class="mini-controls">
        <button type="button" data-step="-30">−30</button>
        <button type="button" data-step="-10">−10</button>
        <button type="button" data-step="-5">−5</button>
        <button type="button" id="miniPlay">Play</button>
        <button type="button" data-step="5">+5</button>
        <button type="button" data-step="10">+10</button>
        <button type="button" data-step="30">+30</button>
      </div>
      <div class="mini-tools">
        <label>Vel.<select id="miniRate"><option>0.5</option><option>0.75</option><option selected>1</option><option>1.25</option><option>1.5</option><option>2</option></select></label>
        <label>Vol.<input id="miniVolume" type="range" min="0" max="1" step="0.05" value="1"></label>
      </div>
      <div class="mini-controls secondary">
        <button type="button" id="loopA">A</button>
        <button type="button" id="loopB">B</button>
        <button type="button" id="loopClear">Limpar</button>
        <button type="button" id="markTime">Nota</button>
        ${isVideo ? '<button type="button" id="miniPip">PiP</button>' : ''}
      </div>
      <details class="transcribe-box">
        <summary>Transcrição</summary>
        <div class="mini-controls secondary web-speech-actions">
          <button type="button" id="webSpeechStart">Web Speech grátis</button>
          <button type="button" id="webSpeechStop">Parar</button>
        </div>
        <label>Idioma Web Speech<select id="speechLang"><option value="pt-BR">Português Brasil</option><option value="en-US">English US</option><option value="es-ES">Español</option></select></label>
        <p class="mini-hint">Grátis: usa o microfone do navegador. Serve para fala ao vivo ou áudio tocando no ambiente. Não lê arquivo salvo diretamente.</p>
        <hr class="mini-separator" />
        <label>Endpoint IA paga/local<input id="transcribeEndpoint" value="${escapeHtml(config.endpoint)}" placeholder="/api/transcribe"></label>
        <div class="mini-controls secondary">
          <button type="button" id="saveTranscribeEndpoint">Salvar endpoint</button>
          <button type="button" id="transcribeMedia">Transcrever arquivo</button>
        </div>
        <p class="mini-hint">Envia este áudio/vídeo ao backend configurado. Limite padrão: 25 MB.</p>
      </details>
      <div class="mini-marks" id="miniMarks"></div>
    `;

    media = root.querySelector('#miniMedia');
    bindControls(isVideo);
    media.play().catch(() => toast?.('Mídia carregada. Toque em Play para iniciar.'));
  }

  function bindControls(isVideo) {
    const play = root.querySelector('#miniPlay');
    const seek = root.querySelector('#miniSeek');
    const cur = root.querySelector('#miniCurrent');
    const dur = root.querySelector('#miniDuration');
    const rate = root.querySelector('#miniRate');
    const volume = root.querySelector('#miniVolume');

    play.addEventListener('click', () => media.paused ? media.play() : media.pause());
    media.addEventListener('play', () => play.textContent = 'Pause');
    media.addEventListener('pause', () => play.textContent = 'Play');
    media.addEventListener('loadedmetadata', () => dur.textContent = formatTime(media.duration));
    media.addEventListener('timeupdate', () => {
      cur.textContent = formatTime(media.currentTime);
      seek.value = media.duration ? String((media.currentTime / media.duration) * 100) : '0';
      if (loopA !== null && loopB !== null && loopB > loopA && media.currentTime >= loopB) media.currentTime = loopA;
    });
    seek.addEventListener('input', () => { if (media.duration) media.currentTime = (Number(seek.value) / 100) * media.duration; });
    rate.addEventListener('change', () => media.playbackRate = Number(rate.value));
    volume.addEventListener('input', () => media.volume = Number(volume.value));
    root.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => media.currentTime = Math.max(0, media.currentTime + Number(button.dataset.step))));
    root.querySelector('#loopA').addEventListener('click', () => { loopA = media.currentTime; toast?.(`Loop A: ${formatTime(loopA)}`); });
    root.querySelector('#loopB').addEventListener('click', () => { loopB = media.currentTime; toast?.(`Loop B: ${formatTime(loopB)}`); });
    root.querySelector('#loopClear').addEventListener('click', () => { loopA = null; loopB = null; toast?.('Loop limpo.'); });
    root.querySelector('#markTime').addEventListener('click', () => addMark());
    root.querySelector('#miniPip')?.addEventListener('click', async () => {
      try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await media.requestPictureInPicture(); }
      catch { toast?.('Picture-in-picture indisponível neste navegador.'); }
    });
    root.querySelector('#saveTranscribeEndpoint').addEventListener('click', () => {
      const endpoint = root.querySelector('#transcribeEndpoint').value.trim() || './api/transcribe';
      saveTranscribeConfig({ endpoint });
      toast?.('Endpoint de transcrição salvo.');
    });
    root.querySelector('#transcribeMedia').addEventListener('click', transcribeCurrentMedia);
    root.querySelector('#webSpeechStart').addEventListener('click', startWebSpeech);
    root.querySelector('#webSpeechStop').addEventListener('click', stopWebSpeech);
  }

  function addMark(label = '', time = null, meta = {}) {
    if (!media || !currentFile) return;
    const text = label || prompt('Nota para este tempo:') || '';
    const mark = {
      time: Number.isFinite(time) ? time : media.currentTime,
      end: Number.isFinite(meta.end) ? meta.end : null,
      text,
      file: currentFile.name,
      source: meta.source || 'manual',
      createdAt: new Date().toISOString()
    };
    marks.push(mark);
    renderMarks();
    window.dispatchEvent(new CustomEvent('uniread:media-mark', { detail: mark }));
    if (meta.silent !== true) toast?.(`Nota criada em ${formatTime(mark.time)}.`);
  }

  function startWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast?.('Web Speech não está disponível neste navegador. Teste no Chrome/Edge.');
      return;
    }
    if (speechActive) return;

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = root.querySelector('#speechLang')?.value || 'pt-BR';
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechActive = true;

    speechRecognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const text = result[0]?.transcript?.trim();
        if (text) addMark(text, media?.currentTime || 0, { source: 'web-speech', silent: true });
      }
      toast?.('Trecho capturado pelo Web Speech.');
    };

    speechRecognition.onerror = event => {
      speechActive = false;
      toast?.(`Web Speech parou: ${event.error || 'erro'}.`);
    };

    speechRecognition.onend = () => {
      if (speechActive) {
        try { speechRecognition.start(); }
        catch { speechActive = false; }
      }
    };

    try {
      speechRecognition.start();
      toast?.('Web Speech iniciado. Permita o microfone.');
    } catch (error) {
      speechActive = false;
      toast?.(`Não foi possível iniciar: ${error.message}`);
    }
  }

  function stopWebSpeech() {
    speechActive = false;
    if (speechRecognition) {
      try { speechRecognition.stop(); } catch {}
    }
    toast?.('Web Speech parado.');
  }

  async function transcribeCurrentMedia() {
    if (!currentFile || transcribing) return;
    const endpoint = root.querySelector('#transcribeEndpoint')?.value.trim() || getTranscribeConfig().endpoint;
    saveTranscribeConfig({ endpoint });

    transcribing = true;
    const button = root.querySelector('#transcribeMedia');
    button.disabled = true;
    button.textContent = 'Transcrevendo...';
    toast?.('Enviando mídia para transcrição.');

    try {
      const data = await sendToTranscriptionBackend(endpoint, currentFile);
      const segments = Array.isArray(data.segments) ? data.segments : [];
      if (!segments.length && data.text) {
        addMark(data.text, 0, { source: 'transcription', silent: true });
      } else {
        for (const segment of segments.slice(0, 250)) {
          addMark(segment.text, Number(segment.start || 0), { end: Number(segment.end || 0), source: 'transcription', silent: true });
        }
      }
      renderMarks();
      toast?.(`Transcrição importada: ${segments.length || 1} trecho(s).`);
      window.dispatchEvent(new CustomEvent('uniread:transcription', { detail: data }));
    } catch (error) {
      toast?.(`Falha na transcrição: ${error.message}`);
    } finally {
      transcribing = false;
      button.disabled = false;
      button.textContent = 'Transcrever arquivo';
    }
  }

  function renderMarks() {
    const box = root.querySelector('#miniMarks');
    if (!box) return;
    box.innerHTML = marks.slice(-40).map(mark => `
      <button type="button" class="mini-mark ${['transcription','web-speech'].includes(mark.source) ? 'transcript-mark' : ''}" data-time="${mark.time}">
        <strong>${formatTime(mark.time)}</strong><span>${escapeHtml(mark.text || 'Sem nota')}</span>
      </button>
    `).join('');
    box.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { if (media) media.currentTime = Number(button.dataset.time); }));
  }

  function getState() {
    return { file: currentFile?.name || null, currentTime: media?.currentTime || 0, duration: media?.duration || 0, marks: [...marks], hasMedia: Boolean(media), speechActive };
  }

  return { load, isMediaFile, getState, addMark };
}

async function sendToTranscriptionBackend(endpoint, file) {
  const form = new FormData();
  form.append('file', file, file.name || 'media-file');
  const response = await fetch(endpoint, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function getTranscribeConfig() {
  try {
    return { endpoint: './api/transcribe', ...JSON.parse(localStorage.getItem(TRANSCRIBE_CONFIG_KEY) || '{}') };
  } catch {
    return { endpoint: './api/transcribe' };
  }
}

function saveTranscribeConfig(config) {
  localStorage.setItem(TRANSCRIBE_CONFIG_KEY, JSON.stringify(config));
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}
