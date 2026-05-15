import { useEffect, useRef, useState } from 'react';
import { useReducer } from 'react';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { NlPane } from './components/NlPane';
import { createLspClient } from './lsp-client';
import type { LspClient } from './lsp-client';
import { designerReducer } from './state/designer-reducer';
import { initialDesignerState } from './state/designer-state';

function App() {
  const [state, dispatch] = useReducer(designerReducer, initialDesignerState);
  // NL-pane open/close is UI-only and not project-scoped, so it lives in local
  // useState rather than DesignerState. If the pane gains state that must persist
  // across project loads, move it into the reducer.
  const [nlPaneOpen, setNlPaneOpen] = useState(false);
  const clientRef = useRef<LspClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    createLspClient().then((client: LspClient) => {
      if (cancelled) {
        client.dispose();
        return;
      }
      client.onDiagnostics((_uri, messages) => {
        dispatch({ type: 'setError', message: messages.length === 0 ? null : messages.join(', ') });
      });
      clientRef.current = client;
    });
    return () => {
      cancelled = true;
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  // Graph fetching lives in §B (see docs/plan/phase-03/B-lsp-integration.md):
  // a useEffect on (projectUri, activeSchema) will dispatch a 'setGraph' action.

  const handleFileLoad = async (content: string, uri: string) => {
    const client = clientRef.current;
    if (!client) return;
    const fileUri = `file:///${uri}`;
    await client.openDocument(fileUri, content);
    dispatch({ type: 'loadProject', projectUri: fileUri });
  };

  const handleNodeSelect = (qname: string) => {
    dispatch({ type: 'selectSymbol', qname });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        activeSchema={state.activeSchema}
        displayMode={state.viewports[state.activeSchema].displayMode}
        projectUri={state.projectUri}
        onFileLoad={handleFileLoad}
        onSchemaChange={(schema) => dispatch({ type: 'switchSchema', schema })}
        onDisplayModeChange={(mode) => dispatch({ type: 'setDisplayMode', schema: state.activeSchema, mode })}
        onToggleNlPane={() => setNlPaneOpen((v) => !v)}
      />
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          {state.error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <Canvas
            projectUri={state.projectUri}
            activeSchema={state.activeSchema}
            displayMode={state.viewports[state.activeSchema].displayMode}
            onNodeSelect={handleNodeSelect}
          />
        </div>
        <InspectorPanel
          selectedSymbol={state.selectedSymbol}
          symbolDetails={state.symbolDetails}
        />
      </div>
      <NlPane open={nlPaneOpen} onToggle={() => setNlPaneOpen((v) => !v)} />
    </div>
  );
}

export default App;