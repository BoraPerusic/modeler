import type { Document } from '@modeler/parser';
import { DocumentSymbolTable, type SymbolEntry } from './symbol-table.js';

export class ProjectSymbolTable {
  private byDocument: Map<string, DocumentSymbolTable> = new Map();
  private byQname: Map<string, SymbolEntry[]> = new Map();

  upsertDocument(uri: string, ast: Document, schemaCode: string, namespace: string, _packageName = ''): void {
    const existing = this.byDocument.get(uri);
    if (existing) {
      this.removeDocument(uri);
    }

    const table = new DocumentSymbolTable(uri, ast, schemaCode, namespace);
    this.byDocument.set(uri, table);

    for (const entry of table.all()) {
      const existing = this.byQname.get(entry.qname) ?? [];
      existing.push(entry);
      this.byQname.set(entry.qname, existing);
    }
  }

  removeDocument(uri: string): void {
    const table = this.byDocument.get(uri);
    if (!table) return;

    for (const entry of table.all()) {
      const existing = this.byQname.get(entry.qname);
      if (existing) {
        const filtered = existing.filter((e) => e.documentUri !== uri);
        if (filtered.length === 0) {
          this.byQname.delete(entry.qname);
        } else {
          this.byQname.set(entry.qname, filtered);
        }
      }
    }

    this.byDocument.delete(uri);
  }

  get(qname: string): SymbolEntry | undefined {
    return this.byQname.get(qname)?.[0];
  }

  all(): SymbolEntry[] {
    const result: SymbolEntry[] = [];
    const seen = new Set<string>();
    for (const entries of this.byQname.values()) {
      for (const entry of entries) {
        if (!seen.has(entry.qname)) {
          seen.add(entry.qname);
          result.push(entry);
        }
      }
    }
    return result;
  }

  findByName(name: string): SymbolEntry[] {
    const result: SymbolEntry[] = [];
    for (const entry of this.all()) {
      if (entry.name === name) {
        result.push(entry);
      }
    }
    return result;
  }

  duplicates(): Array<{ qname: string; entries: SymbolEntry[] }> {
    const result: Array<{ qname: string; entries: SymbolEntry[] }> = [];
    for (const [qname, entries] of this.byQname.entries()) {
      if (entries.length > 1) {
        result.push({ qname, entries });
      }
    }
    return result;
  }

  getByPackage(packageName: string): SymbolEntry[] {
    const result: SymbolEntry[] = [];
    for (const entry of this.all()) {
      if (entry.packageName === packageName) {
        result.push(entry);
      }
    }
    return result;
  }

  getBySuffix(suffix: string): SymbolEntry[] {
    const result: SymbolEntry[] = [];
    for (const entries of this.byQname.values()) {
      for (const entry of entries) {
        if (entry.qname.endsWith(`.${suffix}`) || entry.qname === suffix) {
          result.push(entry);
        }
      }
    }
    return result;
  }

  listPackages(): string[] {
    const packages = new Set<string>();
    for (const entry of this.all()) {
      packages.add(entry.packageName);
    }
    return Array.from(packages).sort();
  }
}