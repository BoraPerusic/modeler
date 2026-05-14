# @modeler/lsp

LSP server for TTR (Tatrman) language. Powers VS Code extension, Designer, and IntelliJ plugin.

## Entry Points

- `dist/server-stdio.js` — stdio transport for VS Code and IntelliJ
- `dist/server-browser.js` — browser transport (Web Worker) for Designer

## Features (Phase 0)

- `initialize`, `initialized`, `shutdown`, `exit` lifecycle
- `textDocument/didOpen`, `didChange`, `didClose`, `didSave` full sync
- `textDocument/publishDiagnostics` on every document change
- Custom `modeler/getModelGraph` returning stub graph `{ nodes: [], edges: [] }`

## Build

```bash
pnpm install
pnpm run build
```

## Bundling

The server is bundled via esbuild for distribution:
- stdio: targets Node.js
- browser: targets ES2022 with browser-compatible imports