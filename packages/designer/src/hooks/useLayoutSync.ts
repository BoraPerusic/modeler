import { useEffect } from 'react';
import type React from 'react';
import type { DesignerState } from '../state/designer-state';
import type { DesignerAction } from '../state/designer-reducer';
import type { LspClient } from '../lsp-client';

/**
 * Loads layout from LSP when a project is opened. After the project document
 * promises settle (signalled by projectUri being non-null), fetches the saved
 * layout and dispatches `loadLayout` to restore node positions and viewport.
 * Note: with v1.1, layout lives inside .ttrg files; when the Designer state
 * gains `currentGraphUri` (section E), this will call getLayout(graphUri)
 * instead of getLayout(projectRoot) to read from the .ttrg layout block.
 */
export function useLayoutSync(
  state: DesignerState,
  dispatch: React.Dispatch<DesignerAction>,
  client: LspClient | null
): void {
  useEffect(() => {
    const projectUri = state.projectUri;
    if (!client || !projectUri) return;

    let cancelled = false;
    client.getLayout(projectUri).then((layout) => {
      if (cancelled || !layout) return;
      dispatch({ type: 'loadLayout', layout });
    }).catch((err: unknown) => {
      if (cancelled) return;
      console.warn('[useLayoutSync] getLayout failed', err);
    });

    return () => { cancelled = true; };
  }, [state.projectUri, client, dispatch]);
}