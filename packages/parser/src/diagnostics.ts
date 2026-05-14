export enum DiagnosticCode {
  ParseError = 'ttr/parse-error',
  UnknownProperty = 'ttr/unknown-property',
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