const CONFIG_KEY = 'uniread.ai.config.v1';

export function getAiConfig() {
  try {
    return {
      endpoint: '',
      model: 'openai/gpt-4o-mini',
      ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}')
    };
  } catch {
    return { endpoint: '', model: 'openai/gpt-4o-mini' };
  }
}

export function saveAiConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function askAssistant({ message, context, config = getAiConfig() }) {
  if (!config.endpoint) {
    return localAssistant(message, context);
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, model: config.model })
  });

  if (!response.ok) throw new Error(`Falha no assistente: ${response.status}`);
  return normalizeAssistantResponse(await response.json());
}

function normalizeAssistantResponse(data) {
  if (data?.message || data?.actions) {
    return { message: data.message || '', actions: Array.isArray(data.actions) ? data.actions : [] };
  }
  if (typeof data === 'string') return { message: data, actions: [] };
  return { message: JSON.stringify(data, null, 2), actions: [] };
}

function localAssistant(message, context) {
  const text = String(message || '').toLowerCase();
  const actions = [];
  let answer = 'Estou em modo local. Configure um endpoint seguro para usar IA via OpenRouter.';

  if (text.includes('layout') || text.includes('estudo') || text.includes('aula')) {
    actions.push({ type: 'set_layout', payload: { mode: 'study', aiPanel: true, support: false, readerWidth: 'comfortable', fontSize: 17, lineHeight: 1.78 } });
    answer = 'Apliquei um layout local de estudo: painel de IA aberto, suporte oculto e leitura mais confortável.';
  }

  if (text.includes('fonte') || text.includes('maior')) {
    actions.push({ type: 'set_font', payload: { fontSize: 19, lineHeight: 1.85 } });
    answer = 'Aumentei a fonte e o espaçamento para leitura longa.';
  }

  if (text.includes('foco')) {
    actions.push({ type: 'set_layout', payload: { mode: 'focus', sidebar: false, support: false, aiPanel: false, readerWidth: 'wide', fontSize: 18, lineHeight: 1.82 } });
    answer = 'Ativei o modo foco local.';
  }

  if (text.includes('resum')) {
    answer = summarizeLocally(context?.activeText || '');
  }

  return Promise.resolve({ message: answer, actions });
}

function summarizeLocally(text) {
  if (!text) return 'Não encontrei texto extraído do arquivo atual para resumir.';
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 5).join(' ');
  return summary || text.slice(0, 900);
}
