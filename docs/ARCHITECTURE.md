# UniRead — Arquitetura

O projeto foi reestruturado para deixar de depender de um HTML monolítico e passar a usar uma base modular estática compatível com GitHub Pages.

## Entrada principal

- `app.html`: shell principal do aplicativo.
- `manifest.json`: metadados PWA, start URL, file handlers e share target.
- `sw.js`: service worker limpo, responsável apenas por cache, navegação offline e share target.

## Estilos

- `styles/app.css`: design system, layout, responsividade, componentes e visual do leitor.

## JavaScript

- `src/app.js`: controlador da interface, eventos, estado dos arquivos, drag and drop, instalação PWA e integração com file handlers.
- `src/file-router.js`: roteia cada arquivo para o leitor adequado por MIME type/extensão.
- `src/utils.js`: funções utilitárias compartilhadas.

## Filosofia de suporte a formatos

### Suporte confiável

- Texto: `.txt`, `.md`, `.json`, `.csv`, `.html`, `.css`, `.js`, `.xml`, `.yaml` e similares.
- Imagens comuns: `.jpg`, `.png`, `.gif`, `.webp`, `.svg`.
- Mídia comum: áudio e vídeo suportados pelo navegador.
- PDF: via visualizador nativo do navegador.

### Suporte por biblioteca

- `.docx`: Mammoth.
- `.xlsx`, `.xls`, `.ods`: SheetJS.
- `.zip`: JSZip.

### Suporte limitado

- `.doc`, `.ppt`, `.pptx`, `.rar`, `.7z`, `.heic`, `.raw`, `.psd`, `.ai`, `.indd`.

Esses formatos são reconhecidos, mas podem exigir app externo ou conversores específicos.

## PWA

O `manifest.json` aponta para `app.html` e declara `file_handlers` e `share_target`.

O `sw.js` usa:

- cache-first para assets locais;
- network-first para navegação e bibliotecas CDN;
- fallback para `app.html` quando offline;
- handler de POST para arquivos compartilhados ao PWA.

## Próximas melhorias profissionais

1. Remover o `index.html` legado ou transformá-lo em redirecionamento para `app.html`.
2. Adicionar testes manuais documentados por tipo de arquivo.
3. Adicionar reader específico para EPUB.
4. Adicionar modo de prévia de PPTX apenas se houver biblioteca leve e confiável.
5. Adicionar aviso de atualização quando um novo service worker for ativado.
