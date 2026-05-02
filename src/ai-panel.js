import { askAssistant, getAiConfig, saveAiConfig } from './ai-client.js';
import { runLayoutAction } from './layout-controller.js';
import { escapeHtml } from './utils.js';

export function installAiPanel({ getContext, toast }) {
  const panel = document.createElement('aside');
  panel.className = 'ai-panel';
  panel.innerHTML = `
    <div class="ai-head">
      <div><strong>Assistente</strong><small>Leitura, notas e layout</small></div>
      <button class="icon-button" id="aiClose" type="button">×</button>
    </div>
    <div class="ai-config">
      <input id="aiEndpoint" placeholder="Endpoint seguro /api/assistant" />
      <input id="aiModel" placeholder="Modelo OpenRouter" />
      <button class="ghost-button" id="aiSaveConfig" type="button">Salvar</button>
    </div>
    <div class="ai-presets">
      <button data-prompt="Resuma o arquivo atual" type="button">Resumir</button>
      <button data-prompt="Crie perguntas de estudo sobre o arquivo atual" type="button">Perguntas</button>
      <button data-prompt="Mude para um layout de estudo confortável" type="button">Layout estudo</button>
      <button data-prompt="Ative modo foco para leitura longa" type="button">Modo foco</button>
    </div>
    <div class="ai-log" id="aiLog"></div>
    <form class="ai-form" id="aiForm">
      <textarea id="aiInput" rows="3" placeholder="Peça um resumo, uma nota ou uma mudança de layout..."></textarea>
      <button class="primary-button" type="submit">Enviar</button>
    </form>
  `;
  document.body.appendChild(panel);

  const endpoint = panel.querySelector('#aiEndpoint');
  const model = panel.querySelector('#aiModel');
  const log = panel.querySelector('#aiLog');
  const input = panel.querySelector('#aiInput');
  const form = panel.querySelector('#aiForm');
  const cfg = getAiConfig();
  endpoint.value = cfg.endpoint || '';
  model.value = cfg.model || '';

  panel.querySelector('#aiClose').addEventListener('click', () => runLayoutAction({ type: 'close_ai_panel', payload: {} }));
  panel.querySelector('#aiSaveConfig').addEventListener('click', () => {
    saveAiConfig({ endpoint: endpoint.value.trim(), model: model.value.trim() || 'openai/gpt-4o-mini' });
    toast?.('Configuração do assistente salva.');
  });

  panel.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => submitPrompt(button.dataset.prompt));
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    submitPrompt(input.value.trim());
    input.value = '';
  });

  async function submitPrompt(prompt) {
    if (!prompt) return;
    addMessage('user', prompt);
    addMessage('assistant', 'Pensando...');
    try {
      const result = await askAssistant({ message: prompt, context: getContext?.() || {} });
      replaceLast(result.message || 'Pronto.');
      for (const action of result.actions || []) {
        try { runLayoutAction(action); }
        catch (error) { addMessage('assistant', `Ação ignorada: ${error.message}`); }
      }
    } catch (error) {
      replaceLast(`Erro: ${error.message}`);
    }
  }

  function addMessage(role, text) {
    const item = document.createElement('div');
    item.className = `ai-msg ${role}`;
    item.innerHTML = `<strong>${role === 'user' ? 'Você' : 'Assistente'}</strong><p>${escapeHtml(text)}</p>`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function replaceLast(text) {
    const last = log.lastElementChild;
    if (!last) return addMessage('assistant', text);
    last.innerHTML = `<strong>Assistente</strong><p>${escapeHtml(text)}</p>`;
    log.scrollTop = log.scrollHeight;
  }
}
