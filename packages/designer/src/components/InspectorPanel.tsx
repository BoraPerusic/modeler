import type { SymbolDetail } from '@modeler/lsp';

interface InspectorPanelProps {
  selectedSymbol: { qname: string } | null;
  symbolDetails: Record<string, SymbolDetail>;
}

export function InspectorPanel({ selectedSymbol, symbolDetails }: InspectorPanelProps) {
  const detail = selectedSymbol ? symbolDetails[selectedSymbol.qname] : null;

  return (
    <aside className="w-80 bg-white border-l border-slate-300 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Inspector
        </h2>
        {detail ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Kind</label>
              <p className="text-sm font-medium text-gray-800">{detail.kind}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <p className="text-sm font-medium text-gray-800">{detail.label}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">QName</label>
              <p className="text-sm text-gray-600 font-mono">{detail.qname}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Select a node to see its details.</p>
        )}
      </div>
    </aside>
  );
}