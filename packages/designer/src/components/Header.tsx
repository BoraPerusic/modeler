import { useRef } from 'react';

interface HeaderProps {
  onFileLoad: (content: string, uri: string) => void;
}

export function Header({ onFileLoad }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    onFileLoad(content, file.name);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">TTR Modeler Designer</h1>
        <span className="text-sm text-gray-500">v0.1.0</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".ttr"
          className="hidden"
        />
        <button
          onClick={handleLoadClick}
          className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
        >
          Load .ttr file
        </button>
      </div>
    </header>
  );
}