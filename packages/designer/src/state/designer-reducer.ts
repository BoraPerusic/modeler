import type { RenderableSchemaCode, DisplayMode, LayoutFile, SymbolDetail } from '@modeler/lsp';
import type { DesignerState } from './designer-state';

export type DesignerAction =
  | { type: 'loadProject'; projectUri: string }
  | { type: 'loadLayout'; layout: LayoutFile }
  | { type: 'switchSchema'; schema: RenderableSchemaCode }
  | { type: 'setDisplayMode'; schema: RenderableSchemaCode; mode: DisplayMode }
  | { type: 'setViewport'; schema: RenderableSchemaCode; viewport: { zoom: number; panX: number; panY: number } }
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