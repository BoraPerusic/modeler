import { parseString, type Document, type Definition } from '@modeler/parser';
import { computeGraphEdges, buildNodeForDef, type ModelGraphNode, type ModelGraphEdge } from './model-graph.js';
import { findCyclesOn, type PackageGraph } from '@modeler/semantics';

export interface GraphMetadata {
  uri: string;
  name: string;
  schema: 'db' | 'er' | 'map' | 'query' | 'cnc';
  description?: string;
  tags: string[];
  objectCount: number;
  missingObjectCount: number;
}

export interface GetGraphResponse {
  schema: 'db' | 'er' | 'map' | 'query' | 'cnc';
  nodes: ModelGraphNode[];
  edges: ModelGraphEdge[];
  layout: GraphLayoutOutput;
  missingObjects: string[];
}

export interface GraphLayoutOutput {
  viewport?: { zoom: number; panX: number; panY: number; displayMode: string };
  nodes: Record<string, { x: number; y: number }>;
  edges: Record<string, { bendPoints?: [number, number][] }>;
}

export interface PackageGraphResponse {
  packages: { name: string; documentUris: string[] }[];
  dependencies: { from: string; to: string; citedBy: string[] }[];
  cycles: string[][];
}

function getAllTtrgUris(documents: Map<string, string>): string[] {
  return [...documents.keys()].filter((uri) => uri.endsWith('.ttrg'));
}

function buildQname(schemaCode: string, namespace: string, parts: string[]): string {
  return [schemaCode, namespace, ...parts].filter((s) => s !== '').join('.');
}

function parseAllDocs(documents: Map<string, string>): Map<string, Document> {
  const docs = new Map<string, Document>();
  for (const [uri, content] of documents) {
    const result = parseString(content, uri);
    if (result.ast) docs.set(uri, result.ast);
  }
  return docs;
}

function buildQnameToDef(asts: Document[]): Map<string, { def: Definition; schemaCode: string; namespace: string }> {
  const map = new Map<string, { def: Definition; schemaCode: string; namespace: string }>();
  for (const ast of asts) {
    const schemaCode = ast.schemaDirective?.schemaCode ?? 'er';
    const namespace = ast.schemaDirective?.namespace ?? '';
    for (const def of ast.definitions) {
      const qname = buildQname(schemaCode, namespace, [def.name]);
      map.set(qname, { def, schemaCode, namespace });
    }
  }
  return map;
}

export function getPackageGraphFromCache(pkgGraph: PackageGraph): PackageGraphResponse {
  return {
    packages: pkgGraph.nodes.map((n) => ({ name: n.name, documentUris: n.documentUris })),
    dependencies: pkgGraph.edges.map((e) => ({ from: e.from, to: e.to, citedBy: e.citedBy })),
    cycles: findCyclesOn(pkgGraph),
  };
}

export function listGraphs(
  documents: Map<string, string>,
  qnameToDef?: Map<string, { def: Definition; schemaCode: string; namespace: string }>,
): GraphMetadata[] {
  const uris = getAllTtrgUris(documents);
  const results: GraphMetadata[] = [];

  for (const uri of uris) {
    const content = documents.get(uri);
    if (content === undefined) continue;
    const result = parseString(content, uri);
    const graph = result.ast?.graph;
    if (!graph) continue;

    let missingObjectCount = 0;
    if (qnameToDef) {
      for (const objQname of graph.objects) {
        if (!qnameToDef.has(objQname)) missingObjectCount++;
      }
    }

    results.push({
      uri,
      name: graph.name,
      schema: graph.schema ?? 'er',
      description: graph.description,
      tags: graph.tags ?? [],
      objectCount: graph.objects.length,
      missingObjectCount,
    });
  }

  return results;
}

export function getGraph(
  uri: string,
  documents: Map<string, string>,
  preferredLang = 'en',
): GetGraphResponse | null {
  const content = documents.get(uri);
  if (content === undefined) return null;
  const result = parseString(content, uri);
  const graph = result.ast?.graph;
  if (!graph) return null;

  const schema = graph.schema ?? 'er';
  const objectSet = new Set(graph.objects);

  const allDocs = parseAllDocs(documents);
  const qnameToDef = buildQnameToDef([...allDocs.values()]);

  const missingObjects = graph.objects.filter((qname) => !qnameToDef.has(qname));

  const edges = computeGraphEdges(graph, [...allDocs.values()]);

  const nodes: ModelGraphNode[] = [];

  for (const objQname of objectSet) {
    const entry = qnameToDef.get(objQname);
    if (!entry) continue;
    const { def, schemaCode, namespace } = entry;
    const node = buildNodeForDef(def, schemaCode, namespace, preferredLang);
    if (node) {
      node.qname = objQname;
      nodes.push(node);
    }
  }

  const layout: GraphLayoutOutput = {
    viewport: graph.layout?.viewport ? {
      zoom: graph.layout.viewport.zoom,
      panX: graph.layout.viewport.panX,
      panY: graph.layout.viewport.panY,
      displayMode: graph.layout.viewport.displayMode,
    } : undefined,
    nodes: graph.layout?.nodes ?? {},
    edges: graph.layout?.edges ?? {},
  };

  return { schema, nodes, edges, layout, missingObjects };
}