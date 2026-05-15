import type { RenderableSchemaCode, DisplayMode } from '@modeler/lsp';
import type { SymbolDetail } from '@modeler/lsp';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  displayMode: DisplayMode;
}

export interface DesignerState {
  activeSchema: RenderableSchemaCode;
  viewports: Record<RenderableSchemaCode, ViewportState>;
  nodePositions: Record<string, { x: number; y: number }>;
  symbolDetails: Record<string, SymbolDetail>;
  selectedSymbol: { qname: string } | null;
  projectUri: string | null;
  error: string | null;
}

export const initialDesignerState: DesignerState = {
  activeSchema: 'db',
  viewports: {
    db: { zoom: 1.0, panX: 0, panY: 0, displayMode: 'with-types' },
    er: { zoom: 1.0, panX: 0, panY: 0, displayMode: 'just-names' },
  },
  nodePositions: {},
  symbolDetails: {},
  selectedSymbol: null,
  projectUri: null,
  error: null,
};

export type DesignerAction =
  | { type: 'loadProject'; projectUri: string }
  | { type: 'loadLayout'; layout: { viewports: Record<RenderableSchemaCode, ViewportState>; nodes: Record<string, { x: number; y: number }>; edges: Record<string, { bendPoints: Array<[number, number]> }> } }
  | { type: 'switchSchema'; schema: RenderableSchemaCode }
  | { type: 'setDisplayMode'; schema: RenderableSchemaCode; mode: DisplayMode }
  | { type: 'setViewport'; schema: RenderableSchemaCode; viewport: Omit<ViewportState, 'displayMode'> }
  | { type: 'setNodePosition'; qname: string; x: number; y: number }
  | { type: 'selectSymbol'; qname: string | null }
  | { type: 'storeSymbolDetail'; detail: SymbolDetail }
  | { type: 'setError'; message: string | null };

export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case 'loadProject':
      return {
        ...state,
        projectUri: action.projectUri,
        symbolDetails: {},
      };
    case 'loadLayout':
      return {
        ...state,
        viewports: action.layout.viewports,
        nodePositions: action.layout.nodes,
      };
    case 'switchSchema':
      return { ...state, activeSchema: action.schema };
    case 'setDisplayMode':
      return {
        ...state,
        viewports: {
          ...state.viewports,
          [action.schema]: {
            ...state.viewports[action.schema],
            displayMode: action.mode,
          },
        },
      };
    case 'setViewport':
      return {
        ...state,
        viewports: {
          ...state.viewports,
          [action.schema]: {
            ...state.viewports[action.schema],
            ...action.viewport,
          },
        },
      };
    case 'setNodePosition':
      return {
        ...state,
        nodePositions: {
          ...state.nodePositions,
          [action.qname]: { x: action.x, y: action.y },
        },
      };
    case 'selectSymbol':
      return {
        ...state,
        selectedSymbol: action.qname !== null ? { qname: action.qname } : null,
      };
    case 'storeSymbolDetail':
      return {
        ...state,
        symbolDetails: {
          ...state.symbolDetails,
          [action.detail.qname]: action.detail,
        },
      };
    case 'setError':
      return { ...state, error: action.message };
    default:
      return state;
  }
}