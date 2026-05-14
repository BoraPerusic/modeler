# @modeler/vscode-ext

VS Code extension for TTR (Tatrman) language support.

## Features (Phase 0)

- Language registration for `.ttr` and `.ttrl` files
- Syntax highlighting via TextMate grammar
- LSP integration for diagnostics and code intelligence
- Command: `modeler.openInDesigner` (placeholder)

## Development

1. Open this package in VS Code
2. Press F5 to launch Extension Development Host
3. Open any `.ttr` file to test syntax highlighting and LSP diagnostics

## Building

```bash
pnpm install
pnpm run build
```

The extension requires the LSP server at `dist/server-stdio.js` from `@modeler/lsp`. Make sure `@modeler/lsp` is built before building this extension.