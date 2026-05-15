export enum DiagnosticCode {
  ParseError = 'ttr/parse-error',
  UnknownProperty = 'ttr/unknown-property',
  UnresolvedReference = 'ttr/unresolved-reference',
  DuplicateDefinition = 'ttr/duplicate-definition',
  RequiredPropertyMissing = 'ttr/required-property-missing',
  InvalidType = 'ttr/invalid-type',
  EntityAttributeNotFound = 'ttr/entity-attribute-not-found',
  PrimaryKeyColumnNotFound = 'ttr/primary-key-column-not-found',
}

export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning',
  Information = 'information',
  Hint = 'hint',
}

export interface DiagnosticEntry {
  code: DiagnosticCode;
  message: string;
  severity: DiagnosticSeverity;
}