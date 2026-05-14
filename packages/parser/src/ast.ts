/**
 * Source-file location for a parsed node or diagnostic.
 *
 * Conventions (match ANTLR's TokenStream, not LSP):
 *   - `line` and `endLine` are 1-indexed.
 *   - `column` and `endColumn` are 0-indexed (column of the first character of the token / one past the last).
 *   - `offsetStart` and `offsetEnd` are 0-indexed byte offsets into the source file;
 *     `offsetEnd` is exclusive.
 *
 * LSP consumers must subtract 1 from `line`/`endLine` to produce LSP positions.
 */
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

export interface ModelDef {
  kind: 'model';
  name: string;
  source: SourceLocation;
}

export interface TableDef {
  kind: 'table';
  name: string;
  source: SourceLocation;
}

export interface ViewDef {
  kind: 'view';
  name: string;
  source: SourceLocation;
}

export interface ColumnDef {
  kind: 'column';
  name: string;
  source: SourceLocation;
}

export interface IndexDef {
  kind: 'index';
  name: string;
  source: SourceLocation;
}

export interface ConstraintDef {
  kind: 'constraint';
  name: string;
  source: SourceLocation;
}

export interface FkDef {
  kind: 'fk';
  name: string;
  source: SourceLocation;
}

export interface ProcedureDef {
  kind: 'procedure';
  name: string;
  source: SourceLocation;
}

export interface EntityDef {
  kind: 'entity';
  name: string;
  source: SourceLocation;
}

export interface AttributeDef {
  kind: 'attribute';
  name: string;
  source: SourceLocation;
}

export interface RelationDef {
  kind: 'relation';
  name: string;
  source: SourceLocation;
}

export interface Er2dbEntityDef {
  kind: 'er2dbEntity';
  name: string;
  source: SourceLocation;
}

export interface Er2dbAttributeDef {
  kind: 'er2dbAttribute';
  name: string;
  source: SourceLocation;
}

export interface Er2dbRelationDef {
  kind: 'er2dbRelation';
  name: string;
  source: SourceLocation;
}

export interface QueryDef {
  kind: 'query';
  name: string;
  source: SourceLocation;
}

export interface RoleDef {
  kind: 'role';
  name: string;
  source: SourceLocation;
}

export interface Er2cncRoleDef {
  kind: 'er2cncRole';
  name: string;
  source: SourceLocation;
}

export type Definition =
  | ModelDef
  | TableDef
  | ViewDef
  | ColumnDef
  | IndexDef
  | ConstraintDef
  | FkDef
  | ProcedureDef
  | EntityDef
  | AttributeDef
  | RelationDef
  | Er2dbEntityDef
  | Er2dbAttributeDef
  | Er2dbRelationDef
  | QueryDef
  | RoleDef
  | Er2cncRoleDef;

export interface Document {
  schemaDirective?: SchemaDirective;
  definitions: Definition[];
  source: SourceLocation;
}

export interface ParseError {
  code?: string;
  message: string;
  severity: 'error' | 'warning';
  source: SourceLocation;
}

export interface ParseResult {
  ast?: Document;
  errors: ParseError[];
  sourceFile: string;
}