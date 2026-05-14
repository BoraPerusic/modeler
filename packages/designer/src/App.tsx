import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { createLspClient } from './lsp-client';

interface ModelNode {
  qname: string;
  kind: string;
  label: string;
}

type ModelEdge = Record<string, never>;

function App() {
  const [nodes, setNodes] = useState<ModelNode[]>([]);
  const [edges, setEdges] = useState<ModelEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ModelNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Awaited<ReturnType<typeof createLspClient>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    createLspClient().then((client) => {
      if (cancelled) {
        client.dispose();
        return;
      }
      client.onDiagnostics((_uri, messages) => {
        setError(messages.length === 0 ? null : messages.join(', '));
      });
      clientRef.current = client;
    });
    return () => {
      cancelled = true;
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const handleFileLoad = async (content: string, uri: string) => {
    const client = clientRef.current;
    if (!client) return;
    const fileUri = `file:///${uri}`;
    await client.openDocument(fileUri, content);
    const graph = await client.getModelGraph(fileUri);
    setNodes(graph.nodes);
    setEdges(graph.edges as never[]);
  };

  const handleNodeSelect = (node: ModelNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onFileLoad={handleFileLoad} />
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          {error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <Canvas nodes={nodes} edges={edges} onNodeSelect={handleNodeSelect} />
        </div>
        <InspectorPanel selectedNode={selectedNode} />
      </div>
    </div>
  );
}

export default App;