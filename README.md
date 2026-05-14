# Tatrman  Modeler

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

