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
import { loadDemoFiles } from './fs/demo-loader';
import type { LayoutFile } from '@modeler/lsp';
import { useProjectGraph } from './hooks/useProjectGraph';
import { useLayoutSync } from './hooks/useLayoutSync';

function LandingCard({ onLoadProject, onOpenDemo }: { onLoadProject: () => void; onOpenDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 p-12">
      <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-10 max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">TTR Modeler Designer</h2>
        <p className="text-gray-500 mb-8">
          Visual schema designer for Tatrman models. Load a local project folder or explore a demo.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onLoadProject}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 font-medium transition-colors"
          >
            Load Project Folder
          </button>
          <button
            onClick={onOpenDemo}
            className="px-6 py-3 bg-slate-100 text-gray-700 border border-slate-300 rounded-lg hover:bg-slate-200 font-medium transition-colors"
          >
            Open Demo (v1-metadata)
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(designerReducer, initialDesignerState);
  const [nlPaneOpen, setNlPaneOpen] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const clientRef = useRef<LspClient | null>(null);
  const demoLoadingRef = useRef(false);
  const [transportKind, setTransportKind] = useState<'node' | 'browser' | null>(null);

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
      setTransportKind(client.transportKind);
      setClientReady(true);
    });
    return () => {
      cancelled = true;
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (!demo || demoLoadingRef.current) return;
    demoLoadingRef.current = true;
    loadDemoFiles(demo).then((files) => {
      if (!clientRef.current) return;
      return Promise.all(
        Array.from(files.files.entries()).map(([relativePath, content]) =>
          clientRef.current!.openDocument(`file:///${demo}/${relativePath}`, content)
        )
      ).then(() => {
        dispatch({ type: 'loadProject', projectUri: `file:///${demo}` });
      });
    }).catch((err: unknown) => {
      dispatch({ type: 'setError', message: `Failed to load demo: ${err}` });
    });
  }, [clientReady]);

  useProjectGraph(state, dispatch, clientRef.current);
  useLayoutSync(state, dispatch, clientRef.current);

  const prevViewportsRef = useRef(state.viewports);
  useEffect(() => {
    const prev = prevViewportsRef.current;
    prevViewportsRef.current = state.viewports;

    if (!state.projectUri || !clientRef.current) return;
    const active = state.activeSchema;
    if (prev[active].displayMode === state.viewports[active].displayMode) return;

    const layout: LayoutFile = {
      version: 1,
      viewports: state.viewports,
      nodes: state.nodePositions,
      edges: {},
    };
    clientRef.current.setLayout(state.projectUri, layout).catch(() => {});
  }, [state.viewports, state.activeSchema, state.projectUri, state.nodePositions]);

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

  const handleOpenDemo = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('demo', 'v1-metadata');
    window.location.search = params.toString();
  };

  const handleNodeSelect = (qname: string | null) => {
    dispatch({ type: 'selectSymbol', qname });
  };

  useEffect(() => {
    const qname = state.selectedSymbol?.qname;
    if (!qname) return;
    if (state.symbolDetails[qname]) return;
    const client = clientRef.current;
    if (!client) return;
    let cancelled = false;
    client.getSymbolDetail(qname).then((detail) => {
      if (cancelled || !detail) return;
      dispatch({ type: 'storeSymbolDetail', detail });
    }).catch((err) => {
      if (cancelled) return;
      dispatch({ type: 'setError', message: String(err) });
    });
    return () => { cancelled = true; };
  }, [state.selectedSymbol?.qname, state.symbolDetails]);

  const hasProject = state.projectUri !== null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        activeSchema={state.activeSchema}
        displayMode={state.viewports[state.activeSchema].displayMode}
        projectUri={state.projectUri}
        transportKind={transportKind}
        onFileLoad={handleFileLoad}
        onSchemaChange={(schema) => dispatch({ type: 'switchSchema', schema })}
        onDisplayModeChange={(mode) => dispatch({ type: 'setDisplayMode', schema: state.activeSchema, mode })}
        onToggleNlPane={() => setNlPaneOpen((v) => !v)}
        onDirPick={handleDirPick}
        onDownloadLayout={async () => {
          const client = clientRef.current;
          const uri = state.projectUri;
          if (!client || !uri) return;
          const layout = await client.exportLayout(uri);
          const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'layout.ttrl';
          a.click();
          URL.revokeObjectURL(url);
        }}
      />
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          {state.error}
        </div>
      )}
      {!hasProject ? (
        <LandingCard onLoadProject={handleDirPick} onOpenDemo={handleOpenDemo} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 relative">
            <ErrorBoundary
              label={`${state.activeSchema} schema`}
              resetKey={`${state.projectUri}|${state.activeSchema}`}
            >
              <Canvas
                graph={state.graphsBySchema[state.activeSchema]}
                displayMode={state.viewports[state.activeSchema].displayMode}
                activeSchema={state.activeSchema}
                viewports={state.viewports}
                nodePositions={state.nodePositions}
                lspClient={clientRef.current}
                projectRoot={state.projectUri}
                onNodeSelect={handleNodeSelect}
              />
            </ErrorBoundary>
          </div>
          <InspectorPanel
            selectedSymbol={state.selectedSymbol}
            symbolDetails={state.symbolDetails}
            onSelect={handleNodeSelect}
          />
        </div>
      )}
      <NlPane open={nlPaneOpen} onToggle={() => setNlPaneOpen((v) => !v)} />
    </div>
  );
}

export default App;