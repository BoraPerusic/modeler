# Tatrman Modeler

This folder contains the support for the Tatrman modeling language, TTR.

We start with the grammar in `packages/grammar/src/TTR.g4`, and samples in the `samples` directory.

## Goal

The goal is to develop the support for this language. We want the following:
- support for the language as a VS Code plugin
- support for the language as an IntelliJ Idea (or in general JetBrain's IDEs) plugin
- graphical designer

## Graphical Designer

Graphical designer should be based on the Ontology Playground project (see `~/Dev/view-only/ontology-playground`). We will update it as follows:
Reuse:
- the graphical canvas with objects and relationships, with its full functionality
- the right hand side panel for details
- the "Designer" mode
- the overall look and feel
- the tech stack
- the top menu bar
- the "natural language" pane

Get rid of
- the Quests and gamification
- the Ontology School

Updates
- different display "schemas" - for physical model, for E-R, for (coming) conceptual model; inlcuding, for example, different views of E-R schema (Chen, Crow's foot, UML)
- toggle to display details in the objects - columns (or attributes) inside the graph, and the level of detail (just columns, columns + types, incl. constrains and indices, ...)

Designer
- designer will produce updated TTR files

## Language Plugins

Standard language properties
- syntax highlighting
- reference checks for "variables" (objects in our case)
- suggestions

## Priority

1. VS Code
2. Graphical Designer
3. IntelliJ

## Architecture

See [docs/design/architecture.md](docs/design/architecture.md) for the full architecture and design decisions.

## Implementation Plan

See [docs/plan/implementation-plan.md](docs/plan/implementation-plan.md) for the phased implementation plan.

## Developing Locally

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run tests
pnpm -r test

# Lint all packages
pnpm -r lint
```

### Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm -r build` | Build all packages |
| `pnpm -r test` | Run all tests |
| `pnpm -r lint` | Lint all packages |

### Package Structure

| Package | Purpose |
|---------|---------|
| `@modeler/grammar` | TTR.g4 grammar and sync scripts |
| `@modeler/parser` | TypeScript parser generated from grammar |
| `@modeler/semantics` | Symbol table, resolver, validator (Phase 2) |
| `@modeler/edit` | WorkspaceEdit synthesizer (v1.1) |
| `@modeler/lsp` | LSP server (stdio and browser transports) |
| `@modeler/vscode-ext` | VS Code extension |
| `@modeler/designer` | React-based graphical designer |

### Testing the VS Code Extension

1. Open `packages/vscode-ext` in VS Code
2. Press F5 to launch Extension Development Host
3. Open any `.ttr` file to test syntax highlighting and LSP diagnostics

### Testing the Designer

```bash
cd packages/designer
pnpm run dev
```

Opens on http://localhost:5173

## Documentation

- [docs/design/architecture.md](docs/design/architecture.md) — Architecture and design decisions
- [docs/plan/implementation-plan.md](docs/plan/implementation-plan.md) — Phased implementation plan
- [docs/plan/progress-phase-00.md](docs/plan/progress-phase-00.md) — Phase 0 progress tracking