# TTR Diagnostic Codes

**Status:** v1 draft, 2026-05-14

This document lists every diagnostic code the TTR LSP can emit, organized by tier.

---

## Foundation Tier (Phase 1)

These diagnostics are produced by the parser layer (`@modeler/parser`) and propagated by the LSP (`@modeler/lsp`).

| Code | Severity | Trigger | Fix |
|------|----------|---------|-----|
| `ttr/parse-error` | Error | ANTLR syntax error — missing token, unexpected token, malformed input | Correct the syntactic structure |
| `ttr/unknown-property` | Error | Property name not recognized for the current `def <kind>` context (Phase 2 semantics work) | Use a valid property name; check for typos |

### `ttr/parse-error`

The parser's ANTLR error listener emits this for every syntactic violation. Severity is always `Error`. The LSP maps it to `DiagnosticSeverity::Error`.

Example:
```
def entity foo {
```
The opening `{` has no matching `}` on the same line. The parser's ANTLR error listener emits `ttr/parse-error` at end-of-file.

### `ttr/unknown-property`

**Reserved for Phase 2.** Defined in `DiagnosticCode` but not yet emitted by any Phase 1 code path. The grammar accepts any identifier as a property key — semantic validation of property names against the allowed set for each `def <kind>` is Phase 2.D work. The code is reserved for that layer.

---

## Core Tier (Phase 2)

These diagnostics are produced by the semantics layer (`@modeler/semantics`) and are out of scope for Phase 1.

| Code | Severity | Trigger | Fix |
|------|----------|---------|-----|
| `ttr/unresolved-reference` | Warning | A dotted reference (e.g. `er.entity.artikl`) does not resolve against the symbol table | Define the referenced symbol, or correct the qname |
| `ttr/duplicate-definition` | Error | A qname is defined more than once in the same scope | Rename or remove the duplicate |
| `ttr/required-property-missing` | Warning | A `def <kind>` is missing a required property for its kind | Add the required property |
| `ttr/invalid-type` | Error | The value for `type:` is not a valid data type | Use a recognized type name or remove the property |

---

## Severity mapping

The LSP maps parser codes to LSP severities as follows:

| Parser code | LSP severity |
|---|---|
| `ttr/parse-error` | `Error` |
| `ttr/unknown-property` | `Error` (Phase 2 — reserved, not yet emitted) |
| (Phase 2 codes) | |
| `ttr/unresolved-reference` | `Warning` (configurable to `Error` via `[lint].strict`) |
| `ttr/duplicate-definition` | `Error` |
| `ttr/required-property-missing` | `Warning` |
| `ttr/invalid-type` | `Error` |

All diagnostics carry `source: "modeler"` in the LSP `Diagnostic` payload. Phase 2 diagnostics may carry additional structured data in `data` fields for quick-fix actions.

---

## Adding a new diagnostic code

1. Add the code to the appropriate tier enum in `@modeler/parser/src/diagnostics.ts`
2. Emit it from the layer that detects the condition (parser for syntax errors, semantics for cross-reference errors)
3. Update this document with the code, severity, trigger, and fix
4. Add a test in the emitting layer asserting the code is set
5. If the code maps to a non-default severity, update `packages/lsp/src/server.ts`'s `publishDiagnostics` mapping