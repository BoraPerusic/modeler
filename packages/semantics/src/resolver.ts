import type { SymbolEntry } from './symbol-table.js';
import { ProjectSymbolTable } from './project-symbols.js';

export type ResolutionResult =
  | { resolved: true; symbol: SymbolEntry }
  | { resolved: false; reason: 'not-found' | 'ambiguous'; tried: string[]; candidates?: SymbolEntry[] };

export interface LexicalScope {
  schemaCode: string;
  namespace: string;
  enclosing?: { kind: 'entity' | 'table' | 'view' | 'procedure'; qname: string };
}

export interface ResolutionContext {
  schemaCode: string;
  namespace: string;
  /**
   * Optional enclosing-def qname (e.g. `er.entity.artikl`). When present, a
   * bare-id reference is first tried as a child of this enclosing def (so
   * `nameAttribute: id` inside `entity artikl` resolves to
   * `er.entity.artikl.id`).
   */
  enclosingQname?: string;
}

export class Resolver {
  constructor(private symbols: ProjectSymbolTable) {}

  resolveReference(ref: { path: string; parts: string[] }, context: ResolutionContext): ResolutionResult {
    const schemaCodes = ['db', 'er', 'map', 'query', 'cnc'];
    const firstPart = ref.parts[0];
    const tried: string[] = [];

    if (schemaCodes.includes(firstPart)) {
      if (ref.parts.length < 3) {
        return { resolved: false, reason: 'not-found', tried: [ref.path] };
      }
      const schemaCode = firstPart;
      const namespace = ref.parts[1];
      const localName = ref.parts.slice(2).join('.');
      const qname = `${schemaCode}.${namespace}.${localName}`;
      tried.push(qname);
      const symbol = this.symbols.get(qname);
      if (symbol) {
        return { resolved: true, symbol };
      }
      return { resolved: false, reason: 'not-found', tried };
    }

    // bare-id or short dotted reference: try enclosing scope first, then
    // schema-and-namespace, then stock vocab fallback.
    if (context.enclosingQname) {
      const inEnclosing = `${context.enclosingQname}.${ref.path}`;
      tried.push(inEnclosing);
      const symbol = this.symbols.get(inEnclosing);
      if (symbol) return { resolved: true, symbol };
    }

    const fullQname = `${context.schemaCode}.${context.namespace}.${ref.path}`;
    tried.push(fullQname);
    const symbol = this.symbols.get(fullQname);
    if (symbol) {
      return { resolved: true, symbol };
    }

    const withCncRole = `cnc.role.${ref.path}`;
    if (withCncRole !== fullQname) {
      tried.push(withCncRole);
      const cncSymbol = this.symbols.get(withCncRole);
      if (cncSymbol) return { resolved: true, symbol: cncSymbol };
    }

    return { resolved: false, reason: 'not-found', tried };
  }

  resolveBareId(name: string, scope: LexicalScope): ResolutionResult {
    const tried: string[] = [];

    if (scope.enclosing) {
      const withEnclosing = `${scope.enclosing.qname}.${name}`;
      tried.push(withEnclosing);
      const symbol = this.symbols.get(withEnclosing);
      if (symbol) {
        return { resolved: true, symbol };
      }
    }

    const withSchema = `${scope.schemaCode}.${scope.namespace}.${name}`;
    tried.push(withSchema);
    const symbol = this.symbols.get(withSchema);
    if (symbol) {
      return { resolved: true, symbol };
    }

    const withCncRole = `cnc.role.${name}`;
    tried.push(withCncRole);
    const cncSymbol = this.symbols.get(withCncRole);
    if (cncSymbol) {
      return { resolved: true, symbol: cncSymbol };
    }

    return { resolved: false, reason: 'not-found', tried };
  }
}