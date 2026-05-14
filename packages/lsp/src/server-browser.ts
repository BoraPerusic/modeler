import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver';
import type { ParseError } from '@modeler/parser';

const connection = (createConnection as any)();

const documents: any = new (TextDocuments as any)(undefined);

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        willSave: false,
        save: false,
        change: 1,
      },
    },
  };
});

connection.onInitialized(() => {
  // nothing yet
});

function publishDiagnostics(uri: string, content: string): void {
  const { parseString } = require('@modeler/parser');
  const result = parseString(content, uri);

  const diagnostics: Diagnostic[] = result.errors.map((err: ParseError) => ({
    range: {
      start: { line: err.source.line - 1, character: err.source.column },
      end: { line: err.source.endLine - 1, character: err.source.endColumn },
    },
    message: err.message,
    severity: err.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    source: 'ttr',
  }));

  connection.sendDiagnostics({ uri, diagnostics });
}

documents.onDidOpen((event: any) => {
  const doc = documents.get(event.document.uri);
  if (doc) {
    publishDiagnostics(event.document.uri, doc.getText());
  }
});

documents.onDidChangeContent((event: any) => {
  publishDiagnostics(event.document.uri, event.document.getText());
});

documents.onDidClose(() => {
  // nothing yet
});

documents.onDidSave(() => {
  // nothing yet
});

connection.onRequest('modeler/getModelGraph', (params: { textDocument: { uri: string } }) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return { nodes: [], edges: [] };
  }

  const content = doc.getText();
  const { parseString } = require('@modeler/parser');
  const result = parseString(content, doc.uri);

  const nodes = (result.ast?.definitions ?? []).map((def: { name: string; kind: string }) => ({
    qname: def.name,
    kind: def.kind,
    label: def.name,
  }));

  return { nodes, edges: [] };
});

connection.onExit(() => {
  // nothing cleanup needed
});

documents.listen(connection);

connection.listen();