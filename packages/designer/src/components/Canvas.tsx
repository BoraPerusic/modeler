import { useEffect, useRef, useState } from 'react';
import type { ModelGraph, DisplayMode, Cardinality } from '@modeler/lsp';
import { modelGraphToCyElements } from '../cy/adapter';
import { glyphFor } from '../cy/glyph-renderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CytoscapeInstance = any;

// Module-scope promise: loads cytoscape + extensions once, registers extensions globally.
const cytoscapeReadyPromise = Promise.all([
  import('cytoscape'),
  import('cytoscape-cose-bilkent'),
  import('cytoscape-node-html-label'),
]).then(([cyMod, coseMod, nlMod]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cytoscape = (cyMod as any).default ?? cyMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cose = (coseMod as any).default ?? coseMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nl = (nlMod as any).default ?? nlMod;

  cytoscape.use(cose);
  nl(cytoscape);
  return cytoscape;
});

interface CanvasProps {
  graph: ModelGraph | null;
  displayMode: DisplayMode;
  onNodeSelect: (qname: string) => void;
}

export function Canvas({ graph, displayMode, onNodeSelect }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<CytoscapeInstance | null>(null);
  const displayModeRef = useRef<DisplayMode>(displayMode);
  const graphRef = useRef<ModelGraph | null>(graph);
  const onNodeSelectRef = useRef(onNodeSelect);
  const cyInitRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [cyReady, setCyReady] = useState(false);

  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);

  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    if (cyInitRef.current || !containerRef.current) return;
    cyInitRef.current = true;

    cytoscapeReadyPromise.then((cytoscape) => {
      if (!containerRef.current) return;

      const cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#0f172a',
              'border-width': 1,
              'border-color': '#475569',
              color: '#1e293b',
              'font-size': '11px',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'font-family': 'ui-monospace, monospace',
            },
          },
          {
            selector: 'node[kind = "table"]',
            style: { shape: 'round-rectangle', width: 200, height: 'label' },
          },
          {
            selector: 'node[kind = "view"]',
            style: { shape: 'round-rectangle', width: 200, height: 'label' },
          },
          {
            selector: 'node[kind = "entity"]',
            style: { shape: 'round-rectangle', width: 200, height: 'label' },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': '#3b82f6',
              'target-arrow-color': '#3b82f6',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'edge[kind = "fk"]',
            style: { 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6', 'target-arrow-shape': 'triangle' },
          },
          {
            selector: 'edge[kind = "relation"]',
            style: { 'line-color': '#10b981', 'target-arrow-color': '#10b981', 'target-arrow-shape': 'none' },
          },
        ],
      });

      cy.nodeHtmlLabel([
        {
          query: 'node',
          halign: 'center',
          valign: 'center',
          tpl: (data: Record<string, unknown>) => (data['labelHtml'] as string) ?? '',
        },
      ]);

      cy.on('tap', 'node', (evt: CytoscapeInstance) => {
        const data = evt.target.data();
        onNodeSelectRef.current(data['qname'] as string);
      });

      cyRef.current = cy;
      setCyReady(true);
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      cyInitRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (graph === null) {
      cy.elements().remove();
      return;
    }

    const els = modelGraphToCyElements(graph, displayModeRef.current);
    cy.elements().remove();
    if (els.length > 0) {
      cy.add(els);
    }

    cy.layout({
      name: 'cose-bilkent',
      randomize: false,
      animate: false,
      nodeRepulsion: 4500,
      idealEdgeLength: 200,
    }).run();
  }, [graph]);

  useEffect(() => {
    if (!cyRef.current || !graphRef.current) return;
    const cy = cyRef.current;
    const mode = displayModeRef.current;

    const els = modelGraphToCyElements(graphRef.current, mode);
    cy.nodes().forEach((node: CytoscapeInstance) => {
      const qname = node.data('qname');
      const el = els.find((e) => e.group === 'nodes' && e.data['qname'] === qname);
      if (el) {
        node.data('labelHtml', el.data['labelHtml']);
      }
    });
    (cy as unknown as { nodeHtmlLabel: (opts: string) => void }).nodeHtmlLabel('update');
  }, [displayMode]);

  useEffect(() => {
    const cy = cyRef.current;
    const overlayEl = overlayRef.current;
    if (!cy || !overlayEl) return;

    function renderOverlay() {
      const overlay = overlayEl;
      if (!overlay) return;
      const relationEdges = cy.edges('[kind = "relation"]');

      const svgParts: string[] = [];
      for (const edge of relationEdges) {
        const fromCard = edge.data('fromCardinality') as string | null;
        const toCard = edge.data('toCardinality') as string | null;

        // rendered in screen coordinates, already at edge-node boundary
        const sEnd = edge.sourceEndpoint() as { x: number; y: number };
        const tEnd = edge.targetEndpoint() as { x: number; y: number };
        const sx = sEnd.x;
        const sy = sEnd.y;
        const tx = tEnd.x;
        const ty = tEnd.y;

        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) continue;

        const nx = dx / length;
        const ny = dy / length;
        const angle = Math.atan2(ny, nx) * (180 / Math.PI);

        const fromGlyph = fromCard ? glyphFor(fromCard as Cardinality) : '';
        const toGlyph = toCard ? glyphFor(toCard as Cardinality) : '';

        if (fromGlyph) {
          const fromAngle = angle + 180;
          svgParts.push(`<g transform="translate(${sx},${sy}) rotate(${fromAngle})">${fromGlyph}</g>`);
        }
        if (toGlyph) {
          svgParts.push(`<g transform="translate(${tx},${ty}) rotate(${angle})">${toGlyph}</g>`);
        }
      }

      overlay.innerHTML = svgParts.length > 0
        ? `<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible">${svgParts.join('')}</svg>`
        : '';
    }

    function scheduleRender() {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        renderOverlay();
      });
    }

    cy.on('render zoom pan', scheduleRender);
    renderOverlay();

    return () => {
      cy.off('render zoom pan', scheduleRender);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cyReady]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className="w-full h-full bg-white"
        style={{ minHeight: '400px' }}
      />
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}