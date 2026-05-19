import Ajv2020Module from 'ajv/dist/2020.js';
import type { Definition, Document, EntityDef, ObjectValue, SimpleDataType, StructuredDataType, RoleDef } from '@modeler/parser';
import type { ProjectSymbolTable, Resolver, ReferenceIndex, ResolvedManifest } from '@modeler/semantics';

export type RenderableSchemaCode = 'db' | 'er';
export type DisplayMode = 'just-names' | 'with-types' | 'with-constraints';
export type SchemaCode = 'db' | 'er' | 'map' | 'query' | 'cnc';

export type Cardinality = 'one' | 'zero-or-one' | 'many' | 'one-or-many';

export interface ModelGraphNode {
  qname: string;
  kind: 'table' | 'view' | 'entity';
  name: string;
  schemaCode: RenderableSchemaCode;
  label: string;
  sourceUri: string;
  sourceLocation: { line: number; column: number };
  rows: ModelGraphRow[];
}

export interface ModelGraphRow {
  name: string;
  qname: string;
  kind: 'column' | 'attribute';
  type: string | null;
  isKey: boolean;
  optional: boolean;
  isNameAttribute: boolean;
  isCodeAttribute: boolean;
}

export interface ModelGraphEdge {
  id: string;
  qname: string;
  kind: 'fk' | 'relation';
  fromNode: string;
  toNode: string;
  fromCardinality: Cardinality | null;
  toCardinality: Cardinality | null;
  sourceUri: string;
  sourceLocation: { line: number; column: number };
}

export interface ModelGraph {
  schemaCode: RenderableSchemaCode;
  nodes: ModelGraphNode[];
  edges: ModelGraphEdge[];
}

export type DataType = DataTypeSimple | DataTypeStructured | undefined;
export interface DataTypeSimple { kind: 'simple'; name: string }
export interface DataTypeStructured { kind: 'structured'; typeName: string; length?: number; precision?: number }

export function renderDataType(t: DataType | SimpleDataType | StructuredDataType | undefined): string | null {
  if (!t) return null;
  if (t.kind === 'simple') return t.name;
  if (t.kind === 'structured') {
    const parts: string[] = [];
    if (typeof t.length === 'number') parts.push(String(t.length));
    if (typeof t.precision === 'number') parts.push(String(t.precision));
    return parts.length === 0 ? t.typeName : `${t.typeName}(${parts.join(',')})`;
  }
  return null;
}

export function parseCardinality(s: string): Cardinality | null {
  switch (s) {
    case '1': return 'one';
    case '0..1': return 'zero-or-one';
    case '0..*':
    case 'n':
    case '*': return 'many';
    case '1..n':
    case '1..*': return 'one-or-many';
    default: return null;
  }
}

export function extractCardinality(obj: ObjectValue | undefined): { from: Cardinality | null; to: Cardinality | null } {
  if (!obj) return { from: null, to: null };
  const lookup = (key: string): Cardinality | null => {
    const entry = obj.entries.find((e) => e.key === key);
    if (!entry || entry.value.kind !== 'string') return null;
    return parseCardinality(entry.value.value);
  };
  return { from: lookup('from'), to: lookup('to') };
}

// Layout sidecar types
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  displayMode: DisplayMode;
}

export interface LayoutFile {
  version: 1;
  viewports: Record<RenderableSchemaCode, ViewportState>;
  nodes: Record<string, { x: number; y: number }>;
  edges: Record<string, { bendPoints: Array<[number, number]> }>;
}

export function emptyLayout(): LayoutFile {
  return {
    version: 1,
    viewports: {
      db: { zoom: 1.0, panX: 0, panY: 0, displayMode: 'with-types' },
      er: { zoom: 1.0, panX: 0, panY: 0, displayMode: 'just-names' },
    },
    nodes: {},
    edges: {},
  };
}

const layoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://tatrman.org/schemas/layout/1.json',
  title: 'Tatrman Modeler layout sidecar',
  type: 'object',
  required: ['version', 'viewports', 'nodes', 'edges'],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    viewports: {
      type: 'object',
      required: ['db', 'er'],
      additionalProperties: false,
      properties: {
        db: { $ref: '#/$defs/viewport' },
        er: { $ref: '#/$defs/viewport' },
      },
    },
    nodes: {
      type: 'object',
      patternProperties: {
        '^.+$': {
          type: 'object',
          required: ['x', 'y'],
          additionalProperties: false,
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
      },
      additionalProperties: false,
    },
    edges: {
      type: 'object',
      patternProperties: {
        '^.+$': {
          type: 'object',
          required: ['bendPoints'],
          additionalProperties: false,
          properties: {
            bendPoints: {
              type: 'array',
              items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  $defs: {
    viewport: {
      type: 'object',
      required: ['zoom', 'panX', 'panY', 'displayMode'],
      additionalProperties: false,
      properties: {
        zoom: { type: 'number', exclusiveMinimum: 0 },
        panX: { type: 'number' },
        panY: { type: 'number' },
        displayMode: { enum: ['just-names', 'with-types', 'with-constraints'] },
      },
    },
  },
};

// ajv/dist/2020.js has a default export but TypeScript can't infer the constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv2020Module as any).default ?? Ajv2020Module;
const ajv = new AjvClass({ strict: false });
const validateLayoutFn = ajv.compile(layoutSchema);

export function validateLayout(unknown: unknown): LayoutFile | null {
  if (validateLayoutFn(unknown)) return unknown as LayoutFile;
  return null;
}

// Symbol detail types
export type PerKindData =
  | { kind: 'table'; columns: ModelGraphRow[]; primaryKey: string[] }
  | { kind: 'view'; columns: ModelGraphRow[] }
  | { kind: 'entity'; attributes: ModelGraphRow[]; nameAttributeQname: string | null; codeAttributeQname: string | null; roleQnames: string[] }
  | { kind: 'fk'; fromQname: string; toQname: string }
  | { kind: 'relation'; fromQname: string; toQname: string; fromCardinality: Cardinality | null; toCardinality: Cardinality | null }
  | { kind: 'role'; labelByLanguage: Record<string, string> }
  | { kind: 'query' }
  | { kind: 'er2dbEntity'; entityQname: string; targetDescription: string }
  | { kind: 'er2dbAttribute'; attributeQname: string; targetDescription: string }
  | { kind: 'er2dbRelation'; relationQname: string; fkQname: string }
  | { kind: 'er2cncRole'; entityQname: string; roleQname: string }
  | { kind: 'other' };

export interface SymbolDetail {
  qname: string;
  kind: Definition['kind'];
  name: string;
  label: string;
  description: string | null;
  tags: string[];
  sourceUri: string;
  sourceLine: number;
  perKindData: PerKindData;
  referencedBy: Array<{ qname: string; sourceUri: string; sourceLine: number }>;
}

function buildQname(schemaCode: string, namespace: string, parts: string[]): string {
  return [schemaCode, namespace, ...parts].filter(s => s !== '').join('.');
}

function getDisplayLabel(def: Definition, preferredLang: string): string {
  if (def.kind === 'entity') {
    const entity = def as EntityDef;
    if (entity.displayLabel && entity.displayLabel.kind === 'localizedString') {
      const entry = entity.displayLabel.entries[preferredLang];
      if (entry) return entry;
    }
  }
  if (def.kind === 'table' && def.description) {
    if (def.description.kind === 'string' || def.description.kind === 'tripleString') {
      return def.description.value;
    }
  }
  return def.name;
}

function getDescription(def: Definition): string | null {
  if ('description' in def && def.description) {
    if (def.description.kind === 'string' || def.description.kind === 'tripleString') {
      return def.description.value;
    }
  }
  return null;
}

function buildSymbolDetailForDef(
  def: Definition,
  schemaCode: string,
  namespace: string,
  preferredLang: string,
  documentUri: string,
  refIndex: ReferenceIndex
): SymbolDetail {
  const qname = buildQname(schemaCode, namespace, [def.name]);
  const tags: string[] = ('tags' in def ? (def as { tags?: string[] }).tags : []) ?? [];

  let perKindData: PerKindData = { kind: 'other' };
  if (def.kind === 'table' && def.columns) {
    const columns = (def.columns ?? []).map(col => ({
      name: col.name,
      qname: buildQname(schemaCode, namespace, [def.name, col.name]),
      kind: 'column' as const,
      type: renderDataType(col.type),
      isKey: !!(col.isKey || (def.primaryKey ?? []).includes(col.name)),
      optional: !!col.optional,
      isNameAttribute: false,
      isCodeAttribute: false,
    }));
    perKindData = { kind: 'table', columns, primaryKey: def.primaryKey ?? [] };
  } else if (def.kind === 'view' && def.columns) {
    const columns = (def.columns ?? []).map(col => ({
      name: col.name,
      qname: buildQname(schemaCode, namespace, [def.name, col.name]),
      kind: 'column' as const,
      type: renderDataType(col.type),
      isKey: false,
      optional: !!col.optional,
      isNameAttribute: false,
      isCodeAttribute: false,
    }));
    perKindData = { kind: 'view', columns };
  } else if (def.kind === 'entity') {
    const nameAttrPath = def.nameAttribute?.path;
    const codeAttrPath = def.codeAttribute?.path;
    const attributes = (def.attributes ?? []).map(attr => ({
      name: attr.name,
      qname: buildQname(schemaCode, namespace, [def.name, attr.name]),
      kind: 'attribute' as const,
      type: renderDataType(attr.type),
      isKey: !!attr.isKey,
      optional: !!attr.optional,
      isNameAttribute: attr.name === nameAttrPath,
      isCodeAttribute: attr.name === codeAttrPath,
    }));
    perKindData = {
      kind: 'entity',
      attributes,
      nameAttributeQname: def.nameAttribute ? buildQname(schemaCode, namespace, [def.name, def.nameAttribute.path]) : null,
      codeAttributeQname: def.codeAttribute ? buildQname(schemaCode, namespace, [def.name, def.codeAttribute.path]) : null,
      roleQnames: def.roles ?? [],
    };
  } else if (def.kind === 'fk') {
    const fromRef = def.from?.kind === 'id' ? { path: def.from.path, parts: def.from.parts } : null;
    const toRef = def.to?.kind === 'id' ? { path: def.to.path, parts: def.to.parts } : null;
    const fromQname = fromRef ? [schemaCode, namespace, fromRef.path].filter(s => s !== '').join('.') : null;
    const toQname = toRef ? [schemaCode, namespace, toRef.path].filter(s => s !== '').join('.') : null;
    perKindData = { kind: 'fk', fromQname: fromQname ?? '', toQname: toQname ?? '' };
  } else if (def.kind === 'relation') {
    const fromRef = def.from?.kind === 'id' ? { path: def.from.path, parts: def.from.parts } : null;
    const toRef = def.to?.kind === 'id' ? { path: def.to.path, parts: def.to.parts } : null;
    const fromQname = fromRef ? [schemaCode, namespace, fromRef.path].filter(s => s !== '').join('.') : null;
    const toQname = toRef ? [schemaCode, namespace, toRef.path].filter(s => s !== '').join('.') : null;
    const card = extractCardinality(def.cardinality);
    perKindData = { kind: 'relation', fromQname: fromQname ?? '', toQname: toQname ?? '', fromCardinality: card.from, toCardinality: card.to };
  } else if (def.kind === 'role') {
    const labelByLanguage: Record<string, string> = {};
    const role = def as RoleDef;
    if (role.label && role.label.kind === 'localizedString') {
      Object.assign(labelByLanguage, role.label.entries);
    }
    perKindData = { kind: 'role', labelByLanguage };
  } else if (def.kind === 'query') {
    perKindData = { kind: 'query' };
  } else if (def.kind === 'er2dbEntity') {
    const e2 = def as { entity?: { path: string }; target?: { table?: string; sqlQuery?: string } };
    const entityRef = e2.entity?.path ?? '';
    const targetDesc = e2.target
      ? (e2.target.table ? `table:${e2.target.table}` : e2.target.sqlQuery ? `sqlQuery:${e2.target.sqlQuery}` : '')
      : '';
    perKindData = { kind: 'er2dbEntity', entityQname: entityRef, targetDescription: targetDesc };
  } else if (def.kind === 'er2dbAttribute') {
    const e2a = def as { attribute?: { path: string }; target?: { table?: string; sqlQuery?: string } };
    const attrRef = e2a.attribute?.path ?? '';
    const targetDesc = e2a.target
      ? (e2a.target.table ? `table:${e2a.target.table}` : e2a.target.sqlQuery ? `sqlQuery:${e2a.target.sqlQuery}` : '')
      : '';
    perKindData = { kind: 'er2dbAttribute', attributeQname: attrRef, targetDescription: targetDesc };
  } else if (def.kind === 'er2dbRelation') {
    const e2r = def as { relation?: { path: string }; fk?: { path: string } };
    perKindData = {
      kind: 'er2dbRelation',
      relationQname: e2r.relation?.path ?? '',
      fkQname: e2r.fk?.path ?? '',
    };
  } else if (def.kind === 'er2cncRole') {
    const e2c = def as { entity?: { path: string }; role?: { path: string } };
    perKindData = {
      kind: 'er2cncRole',
      entityQname: e2c.entity?.path ?? '',
      roleQname: e2c.role?.path ?? '',
    };
  }

  const seen = new Set<string>();
  const referencedBy = refIndex.findByQname(qname).map(loc => ({
    qname: loc.referrerQname ?? loc.targetQname,
    sourceUri: loc.documentUri,
    sourceLine: loc.source.line,
  })).filter(loc => {
    if (seen.has(loc.qname)) return false;
    seen.add(loc.qname);
    return true;
  });

  return {
    qname,
    kind: def.kind,
    name: def.name,
    label: getDisplayLabel(def, preferredLang),
    description: getDescription(def),
    tags,
    sourceUri: documentUri,
    sourceLine: def.source.line,
    perKindData,
    referencedBy,
  };
}

export function buildSymbolDetail(
  qname: string,
  symbols: ProjectSymbolTable,
  resolver: Resolver,
  refIndex: ReferenceIndex,
  manifest: ResolvedManifest,
  getDocument: (uri: string) => string | null,
  parseDocument: (content: string, uri: string) => { ast?: Document | null }
): SymbolDetail | null {
  const symbol = symbols.get(qname);
  if (!symbol) return null;

  const realDef = findDefByQname(symbol.documentUri, qname, getDocument, parseDocument);
  if (!realDef) return null;

  const parts = qname.split('.');
  const schemaCode = parts[0] ?? 'db';
  const namespace = parts.length === 2 ? '' : (parts[1] ?? '');
  return buildSymbolDetailForDef(
    realDef,
    schemaCode,
    namespace,
    manifest.preferredLanguage,
    symbol.documentUri,
    refIndex
  );
}

// v1 limitation: only top-level defs (table / view / entity / role / fk / relation
// — though fk / relation are filtered out below) are looked up. Nested qnames
// like `db.dbo.tableName.colName` produce a `name` of `tableName.colName` after
// the slice(2).join('.') below, which never matches a top-level def.name, so
// `findDefByQname` returns null and getSymbolDetail returns null. The Designer
// inspector only opens on top-level nodes in v1, so this is enough for Phase 3;
// remove this restriction when row-level inspection lands.
function findDefByQname(
  uri: string,
  qname: string,
  getDocument: (uri: string) => string | null,
  parseDocument: (content: string, uri: string) => { ast?: Document | null }
): Definition | null {
  const content = getDocument(uri);
  if (!content) return null;
  const result = parseDocument(content, uri);
  if (!result.ast) return null;
  const parts = qname.split('.');
  const schemaCode = parts[0] ?? 'db';
  const qnameNamespace = parts.length === 2 ? '' : (parts[1] ?? '');
  const name = parts.length === 2 ? parts[1] : parts.slice(2).join('.');
  for (const def of result.ast.definitions) {
    if (def.name === name && def.kind !== 'fk') {
      const defSchema = result.ast.schemaDirective?.schemaCode ?? 'db';
      const defNamespace = result.ast.schemaDirective?.namespace ?? '';
      const nsOrKind = defNamespace || def.kind;
      if (defSchema === schemaCode && nsOrKind === qnameNamespace) return def;
    }
  }
  return null;
}

function resolveRef(ref: { path: string; parts: string[] }, schemaCode: string, namespace: string, knownQnames: Set<string>): string | null {
  // Fully-qualified ref like `db.dbo.TABLE.COLUMN`: drop trailing parts until a
  // known table qname is found. Handles both `<schema>.<ns>.<table>` and the
  // longer `<schema>.<ns>.<table>.<column>` form (FKs target columns but the
  // edge is table-to-table).
  if (ref.parts[0] && ['db', 'er', 'map', 'query', 'cnc'].includes(ref.parts[0])) {
    for (let i = ref.parts.length; i >= 1; i--) {
      const candidate = ref.parts.slice(0, i).join('.');
      if (knownQnames.has(candidate)) return candidate;
    }
  }
  // Bare ref relative to the current schema/namespace: `TABLE` or `TABLE.COLUMN`.
  for (let i = 1; i <= ref.parts.length; i++) {
    const tableParts = ref.parts.slice(0, i);
    const candidate = [schemaCode, namespace, ...tableParts].filter(s => s !== '').join('.');
    if (knownQnames.has(candidate)) return candidate;
  }
  return null;
}

export function buildModelGraph(ast: Document, schema: RenderableSchemaCode, preferredLang = 'en'): ModelGraph {
  return buildProjectModelGraph([ast], schema, preferredLang);
}

export function buildProjectModelGraph(asts: Document[], schema: RenderableSchemaCode, preferredLang = 'en'): ModelGraph {
  const nodes: ModelGraphNode[] = [];
  const edges: ModelGraphEdge[] = [];
  const knownNodes = new Map<string, { def: Definition; qname: string; schemaCode: string; namespace: string }>();

  for (const ast of asts) {
    if (ast.schemaDirective?.schemaCode && ast.schemaDirective.schemaCode !== schema) continue;

    const schemaCode = ast.schemaDirective?.schemaCode ?? schema;
    const namespace = ast.schemaDirective?.namespace ?? '';

    for (const def of ast.definitions) {
      if (def.kind === 'table' || def.kind === 'view' || def.kind === 'entity') {
        const qname = buildQname(schemaCode, namespace, [def.name]);
        knownNodes.set(qname, { def, qname, schemaCode, namespace });
      }
    }
  }

  const knownQnames = new Set(knownNodes.keys());

  for (const [, { def, qname, schemaCode, namespace }] of knownNodes) {
    if (def.kind === 'table') {
      const rows: ModelGraphRow[] = (def.columns ?? []).map(col => ({
        name: col.name,
        qname: buildQname(schemaCode, namespace, [def.name, col.name]),
        kind: 'column' as const,
        type: renderDataType(col.type),
        isKey: !!(col.isKey || (def.primaryKey ?? []).includes(col.name)),
        optional: !!col.optional,
        isNameAttribute: false,
        isCodeAttribute: false,
      }));
      nodes.push({
        qname,
        kind: 'table',
        name: def.name,
        schemaCode: schema as RenderableSchemaCode,
        label: def.name,
        sourceUri: def.source.file,
        sourceLocation: { line: def.source.line, column: def.source.column },
        rows,
      });
    } else if (def.kind === 'view') {
      const rows: ModelGraphRow[] = (def.columns ?? []).map(col => ({
        name: col.name,
        qname: buildQname(schemaCode, namespace, [def.name, col.name]),
        kind: 'column' as const,
        type: renderDataType(col.type),
        isKey: false,
        optional: !!col.optional,
        isNameAttribute: false,
        isCodeAttribute: false,
      }));
      nodes.push({
        qname,
        kind: 'view',
        name: def.name,
        schemaCode: schema as RenderableSchemaCode,
        label: def.name,
        sourceUri: def.source.file,
        sourceLocation: { line: def.source.line, column: def.source.column },
        rows,
      });
    } else if (def.kind === 'entity') {
      const nameAttrPath = (def as EntityDef).nameAttribute?.path;
      const codeAttrPath = (def as EntityDef).codeAttribute?.path;
      const rows: ModelGraphRow[] = (def.attributes ?? []).map(attr => ({
        name: attr.name,
        qname: buildQname(schemaCode, namespace, [def.name, attr.name]),
        kind: 'attribute' as const,
        type: renderDataType(attr.type),
        isKey: !!attr.isKey,
        optional: !!attr.optional,
        isNameAttribute: attr.name === nameAttrPath,
        isCodeAttribute: attr.name === codeAttrPath,
      }));
      nodes.push({
        qname,
        kind: 'entity',
        name: def.name,
        schemaCode: schema as RenderableSchemaCode,
        label: getDisplayLabel(def, preferredLang),
        sourceUri: def.source.file,
        sourceLocation: { line: def.source.line, column: def.source.column },
        rows,
      });
    }
  }

  for (const ast of asts) {
    if (ast.schemaDirective?.schemaCode && ast.schemaDirective.schemaCode !== schema) continue;

    const schemaCode = ast.schemaDirective?.schemaCode ?? schema;
    const namespace = ast.schemaDirective?.namespace ?? '';

    for (const def of ast.definitions) {
      if (def.kind === 'fk') {
        const fromQname = extractFkRef(def.from, schemaCode, namespace, knownQnames);
        const toQname = extractFkRef(def.to, schemaCode, namespace, knownQnames);
        if (fromQname && toQname) {
          edges.push({
            id: buildQname(schemaCode, namespace, [def.name]),
            qname: buildQname(schemaCode, namespace, [def.name]),
            kind: 'fk',
            fromNode: fromQname,
            toNode: toQname,
            fromCardinality: null,
            toCardinality: null,
            sourceUri: def.source.file,
            sourceLocation: { line: def.source.line, column: def.source.column },
          });
        }
      } else if (def.kind === 'relation') {
        const fromRef = def.from?.kind === 'id' ? { path: def.from.path, parts: def.from.parts } : null;
        const toRef = def.to?.kind === 'id' ? { path: def.to.path, parts: def.to.parts } : null;
        const fromQname = fromRef ? resolveRef(fromRef, schemaCode, namespace, knownQnames) : null;
        const toQname = toRef ? resolveRef(toRef, schemaCode, namespace, knownQnames) : null;
        if (fromQname && toQname) {
          const card = extractCardinality(def.cardinality);
          edges.push({
            id: buildQname(schemaCode, namespace, [def.name]),
            qname: buildQname(schemaCode, namespace, [def.name]),
            kind: 'relation',
            fromNode: fromQname,
            toNode: toQname,
            fromCardinality: card.from,
            toCardinality: card.to,
            sourceUri: def.source.file,
            sourceLocation: { line: def.source.line, column: def.source.column },
          });
        }
      }
    }
  }

  return { schemaCode: schema as RenderableSchemaCode, nodes, edges };
}

// FK edges are table-to-table; we pick the first column to derive the source
// table — multi-column FKs collapse to one edge.
function extractFkRef(pv: import('@modeler/parser').PropertyValue | undefined, schemaCode: string, namespace: string, knownQnames: Set<string>): string | null {
  if (!pv) return null;
  if (pv.kind === 'id') {
    return resolveRef({ path: pv.path, parts: pv.parts }, schemaCode, namespace, knownQnames);
  }
  if (pv.kind === 'list' && pv.items[0]?.kind === 'id') {
    return resolveRef({ path: pv.items[0].path, parts: pv.items[0].parts }, schemaCode, namespace, knownQnames);
  }
  return null;
}