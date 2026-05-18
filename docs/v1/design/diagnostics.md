# TTR Diagnostic Codes

**Status:** v1.1, 2026-05-16

This document lists every diagnostic code the TTR LSP can emit, organized by tier.

---

## Foundation Tier (Phase 1)

These diagnostics are produced by the parser layer (`@modeler/parser`) and propagated by the LSP (`@modeler/lsp`).

| Code | Severity | Trigger | Fix |
|------|----------|---------|-----|
| `ttr/parse-error` | Error | ANTLR syntax error — missing token, unexpected token, malformed input | Correct the syntactic structure |
| `ttr/parse-recovery-info` | Information | ANTLR error strategy recovered at a token — parser resynchronized and produced a partial AST | The input had a syntax error; recovery kept parsing to produce a usable result |
| `ttr/unknown-property` | Error | Property name not recognized for the current `def <kind>` context | Use a valid property name; check for typos |

### `ttr/parse-error`

The parser's ANTLR error listener emits this for every syntactic violation. Severity is always `Error`. The LSP maps it to `DiagnosticSeverity::Error`.

Example:
```
def entity foo {
```
The opening `{` has no matching `}` on the same line. The parser's ANTLR error listener emits `ttr/parse-error` at end-of-file.

### `ttr/parse-recovery-info`

When ANTLR encounters a syntax error it cannot fix with single-token insertion/deletion, it enters recovery mode — consuming tokens until it finds one that allows parsing to resume. The parser's `RecoveryReportingStrategy` (a subclass of `DefaultErrorStrategy`) captures each recovery point and emits a `ttr/parse-recovery-info` diagnostic at `Information` severity.

This diagnostic is always accompanied by at least one `ttr/parse-error` from the original syntax violation. The partial AST produced by the walk is still usable — recovery fixtures assert that recovered definitions are still populated.

Example for `def entity {` (missing entity name):
```
def entity {
  description: "Test"
```
ANTLR recovers by synthesizing a placeholder name; one `ttr/parse-error` (unexpected end of input) and one `ttr/parse-recovery-info` ("parser resumed after syntax error at '{'") are both emitted.

### `ttr/unknown-property`

Emitted when a property name is not recognized for the current `def <kind>` context.

Example:
```
def entity foo {
  descriptin: "Test"  # "descriptin" is not a valid entity property
}
```

## Core Tier (Phase 2)

These diagnostics are produced by the semantics layer (`@modeler/semantics`) and are out of scope for Phase 1.

| Code | Severity | Trigger | Fix |
|------|----------|---------|-----|
| `ttr/unresolved-reference` | Warning | A dotted reference (e.g. `er.entity.artikl`) does not resolve against the symbol table | Define the referenced symbol, or correct the qname |
| `ttr/duplicate-definition` | Error | A qname is defined more than once in the same scope | Rename or remove the duplicate |
| `ttr/required-property-missing` | Warning | A `def <kind>` is missing a required property for its kind | Add the required property |
| `ttr/invalid-type` | Error | The value for `type:` is not a valid data type | Use a recognized type name or remove the property |
| `ttr/entity-attribute-not-found` | Error | `nameAttribute` or `codeAttribute` points to an attribute that does not exist on the entity | Add the attribute or correct the path |
| `ttr/primary-key-column-not-found` | Error | `primaryKey` lists a column that does not exist on the table | Add the column or update the primaryKey list |

### `ttr/unresolved-reference`

The resolver (`@modeler/semantics/src/resolver.ts`) emits this when a dotted reference cannot be resolved against the symbol table. This includes stock vocabulary references (e.g. `fact` in `roles: [fact]`) that don't match any loaded stock role.

Example:
```
def entity orders {
  roles: [fact_role]  # "fact_role" is not a known stock role
}
```

### `ttr/duplicate-definition`

The validator's `validateProject()` emits this when the symbol table contains multiple entries with the same fully-qualified name.

Example:
```
# file1.ttr
schema db { def table users { columns: [...] } }
# file2.ttr
schema db { def table users { columns: [...] } }  # duplicate db.users
```

### `ttr/required-property-missing`

Emitted when a definition is missing a required property for its kind:
- `entity` must have at least one `attributes` entry
- `table` must have at least one `columns` entry
- `column` must have a `type` property
- `attribute` must have a `type` property
- When `lint.requireDescriptions: true`, any definition missing `description` emits a warning

### `ttr/invalid-type`

Reserved for Phase 2 type validation. Currently the parser accepts any identifier as a type name; semantic validation of type names against declared schema types is Phase 2 work.

### `ttr/entity-attribute-not-found`

Emitted when `nameAttribute` or `codeAttribute` on an entity does not match any attribute in the entity's `attributes` list.

Example:
```
def entity order {
  nameAttribute: id_order  # "id_order" not in attributes list
  attributes: [
    def attribute id { type: integer }
  ]
}
```

### `ttr/primary-key-column-not-found`

Emitted when `primaryKey` on a table lists a column name that doesn't exist in the table's `columns` list.

Example:
```
def table orders {
  primaryKey: [order_id]  # "order_id" not in columns list
  columns: [
    def column id { type: integer }
  ]
}
```

---

## Severity mapping

The LSP maps parser codes to LSP severities as follows:

| Parser code | LSP severity |
|---|---|
| `ttr/parse-error` | `Error` |
| `ttr/parse-recovery-info` | `Information` |
| `ttr/unknown-property` | `Error` |
| (Phase 2 codes) | |
| `ttr/unresolved-reference` | `Warning` (configurable to `Error` via `[lint].strict`) |
| `ttr/duplicate-definition` | `Error` |
| `ttr/required-property-missing` | `Warning` (error for entity/table/column/attribute without type; warning for missing description) |
| `ttr/invalid-type` | `Error` |
| `ttr/entity-attribute-not-found` | `Error` |
| `ttr/primary-key-column-not-found` | `Error` |

All diagnostics carry `source: "modeler"` in the LSP `Diagnostic` payload. Phase 2 diagnostics may carry additional structured data in `data` fields for quick-fix actions.

---

## Adding a new diagnostic code

1. Add the code to the appropriate tier enum in `@modeler/parser/src/diagnostics.ts`
2. Emit it from the layer that detects the condition (parser for syntax errors, semantics for cross-reference errors)
3. Update this document with the code, severity, trigger, and fix
4. Add a test in the emitting layer asserting the code is set
5. If the code maps to a non-default severity, update `packages/lsp/src/server.ts`'s `publishDiagnostics` mapping