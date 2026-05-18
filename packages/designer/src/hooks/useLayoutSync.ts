import { useEffect } from 'react';
import type React from 'react';
import type { DesignerState } from '../state/designer-state';
import type { DesignerAction } from '../state/designer-reducer';
import type { LspClient } from '../lsp-client';

/**
 * Loads layout from LSP when a project is opened. After the project document
 * promises settle (signalled by projectUri being non-null), fetches the saved
 * layout and dispatches `loadLayout` to restore node positions and viewport.
 */
export function useLayoutSync(
  state: DesignerState,
  dispatch: React.Dispatch<DesignerAction>,
  client: LspClient | null
): void {
  useEffect(() => {
    const uri = state.projectUri;
    if (!client || !uri) return;

    let cancelled = false;
    client.getLayout(uri).then((layout) => {
      if (cancelled) return;
      dispatch({ type: 'loadLayout', layout });
    }).catch((err: unknown) => {
      if (cancelled) return;
      console.warn('[useLayoutSync] getLayout failed', err);
    });

    return () => { cancelled = true; };
  }, [state.projectUri, client, dispatch]);
}