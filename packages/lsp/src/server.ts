import {
  InitializeParams,
  InitializeResult,
  TextDocuments,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
  TextDocumentChangeEvent,
  Connection,
  Location,
  SymbolInformation,
  SymbolKind,
  Hover,
  SemanticTokensBuilder,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import fuzzysort from 'fuzzysort';
import {
  parseString,
  type ParseError,
  type Document,
  type Definition,
  type Reference,
  type SourceLocation,
} from '@modeler/parser';
import {
  ProjectSymbolTable,
  Resolver,
  Validator,
  resolveManifest,
  loadProjectFromOpenDocuments,
  collectReferences,
  nestedDefs,
  ReferenceIndex,
  type ResolvedManifest,
  type ValidationDiagnostic,
} from '@modeler/semantics';

export interface ServerOptions {
  /**
   * Optional callback to load the project manifest for a workspace.
   * The stdio entry wires this to `findProjectRoot` + `loadProject` from
   * `@modeler/semantics/node-only`; the browser entry leaves it undefined.
   */
  loadManifest?: (rootUri: string) => Promise<ResolvedManifest>;

  /**
   * Optional callback to pre-load stock vocabulary documents. Each entry's
   * `uri` is used as the URI in the symbol table (typically
   * `stock://<name>.ttr`).
   */
  loadStock?: () => Promise<
    Array<{ uri: string; ast: Document; schemaCode: string; namespace: string }>
  >;
}

type FoundNode =
  | { kind: 'def'; def: Definition; enclosing?: Definition }
  | { kind: 'ref'; ref: Reference; from: Definition };

function isPositionInRange(line: number, char: number, loc: SourceLocation): boolean {
  if (line < loc.line || line > loc.endLine) return false;
  if (line === loc.line && char < loc.column) return false;
  if (line === loc.endLine && char > loc.endColumn) return false;
  return true;
}

function rangeArea(loc: SourceLocation): number {
  return (loc.endLine - loc.line) * 1000 + (loc.endColumn - loc.column);
}

function sourceLocationToRange(source: SourceLocation) {
  return {
    start: { line: source.line - 1, character: source.column },
    end: { line: source.endLine - 1, character: source.endColumn },
  };
}

export function createServerConnection(
  connection: Connection,
  opts: ServerOptions = {}
): void {
  const documents = new TextDocuments(TextDocument);

  const projectSymbols = new ProjectSymbolTable();
  let manifest: ResolvedManifest = resolveManifest(undefined, '');
  let resolver = new Resolver(projectSymbols);
  let validator = new Validator(projectSymbols, resolver, manifest);
  const refIndex = new ReferenceIndex();

  /**
   * Locate the most-specific AST node under the cursor.
   *
   * Walks every top-level def, recurses into nested attribute / column /
   * resultColumn children, and inspects every reference-valued property.
   * Returns the smallest range that contains the cursor; prefers
   * reference matches over their enclosing defs (so Cmd-clicking on
   * `er.entity.foo` inside a `nameAttribute:` lands on the reference).
   */
  function findNodeAtPosition(
    ast: Document,
    position: { line: number; character: number }
  ): FoundNode | null {
    const line = position.line + 1;
    const char = position.character;
    let best: FoundNode | null = null;
    let bestArea = Number.POSITIVE_INFINITY;

    function consider(node: FoundNode, source: SourceLocation): void {
      if (!isPositionInRange(line, char, source)) return;
      const area = rangeArea(source);
      if (area < bestArea) {
        best = node;
        bestArea = area;
      }
    }

    function visit(def: Definition, enclosing?: Definition): void {
      if (!isPositionInRange(line, char, def.source)) return;
      consider({ kind: 'def', def, enclosing }, def.source);

      for (const child of nestedDefs(def)) {
        visit(child, def);
      }
      for (const ref of collectReferences(def)) {
        consider({ kind: 'ref', ref, from: def }, ref.source);
      }
    }

    for (const def of ast.definitions) visit(def);
    return best;
  }

  function qnameOf(def: Definition, ast: Document, enclosing?: Definition): string {
    const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = ast.schemaDirective?.namespace ?? '';
    if (enclosing) {
      return [schemaCode, namespace, enclosing.name, def.name]
        .filter((s) => s !== '')
        .join('.');
    }
    return [schemaCode, namespace, def.name].filter((s) => s !== '').join('.');
  }

  function enclosingQnameOf(def: Definition, ast: Document): string | undefined {
    if (def.kind === 'entity' || def.kind === 'table' || def.kind === 'view' || def.kind === 'procedure') {
      const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
      const namespace = ast.schemaDirective?.namespace ?? '';
      return [schemaCode, namespace, def.name].filter((s) => s !== '').join('.');
    }
    return undefined;
  }

  function symbolKindOf(kind: string): SymbolKind {
    if (kind === 'entity' || kind === 'table' || kind === 'view') return SymbolKind.Class;
    if (kind === 'column' || kind === 'attribute') return SymbolKind.Field;
    if (kind === 'procedure' || kind === 'query') return SymbolKind.Method;
    return SymbolKind.File;
  }

  function getDocument(uri: string): TextDocument | undefined {
    return documents.get(uri);
  }

  function parseDocument(content: string, uri: string): Document | undefined {
    const result = parseString(content, uri);
    return result.ast;
  }

  function rebuildValidator(): void {
    resolver = new Resolver(projectSymbols);
    validator = new Validator(projectSymbols, resolver, manifest);
  }

  function publishDiagnostics(uri: string, content: string): void {
    if (uri.endsWith('.ttrl')) return;

    const result = parseString(content, uri);
    const diagnostics: Diagnostic[] = result.errors.map((err: ParseError) => ({
      range: sourceLocationToRange(err.source),
      message: err.message,
      severity: err.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
      code: err.code,
      source: 'modeler',
    }));

    if (result.ast) {
      const structural = validator.validateDocument(uri, result.ast);
      const refs = validator.validateReferences(uri, result.ast);
      const project = validator.validateProject().filter((d) => d.source.file === uri);
      for (const d of [...structural, ...refs, ...project]) {
        diagnostics.push(toLspDiagnostic(d));
      }
    }

    connection.sendDiagnostics({ uri, diagnostics });
  }

  function toLspDiagnostic(d: ValidationDiagnostic): Diagnostic {
    const severity =
      d.severity === 'warning'
        ? DiagnosticSeverity.Warning
        : d.severity === 'info'
        ? DiagnosticSeverity.Information
        : DiagnosticSeverity.Error;
    return {
      range: sourceLocationToRange(d.source),
      message: d.message,
      severity,
      code: d.code,
      source: 'modeler',
    };
  }

  function updateSymbolTable(uri: string, content: string): void {
    const result = parseString(content, uri);
    if (!result.ast) return;
    const schemaCode = result.ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = result.ast.schemaDirective?.namespace ?? '';
    projectSymbols.upsertDocument(uri, result.ast, schemaCode, namespace);
    refIndex.upsertDocument(uri, result.ast, schemaCode, namespace, resolver);
  }

  documents.onDidOpen(async (event: TextDocumentChangeEvent<TextDocument>) => {
    // First open in a workspace: ask the host for the manifest. Cheap when
    // no callback is wired (browser worker).
    if (opts.loadManifest) {
      try {
        const root = event.document.uri.replace(/\/[^/]+$/, '');
        const loaded = await opts.loadManifest(root);
        manifest = loaded;
        rebuildValidator();
      } catch {
        // keep the default manifest
      }
    }
    updateSymbolTable(event.document.uri, event.document.getText());
    publishDiagnostics(event.document.uri, event.document.getText());
  });

  documents.onDidChangeContent((event: TextDocumentChangeEvent<TextDocument>) => {
    updateSymbolTable(event.document.uri, event.document.getText());
    publishDiagnostics(event.document.uri, event.document.getText());
  });

  documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
    projectSymbols.removeDocument(event.document.uri);
    refIndex.removeDocument(event.document.uri);
  });

  documents.onDidSave(() => {
    // nothing yet
  });

  connection.onInitialize(async (_params: InitializeParams): Promise<InitializeResult> => {
    if (opts.loadStock) {
      try {
        const docs = await opts.loadStock();
        for (const d of docs) {
          projectSymbols.upsertDocument(d.uri, d.ast, d.schemaCode, d.namespace);
        }
        rebuildValidator();
      } catch {
        // stock loading is best-effort
      }
    }
    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          willSave: false,
          save: false,
          change: TextDocumentSyncKind.Full,
        },
        definitionProvider: true,
        referencesProvider: true,
        hoverProvider: true,
        workspaceSymbolProvider: true,
        semanticTokensProvider: {
          legend: {
            tokenTypes: [
              'namespace',
              'type',
              'class',
              'property',
              'string',
              'number',
              'comment',
              'keyword',
              'variable',
            ],
            tokenModifiers: ['declaration', 'readonly', 'deprecated'],
          },
          full: true,
        },
      },
    };
  });

  connection.onInitialized(() => {
    // nothing yet
  });

  connection.onRequest('modeler/getProjectInfo', async (params: { textDocument: { uri: string } }) => {
    const allDocs = documents.all();
    const project = loadProjectFromOpenDocuments(
      allDocs.map((d) => ({ uri: d.uri })),
      params.textDocument.uri.replace(/\/[^/]+$/, ''),
      manifest
    );
    return { ...project.manifest, root: project.root, ttrFileCount: project.ttrFiles.length };
  });

  connection.onRequest('modeler/getModelGraph', (params: { textDocument: { uri: string } }) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return { nodes: [], edges: [] };
    }

    const content = doc.getText();
    const result = parseString(content, doc.uri);

    const nodes = (result.ast?.definitions ?? []).map((def: { name: string; kind: string }) => ({
      qname: def.name,
      kind: def.kind,
      label: def.name,
    }));

    return { nodes, edges: [] };
  });

  connection.onDefinition((params) => {
    const uri = params.textDocument.uri;
    const doc = getDocument(uri);
    if (!doc) return null;

    const ast = parseDocument(doc.getText(), uri);
    if (!ast) return null;

    const found = findNodeAtPosition(ast, params.position);
    if (!found) return null;

    const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = ast.schemaDirective?.namespace ?? '';

    if (found.kind === 'ref') {
      const res = resolver.resolveReference(
        { path: found.ref.path, parts: found.ref.parts },
        { schemaCode, namespace, enclosingQname: enclosingQnameOf(found.from, ast) }
      );
      if (!res.resolved) return null;
      return {
        uri: res.symbol.documentUri,
        range: sourceLocationToRange(res.symbol.source),
      } satisfies Location;
    }

    // cursor on a def: return its canonical declaration location
    const qname = qnameOf(found.def, ast, found.enclosing);
    const symbol = projectSymbols.get(qname);
    if (!symbol) return null;
    return {
      uri: symbol.documentUri,
      range: sourceLocationToRange(symbol.source),
    } satisfies Location;
  });

  connection.onReferences((params) => {
    const uri = params.textDocument.uri;
    const doc = getDocument(uri);
    if (!doc) return [];

    const ast = parseDocument(doc.getText(), uri);
    if (!ast) return [];

    const found = findNodeAtPosition(ast, params.position);
    if (!found) return [];

    const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = ast.schemaDirective?.namespace ?? '';

    let targetQname: string | null = null;
    if (found.kind === 'ref') {
      const res = resolver.resolveReference(
        { path: found.ref.path, parts: found.ref.parts },
        { schemaCode, namespace, enclosingQname: enclosingQnameOf(found.from, ast) }
      );
      if (res.resolved) targetQname = res.symbol.qname;
    } else {
      targetQname = qnameOf(found.def, ast, found.enclosing);
    }

    if (!targetQname) return [];

    const locations: Location[] = [];

    if (params.context?.includeDeclaration ?? true) {
      const declSymbol = projectSymbols.get(targetQname);
      if (declSymbol) {
        locations.push({
          uri: declSymbol.documentUri,
          range: sourceLocationToRange(declSymbol.source),
        });
      }
    }

    for (const refLoc of refIndex.findByQname(targetQname)) {
      locations.push({
        uri: refLoc.documentUri,
        range: sourceLocationToRange(refLoc.source),
      });
    }

    return locations;
  });

  connection.onHover((params) => {
    const uri = params.textDocument.uri;
    const doc = getDocument(uri);
    if (!doc) return null;

    const ast = parseDocument(doc.getText(), uri);
    if (!ast) return null;

    const found = findNodeAtPosition(ast, params.position);
    if (!found) return null;

    const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = ast.schemaDirective?.namespace ?? '';

    let qname: string | null = null;
    let def: Definition | null = null;

    if (found.kind === 'ref') {
      const res = resolver.resolveReference(
        { path: found.ref.path, parts: found.ref.parts },
        { schemaCode, namespace, enclosingQname: enclosingQnameOf(found.from, ast) }
      );
      if (!res.resolved) return null;
      qname = res.symbol.qname;
    } else {
      qname = qnameOf(found.def, ast, found.enclosing);
      def = found.def;
    }

    const symbol = projectSymbols.get(qname);
    if (!symbol) return null;

    const lines: string[] = [];
    lines.push(`**${symbol.qname}** *(${symbol.kind})*`);
    if (def && 'description' in def && def.description) {
      const desc = def.description;
      if (desc.kind === 'string' || desc.kind === 'tripleString') {
        lines.push(desc.value);
      }
    }
    const fileBaseName = symbol.documentUri.split('/').pop() ?? symbol.documentUri;
    lines.push(`- **Defined at:** ${fileBaseName}:${symbol.source.line}`);

    return {
      contents: { kind: 'markdown', value: lines.join('\n\n') },
    } satisfies Hover;
  });

  connection.onWorkspaceSymbol((params) => {
    const query = params.query ?? '';
    const allSymbols = projectSymbols.all();

    if (!query) {
      return allSymbols.slice(0, 100).map((symbol) => ({
        name: symbol.qname,
        kind: symbolKindOf(symbol.kind),
        location: {
          uri: symbol.documentUri,
          range: sourceLocationToRange(symbol.source),
        },
      })) satisfies SymbolInformation[];
    }

    const scored = fuzzysort.go(query, allSymbols, {
      keys: ['qname', 'name'],
      limit: 100,
    });

    return scored.map((entry) => {
      const symbol = entry.obj;
      return {
        name: symbol.qname,
        kind: symbolKindOf(symbol.kind),
        location: {
          uri: symbol.documentUri,
          range: sourceLocationToRange(symbol.source),
        },
      };
    }) satisfies SymbolInformation[];
  });

  /**
   * Emit one `class`-typed `declaration`-modified semantic token per
   * definition name. The token's start is computed by scanning the def's
   * opening line for the name immediately after the def-kind keyword.
   */
  connection.onRequest('textDocument/semanticTokens/full', (params) => {
    const uri = params.textDocument.uri;
    const doc = getDocument(uri);
    if (!doc) return { data: [] };

    const content = doc.getText();
    const result = parseString(content, uri);
    if (!result.ast) return { data: [] };

    const lines = content.split('\n');
    const builder = new SemanticTokensBuilder();

    function emitForDef(def: Definition): void {
      const lineIndex = def.source.line - 1; // 0-based
      const lineText = lines[lineIndex] ?? '';
      const nameStart = locateName(lineText, def.name, def.source.column);
      if (nameStart < 0) return;
      builder.push(lineIndex, nameStart, def.name.length, 2 /* class */, 1 /* declaration */);
      for (const child of nestedDefs(def)) emitForDef(child);
    }

    for (const def of result.ast.definitions) emitForDef(def);

    const tokens = builder.build();
    return tokens;
  });

  connection.onExit(() => {
    // nothing cleanup needed
  });

  documents.listen(connection);
}

/**
 * Find the column where `name` appears after `startCol` on the line. Returns
 * -1 if the name isn't found (e.g. on a continuation line where the def
 * keyword and name are on different lines).
 */
function locateName(lineText: string, name: string, startCol: number): number {
  // Search forward from startCol for the first occurrence of `name` as a
  // whole word. For inline defs (`def attribute id { ... }`), `name` is
  // usually a few tokens to the right of the def's first column.
  const idx = lineText.indexOf(name, startCol);
  if (idx < 0) return -1;
  // Sanity: prefer the name when preceded by whitespace or the def-kind word.
  const before = idx === 0 ? '' : lineText[idx - 1];
  if (before && /[A-Za-z0-9_]/.test(before)) {
    // adjacent to an identifier — try a later occurrence
    return lineText.indexOf(name, idx + name.length);
  }
  return idx;
}
