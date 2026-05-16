import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as lsp from 'vscode-languageserver/node';
import { PassThrough } from 'stream';
import { createServerConnection } from '@modeler/lsp/server';
import path from 'path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const samplesDir = path.resolve(__dirname, '../../../samples');

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

describe('Phase 3 custom LSP methods', () => {
  let client: lsp.Connection;
  let server: lsp.Connection;

  beforeAll(async () => {
    const pair = createPairedConnection();
    client = pair.client;
    server = pair.server;
    createServerConnection(server);
    await client.sendRequest('initialize', { processId: null, rootUri: null, capabilities: {} });
    client.sendNotification('initialized', {});
  });

  afterAll(() => {
    client.dispose();
    server.dispose();
  });

  it('4.1 getLayout returns emptyLayout() when no .modeler/ directory exists', async () => {
    const emptyRoot = join(tmpdir(), `modeler-test-empty-${Date.now()}`);
    const result = await client.sendRequest('modeler/getLayout', { projectRoot: emptyRoot }) as {
      version: number;
      viewports: unknown;
      nodes: unknown;
      edges: unknown;
    };
    expect(result.version).toBe(1);
    expect(result.viewports).toHaveProperty('db');
    expect(result.viewports).toHaveProperty('er');
  });

  it('4.2 setLayout then getLayout round-trips the same LayoutFile', async () => {
    const tempRoot = join(tmpdir(), `modeler-test-layout-${Date.now()}`);
    mkdirSync(tempRoot, { recursive: true });
    try {
      const layoutPayload = {
        version: 1 as const,
        viewports: {
          db: { zoom: 1.5, panX: 10, panY: 20, displayMode: 'with-types' as const },
          er: { zoom: 2.0, panX: 0, panY: 0, displayMode: 'just-names' as const },
        },
        nodes: { 'db.dbo.foo': { x: 100, y: 200 } },
        edges: { 'db.dbo.rel1': { bendPoints: [[150, 250] as [number, number]] } },
      };
      const setResult = await client.sendRequest('modeler/setLayout', {
        projectRoot: tempRoot,
        layout: layoutPayload,
      }) as { ok: boolean };
      expect(setResult.ok).toBe(true);

      const getResult = await client.sendRequest('modeler/getLayout', {
        projectRoot: tempRoot,
      }) as typeof layoutPayload;
      expect(getResult.version).toBe(1);
      expect(getResult.viewports.db.zoom).toBe(1.5);
      expect(getResult.viewports.db.panX).toBe(10);
      expect(getResult.nodes['db.dbo.foo']).toEqual({ x: 100, y: 200 });
      expect(getResult.edges['db.dbo.rel1']).toEqual({ bendPoints: [[150, 250]] });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('4.3 applyGraphEdit returns edit-mode-not-available-in-v1', async () => {
    const result = await client.sendRequest('modeler/applyGraphEdit', {
      operations: [{ op: 'add-node', node: {} }],
    }) as { ok: false; reason: string };
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('edit-mode-not-available-in-v1');
  });

  it('4.4 getSymbolDetail for er.entity.artikl returns Czech label, description, perKindData, referencedBy', async () => {
    const ttrFiles = await getAllTtrFiles(samplesDir, ['broken']);
    for (const file of ttrFiles) {
      const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
      client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: `file://${file}`,
          languageId: 'ttr',
          version: 1,
          text: content,
        },
      });
    }
    await sleep(100);

    const result = await client.sendRequest('modeler/getSymbolDetail', {
      qname: 'er.entity.artikl',
    }) as {
      qname: string;
      label: string;
      description: string | null;
      perKindData: { kind: string; attributes?: unknown[] };
      referencedBy: unknown[];
    } | null;

    expect(result).not.toBeNull();
    expect(result!.label).toBe('artikl');
    expect(result!.description).not.toBeNull();
    expect(result!.perKindData.kind).toBe('entity');
    expect((result!.perKindData as { attributes?: unknown[] }).attributes?.length).toBeGreaterThan(0);
    expect(result!.referencedBy.length).toBeGreaterThan(0);
  }, 10000);

  it('4.5 getModelGraph with schema db on multi-file project returns >= 5 edges', async () => {
    const ttrFiles = await getAllTtrFiles(samplesDir, ['broken']);
    for (const file of ttrFiles) {
      const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
      client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: `file://${file}`,
          languageId: 'ttr',
          version: 1,
          text: content,
        },
      });
    }
    await sleep(100);

    const result = await client.sendRequest('modeler/getModelGraph', {
      textDocument: { uri: `file://${ttrFiles.find(f => f.endsWith('db.ttr')) ?? ttrFiles[0]}` },
      schema: 'db',
    }) as {
      schemaCode: string;
      nodes: Array<{ qname: string }>;
      edges: Array<{ fromNode: string; toNode: string }>;
    };

    expect(result.schemaCode).toBe('db');
    expect(result.nodes.length).toBeGreaterThan(0);
    // samples/v1-metadata/db.ttr has 111 fk defs; bump if the sample changes.
    expect(result.edges.length).toBeGreaterThanOrEqual(5);
    for (const edge of result.edges) {
      expect(result.nodes.some(n => n.qname === edge.fromNode)).toBe(true);
      expect(result.nodes.some(n => n.qname === edge.toNode)).toBe(true);
    }
  }, 10000);

  it('4.5b getModelGraph with schema er returns relation edges with from/toCardinality and localized entity labels', async () => {
    const ttrFiles = await getAllTtrFiles(samplesDir, ['broken']);
    for (const file of ttrFiles) {
      const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
      client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: `file://${file}`,
          languageId: 'ttr',
          version: 1,
          text: content,
        },
      });
    }
    await sleep(100);

    const erFile = ttrFiles.find(f => f.endsWith('er.ttr')) ?? ttrFiles[0];
    const result = await client.sendRequest('modeler/getModelGraph', {
      textDocument: { uri: `file://${erFile}` },
      schema: 'er',
    }) as {
      schemaCode: string;
      nodes: Array<{ qname: string; label: string; kind: string }>;
      edges: Array<{ kind: string; fromCardinality: string | null; toCardinality: string | null }>;
    };

    expect(result.schemaCode).toBe('er');
    expect(result.nodes.length).toBeGreaterThan(0);
    const relationEdges = result.edges.filter((e: { kind: string }) => e.kind === 'relation');
    expect(relationEdges.length).toBeGreaterThan(0);
    for (const edge of relationEdges) {
      expect(edge.fromCardinality).not.toBeNull();
      expect(edge.toCardinality).not.toBeNull();
    }
    // er.ttr has no displayLabel on artikl, so label falls back to def.name.
    const artikl = result.nodes.find(n => n.qname === 'er.entity.artikl');
    expect(artikl).toBeDefined();
    expect(artikl!.label).toBe('artikl');
  }, 10000);

  it('4.6 getSymbolDetail for a column qname returns null in v1 (nested-qname limitation)', async () => {
    // The Designer inspector only opens on top-level nodes in v1; nested
    // qnames like db.dbo.QCENSKUP_DF.IDCENSKUP intentionally resolve to null.
    // See findDefByQname in packages/lsp/src/model-graph.ts.
    const ttrFiles = await getAllTtrFiles(samplesDir, ['broken']);
    for (const file of ttrFiles) {
      const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
      client.sendNotification('textDocument/didOpen', {
        textDocument: { uri: `file://${file}`, languageId: 'ttr', version: 1, text: content },
      });
    }
    await sleep(100);
    const result = await client.sendRequest('modeler/getSymbolDetail', {
      qname: 'db.dbo.QCENSKUP_DF.IDCENSKUP',
    });
    expect(result).toBeNull();
  }, 10000);
});