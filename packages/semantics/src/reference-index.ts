import type { Definition, Document, SourceLocation } from '@modeler/parser';
import { collectAllReferences } from './references.js';
import type { Resolver } from './resolver.js';

function enclosingQnameOf(def: Definition, schemaCode: string, namespace: string): string | undefined {
  if (def.kind === 'entity' || def.kind === 'table' || def.kind === 'view' || def.kind === 'procedure') {
    return [schemaCode, namespace, def.name].filter((s) => s !== '').join('.');
  }
  return undefined;
}

export interface ReferenceLocation {
  documentUri: string;
  source: SourceLocation;
  /** The canonical qname this reference resolved to. */
  targetQname: string;
}

/**
 * Reverse index: for each target qname, the list of reference locations that
 * resolve to it. Built incrementally as documents are upserted.
 */
export class ReferenceIndex {
  private byDocument: Map<string, ReferenceLocation[]> = new Map();
  private byTargetQname: Map<string, ReferenceLocation[]> = new Map();

  upsertDocument(
    uri: string,
    ast: Document,
    schemaCode: string,
    namespace: string,
    resolver: Resolver
  ): void {
    this.removeDocument(uri);
    const locations: ReferenceLocation[] = [];

    for (const { ref, ownerDef } of collectAllReferences(ast)) {
      const enclosingQname = enclosingQnameOf(ownerDef, schemaCode, namespace);
      const res = resolver.resolveReference(
        { path: ref.path, parts: ref.parts },
        { schemaCode, namespace, enclosingQname }
      );
      if (!res.resolved) continue;
      const loc: ReferenceLocation = {
        documentUri: uri,
        source: ref.source,
        targetQname: res.symbol.qname,
      };
      locations.push(loc);
      const list = this.byTargetQname.get(res.symbol.qname) ?? [];
      list.push(loc);
      this.byTargetQname.set(res.symbol.qname, list);
    }

    this.byDocument.set(uri, locations);
  }

  removeDocument(uri: string): void {
    const old = this.byDocument.get(uri);
    if (!old) return;
    for (const loc of old) {
      const list = this.byTargetQname.get(loc.targetQname);
      if (!list) continue;
      const filtered = list.filter((l) => l.documentUri !== uri);
      if (filtered.length === 0) {
        this.byTargetQname.delete(loc.targetQname);
      } else {
        this.byTargetQname.set(loc.targetQname, filtered);
      }
    }
    this.byDocument.delete(uri);
  }

  findByQname(qname: string): ReferenceLocation[] {
    return this.byTargetQname.get(qname) ?? [];
  }
}
