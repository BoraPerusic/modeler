# 1.1.E.4 — Reducer + per-graph layout persistence

**Goal:** the Designer's layout-persistence path is fully rewired from project-wide `.ttrl` to per-graph `layout` block inside each `.ttrg`. Reducer state model is final; schema-toggle UI decision is made.

**Reads:** [contracts §8.7 (updated existing methods)](../../design/v1-1-contracts.md#87-updated-existing-methods), [design doc §8.5](../../design/v1.1-packages-and-graphs.md#85-modelerdesigner), `packages/designer/src/state/designer-reducer.ts`, `packages/designer/src/Canvas.tsx`, `packages/designer/src/hooks/useLayoutSync.ts` (v1).
**Blocked by:** 1.1.E.3.
**Blocks:** the v1.1 Designer acceptance.
**Estimated time:** 2 days.

## Tests-first

- [ ] `packages/designer/src/__tests__/layout-persistence-v1.1.test.ts` — extend the existing layout-round-trip tests. New cases:
  - After `openGraph(uri)`, the Designer calls `client.getLayout(uri)` (with the new `graphUri` parameter) and dispatches `loadLayout` with the returned layout.
  - Dragging a node fires `setNodePosition`, which (debounced) calls `client.setLayout(uri, { ...currentLayout, nodes: {...currentLayout.nodes, [qname]: { x, y } } })`. The wire payload now includes `graphUri`.
  - Viewport changes (pan/zoom) flow analogously.
  - Display-mode changes are saved to the per-graph layout, not a project-wide store.
- [ ] `packages/designer/src/__tests__/schema-toggle-v1.1.test.tsx` — RTL. Cases:
  - With the schema toggle UI **removed** (per the E4 decision): no toggle in the header; the only way to switch schemas is to open a different graph from the picker.

## Library reference

No new libraries. The existing debounce + `setLayout` pattern stays; only the wire payload changes.

## Implementation tasks

- [ ] **E4.1 — Remove the schema-toggle UI.** Locked decision per [contracts §11.1](../../design/v1-1-contracts.md#111-locked-design-decision-schema-toggle-removed): each `.ttrg` is one schema; switching schemas means opening a different `.ttrg`. Remove the schema-toggle pills from `<Header />`. The "switch to equivalent graph in other schema" affordance is explicitly deferred to a future v1.x — don't try to ship a heuristic version in v1.1.
- [ ] **E4.2 — Update `useLayoutSync` hook.** Now takes `graphUri` instead of `projectRoot`. On graph open, fetches `client.getLayout(graphUri)`. On unmount or graph close, no flush needed (the debounced save already covered the last change).
- [ ] **E4.3 — Update the save path.** In `Canvas.tsx`, the debounced `saveLayout` function now calls `client.setLayout(currentGraphUri, layout)`. The layout object's shape is unchanged (matches v1's `LayoutFile`, minus the `viewports` keyed by schema since each `.ttrg` is one schema — flatten to a single `viewport`).
- [ ] **E4.4 — Remove project-wide layout state.** In the reducer, drop `viewports: Record<RenderableSchemaCode, ViewportState>` and replace with `currentViewport: ViewportState | null`. The previous "remember per-schema viewport" behaviour is now per-graph and lives on disk in each `.ttrg`.
- [ ] **E4.5 — Update the export-layout affordance.** The v1 "Export Layout" button (browser-mode only) downloaded the project's `.ttrl`. Now it downloads the current graph's `.ttrg` file as-is. Reuses `client.exportLayout(currentGraphUri)`.
- [ ] **E4.6 — Update `App.tsx` mount flow.** On project open, fetch `listGraphs` and show the picker. On graph select, fetch `getGraph` + `getLayout` in parallel, then render. On graph close, return to picker (do NOT reload `listGraphs` unless project URI changed).
- [ ] **E4.7 — Final reducer cleanup.** Confirm `DesignerState` matches [contracts §11.2](../../design/v1-1-contracts.md#112-state-shape) exactly: no `RenderableSchemaCode`-keyed fields, no `activeSchema`, no `viewports` (replaced by `currentViewport`). All action handlers in `designer-reducer.ts` covered by the unit test suite.

## Verify by running

```bash
pnpm --filter @modeler/designer test
pnpm --filter @modeler/designer typecheck
pnpm --filter @modeler/designer build
pnpm --filter @modeler/integration-tests test
```

All Designer + integration tests pass. Manual smoke: open a fixture graph, drag nodes, close and reopen, layout restored from the `.ttrg`'s `layout` block.

## DONE when

- [ ] Every checkbox above is ticked.
- [ ] Schema toggle UI removed (or repurposed per E4.1's chosen path).
- [ ] No `.ttrl`-shaped state remains in the Designer.
- [ ] Layout round-trips through the `.ttrg`'s `layout` block correctly.
- [ ] Designer acceptance per [`implementation-plan-v1.1.md`](../implementation-plan-v1.1.md) §1.1.E satisfied.
