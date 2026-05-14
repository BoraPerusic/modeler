interface InspectorPanelProps {
  selectedNode: { qname: string; kind: string; label: string } | null;
}

export function InspectorPanel({ selectedNode }: InspectorPanelProps) {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Inspector
        </h2>
        {selectedNode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Kind</label>
              <p className="text-sm font-medium text-gray-800">{selectedNode.kind}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <p className="text-sm font-medium text-gray-800">{selectedNode.label}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">QName</label>
              <p className="text-sm text-gray-600 font-mono">{selectedNode.qname}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Select a node to see its details.</p>
        )}
      </div>
    </aside>
  );
}