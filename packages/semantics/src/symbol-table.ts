import type { SourceLocation, Document, Definition, EntityDef, TableDef, ProcedureDef, ViewDef, ColumnDef, IndexDef, ConstraintDef } from '@modeler/parser';
import { qnameToString, buildQname, type Qname } from './qname.js';

export interface SymbolEntry {
  qname: string;
  kind: Definition['kind'];
  name: string;
  source: SourceLocation;
  documentUri: string;
  parent?: string;
}

export class DocumentSymbolTable {
  private entries: Map<string, SymbolEntry> = new Map();
  private documentUri: string;
  private schemaCode: string;
  private namespace: string;

  constructor(documentUri: string, ast: Document, schemaCode: string, namespace: string) {
    this.documentUri = documentUri;
    this.schemaCode = schemaCode;
    this.namespace = namespace;

    for (const def of ast.definitions) {
      this.addEntry(def);
    }
  }

  private addEntry(def: Definition, parentQname?: string): void {
    const qname = buildQname(this.schemaCode, this.namespace, [def.name]);
    const qnameStr = qnameToString(qname);

    const entry: SymbolEntry = {
      qname: qnameStr,
      kind: def.kind,
      name: def.name,
      source: def.source,
      documentUri: this.documentUri,
      parent: parentQname,
    };

    this.entries.set(qnameStr, entry);

    if (def.kind === 'entity' && def.attributes) {
      const entityQname = qnameStr;
      for (const attr of def.attributes) {
        const attrQname = buildQname(this.schemaCode, this.namespace, [def.name, attr.name]);
        const attrQnameStr = qnameToString(attrQname);
        this.entries.set(attrQnameStr, {
          qname: attrQnameStr,
          kind: 'attribute',
          name: attr.name,
          source: attr.source,
          documentUri: this.documentUri,
          parent: entityQname,
        });
      }
    }

    if (def.kind === 'table' && def.columns) {
      const tableQname = qnameStr;
      for (const col of def.columns) {
        const colQname = buildQname(this.schemaCode, this.namespace, [def.name, col.name]);
        const colQnameStr = qnameToString(colQname);
        this.entries.set(colQnameStr, {
          qname: colQnameStr,
          kind: 'column',
          name: col.name,
          source: col.source,
          documentUri: this.documentUri,
          parent: tableQname,
        });
      }
    }

    if (def.kind === 'view' && def.columns) {
      const viewQname = qnameStr;
      for (const col of def.columns) {
        const colQname = buildQname(this.schemaCode, this.namespace, [def.name, col.name]);
        const colQnameStr = qnameToString(colQname);
        this.entries.set(colQnameStr, {
          qname: colQnameStr,
          kind: 'column',
          name: col.name,
          source: col.source,
          documentUri: this.documentUri,
          parent: viewQname,
        });
      }
    }

    if (def.kind === 'procedure' && def.resultColumns) {
      const procQname = qnameStr;
      for (const col of def.resultColumns) {
        const colQname = buildQname(this.schemaCode, this.namespace, [def.name, col.name]);
        const colQnameStr = qnameToString(colQname);
        this.entries.set(colQnameStr, {
          qname: colQnameStr,
          kind: 'column',
          name: col.name,
          source: col.source,
          documentUri: this.documentUri,
          parent: procQname,
        });
      }
    }
  }

  get(qname: string): SymbolEntry | undefined {
    return this.entries.get(qname);
  }

  all(): SymbolEntry[] {
    return Array.from(this.entries.values());
  }

  inDocument(): SymbolEntry[] {
    return this.all();
  }
}