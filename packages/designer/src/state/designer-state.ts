import type { RenderableSchemaCode, ViewportState as LspViewportState, SymbolDetail } from '@modeler/lsp';

export { LspViewportState as ViewportState };

export interface DesignerState {
  activeSchema: RenderableSchemaCode;
  viewports: Record<RenderableSchemaCode, LspViewportState>;
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