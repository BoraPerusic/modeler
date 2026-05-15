import { createServerConnection } from './server.js';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/lib/node/main.js';
import { findProjectRoot, loadProject, loadStockVocabularies } from '@modeler/semantics/node-only';
import type {
  RenderableSchemaCode,
  DisplayMode,
  SchemaCode,
  Cardinality,
  ModelGraphNode,
  ModelGraphRow,
  ModelGraphEdge,
  ModelGraph,
  ViewportState,
  LayoutFile,
  PerKindData,
  SymbolDetail,
} from './model-graph.js';
import { renderDataType, parseCardinality, emptyLayout, validateLayout } from './model-graph.js';

export type {
  RenderableSchemaCode,
  DisplayMode,
  SchemaCode,
  Cardinality,
  ModelGraphNode,
  ModelGraphRow,
  ModelGraphEdge,
  ModelGraph,
  ViewportState,
  LayoutFile,
  PerKindData,
  SymbolDetail,
};
export { renderDataType, parseCardinality, emptyLayout, validateLayout };

const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);

createServerConnection(connection, {
  async loadManifest(rootUri: string): Promise<import('@modeler/semantics').ResolvedManifest> {
    const docPath = rootUri.startsWith('file://') ? rootUri.slice(7) : rootUri;
    const root = await findProjectRoot(docPath, docPath);
    const project = await loadProject(root);
    return project.manifest;
  },
  async loadStock() {
    const vocabs = await loadStockVocabularies(['cnc-roles']);
    const out: Array<{ uri: string; ast: import('@modeler/parser').Document; schemaCode: string; namespace: string }> = [];
    for (const [name, ast] of vocabs) {
      const schemaCode = ast.schemaDirective?.schemaCode ?? 'cnc';
      const namespace = ast.schemaDirective?.namespace ?? 'role';
      out.push({ uri: `stock://${name}.ttr`, ast, schemaCode, namespace });
    }
    return out;
  },
});

connection.listen();
