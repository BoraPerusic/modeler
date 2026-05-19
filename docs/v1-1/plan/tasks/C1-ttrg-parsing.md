# 1.1.C.1 — `.ttrg` parsing, validation, edge inclusion

**Goal:** `.ttrg` files parse via the same parser as `.ttr`; the validator enforces graph-block invariants; the resolver computes the edge set from the explicit object list using the "edges-are-computed" rule.

**Reads:** [contracts §7 (.ttrg shape)](../../design/v1-1-contracts.md#7-ttrg-graph-file-shape), [contracts §2 (GraphBlock AST)](../../design/v1-1-contracts.md#2-ast-additions), `packages/parser/src/index.ts`, `packages/semantics/src/validator.ts`.
**Blocked by:** 1.1.B.4.
**Blocks:** C2 (LSP methods consume the parsed Graph), E (Designer renders from C2).
**Estimated time:** 2 days.

## Tests-first

- [ ] `packages/parser/src/__tests__/ttrg-parse.test.ts` — new file. Cases:
  - Hand-authored `.ttrg` fixture (mini, 2 entities, 1 relation) parses to a `Document` with `graph` populated and `definitions === []`.
  - `.ttrg` file with no `graph` block → `ttr/wrong-file-kind` (Error).
  - `.ttr` file with a `graph` block → `ttr/wrong-file-kind` (Error). (Already wired in B1.5; verify here too.)
  - `parseFile` correctly distinguishes `.ttr` vs `.ttrg` by extension and labels the document accordingly.
- [ ] `packages/semantics/src/__tests__/graph-validator.test.ts` — new file. Cases:
  - `graph X { schema: er, objects: [a.b.er.entity.Y] }` where `a.b.er.entity.Y` exists → 0 diagnostics.
  - Same graph with `objects: [a.b.er.entity.NOPE]` (unresolved) → `ttr/graph-object-not-found` (Warning) at the qname's range.
  - `objects: []` → `ttr/graph-objects-empty` (Warning) [add this code if not already in contracts §6; otherwise reuse `ttr/empty-collection`].
  - Layout-stale: `layout.nodes["a.b.er.entity.OLD"]` where `OLD` is not in `objects` → `ttr/graph-layout-stale-node` (Warning).
  - Filename mismatch: file `views/foo.ttrg` contains `graph bar { ... }` → `ttr/graph-name-mismatch` (Warning) [add to contracts §6 if missing].
- [ ] `packages/lsp/src/__tests__/graph-resolve.test.ts` — new file. Cases for the edge-inclusion rule:
  - Graph contains `objects: [A, B, R]` where `R` is a relation with `from: A, to: B`. The computed graph has 2 nodes and 1 edge.
  - Same `objects: [A, B]` (relation `R` omitted): 2 nodes, **0 edges** (explicit objects, edges-are-computed-from-the-explicit-set per [contracts §7.2](../../design/v1-1-contracts.md#72-edge-inclusion-semantics-open-question-6-resolution)).
  - `objects: [A, R]` (B omitted): 1 node, 0 edges (edge needs both endpoints).

## Library reference

`.ttrg` shares the parser with `.ttr` — no new parsing library. The Cytoscape rendering happens later (E1–E4); this task stops at producing the model graph JSON.

## Implementation tasks

- [ ] **C1.1 — Update `parseString` / `parseFile` to accept a file-kind hint.** Add an optional `kind: 'ttr' | 'ttrg'` parameter (default: infer from file extension or pass through). The parser dispatches the same grammar but tags the result. The `Document` doesn't change shape — `kind` is implicit from whether `graph` or `definitions` is populated.
- [ ] **C1.2 — Add `ttr/graph-objects-empty` and `ttr/graph-name-mismatch` to the diagnostic union.** Both codes are in [contracts §6](../../design/v1-1-contracts.md#6-diagnostic-codes-v11-additions) (added in contracts v2). Add them to the `DiagnosticCode` union in `packages/semantics/src/validator.ts`; no contract amendment needed.
- [ ] **C1.3 — Implement `GraphValidator`.** New file `packages/semantics/src/graph-validator.ts`. Exports `validateGraph(graph: GraphBlock, projectSymbols: ProjectSymbolTable, fileUri: string): Diagnostic[]`. Implements all five validations from the tests above. Emits diagnostics with accurate source locations (use the per-object `source` from each AST node, not the parent graph's location).
- [ ] **C1.4 — Wire `GraphValidator` into the validator entry point.** In the existing `Validator.diagnose(document)` flow, when `document.graph` is populated, call `validateGraph` and merge its diagnostics into the result.
- [ ] **C1.5 — Implement edge-inclusion computation.** New helper `computeGraphEdges(graph: GraphBlock, projectSymbols: ProjectSymbolTable): GraphEdge[]`. For each qname in `objects` that's a relation/fk, check whether both endpoint qnames are also in `objects`. If yes, include the edge; if no, skip. Used by `modeler/getGraph` (C2.2).
- [ ] **C1.6 — Hand-author a `.ttrg` fixture for the test suite.** Place under `samples/v1.1-mini/graphs/artikl_overview.ttrg` (creating the directory). The fixture references entities from the migrated v1.1-mini samples (which 1.1.G will produce — for now, hand-author the corresponding `.ttr` files with `package` declarations so the fixture resolves). Document at the top of the file: `// hand-authored fixture for 1.1.C; eventual home is the migrated samples in 1.1.G`.

## Verify by running

```bash
pnpm --filter @modeler/parser test
pnpm --filter @modeler/semantics test
pnpm --filter @modeler/lsp test
pnpm -r typecheck
```

All three test files green; existing tests still pass.

## DONE when

- [ ] Every checkbox above is ticked.
- [ ] `.ttrg` files parse cleanly; the `Document.graph` field is populated.
- [ ] `GraphValidator` enforces all five rules from the test list.
- [ ] `computeGraphEdges` correctly implements the edges-are-computed-from-objects rule.
- [ ] Contracts amended (if C1.2 needed it) and version-bumped per the contract-amendment discipline.
- [ ] No LSP method changes yet — C2 wraps the parsed/validated graph in custom LSP methods.
