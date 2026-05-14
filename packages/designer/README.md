# @modeler/designer

Graphical designer for TTR (Tatrman) models. Forked from Ontology Playground with Quests and gamification removed.

## Status (Phase 0)

Minimal implementation:
- React 19 + Vite + Tailwind CSS scaffold
- Cytoscape canvas component for rendering nodes
- Header with file picker (File System Access API + fallback)
- Inspector panel (scaffold only, content in Phase 3)
- Simple node rendering from parsed .ttr content (no LSP in Phase 0)

## Development

```bash
cd packages/designer
pnpm install
pnpm run dev
```

Opens on http://localhost:5173

## Building

```bash
pnpm run build
```

Output goes to `dist/` as a static site.

## Phase 3 (read-only Designer v1)

- LSP integration for model loading
- db and er schema rendering
- Schema/detail toggles
- Layout persistence