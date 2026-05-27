import type {
  Document,
  EntityDef,
  AttributeDef,
  RelationDef,
  MappingProperty,
  MappingColumnEntry,
  SourceLocation,
} from '@modeler/parser';
import { ProjectSymbolTable } from './project-symbols.js';
import type { SymbolEntry } from './symbol-table.js';

export function synthesizeMappings(
  symbols: ProjectSymbolTable,
  uri: string,
  ast: Document
): void {
  const packageName = ast.packageDecl?.name ?? '';
  const entries: SymbolEntry[] = [];

  for (const def of ast.definitions) {
    if (def.kind === 'entity') {
      collectFromEntity(def, packageName, uri, entries);
    } else if (def.kind === 'attribute') {
    } else if (def.kind === 'relation') {
      collectFromRelation(def, packageName, uri, entries);
    }
  }

  symbols.upsertSynthesizedSymbols(uri, entries);
}

function collectFromEntity(
  entity: EntityDef,
  packageName: string,
  uri: string,
  entries: SymbolEntry[]
): void {
  if (entity.mapping) {
    if (entity.mapping.kind !== 'block') {
      return;
    }
    const block = entity.mapping;

    entries.push({
      qname: synthQname(packageName, 'er2dbEntity', entity.name),
      kind: 'er2dbEntity',
      name: entity.name,
      source: block.source,
      documentUri: uri,
      packageName,
      schemaCode: 'map',
      mappingSource: 'inline',
    });

    for (const col of block.columns ?? []) {
      entries.push({
        qname: synthQname(packageName, 'er2dbAttribute', `${entity.name}.${col.name}`),
        kind: 'er2dbAttribute',
        name: `${entity.name}.${col.name}`,
        source: col.source,
        documentUri: uri,
        packageName,
        schemaCode: 'map',
        mappingSource: 'inline',
        parent: synthQname(packageName, 'er2dbEntity', entity.name),
      });
    }
  }

  for (const attr of entity.attributes ?? []) {
    if (!attr.mapping) continue;
    entries.push({
      qname: synthQname(packageName, 'er2dbAttribute', `${entity.name}.${attr.name}`),
      kind: 'er2dbAttribute',
      name: `${entity.name}.${attr.name}`,
      source: attr.mapping.source,
      documentUri: uri,
      packageName,
      schemaCode: 'map',
      mappingSource: 'inline',
      parent: synthQname(packageName, 'er2dbEntity', entity.name),
    });
  }
}

function collectFromRelation(
  rel: RelationDef,
  packageName: string,
  uri: string,
  entries: SymbolEntry[]
): void {
  if (!rel.mapping) return;
  entries.push({
    qname: synthQname(packageName, 'er2dbRelation', rel.name),
    kind: 'er2dbRelation',
    name: rel.name,
    source: rel.mapping.source,
    documentUri: uri,
    packageName,
    schemaCode: 'map',
    mappingSource: 'inline',
  });
}

function synthQname(pkg: string, kindToken: string, name: string): string {
  const segments: string[] = [];
  if (pkg) segments.push(pkg);
  segments.push('map', kindToken, name);
  return segments.join('.');
}