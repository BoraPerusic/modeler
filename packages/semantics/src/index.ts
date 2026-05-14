// Phase 2.B/C/D — symbol table, resolver, validator
// TODO: Define SymbolTable interface with qname-indexed entries
export interface SymbolTable {
  // TODO: Map of qname -> SymbolDefinition
  // Will include kind, name attribute, source location, file of origin
}

// TODO: Reference resolver
export interface Resolver {
  // resolve(path: string): ResolvedSymbol | UnresolvedReference
}

// TODO: Per-kind structural validator
export interface Validator {
  // validate(ast: Document, symbols: SymbolTable): Diagnostic[]
}

export function noop(): void {
  // Placeholder function to keep package non-empty
  // Will be replaced in Phase 2
}