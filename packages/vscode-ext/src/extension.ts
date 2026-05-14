import * as vscode from 'vscode';
import { LanguageClient, TransportKind, NodeModule } from 'vscode-languageclient';

export function activate(context: vscode.ExtensionContext) {
  const serverModule: NodeModule = {
    module: vscode.Uri.joinPath(context.extensionUri, 'dist', 'server-stdio.js').fsPath,
    transport: TransportKind.stdio,
  };

  const serverOptions = {
    run: serverModule,
    debug: serverModule,
  };

  const client = new LanguageClient('ttr', 'TTR Language Server', serverOptions, {
    documentSelector: [{ scheme: 'file', language: 'ttr' }],
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