import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

const { mockOpenDocument, mockSetLayout, mockLoadDemoFiles } = vi.hoisted(() => ({
  mockOpenDocument: vi.fn().mockResolvedValue(undefined),
  mockSetLayout: vi.fn().mockResolvedValue({ ok: true }),
  mockLoadDemoFiles: vi.fn(),
}));

vi.mock('cytoscape', () => {
  const mockUse = vi.fn();
  const mockDefault = vi.fn((_opts: unknown) => ({
    elements: vi.fn(() => ({ remove: vi.fn().mockReturnThis() })),
    add: vi.fn().mockReturnThis(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    nodes: vi.fn(() => ({ forEach: vi.fn() })),
    on: vi.fn(),
    off: vi.fn(),
    nodeHtmlLabel: vi.fn(),
    destroy: vi.fn(),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    zoom: vi.fn(() => 1),
    edges: vi.fn(() => []),
    render: vi.fn(),
  }));
  (mockDefault as unknown as Record<string, unknown>).use = mockUse;
  return { default: mockDefault, use: mockUse };
});

vi.mock('cytoscape-cose-bilkent', () => ({ default: vi.fn() }));
vi.mock('cytoscape-node-html-label', () => ({ default: vi.fn() }));

vi.mock('../lsp-client.ts', () => ({
  createLspClient: vi.fn().mockResolvedValue({
    transportKind: 'browser',
    openDocument: mockOpenDocument,
    onDiagnostics: vi.fn(),
    dispose: vi.fn(),
    getModelGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getLayout: vi.fn().mockResolvedValue({
      version: 1,
      viewports: {
        db: { zoom: 1, panX: 0, panY: 0, displayMode: 'with-types' },
        er: { zoom: 1, panX: 0, panY: 0, displayMode: 'just-names' },
      },
      nodes: {},
      edges: {},
    }),
    getSymbolDetail: vi.fn().mockResolvedValue(null),
    setLayout: mockSetLayout,
    exportLayout: vi.fn(),
    applyGraphEdit: vi.fn(),
  }),
}));

vi.mock('../fs/demo-loader', () => ({
  loadDemoFiles: mockLoadDemoFiles,
}));

import App from '../App';

describe('App demo loading (G-4)', () => {
  beforeEach(() => {
    mockOpenDocument.mockClear();
    mockSetLayout.mockClear();
    mockLoadDemoFiles.mockClear();
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('with ?demo=v1-metadata, calls loadDemoFiles and opens each file', async () => {
    window.history.replaceState(null, '', '/?demo=v1-metadata');
    const files = new Map([['modeler.toml', 'content'], ['db.ttr', 'content']]);
    mockLoadDemoFiles.mockResolvedValue({ rootName: 'v1-metadata', files });

    render(<App />);

    await waitFor(() => expect(mockLoadDemoFiles).toHaveBeenCalledWith('v1-metadata'));
    await waitFor(() => expect(mockOpenDocument).toHaveBeenCalledTimes(2));
    expect(mockOpenDocument).toHaveBeenCalledWith('file:///v1-metadata/modeler.toml', 'content');
    expect(mockOpenDocument).toHaveBeenCalledWith('file:///v1-metadata/db.ttr', 'content');
  });

  it('without ?demo flag, does not call loadDemoFiles or openDocument', async () => {
    window.history.replaceState(null, '', '/');
    render(<App />);
    await waitFor(() => screen.getByText('Open Demo (v1-metadata)'));
    expect(mockLoadDemoFiles).not.toHaveBeenCalled();
    expect(mockOpenDocument).not.toHaveBeenCalled();
  });

  it('after demo load, displayMode does not trigger spurious setLayout (N-5 regression)', async () => {
    window.history.replaceState(null, '', '/?demo=v1-metadata');
    const files = new Map([['modeler.toml', 'content']]);
    mockLoadDemoFiles.mockResolvedValue({ rootName: 'v1-metadata', files });

    render(<App />);

    await waitFor(() => expect(mockLoadDemoFiles).toHaveBeenCalled());
    expect(mockSetLayout).not.toHaveBeenCalled();
  });
});