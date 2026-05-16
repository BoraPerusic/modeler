import { useEffect } from 'react';
import type React from 'react';
import type { DesignerState } from '../state/designer-state';
import type { DesignerAction } from '../state/designer-reducer';
import type { LspClient } from '../lsp-client';

/**
 * Owns the cache-fetch effect for `getModelGraph`. Calls the LSP only on
 * cache miss; populates `state.graphsBySchema[schema]` via `storeGraph`.
 *
 * Extracted from App.tsx so the four behaviour invariants — first load fires
 * once, displayMode change does NOT fire, schema toggle DOES fire, toggle-back
 * to a cached schema does NOT fire — can be unit-tested with `renderHook`.
 */
export function useProjectGraph(
  state: DesignerState,
  dispatch: React.Dispatch<DesignerAction>,
  client: LspClient | null
): void {
  useEffect(() => {
    const uri = state.projectUri;
    if (!client || !uri) return;
    const schema = state.activeSchema;
    // Cache hit: skip the LSP round-trip and reuse the prior graph.
    if (state.graphsBySchema[schema]) return;
    client.getModelGraph(uri, schema)
      .then((graph) => dispatch({ type: 'storeGraph', schema, graph }))
      .catch((err) => dispatch({ type: 'setError', message: String(err) }));
  }, [state.projectUri, state.activeSchema, state.graphsBySchema, client, dispatch]);
}
