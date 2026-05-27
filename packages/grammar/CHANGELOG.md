# TTR grammar changelog

Versioning follows `X.Y`:

- **X** — breaking change. New required syntax, removed/renamed constructs, or
  changes that cause previously-valid `.ttr` files to fail to parse.
- **Y** — additive change. New optional constructs, syntactic sugar, parser
  bug fixes, or any change that keeps previously-valid files parsing.

The canonical version lives in the `// @grammar-version:` marker at the top of
`src/TTR.g4`. The prebuild script extracts it into
`src/generated/version.ts`, re-exported from `@modeler/grammar` as
`TTR_GRAMMAR_VERSION`.

## 2.0 — 2026-05-27

Major version bump promoting the v1.1 "packages" work to a stable grammar
version. Breaking because the document rule now accepts new top-level
constructs and several new reserved keywords were added.

- Added `package <qualifiedName>` top-level declaration.
- Added `import <qualifiedName>[.*]` top-level declaration.
- Added `graph <id> { ... }` block with `schema`, `objects`, and `layout`
  properties (replaces the v1 `.modeler/layout.ttrl` sidecar).
- New lexer tokens: `PACKAGE`, `IMPORT`, `GRAPH`, `OBJECTS`, `LAYOUT`, `STAR`.
- New parser rules: `packageDecl`, `importDecl`, `graphBlock`,
  `graphProperty`, `graphSchemaProperty`, `graphObjectsProperty`,
  `graphLayoutProperty`, `qualifiedName`.
- `idPart` extended so the new keywords remain usable inside cross-reference
  components.

## 1.x

Pre-versioning baseline. See git history under `packages/grammar/src/TTR.g4`.
