# Broken Sample Fixtures — v1.1

These files contain intentional defects. They are consumed by tests and manual smoke checks — do not "fix" them.

## v1.1 Diagnostic Fixtures

| File | Diagnostic Code | Trigger |
|------|-----------------|---------|
| `unimported-reference.ttr` | `ttr/unimported-reference` | Fully-qualified ref `pkg_b.er.entity.some_rel` with `pkg_b` not imported |
| `unused-import.ttr` | `ttr/unused-import` | Named import `pkg_b.some_entity` never referenced |
| `wildcard-with-no-matches.ttr` | `ttr/wildcard-with-no-matches` | `import pkg_nonexistent.*` where `pkg_nonexistent` has no definitions |
| `duplicate-import.ttr` | `ttr/duplicate-import` | Same import declared twice: `import pkg_b.some_entity` × 2 |
| `circular/pkg_a/a.ttr` + `circular/pkg_b/b.ttr` | `ttr/circular-package-dependency` | pkg_a imports pkg_b, pkg_b imports pkg_a (cycle) |
| `pkg_a/package-declaration-mismatch.ttr` | `ttr/package-declaration-mismatch` | File under `pkg_a/` declares `package wrong.pkg` |
| `pkg_a/sub/missing-package-declaration.ttr` | `ttr/missing-package-declaration` | File in subdirectory has no `package` declaration |
| `ambiguous-reference.ttr` | `ttr/ambiguous-reference` | Bare ref `shared_name` matches defs in 2 wildcard-imported packages |
| `wrong-file-kind.ttr` | `ttr/wrong-file-kind` | `.ttr` file contains both a `graph` block and top-level `def` statements |
| `graph_object_not_found.ttrg` | `ttr/graph-object-not-found` | `.ttrg` `objects` references `er.entity.nonexistent` which doesn't exist |
| `graph-layout-stale-node.ttrg` | `ttr/graph-layout-stale-node` | **N/A — blocked on C1:** the grammar's `layout.nodes` map requires IDENT keys; qname-keyed nodes (with dots) cannot parse. |
| `graph_objects_empty.ttrg` | `ttr/graph-objects-empty` | `.ttrg` has `objects: []` |
| `graph_name_mismatch.ttrg` | `ttr/graph-name-mismatch` | File stem `graph_name_mismatch.ttrg` contains `graph wrong_name { ... }` |
| `file-ordering.ttr` | `ttr/file-ordering` | **Note:** grammar is order-strict; this fixture cannot currently emit the diagnostic. Kept for completeness. |

## Cross-file Dependencies

- `unimported-reference.ttr` requires `pkg_b/` files present in the same project for the resolver to find `pkg_b.er.entity.some_rel`.
- `circular/pkg_a/a.ttr` requires `circular/pkg_b/b.ttr` for the cycle to form.
- `ambiguous-reference.ttr` requires `pkg_b1/` and `pkg_b2/` files each containing `def entity shared_name`.

## Notes on N/A Fixtures

### `ttr/file-ordering`

The grammar is order-strict (`packageDecl? importDecl* (schemaDirective | graphBlock)? definition* EOF`). Out-of-order files produce `ttr/parse-error`, not `ttr/file-ordering`. The `file-ordering.ttr` fixture is included for completeness but will not emit `ttr/file-ordering` under normal parsing. The diagnostic is a placeholder for a future formatter that operates on a permissive AST builder.

### `ttr/graph-layout-stale-node`

The grammar's `layout.nodes` property accepts an `object_` production whose `key` is an `id` (IDENT token). Qname-keyed layout nodes like `"er.entity.nonexistent": { x: 100, y: 100 }` cannot parse because qnames contain dots that are tokenised as punctuation, not IDENT. This is a C1 grammar gap — the fixture is present for completeness but will not emit the diagnostic until the grammar supports string/qname keys in layout nodes.