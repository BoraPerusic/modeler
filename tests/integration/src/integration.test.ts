import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseFile } from '@modeler/parser';
import * as lsp from 'vscode-languageserver/node';
import { PassThrough } from 'stream';
import { createServerConnection } from '@modeler/lsp/server';
import { DiagnosticCode } from '@modeler/parser';
import path from 'path';

const samplesDir = path.resolve(__dirname, '../../../samples');
const brokenDir = path.resolve(samplesDir, 'broken');

async function getAllTtrFiles(dir: string, excludeDirs: string[] = []): Promise<string[]> {
  const results: string[] = [];
  const fs = await import('fs/promises');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) continue;
      results.push(...await getAllTtrFiles(fullPath, excludeDirs));
    } else if (entry.isFile() && entry.name.endsWith('.ttr')) {
      results.push(fullPath);
    }
  }
  return results;
}

function createPairedConnection(): { client: lsp.Connection; server: lsp.Connection } {
  const clientTransport = new PassThrough({ objectMode: true });
  const serverTransport = new PassThrough({ objectMode: true });

  const clientReader = new lsp.StreamMessageReader(clientTransport as unknown as NodeJS.ReadableStream);
  const clientWriter = new lsp.StreamMessageWriter(serverTransport as unknown as NodeJS.WritableStream);
  const client = lsp.createConnection(clientReader, clientWriter) as lsp.Connection;

  const serverReader = new lsp.StreamMessageReader(serverTransport as unknown as NodeJS.ReadableStream);
  const serverWriter = new lsp.StreamMessageWriter(clientTransport as unknown as NodeJS.WritableStream);
  const server = lsp.createConnection(serverReader, serverWriter) as lsp.Connection;

  client.listen();
  server.listen();

  return { client, server };
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

describe('parser integration', () => {
  let sampleFiles: string[];
  let brokenFiles: string[];

  beforeAll(async () => {
    sampleFiles = await getAllTtrFiles(samplesDir, ['broken']);
    brokenFiles = await getAllTtrFiles(brokenDir);
  });

  it('parses all sample files (non-broken) without errors', async () => {
    for (const file of sampleFiles) {
      const result = await parseFile(file);
      expect(result.errors, `Errors in ${file}: ${result.errors.map(e => e.message).join(', ')}`).toHaveLength(0);
    }
  });

  it('parses samples/v1-metadata/er.ttr with >0 entity definitions', async () => {
    const result = await parseFile(path.join(samplesDir, 'v1-metadata/er.ttr'));
    expect(result.errors).toHaveLength(0);
    const entities = result.ast?.definitions.filter(d => d.kind === 'entity') ?? [];
    expect(entities.length).toBeGreaterThan(0);
  });

  it('broken fixtures produce ttr/parse-error diagnostics', async () => {
    for (const file of brokenFiles) {
      const result = await parseFile(file);
      expect(result.errors.length, `Expected errors in ${file}`).toBeGreaterThanOrEqual(1);
      const hasParseError = result.errors.some(e => e.code === DiagnosticCode.ParseError);
      expect(hasParseError, `Expected ttr/parse-error in ${file}: ${result.errors.map(e => e.code).join(', ')}`).toBe(true);
    }
  });
});

describe('lsp integration', () => {
  let sampleFiles: string[];
  let clientConnection: lsp.Connection;
  let serverConnection: lsp.Connection;

  beforeAll(async () => {
    sampleFiles = await getAllTtrFiles(samplesDir, ['broken']);
    const { client, server } = createPairedConnection();
    clientConnection = client;
    serverConnection = server;
    createServerConnection(serverConnection);
    await clientConnection.sendRequest('initialize', {
      processId: null,
      rootUri: null,
      capabilities: {},
    });
    clientConnection.sendNotification('initialized', {});
  });

  afterAll(async () => {
    clientConnection.dispose();
    serverConnection.dispose();
  });

  it('modeler/getModelGraph returns expected stub nodes after didOpen', async () => {
    const filePath = path.join(samplesDir, 'v1-metadata/er.ttr');
    const content = await import('fs/promises').then(fs => fs.readFile(filePath, 'utf-8'));
    const fileUri = `file://${filePath}`;

    clientConnection.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: fileUri,
        languageId: 'ttr',
        version: 1,
        text: content,
      },
    });

    await sleep(100);

    const result = await clientConnection.sendRequest('modeler/getModelGraph', {
      textDocument: { uri: fileUri },
    }) as { nodes: Array<{ qname: string; kind: string; label: string }>; edges: unknown[] };

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.nodes.every(n => typeof n.qname === 'string' && typeof n.kind === 'string' && typeof n.label === 'string')).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it('modeler/getModelGraph returns empty for unknown document', async () => {
    const result = await clientConnection.sendRequest('modeler/getModelGraph', {
      textDocument: { uri: 'file:///unknown.ttr' },
    }) as { nodes: unknown[]; edges: unknown[] };

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});