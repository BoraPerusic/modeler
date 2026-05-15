import { describe, it, expect } from 'vitest';
import { designerReducer, initialDesignerState } from '../designer-state';
import type { DesignerAction } from '../designer-state';

describe('designerReducer', () => {
  it("'switchSchema' updates activeSchema", () => {
    const action: DesignerAction = { type: 'switchSchema', schema: 'er' };
    const state = designerReducer(initialDesignerState, action);
    expect(state.activeSchema).toBe('er');
  });

  it("'setDisplayMode' updates the named viewport only", () => {
    const action: DesignerAction = {
      type: 'setDisplayMode',
      schema: 'db',
      mode: 'with-constraints',
    };
    const state = designerReducer(initialDesignerState, action);
    expect(state.viewports.db.displayMode).toBe('with-constraints');
    expect(state.viewports.er.displayMode).toBe('just-names');
  });

  it("'setViewport' merges zoom/panX/panY for the named schema", () => {
    const action: DesignerAction = {
      type: 'setViewport',
      schema: 'db',
      viewport: { zoom: 2, panX: 100, panY: -50 },
    };
    const state = designerReducer(initialDesignerState, action);
    expect(state.viewports.db.zoom).toBe(2);
    expect(state.viewports.db.panX).toBe(100);
    expect(state.viewports.db.panY).toBe(-50);
    expect(state.viewports.db.displayMode).toBe('with-types');
  });

  it("'setNodePosition' upserts by qname", () => {
    const action1: DesignerAction = {
      type: 'setNodePosition',
      qname: 'er.entity.artikl',
      x: 100,
      y: 200,
    };
    const state1 = designerReducer(initialDesignerState, action1);
    expect(state1.nodePositions['er.entity.artikl']).toEqual({ x: 100, y: 200 });

    const action2: DesignerAction = {
      type: 'setNodePosition',
      qname: 'er.entity.artikl',
      x: 300,
      y: 400,
    };
    const state2 = designerReducer(state1, action2);
    expect(state2.nodePositions['er.entity.artikl']).toEqual({ x: 300, y: 400 });
  });

  it("'selectSymbol' with null clears selection", () => {
    const selectAction: DesignerAction = {
      type: 'selectSymbol',
      qname: 'er.entity.artikl',
    };
    const state1 = designerReducer(initialDesignerState, selectAction);
    expect(state1.selectedSymbol).toEqual({ qname: 'er.entity.artikl' });

    const clearAction: DesignerAction = { type: 'selectSymbol', qname: null };
    const state2 = designerReducer(state1, clearAction);
    expect(state2.selectedSymbol).toBeNull();
  });

  it("'loadProject' resets symbolDetails cache", () => {
    const stateWithDetails = {
      ...initialDesignerState,
      symbolDetails: {
        'er.entity.artikl': { qname: 'er.entity.artikl', name: 'artikl', label: 'Artikl', kind: 'entity' as const, description: null, tags: [] as string[], sourceUri: 'file:///test.ttr', sourceLine: 1, perKindData: { kind: 'entity' as const, attributes: [], nameAttributeQname: null, codeAttributeQname: null, roleQnames: [] }, referencedBy: [] },
      },
    };
    const action: DesignerAction = { type: 'loadProject', projectUri: 'file:///x' };
    const state = designerReducer(stateWithDetails, action);
    expect(state.symbolDetails).toEqual({});
  });
});