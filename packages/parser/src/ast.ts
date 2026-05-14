export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  offsetStart: number;
  offsetEnd: number;
}

export interface SchemaDirective {
  schemaCode: string;
  namespace?: string;
  source: SourceLocation;
}

export type DefinitionKind =
  | 'model'
  | 'table'
  | 'view'
  | 'column'
  | 'index'
  | 'constraint'
  | 'fk'
  | 'procedure'
  | 'entity'
  | 'attribute'
  | 'relation'
  | 'er2dbEntity'
  | 'er2dbAttribute'
  | 'er2dbRelation'
  | 'query'
  | 'role'
  | 'er2cncRole';

export interface Definition {
  kind: DefinitionKind;
  name: string;
  source: SourceLocation;
}

export interface Document {
  schemaDirective?: SchemaDirective;
  definitions: Definition[];
  source: SourceLocation;
}

export interface ParseError {
  message: string;
  severity: 'error' | 'warning';
  source: SourceLocation;
}

export interface ParseResult {
  ast?: Document;
  errors: ParseError[];
  sourceFile: string;
}