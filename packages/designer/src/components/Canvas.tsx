import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { RenderableSchemaCode, DisplayMode } from '@modeler/lsp';

interface CanvasProps {
  projectUri: string | null;
  activeSchema: RenderableSchemaCode;
  displayMode: DisplayMode;
  onNodeSelect: (qname: string) => void;
}

export function Canvas({ projectUri: _projectUri, activeSchema: _activeSchema, displayMode: _displayMode, onNodeSelect }: CanvasProps) {
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
      const data = evt.target.data();
      onNodeSelect(data.qname);
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [onNodeSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white"
      style={{ minHeight: '400px' }}
    />
  );
}