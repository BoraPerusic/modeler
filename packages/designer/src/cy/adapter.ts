import type { ModelGraph, ModelGraphNode, ModelGraphRow, DisplayMode } from '@modeler/lsp';

export interface CyElement {
  group: 'nodes' | 'edges';
  data: Record<string, unknown>;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRowHtml(row: ModelGraphRow, displayMode: DisplayMode): string {
  const markers: string[] = [];
  if (row.isNameAttribute) markers.push('\u2605 ');
  if (row.isCodeAttribute) markers.push('# ');
  const name = markers.join('') + `<span class="cy-row-name">${escape(row.name)}</span>`;
  if (displayMode === 'just-names') return name;
  const type = row.type ? `<span class="cy-row-type">${escape(row.type)}</span>` : '';
  if (displayMode === 'with-types') return `${name} ${type}`;
  const constraints: string[] = [];
  if (row.isKey) constraints.push(escape('PK'));
  if (!row.optional) constraints.push(escape('NN'));
  const badge = constraints.length
    ? `<span class="cy-row-badge">${constraints.join('')}</span>`
    : '';
  return `${name} ${type} ${badge}`.trim();
}

function nodeLabelHtml(node: ModelGraphNode, displayMode: DisplayMode): string {
  if (node.rows.length === 0) return '';
  const rows = node.rows
    .map((r) => `<div class="cy-row">${renderRowHtml(r, displayMode)}</div>`)
    .join('');
  return `<div class="cy-node-label">${rows}</div>`;
}

export function modelGraphToCyElements(
  graph: ModelGraph,
  displayMode: DisplayMode
): CyElement[] {
  const elements: CyElement[] = [];

  for (const node of graph.nodes) {
    elements.push({
      group: 'nodes',
      data: {
        qname: node.qname,
        kind: node.kind,
        label: node.label,
        labelHtml: nodeLabelHtml(node, displayMode),
      },
    });
  }

  for (const edge of graph.edges) {
    elements.push({
      group: 'edges',
      data: {
        id: edge.id,
        qname: edge.qname,
        kind: edge.kind,
        source: edge.fromNode,
        target: edge.toNode,
        fromCardinality: edge.fromCardinality,
        toCardinality: edge.toCardinality,
      },
    });
  }

  return elements;
}