import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

interface CanvasProps {
  nodes: Array<{ qname: string; kind: string; label: string }>;
  edges: Array<unknown>;
  onNodeSelect: (node: { qname: string; kind: string; label: string }) => void;
}

export function Canvas({ nodes, edges: _edges, onNodeSelect }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#0ea5e9',
            color: '#1e293b',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 40,
            height: 40,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
          },
        },
      ],
      layout: {
        name: 'circle',
        padding: 50,
      },
    });

    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target.data();
      onNodeSelect(node);
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!cyRef.current) return;

    cyRef.current.elements().remove();

    const cyNodes = nodes.map((node, index) => ({
      data: { id: `node-${index}`, label: node.label, kind: node.kind, qname: node.qname },
    }));

    cyRef.current.add(cyNodes);

    if (nodes.length > 0) {
      cyRef.current.layout({ name: 'circle', padding: 50 }).run();
    }
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white"
      style={{ minHeight: '400px' }}
    />
  );
}