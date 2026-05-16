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
              shape: 'round-rectangle',
              'background-color': '#ffffff',
              'background-opacity': 1,
              'border-width': 1,
              'border-color': '#64748b',
              width: 220,
              height: 'data(h)',
              // The HTML overlay (cytoscape-node-html-label) provides the visible content.
              // We zero out cytoscape's own label so it doesn't render twice.
              'text-opacity': 0,
            },
          },
          {
            selector: 'node[kind = "table"]',
            style: { 'border-color': '#3b82f6' },
          },
          {
            selector: 'node[kind = "view"]',
            style: { 'border-color': '#8b5cf6' },
          },
          {
            selector: 'node[kind = "entity"]',
            style: { 'border-color': '#10b981' },
          },
          {
            selector: 'node:selected',
            style: { 'border-width': 2, 'border-color': '#0ea5e9' },
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
      nodeRepulsion: 8000,
      idealEdgeLength: 280,
      edgeElasticity: 0.45,
      gravity: 0.15,
      padding: 30,
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
      const zoom = cy.zoom();

      const svgParts: string[] = [];
      for (const edge of relationEdges) {
        const fromCard = edge.data('fromCardinality') as string | null;
        const toCard = edge.data('toCardinality') as string | null;

        // Screen-coordinate endpoints (already include pan + zoom). The glyph's
        // internal length is in model-pixels, so the outer transform applies
        // `scale(zoom)` to keep the rendered size proportional to the graph.
        const sEnd = edge.renderedSourceEndpoint() as { x: number; y: number };
        const tEnd = edge.renderedTargetEndpoint() as { x: number; y: number };
        const sx = sEnd.x;
        const sy = sEnd.y;
        const tx = tEnd.x;
        const ty = tEnd.y;

        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) continue;

        // Edge direction (source → target) in degrees.
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const fromGlyph = fromCard ? glyphFor(fromCard as Cardinality) : '';
        const toGlyph = toCard ? glyphFor(toCard as Cardinality) : '';

        if (fromGlyph) {
          // At the source endpoint, outward = toward target, so local +x = edge direction.
          svgParts.push(
            `<g transform="translate(${sx},${sy}) rotate(${angle}) scale(${zoom})">${fromGlyph}</g>`
          );
        }
        if (toGlyph) {
          // At the target endpoint, outward = back toward source, so local +x = -edge direction.
          svgParts.push(
            `<g transform="translate(${tx},${ty}) rotate(${angle + 180}) scale(${zoom})">${toGlyph}</g>`
          );
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