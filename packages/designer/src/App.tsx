import { useEffect, useRef, useState } from 'react';
import { useReducer } from 'react';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { NlPane } from './components/NlPane';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createLspClient } from './lsp-client';
import type { LspClient } from './lsp-client';
import { designerReducer } from './state/designer-reducer';
import { initialDesignerState } from './state/designer-state';
import { loadProjectViaFileSystemAccessAPI, type ProjectFiles } from './fs/file-system';
import { useProjectGraph } from './hooks/useProjectGraph';

function App() {
  const [state, dispatch] = useReducer(designerReducer, initialDesignerState);
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

  useProjectGraph(state, dispatch, clientRef.current);

  const handleFileLoad = async (files: ProjectFiles) => {
    const client = clientRef.current;
    if (!client) return;
    await Promise.all(
      Array.from(files.files.entries()).map(([relativePath, content]) =>
        client.openDocument(`file:///${files.rootName}/${relativePath}`, content)
      )
    );
    dispatch({ type: 'loadProject', projectUri: `file:///${files.rootName}` });
  };

  const handleDirPick = async () => {
    const files = await loadProjectViaFileSystemAccessAPI();
    if (files) handleFileLoad(files);
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
        onDirPick={handleDirPick}
      />
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          {state.error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ErrorBoundary
            label={`${state.activeSchema} schema`}
            resetKey={`${state.projectUri}|${state.activeSchema}`}
          >
            <Canvas
              graph={state.graphsBySchema[state.activeSchema]}
              displayMode={state.viewports[state.activeSchema].displayMode}
              onNodeSelect={handleNodeSelect}
            />
          </ErrorBoundary>
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