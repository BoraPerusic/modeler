import { useRef } from 'react';

interface HeaderProps {
  activeSchema: 'db' | 'er';
  displayMode: 'just-names' | 'with-types' | 'with-constraints';
  projectUri: string | null;
  onFileLoad: (content: string, uri: string) => void;
  onSchemaChange: (schema: 'db' | 'er') => void;
  onDisplayModeChange: (mode: 'just-names' | 'with-types' | 'with-constraints') => void;
  onToggleNlPane: () => void;
}

export function Header({ activeSchema, displayMode, projectUri, onFileLoad, onSchemaChange, onDisplayModeChange, onToggleNlPane }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disabled = projectUri === null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    onFileLoad(content, file.name);
  };

  return (
    <header className="bg-white border-b border-slate-300 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">TTR Modeler Designer</h1>
        <span className="text-sm text-gray-500">v0.1.0</span>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Read-only</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border border-slate-300 rounded">
          <button
            disabled={disabled}
            onClick={() => onSchemaChange('db')}
            className={`px-3 py-1 text-sm ${activeSchema === 'db' ? 'text-sky-500 font-medium' : 'text-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            db
          </button>
          <button
            disabled={disabled}
            onClick={() => onSchemaChange('er')}
            className={`px-3 py-1 text-sm ${activeSchema === 'er' ? 'text-sky-500 font-medium' : 'text-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            er
          </button>
        </div>
        <div className="flex items-center gap-1 border border-slate-300 rounded">
          {(['just-names', 'with-types', 'with-constraints'] as const).map((mode) => (
            <button
              key={mode}
              disabled={disabled}
              onClick={() => onDisplayModeChange(mode)}
              className={`px-3 py-1 text-sm ${displayMode === mode ? 'text-sky-500 font-medium' : 'text-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
            >
              {mode.replace('-', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleNlPane}
          className="px-3 py-2 text-sm text-gray-600 border border-slate-300 rounded hover:bg-slate-50"
          title="Toggle natural language pane"
        >
          NL
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".ttr"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
        >
          Load .ttr file
        </button>
      </div>
    </header>
  );
}