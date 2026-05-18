// Phase-3 visual treatment: accent = text-sky-500 (active toggle), border-slate-300 (bar).
// Owned here so §D and §E don't drift — see docs/plan/phase-03/A-designer-scaffold.md A.6.

import React, { useRef } from 'react';
import type { RenderableSchemaCode, DisplayMode } from '@modeler/lsp';
import { loadProjectViaUpload, type ProjectFiles } from '../fs/file-system';

interface HeaderProps {
  activeSchema: RenderableSchemaCode;
  displayMode: DisplayMode;
  projectUri: string | null;
  transportKind: 'node' | 'browser' | null;
  onFileLoad: (files: ProjectFiles) => void;
  onSchemaChange: (schema: RenderableSchemaCode) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onToggleNlPane: () => void;
  onDirPick: () => void;
  onDownloadLayout?: () => void;
}

export function Header({ activeSchema, displayMode, projectUri, transportKind, onFileLoad, onSchemaChange, onDisplayModeChange, onToggleNlPane, onDirPick, onDownloadLayout }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disabled = projectUri === null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files?.length) return;
    const files = await loadProjectViaUpload(input);
    onFileLoad(files);
    input.value = '';
  };

  const webkitDirProps = { webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>;

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
          accept=".ttr,.ttrl,.toml"
          multiple
          className="hidden"
          {...webkitDirProps}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
        >
          Load Project Folder
        </button>
        <button
          onClick={onDirPick}
          className="px-4 py-2 bg-slate-100 text-gray-700 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
          title="Open project folder (requires browser File System Access API support)"
        >
          Open Folder
        </button>
        {transportKind === 'browser' && onDownloadLayout && (
          <button
            onClick={onDownloadLayout}
            className="px-4 py-2 bg-slate-100 text-gray-700 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
            title="Download layout.ttrl (browser mode)"
          >
            Export Layout
          </button>
        )}
      </div>
    </header>
  );
}