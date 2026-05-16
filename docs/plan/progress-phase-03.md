# Phase 3 — Progress

**Started:** 2026-05-15
**Branch:** `feat/phase-03-designer`
**Status:** In progress

## Pre-flight
- [x] Confirm Phase 2 acceptance criteria (build, test, lint, typecheck all green)
- [x] Branch `feat/phase-03-designer` from merged Phase 2 PR
- [x] Read `docs/design/phase-03-contracts.md`
- [x] Read architecture docs (§4.7, §6, §4.5, §8.2)
- [x] Read `docs/plan/implementation-plan.md`
- [x] Re-read `docs/plan/progress-phase-02.md` "Deferred to later phases"
- [x] Walked Designer scaffold (`App.tsx`, `lsp-client.ts`, `Canvas.tsx`, `Header.tsx`, `InspectorPanel.tsx`)
- [ ] Verify context7 MCP responds

## Section A — Designer scaffold cleanup
- [x] A.1 Audit and remove Ontology-Playground vestiges (quest/gamif/school)
- [x] A.2 Create reducer skeleton (`designer-state.ts`, `designer-reducer.ts`) + tests
- [x] A.3 Refactor `App.tsx` onto the reducer
- [x] A.4 Extend `Header.tsx` with schema/display-mode toggles, read-only badge, NL pane toggle
- [x] A.5 Add `NlPane.tsx` (collapsible bottom panel)
- [x] A.6 Re-style for Phase-3 look (text-sky-500 active, border-slate-300 bar)

## Section B — LSP integration
- [x] B.1 `modeler/getModelGraph` rewrite (`model-graph.ts`) — multi-document via `buildProjectModelGraph`
- [x] B.2 Layout types + validator + handlers — types/validator inlined in `model-graph.ts` (per A-time deviation, see contracts v1 changelog); handlers registered in `server.ts` with Node atomic write + browser in-memory `Map`
- [x] B.3 `modeler/applyGraphEdit` placeholder
- [x] B.4 `modeler/getSymbolDetail` handler — per-kind data via re-parsed AST; v1 limitation: only top-level defs (see `findDefByQname` comment + integration test 4.6)
- [x] B.5 Designer-side `LspClient` expansion
- [x] B.6 File-system shim
- [x] B.7 Wire file-system shim into `App.tsx`

## Section C — db schema rendering
- [x] C.1 Add Cytoscape extensions (cose-bilkent, node-html-label)
- [x] C.2 Write `cy/adapter.ts` (`modelGraphToCyElements`) + 7 unit tests
- [x] C.3 Refactor `Canvas.tsx` to consume `ModelGraph`
- [x] C.4 Layout-once-on-load semantics (cose-bilkent on graph change)
- [x] C.5 Wire schema toggle (cache hit guard, F5 fix)
- [x] C.6 Wire display-mode toggle (refresh labels only, no re-layout)

## Section D — er schema rendering
- [x] D.1 `cy/glyph-renderer.ts` — `glyphFor(card)` returning `<g class="glyph-<name>">` with plan-compliant child shapes; covered by `glyph-renderer.test.ts` with snapshot tests
- [x] D.2 Cardinality mapping in LSP (already done in model-graph.ts; updated to include `"0..*"` → `'many'` per contract amendment v3)
- [x] D.3 Extend adapter for er — `isNameAttribute`/`isCodeAttribute` markers in rows; entity label from `getDisplayLabel`; relation edges carry `fromCardinality`/`toCardinality`
- [x] D.4 Canvas overlay for glyphs — SVG overlay via `cy.on('render zoom pan', renderOverlay)` + `requestAnimationFrame`; glyphs positioned at edge endpoints oriented along edge tangent; `glyphFor` consumed directly by the overlay
- [ ] D.5 Visual review (manual, pending dev server)

## Section E — Inspector panel
- [ ] E.1 `buildSymbolDetail` in LSP
- [ ] E.2 Register `modeler/getSymbolDetail`
- [ ] E.3 Extend reducer + client
- [ ] E.4 Rewrite `InspectorPanel.tsx`
- [ ] E.5 Wire selection from Canvas

## Section F — Layout persistence
- [ ] F.1 `debounce` utility
- [ ] F.2 Save flow (dragfreeon, viewport, layoutstop)
- [ ] F.3 Load flow
- [ ] F.4 Layout-vs-positions race resolution
- [ ] F.5 "Download layout" affordance
- [ ] F.6 Stale-qname tolerance

## Section G — Static deploy
- [ ] G.1 Sample copy script
- [ ] G.2 Vite config base path
- [ ] G.3 Demo-mode landing
- [ ] G.4 Landing-page card
- [ ] G.5 GitHub Pages workflow
- [ ] G.6 Smoke-curl post-deploy
- [ ] G.7 README and one-time setup

## Section H — Symbol indexing (carryover)
- [ ] H.1 Identify existing per-kind emitters
- [ ] H.2 Add emitters for 7 new kinds
- [ ] H.3 Verify resolver/ReferenceIndex pick them up
- [ ] H.4 Integration assertions
- [ ] H.5 Update Phase 2 progress doc

## Section I — Parse recovery info (carryover)
- [ ] I.1 Write `recovery.ts` (`RecoveryReportingStrategy`)
- [ ] I.2 Wire into `parseString`
- [ ] I.3 Update recovery-fixtures test
- [ ] I.4 Update Phase 2 progress doc
- [ ] I.5 Update `diagnostics.md`

## Section J — VS Code smoke test (carryover)
- [ ] J.1 devDependencies
- [ ] J.2 Test harness scaffold
- [ ] J.3 Smoke test (TC1-TC5)
- [ ] J.4 `test:smoke` script
- [ ] J.5 CI job
- [ ] J.6 Update Phase 2 progress doc

## Section K — Documentation
- [ ] K.1 `packages/semantics/README.md`
- [ ] K.2 `packages/lsp/README.md`
- [ ] K.3 `packages/designer/README.md`
- [ ] K.4 Top-level `README.md` update
- [ ] K.5 Architecture §10 close-out
- [ ] K.6 `diagnostics.md` final pass

## Final verification
- [ ] All eleven mini-task-lists have every box ticked
- [ ] `pnpm -r build && test && lint && typecheck` green
- [ ] `pnpm --filter @modeler/integration-tests test` green
- [ ] `pnpm --filter @modeler/vscode-ext test:smoke` green
- [ ] `pnpm --filter @modeler/designer build` produces working static bundle
- [ ] GitHub Pages deploy workflow ran at least once
- [ ] Hand-verified demo path (open ?demo=v1-metadata)
- [ ] No regressions in Phase 1/2 features

## Test Results
```
pnpm -r build:        ✅
pnpm -r test:         ✅  151 tests total (19 parser, 40 semantics, 35 lsp, 30 designer, 6 vscode-ext, 21 integration)
pnpm -r lint:         ✅  0 errors, 0 warnings
pnpm -r typecheck:    ✅
```

## Deferred from Phase 2
| Item | Target |
|------|--------|
| `parse-recovery-info` emission | Phase 3.I |
| VS Code `@vscode/test-electron` smoke test | Phase 3.J |
| `packages/semantics/README.md` | Phase 3.K |
| `packages/lsp/README.md` v2 surface doc | Phase 3.K |
| Indexing relations/queries/roles/er2db_* | Phase 3.H |
