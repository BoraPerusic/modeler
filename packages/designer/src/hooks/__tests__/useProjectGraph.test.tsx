import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ModelGraph } from '@modeler/lsp';
import { useProjectGraph } from '../useProjectGraph';
import { initialDesignerState } from '../../state/designer-state';
import type { DesignerState } from '../../state/designer-state';
import type { LspClient } from '../../lsp-client';

function makeClient(): LspClient & { getModelGraph: ReturnType<typeof vi.fn> } {
  return {
    openDocument: vi.fn(() => Promise.resolve()),
    getModelGraph: vi.fn(
      (_uri: string, schema: 'db' | 'er'): Promise<ModelGraph> =>
        Promise.resolve({ schemaCode: schema, nodes: [], edges: [] })
    ),
    getLayout: vi.fn(),
    setLayout: vi.fn(),
    exportLayout: vi.fn(),
    applyGraphEdit: vi.fn(),
    getSymbolDetail: vi.fn(),
    onDiagnostics: vi.fn(),
    dispose: vi.fn(),
  } as unknown as LspClient & { getModelGraph: ReturnType<typeof vi.fn> };
}

function makeState(over: Partial<DesignerState> = {}): DesignerState {
  return { ...initialDesignerState, ...over };
}

describe('useProjectGraph', () => {
  it('first load fires getModelGraph(uri, "db") exactly once', async () => {
    const client = makeClient();
    const dispatch = vi.fn();
    const state = makeState({ projectUri: 'file:///x', activeSchema: 'db' });
    renderHook(() => useProjectGraph(state, dispatch, client));
    await waitFor(() =>
      expect(client.getModelGraph).toHaveBeenCalledExactlyOnceWith('file:///x', 'db')
    );
  });

  it('displayMode change does not trigger getModelGraph', async () => {
    const client = makeClient();
    const dispatch = vi.fn();
    const cachedGraph: ModelGraph = { schemaCode: 'db', nodes: [], edges: [] };
    const initial = makeState({
      projectUri: 'file:///x',
      activeSchema: 'db',
      graphsBySchema: { db: cachedGraph, er: null },
    });
    const { rerender } = renderHook(
      ({ s }: { s: DesignerState }) => useProjectGraph(s, dispatch, client),
      { initialProps: { s: initial } }
    );
    expect(client.getModelGraph).not.toHaveBeenCalled();

    const next = makeState({
      projectUri: 'file:///x',
      activeSchema: 'db',
      graphsBySchema: initial.graphsBySchema,
      viewports: {
        ...initial.viewports,
        db: { ...initial.viewports.db, displayMode: 'with-constraints' },
      },
    });
    rerender({ s: next });
    expect(client.getModelGraph).not.toHaveBeenCalled();
  });

  it('switching activeSchema fetches the new schema', async () => {
    const client = makeClient();
    const dispatch = vi.fn();
    const cachedDb: ModelGraph = { schemaCode: 'db', nodes: [], edges: [] };
    const initial = makeState({
      projectUri: 'file:///x',
      activeSchema: 'db',
      graphsBySchema: { db: cachedDb, er: null },
    });
    const { rerender } = renderHook(
      ({ s }: { s: DesignerState }) => useProjectGraph(s, dispatch, client),
      { initialProps: { s: initial } }
    );
    expect(client.getModelGraph).not.toHaveBeenCalled();

    const next = makeState({ ...initial, activeSchema: 'er' });
    rerender({ s: next });
    await waitFor(() =>
      expect(client.getModelGraph).toHaveBeenCalledExactlyOnceWith('file:///x', 'er')
    );
  });

  it('toggling back to a cached schema does not refetch', async () => {
    const client = makeClient();
    const dispatch = vi.fn();
    const cachedDb: ModelGraph = { schemaCode: 'db', nodes: [], edges: [] };
    const cachedEr: ModelGraph = { schemaCode: 'er', nodes: [], edges: [] };
    const both = makeState({
      projectUri: 'file:///x',
      activeSchema: 'db',
      graphsBySchema: { db: cachedDb, er: cachedEr },
    });
    const { rerender } = renderHook(
      ({ s }: { s: DesignerState }) => useProjectGraph(s, dispatch, client),
      { initialProps: { s: both } }
    );
    rerender({ s: { ...both, activeSchema: 'er' } });
    rerender({ s: { ...both, activeSchema: 'db' } });
    expect(client.getModelGraph).not.toHaveBeenCalled();
  });
});
