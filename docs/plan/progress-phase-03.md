# Phase 3 — Progress

**Started:** _(set when work begins)_
**Branch:** `feat/phase-03-designer`
**Status:** _(not started)_

This is a **summary** progress file. Granular task-level progress is tracked inside each mini-task-list file under `docs/plan/phase-03/` — every checkbox there is the single source of truth for that section. This file only reflects which mini-task-lists are open, in flight, or done.

When you start a mini-task-list, set its status here to **In flight**; when every checkbox in the file is ticked AND its `Verify by running` block exits 0 on a fresh tree, set its status to **Done** and add a one-line summary of what was decided differently than the plan (if anything).

## Pre-flight
- [ ] Phase 2 acceptance criteria green on a fresh clone (build, test, lint, typecheck)
- [ ] Branch `feat/phase-03-designer` created
- [ ] Required reading completed: contracts → architecture → implementation plan → progress-phase-02 deferrals
- [ ] Phase-0 Designer scaffold walked
- [ ] `context7` MCP responds (smoke `mcp__context7__resolve-library-id` call returned a valid id)
- [ ] This progress file mirrors the mini-task-list structure (this list)

## Designer body (sequential)

| Section | File | Status | Notes |
|---|---|---|---|
| A | [A-designer-scaffold.md](phase-03/A-designer-scaffold.md) | Not started | — |
| B | [B-lsp-integration.md](phase-03/B-lsp-integration.md) | Not started | — |
| C | [C-db-rendering.md](phase-03/C-db-rendering.md) | Not started | — |
| D | [D-er-rendering.md](phase-03/D-er-rendering.md) | Not started | — |
| E | [E-inspector.md](phase-03/E-inspector.md) | Not started | — |
| F | [F-layout-persistence.md](phase-03/F-layout-persistence.md) | Not started | — |
| G | [G-static-deploy.md](phase-03/G-static-deploy.md) | Not started | — |

## Phase-2 carryovers (parallel-safe with A; can begin immediately)

| Section | File | Status | Notes |
|---|---|---|---|
| H | [H-symbol-indexing.md](phase-03/H-symbol-indexing.md) | Not started | — |
| I | [I-parse-recovery.md](phase-03/I-parse-recovery.md) | Not started | — |
| J | [J-vscode-smoke.md](phase-03/J-vscode-smoke.md) | Not started | — |

## Documentation

| Section | File | Status | Notes |
|---|---|---|---|
| K | [K-documentation.md](phase-03/K-documentation.md) | Not started | — |

## Final verification

- [ ] All eleven mini-task-lists show Status: Done
- [ ] `pnpm -r build && test && lint && typecheck` green on a fresh clone
- [ ] `pnpm --filter @modeler/integration-tests test` green
- [ ] `pnpm --filter @modeler/vscode-ext test:smoke` green
- [ ] `pnpm --filter @modeler/designer build` produces a working static bundle that includes the worker
- [ ] GitHub Pages deploy URL renders `samples/v1-metadata/` in demo mode
- [ ] Hand-verified demo path complete (see `tasks-phase-03-designer.md` → "Hand-verified demo path")
- [ ] No regressions in Phase 1 / Phase 2 surfaces

## Test results

Captured after the final verification step lands. Format mirrors Phase 2's "Test results" section: per-package test count, build/lint/typecheck status.

```
pnpm -r build:      _
pnpm -r test:       _
  packages/parser:        _ tests
  packages/semantics:     _ tests
  packages/lsp:           _ tests
  packages/designer:      _ tests
  packages/vscode-ext:    _ tests (+ smoke: _)
  tests/integration:      _ tests
pnpm -r lint:       _
pnpm -r typecheck:  _
```

## Key decisions

_(Append decisions made during Phase 3 work that aren't already captured in the plan or contracts. Examples we expect to see: which Cytoscape glyph-overlay approach was chosen, exact cose-bilkent seed value, debounce intervals tuning, file-system shim filtering edge cases.)_

## Contract amendments

_(Append one line per amendment to `docs/design/phase-03-contracts.md`, with a date and a pointer to the PR. Per the amendments policy in the contracts doc.)_

## Deferred to later phases

| Item | Target |
|------|--------|
| Embeddable `<script>` distribution to npm | v1.x |
| VS Code webview embed of the Designer | v1.x |
| Designer edit mode + `WorkspaceEdit` synthesizer | v1.1 |
| `cnc` schema render + Chen / UML display variants | v1.4 |
| Natural-language pane wired to an LLM | v1.4 |
| macOS / Windows `vscode-ext` smoke runners | Phase 5 (hardening) |
