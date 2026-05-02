# Assistente IA via OpenRouter

O UniRead agora possui um painel **Assistente** com duas formas de uso.

## 1. Modo local

Sem configurar endpoint, o app roda em modo local com ações simples:

- resumo básico do texto aberto;
- modo estudo;
- modo foco;
- aumento de fonte.

Esse modo não chama API externa.

## 2. Modo OpenRouter seguro

Para usar OpenRouter de verdade, não coloque a chave no front-end. Use um backend seguro.

Este repositório inclui um exemplo em:

```txt
worker/openrouter-worker.js
```

## Variáveis necessárias no Cloudflare Worker

```txt
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
SITE_URL=https://cobradeca-a11y.github.io/uni_ready/
```

Depois de publicar o Worker, copie a URL dele e cole no campo **Endpoint seguro /api/assistant** dentro do painel Assistente do UniRead.

## Formato de resposta esperado

O backend deve retornar JSON:

```json
{
  "message": "Texto para o usuário",
  "actions": []
}
```

## Ações seguras aceitas

```json
{ "type": "set_layout", "payload": { "mode": "study", "aiPanel": true } }
{ "type": "set_theme", "payload": { "theme": "dark" } }
{ "type": "set_font", "payload": { "fontSize": 18, "lineHeight": 1.8 } }
{ "type": "toggle_sidebar", "payload": { "open": false } }
{ "type": "toggle_support", "payload": { "open": false } }
{ "type": "open_ai_panel", "payload": {} }
{ "type": "close_ai_panel", "payload": {} }
```

## Segurança

A IA não recebe permissão para alterar o código do repositório, apagar arquivos ou fazer commits. Ela controla apenas ações internas seguras do aplicativo.
