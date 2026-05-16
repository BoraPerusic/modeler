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
      schema: 'er',
    }) as { schemaCode: string; nodes: Array<{ qname: string; kind: string; label: string }>; edges: Array<{ fromNode: string; toNode: string }> };

    expect(result.schemaCode).toBe('er');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.nodes.every(n => typeof n.qname === 'string' && typeof n.kind === 'string' && typeof n.label === 'string')).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
    expect(result.edges.length).toBeGreaterThanOrEqual(5);
    for (const edge of result.edges) {
      const fromNode = result.nodes.find(n => n.qname === edge.fromNode);
      const toNode = result.nodes.find(n => n.qname === edge.toNode);
      expect(fromNode, `edge.fromNode ${edge.fromNode} should resolve to a node`).toBeDefined();
      expect(toNode, `edge.toNode ${edge.toNode} should resolve to a node`).toBeDefined();
    }
  });

  it('modeler/getModelGraph returns empty for unknown document', async () => {
    const result = await clientConnection.sendRequest('modeler/getModelGraph', {
      textDocument: { uri: 'file:///unknown.ttr' },
      schema: 'db',
    }) as { schemaCode: string; nodes: unknown[]; edges: unknown[] };

    expect(result.schemaCode).toBe('db');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

describe('Phase 2 LSP features', () => {
  let client: lsp.Connection;
  let server: lsp.Connection;
  const uri = 'file:///fixture.ttr';
  const sampleUri = `file://${path.resolve(samplesDir, 'v1-metadata/er.ttr')}`;
  // line 0: schema er namespace entity
  // line 1: <blank>
  // line 2: def entity artikl {
  // line 3:   attributes: [def attribute id { type: int }]
  // line 4:   nameAttribute: id
  // line 5: }
  const text = `schema er namespace entity

def entity artikl {
  attributes: [def attribute id { type: int }]
  nameAttribute: id
}
`;

  beforeAll(async () => {
    const pair = createPairedConnection();
    client = pair.client;
    server = pair.server;
    createServerConnection(server);
    await client.sendRequest('initialize', {
      processId: null,
      rootUri: null,
      capabilities: {},
    });
    client.sendNotification('initialized', {});
    client.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId: 'ttr', version: 1, text },
    });
    await sleep(150);
  });

  afterAll(() => {
    client.dispose();
    server.dispose();
  });

  it('textDocument/definition on an entity name returns its def location', async () => {
    // cursor on 'artikl' at line 2, col 12
    const res = await client.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line: 2, character: 12 },
    }) as lsp.Location | null;
    expect(res).not.toBeNull();
    expect(res!.uri).toBe(uri);
    expect(res!.range.start.line).toBe(2);
  });

  it('textDocument/definition on a bare-id reference follows to the attribute def', async () => {
    // cursor on 'id' inside `nameAttribute: id` at line 4, col 18
    const res = await client.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line: 4, character: 18 },
    }) as lsp.Location | null;
    expect(res).not.toBeNull();
    expect(res!.uri).toBe(uri);
    // The attribute def is on line 3 (inline inside attributes: [...])
    expect(res!.range.start.line).toBe(3);
  });

  it('textDocument/hover on entity name returns a non-empty markdown', async () => {
    const res = await client.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line: 2, character: 12 },
    }) as lsp.Hover | null;
    expect(res).not.toBeNull();
    const value = (res!.contents as { kind: string; value: string }).value;
    expect(value).toContain('er.entity.artikl');
  });

  it('textDocument/references finds the nameAttribute use that points at the attribute', async () => {
    // cursor on the attribute def 'id' on line 3
    const res = await client.sendRequest('textDocument/references', {
      textDocument: { uri },
      position: { line: 3, character: 30 },
      context: { includeDeclaration: true },
    }) as lsp.Location[];
    // expect at least the declaration + the nameAttribute reference
    expect(res.length).toBeGreaterThanOrEqual(2);
  });

  it('workspace/symbol query="art" finds er.entity.artikl', async () => {
    const res = await client.sendRequest('workspace/symbol', { query: 'art' }) as lsp.SymbolInformation[];
    expect(res.map((s) => s.name)).toContain('er.entity.artikl');
  });

  it('textDocument/semanticTokens/full returns a name-sized token per def', async () => {
    const res = await client.sendRequest('textDocument/semanticTokens/full', {
      textDocument: { uri },
    }) as { data: number[] };
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.length % 5).toBe(0);
    // The first token should be on the line of 'def entity artikl' (line 2,
    // 0-indexed) and have length === 'artikl'.length === 6.
    // tokens layout: deltaLine, deltaStart, length, tokenType, tokenModifiers
    const firstLength = res.data[2];
    expect(firstLength).toBe('artikl'.length);
  });

  it('modeler/getProjectInfo returns defaults when no manifest is loaded', async () => {
    const info = await client.sendRequest('modeler/getProjectInfo', {
      textDocument: { uri },
    }) as { name: string; declaredSchemas: string[] };
    // no loadManifest callback in this test harness, so defaults apply
    expect(info.declaredSchemas).toContain('er');
  });

  it('unresolved references produce ttr/unresolved-reference diagnostics', async () => {
    const badUri = 'file:///bad-ref.ttr';
    const badText = `schema map namespace er2db

def er2cnc_role x {
  entity: er.entity.ghost
  role: fact
}
`;
    const diagnosticsPromise = new Promise<lsp.PublishDiagnosticsParams>((resolve) => {
      const off = client.onNotification('textDocument/publishDiagnostics', (params) => {
        if ((params as lsp.PublishDiagnosticsParams).uri === badUri) {
          off.dispose();
          resolve(params as lsp.PublishDiagnosticsParams);
        }
      });
    });
    client.sendNotification('textDocument/didOpen', {
      textDocument: { uri: badUri, languageId: 'ttr', version: 1, text: badText },
    });
    const diags = await diagnosticsPromise;
    const codes = diags.diagnostics.map((d) => d.code);
    expect(codes).toContain('ttr/unresolved-reference');
  });

  it('with stock vocab loaded, resolveBareId("fact") via the server resolves to cnc.role.fact', async () => {
    // Boot a second server with a loadStock callback that supplies the cnc-roles vocab.
    const { loadStockVocabularies } = await import('@modeler/semantics/node-only');
    const pair = createPairedConnection();
    createServerConnection(pair.server, {
      async loadStock() {
        const vocabs = await loadStockVocabularies(['cnc-roles']);
        const out: Array<{ uri: string; ast: import('@modeler/parser').Document; schemaCode: string; namespace: string }> = [];
        for (const [name, ast] of vocabs) {
          out.push({ uri: `stock://${name}.ttr`, ast, schemaCode: 'cnc', namespace: 'role' });
        }
        return out;
      },
    });
    await pair.client.sendRequest('initialize', { processId: null, rootUri: null, capabilities: {} });
    pair.client.sendNotification('initialized', {});
    const refUri = 'file:///stocktest.ttr';
    pair.client.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: refUri,
        languageId: 'ttr',
        version: 1,
        text: `schema er namespace entity

def entity foo {
  attributes: [def attribute id { type: int }]
  roles: [fact]
}
`,
      },
    });
    await sleep(120);

    // Workspace symbol should now include the stock cnc.role.fact entry.
    const symbols = await pair.client.sendRequest('workspace/symbol', { query: 'fact' }) as lsp.SymbolInformation[];
    expect(symbols.map((s) => s.name)).toContain('cnc.role.fact');
    pair.client.dispose();
    pair.server.dispose();
  });

  it('parses a real sample file in the LSP without producing parse-error diagnostics', async () => {
    const content = await import('fs/promises').then((fs) => fs.readFile(`${sampleUri.slice(7)}`, 'utf-8'));
    const diagnosticsPromise = new Promise<lsp.PublishDiagnosticsParams>((resolve) => {
      const off = client.onNotification('textDocument/publishDiagnostics', (params) => {
        if ((params as lsp.PublishDiagnosticsParams).uri === sampleUri) {
          off.dispose();
          resolve(params as lsp.PublishDiagnosticsParams);
        }
      });
    });
    client.sendNotification('textDocument/didOpen', {
      textDocument: { uri: sampleUri, languageId: 'ttr', version: 1, text: content },
    });
    const diags = await diagnosticsPromise;
    expect(diags.diagnostics.some((d) => d.code === 'ttr/parse-error')).toBe(false);
  });
});