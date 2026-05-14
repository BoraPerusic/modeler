# @modeler/grammar

Canonical source for the TTR (Tatrman) language grammar.

## Files

- `src/TTR.g4` — ANTLR4 grammar file (canonical source)

## Scripts

### `generate-typescript-parser.sh`

Generates the TypeScript parser in `@modeler/parser/src/generated/`. Run from `@modeler/parser` package after installing `antlr4ng-cli`.

```bash
cd packages/parser
pnpm install
bash ../grammar/scripts/generate-typescript-parser.sh
```

### `sync-to-ai-platform.sh <ai-platform-path>`

Copies `TTR.g4` to the ai-platform vendored location:
```
<ai-platform-path>/shared/libs/kotlin/ttr-parser/src/main/antlr/shared/ttr/parser/generated/TTR.g4
```

Adds a vendoring header comment with the commit hash.

### `check-sync.sh <ai-platform-path>`

Compares local and remote grammar files by hash. Exits non-zero if they differ.

## Policy

The grammar file lives here (canonical source). Any changes to the grammar must be made here and then propagated via `sync-to-ai-platform.sh` to ai-platform.