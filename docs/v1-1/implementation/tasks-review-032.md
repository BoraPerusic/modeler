# Tasks — review-032 (search block feature)

> Findings in [`review-032.md`](review-032.md). T1–T4 are essentially done and correct. This is a short follow-up list: 1 real fix, 2 optional polish, 1 separate-ticket flag, 1 coordination item.

## 1. Regenerate the stale TextMate generator artifact — DO

The `.ts` was edited (added `case 'FUZZY'`) but the compiled `.js` it derives — which the canonical regen script actually runs — was never regenerated, so it's missing the `FUZZY` case.

- [ ] **1.1.** Run the canonical regen:
  ```bash
  pnpm --filter @modeler/vscode-ext run regen-tmgrammar
  ```
- [ ] **1.2.** Confirm `git diff` shows the `FUZZY` case now present in `packages/vscode-ext/scripts/generate-tm-grammar.js`, and that `packages/vscode-ext/syntaxes/ttr.tmLanguage.json` is unchanged (expected — see task 4; the generator doesn't emit property-keyword patterns).
- [ ] **1.3.** Commit the regenerated `.js` alongside the grammar change (per the feature's commit-style rule: regeneration in the same commit as the edit it derives from).

## 2. Guard the two new broken fixtures — OPTIONAL (recommended)

`search-fuzzy-without-searchable.ttr` and `search-duplicate-subproperty.ttr` live under `samples/broken/v1.1/` but no test asserts they emit their intended code.

- [ ] **2.1.** Add two rows to the B7 table in `tests/integration/src/integration.test.ts` → `describe('v1.1 broken fixture diagnostics')`:
  ```ts
  ['search-fuzzy-without-searchable.ttr', ['ttr/fuzzy-without-searchable']],
  ['search-duplicate-subproperty.ttr', ['ttr/duplicate-search-property']],
  ```
- [ ] **2.2.** Run `pnpm --filter @modeler/integration-tests test` and confirm the exact-set assertions pass (these fixtures declare no package and are root files, so they should emit only their search diagnostic — verify there's no stray code).

## 3. Tighten `searchBlocksOf` typing — OPTIONAL

- [ ] **3.1.** In `packages/semantics/src/validator.ts`, change `searchBlocksOf`'s parameter from the structural `{ kind: string; search?…; columns?: unknown[]; attributes?: unknown[] }` to the `Definition` union type (import it from `@modeler/parser`), narrowing on `def.kind` instead of casting. Keep behaviour identical. (Cosmetic; current code is lint-clean and works.)

## 4. TextMate property-keyword highlighting — SEPARATE TICKET (not a blocker)

- [ ] **4.1.** File a ticket: the generated `ttr.tmLanguage.json` has a `keywords` repository entry that `include`s `#keyword_other_property_ttr` (and `#keyword_control_def_ttr`, etc.), but the generator never emits those repository blocks — the includes are dangling, so no property keyword (`search`, `searchable`, `fuzzy`, `patterns`, `keywords`, …) is highlighted. Pre-existing; affects all property keywords, not just the new ones. Until fixed, the feature README's manual-smoke ("confirm `search`/`searchable`/`fuzzy` highlight") cannot pass.

## 5. T5 (ai-platform) — COORDINATE / VERIFY

- [ ] **5.1.** In `~/Dev/ai-platform`: confirm `packages/grammar/scripts/check-sync.sh ~/Dev/ai-platform` reports matching hashes, the Kotlin parser was regenerated, and the YAML→TTR converter emits `search { searchable: … }` (merged with any other search content). Run ai-platform's metadata test suite.
- [ ] **5.2.** Coordinate merge order: T5 must merge **before** any ai-platform metadata produced with the old top-level `searchable` is re-validated against the new grammar, or that metadata fails to parse.

## Verify

```bash
pnpm -r build && pnpm -r typecheck && pnpm -r lint && pnpm -r test
```
All green today; re-run after tasks 1–3.
