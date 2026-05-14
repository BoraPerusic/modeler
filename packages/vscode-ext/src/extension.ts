import * as vscode from 'vscode';

const lc = require('vscode-languageclient');

export function activate(context: vscode.ExtensionContext) {
  const LanguageClient: any = (lc as any).LanguageClient;
  const TransportKind: any = (lc as any).TransportKind;

  const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server-stdio.js');
  const serverOptions = {
    run: {
      module: serverModule.fsPath,
      transport: TransportKind.stdio,
    },
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