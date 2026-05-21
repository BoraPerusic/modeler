import * as vscode from 'vscode';
import { LanguageClient, TransportKind, NodeModule } from 'vscode-languageclient';

export function activate(context: vscode.ExtensionContext) {
  // Resolve the LSP server bundle from @modeler/lsp's workspace location.
  // The bundle externalizes @modeler/parser, @modeler/semantics, @modeler/edit
  // (see packages/lsp/package.json's `bundle-stdio` script), so it must be
  // launched from a directory where Node's module resolution can find those
  // workspace deps — i.e. node_modules/@modeler/lsp/dist/, not a copy.
  const serverPath = require.resolve('@modeler/lsp/server-stdio');

  const serverModule: NodeModule = {
    module: serverPath,
    transport: TransportKind.stdio,
  };

  const serverOptions = {
    run: serverModule,
    debug: serverModule,
  };

  const client = new LanguageClient('ttr', 'TTR Language Server', serverOptions, {
    documentSelector: [
      { scheme: 'file', language: 'ttr' },
      { scheme: 'file', language: 'ttrg' },
    ],
    outputChannelName: 'TTR Language Server',
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('modeler.openInDesigner', () => {
      vscode.window.showInformationMessage('Designer integration will be wired in Phase 3.');
    })
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return undefined;
}
