# @modeler/semantics

Placeholder package for Phase 0. Full implementation in Phase 2.B/C/D.

## Exports (Phase 0 — stubs)

- `SymbolTable` — empty interface, TODO in Phase 2.B
- `Resolver` — empty interface, TODO in Phase 2.C
- `Validator` — empty interface, TODO in Phase 2.D
- `noop()` — placeholder function returning void

## Rationale

This package intentionally ships as a minimal placeholder. Downstream packages (`@modeler/lsp`) can import from it without errors. Full semantic features (symbol table, reference resolution, validation) land in Phase 2.