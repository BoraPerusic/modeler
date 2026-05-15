import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createProtocolConnection,
} from 'vscode-languageserver-protocol/browser.js';
import {
  InitializeRequest,
  DidOpenTextDocumentNotification,
  PublishDiagnosticsNotification,
  InitializeParams,
} from 'vscode-languageserver-protocol';

export interface ModelGraph {
  nodes: Array<{ qname: string; kind: string; label: string }>;
  edges: unknown[];
}

export interface LspClient {
  openDocument(uri: string, content: string): Promise<void>;
  getModelGraph(uri: string): Promise<ModelGraph>;
  onDiagnostics(handler: (uri: string, messages: string[]) => void): void;
  dispose(): void;
}

export async function createLspClient(): Promise<LspClient> {
  const worker = new Worker(
    new URL('../../lsp/dist/server-browser.js', import.meta.url),
    { type: 'module' }
  );
  const reader = new BrowserMessageReader(worker);
  const writer = new BrowserMessageWriter(worker);
  const connection = createProtocolConnection(reader, writer);
  connection.listen();
  await connection.sendRequest(InitializeRequest.type, {
    processId: null,
    rootUri: null,
    capabilities: {},
  } satisfies InitializeParams);
  const diagnosticHandlers: Array<(uri: string, msgs: string[]) => void> = [];
  connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
    const messages = params.diagnostics.map((d) => d.message);
    for (const h of diagnosticHandlers) h(params.uri, messages);
  });
  return {
    async openDocument(uri, content) {
      await connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: { uri, languageId: 'ttr', version: 1, text: content },
      });
    },
    async getModelGraph(uri) {
      return connection.sendRequest('modeler/getModelGraph', {
        textDocument: { uri },
      }) as Promise<ModelGraph>;
    },
    onDiagnostics(handler) {
      diagnosticHandlers.push(handler);
    },
    dispose() {
      worker.terminate();
    },
  };
}