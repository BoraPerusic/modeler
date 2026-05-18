# Tatrman Modeler

Editor-side tooling for the **TTR** modeling language: a VS Code extension, a static React graphical designer, and a shared TypeScript LSP server. All consumers share one parser, one semantic engine, and one LSP — the runtime side of TTR is consumed by `ai-platform` (separate repo); this repo is editor tooling only.

The grammar lives in `packages/grammar/src/TTR.g4`. Sample projects are under `samples/`.

## What ships in v1

- **VS Code extension** — `.ttr` syntax highlighting, diagnostics, hover, go-to-definition, find-references, workspace symbol search.
- **Graphical Designer** — read-only React + Cytoscape.js renderer for `db` and `er` schemas. Display-mode toggle (just-names / with-types / with-constraints), schema toggle (db ↔ er), inspector panel with symbol details and reference navigation, layout persistence (node positions + per-schema viewport + display mode round-trip through `.modeler/layout.ttrl`). Deployed via GitHub Pages; `?demo=v1-metadata` query loads the sample project without an upload.
- **Tatrman LSP** — single TypeScript server, two transports: stdio for VS Code / IntelliJ, Web Worker for the Designer. Custom `modeler/*` methods documented in [packages/lsp/README.md](packages/lsp/README.md).

Edit mode (round-tripping graph edits back into `.ttr` text) lands in v1.1; `modeler/applyGraphEdit` is a stub returning `{ ok: false }` in v1.

## Architecture

See [docs/design/architecture.md](docs/design/architecture.md) for the full design and decision log, plus the Designer ↔ LSP control-flow diagram for the deployed (browser) topology.

## Phase status

**Phase 3 — complete.** All sections A–K shipped. See [docs/plan/progress-phase-03.md](docs/plan/progress-phase-03.md) for the per-section progress log and [docs/plan/tasks-phase-03-designer.md](docs/plan/tasks-phase-03-designer.md) for the original task plan.

| Section | Scope |
|---|---|
| A | Designer scaffold cleanup |
| B | LSP custom-method integration |
| C | `db` schema rendering |
| D | `er` schema rendering with cardinality glyphs |
| E | Inspector panel |
| F | Layout persistence (positions, viewport, display mode) |
| G | Static GitHub Pages deploy |
| H | Symbol indexing for `relation` / `query` / `role` / `er2db*` kinds |
| I | `ttr/parse-recovery-info` diagnostic |
| J | `@vscode/test-electron` smoke tests (TC1–TC5) |
| K | Documentation pass |

## Developing locally

### Prerequisites

- Node.js 20+
- pnpm 11+ (the repo pins `pnpm@11.1.1` via `packageManager`; Corepack picks it up automatically)

### Setup

```bash
pnpm install
pnpm -r build      # builds all packages
pnpm -r test       # 226 vitest cases across packages + integration
pnpm -r lint
pnpm -r typecheck
```

### Per-package commands

```bash
pnpm --filter @modeler/designer dev          # Vite dev server on http://localhost:5173
pnpm --filter @modeler/vscode-ext test:smoke # boots VS Code, runs 5 smoke cases
pnpm --filter @modeler/integration-tests test
```

For the VS Code extension dev cycle, open `packages/vscode-ext` in VS Code and press F5 — the Extension Development Host opens; load any `.ttr` from `samples/` to exercise syntax highlighting, diagnostics, and navigation.

### Package structure

| Package | Purpose |
|---|---|
| [`@modeler/grammar`](packages/grammar) | `TTR.g4` grammar and the ANTLR / TextMate generation scripts; no runtime logic |
| [`@modeler/parser`](packages/parser/README.md) | `parseString` / `parseFile` returning `{ ast, errors }`; recovery strategy emits `ttr/parse-recovery-info` |
| [`@modeler/semantics`](packages/semantics/README.md) | Symbol table, resolver, validator, reference index — browser-safe core plus a Node-only subpath for disk I/O |
| [`@modeler/lsp`](packages/lsp/README.md) | LSP server (stdio + browser worker), Phase-3 custom `modeler/*` methods |
| [`@modeler/vscode-ext`](packages/vscode-ext/README.md) | VS Code extension — thin shim, all language logic lives in the LSP |
| [`@modeler/designer`](packages/designer/README.md) | React + Cytoscape.js Designer; deployed via GitHub Pages |

## Documentation

- [docs/design/architecture.md](docs/design/architecture.md) — Architecture and design decisions
- [docs/design/diagnostics.md](docs/design/diagnostics.md) — Diagnostic codes, severities, examples
- [docs/design/phase-03-contracts.md](docs/design/phase-03-contracts.md) — Phase-3 LSP custom-method contracts
- [docs/plan/implementation-plan.md](docs/plan/implementation-plan.md) — Phased implementation plan
- [docs/plan/progress-phase-03.md](docs/plan/progress-phase-03.md) — Phase 3 progress log
