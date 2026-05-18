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

import type { ModelGraph, LayoutFile, SymbolDetail, RenderableSchemaCode } from '@modeler/lsp';
import LspWorker from '@modeler/lsp/browser?worker';

export interface LspClient {
  transportKind: 'node' | 'browser';
  openDocument(uri: string, content: string): Promise<void>;
  getModelGraph(uri: string, schema: RenderableSchemaCode): Promise<ModelGraph>;
  getLayout(projectRoot: string): Promise<LayoutFile>;
  setLayout(projectRoot: string, layout: LayoutFile): Promise<{ ok: boolean }>;
  exportLayout(projectRoot: string): Promise<LayoutFile>;
  applyGraphEdit(_params: unknown): Promise<{ ok: false; reason: string }>;
  getSymbolDetail(qname: string): Promise<SymbolDetail | null>;
  onDiagnostics(handler: (uri: string, messages: string[]) => void): void;
  dispose(): void;
}

export async function createLspClient(): Promise<LspClient> {
  const worker = new LspWorker();
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
    transportKind: 'browser' as const,
    async openDocument(uri, content) {
      await connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: { uri, languageId: 'ttr', version: 1, text: content },
      });
    },
    async getModelGraph(uri, schema) {
      return connection.sendRequest('modeler/getModelGraph', {
        textDocument: { uri },
        schema,
      }) as Promise<ModelGraph>;
    },
    async getLayout(projectRoot) {
      return connection.sendRequest('modeler/getLayout', { projectRoot }) as Promise<LayoutFile>;
    },
    async setLayout(projectRoot, layout) {
      return connection.sendRequest('modeler/setLayout', { projectRoot, layout }) as Promise<{ ok: boolean }>;
    },
    async exportLayout(projectRoot) {
      return connection.sendRequest('modeler/exportLayout', { projectRoot }) as Promise<LayoutFile>;
    },
    async applyGraphEdit(_params) {
      return connection.sendRequest('modeler/applyGraphEdit', _params) as Promise<{ ok: false; reason: string }>;
    },
    async getSymbolDetail(qname) {
      return connection.sendRequest('modeler/getSymbolDetail', { qname }) as Promise<SymbolDetail | null>;
    },
    onDiagnostics(handler) {
      diagnosticHandlers.push(handler);
    },
    dispose() {
      worker.terminate();
    },
  };
}