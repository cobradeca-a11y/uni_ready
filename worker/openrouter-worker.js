export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse();
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    try {
      const body = await request.json();
      const message = String(body.message || '').slice(0, 8000);
      const context = body.context || {};
      const model = body.model || env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

      if (!env.OPENROUTER_API_KEY) {
        return json({ error: 'OPENROUTER_API_KEY not configured' }, 500);
      }

      const system = `Você é o assistente do UniRead. Responda em português do Brasil. Retorne sempre JSON válido no formato {"message":"texto","actions":[]}. Use actions apenas quando for seguro. Actions permitidas: set_layout, set_theme, set_font, toggle_sidebar, toggle_support, open_ai_panel, close_ai_panel. Nunca peça nem exponha chaves de API.`;

      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.SITE_URL || 'https://cobradeca-a11y.github.io/uni_ready/',
          'X-Title': 'UniRead'
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: JSON.stringify({ message, context: compactContext(context) }) }
          ]
        })
      });

      if (!openrouterResponse.ok) {
        const text = await openrouterResponse.text();
        return json({ error: text }, openrouterResponse.status);
      }

      const data = await openrouterResponse.json();
      const content = data?.choices?.[0]?.message?.content || '{"message":"Sem resposta.","actions":[]}';
      let parsed;
      try { parsed = JSON.parse(content); }
      catch { parsed = { message: content, actions: [] }; }

      parsed.actions = sanitizeActions(parsed.actions || []);
      return json(parsed);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
};

function compactContext(context) {
  return {
    activeFile: context.activeFile || null,
    activeText: String(context.activeText || '').slice(0, 18000),
    files: Array.isArray(context.files) ? context.files.slice(0, 20) : [],
    layoutMode: context.layoutMode || 'reader'
  };
}

function sanitizeActions(actions) {
  const allowed = new Set(['set_layout', 'set_theme', 'set_font', 'toggle_sidebar', 'toggle_support', 'open_ai_panel', 'close_ai_panel']);
  return Array.isArray(actions) ? actions.filter(action => allowed.has(action?.type)).slice(0, 8) : [];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function corsResponse() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
