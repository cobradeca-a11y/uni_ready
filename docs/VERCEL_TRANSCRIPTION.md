# Transcrição IA automática com Vercel + OpenAI

O UniRead possui botão **Transcrever IA** no mini player. Ele envia o áudio/vídeo carregado no app para um backend seguro e recebe texto com timestamps.

## Arquivos adicionados

```txt
api/transcribe.js
package.json
```

## Variáveis de ambiente na Vercel

```txt
OPENAI_API_KEY=sk-...
OPENAI_TRANSCRIBE_MODEL=whisper-1
```

## Endpoint

Depois de publicar na Vercel, o endpoint será:

```txt
https://SEU-PROJETO.vercel.app/api/transcribe
```

Cole esse endpoint no campo **Transcrição IA > Endpoint** dentro do mini player e clique em **Salvar endpoint**.

## Fluxo no app

```txt
1. Abra um áudio ou vídeo no UniRead.
2. Ele será enviado ao mini player.
3. Abra a seção Transcrição IA.
4. Cole o endpoint da Vercel, se necessário.
5. Clique em Transcrever IA.
6. Os trechos retornam como notas clicáveis com timestamp.
```

## Limites

- O limite padrão do backend é 25 MB por arquivo.
- Não há download automático de vídeos do YouTube.
- Para YouTube, use conteúdo próprio/autorizado ou um arquivo de mídia local.
- A chave da OpenAI fica somente no backend, nunca no GitHub Pages.
