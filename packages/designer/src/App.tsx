import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';

interface ModelNode {
  qname: string;
  kind: string;
  label: string;
}

interface ModelEdge {
  // Phase 3 will add edges
}

function App() {
  const [nodes, setNodes] = useState<ModelNode[]>([]);
  const [edges, setEdges] = useState<ModelEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ModelNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize LSP worker (placeholder for Phase 0 - will be wired in Phase 3)
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleFileLoad = async (content: string, uri: string) => {
    // In Phase 0, just parse the content directly
    // Phase 3 will use LSP modeler/getModelGraph
    const lines = content.split('\n');
    const parsedNodes: ModelNode[] = [];

    for (const line of lines) {
      const match = line.match(/^\s*def\s+(\w+)\s+(\w+)/);
      if (match) {
        const kind = match[1];
        const name = match[2];
        parsedNodes.push({ qname: name, kind, label: name });
      }
    }

    setNodes(parsedNodes);
    setEdges([]);
    setError(null);
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