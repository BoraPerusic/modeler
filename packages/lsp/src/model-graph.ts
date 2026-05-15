import Ajv2020Module from 'ajv/dist/2020.js';
import type { Definition } from '@modeler/parser';

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

export interface DataTypeSimple { kind: 'simple'; name: string }
export interface DataTypeStructured { kind: 'structured'; typeName: string; length?: number; precision?: number }
export type DataType = DataTypeSimple | DataTypeStructured | undefined;

export function renderDataType(t: DataType): string | null {
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
    case 'n':
    case '*': return 'many';
    case '1..n':
    case '1..*': return 'one-or-many';
    default: return null;
  }
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