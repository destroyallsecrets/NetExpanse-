import React, { useState, useEffect } from 'react';

interface EditorProps {
  filename: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const Editor: React.FC<EditorProps> = ({ filename, initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-slate-900 w-full max-w-4xl h-3/4 border border-slate-600 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
          <div className="text-slate-200 font-mono">
            <span className="text-emerald-500 mr-2">nano</span>
            {filename}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onSave(content)}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-xs rounded transition-colors"
            >
              ^O WriteOut
            </button>
            <button 
              onClick={onCancel}
              className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 text-xs rounded transition-colors"
            >
              ^X Exit
            </button>
          </div>
        </div>

        {/* Body */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 bg-slate-950 p-4 text-slate-300 font-mono text-sm resize-none outline-none focus:ring-0 leading-relaxed"
          spellCheck="false"
        />

        {/* Footer */}
        <div className="bg-slate-800 px-4 py-1 text-xs text-slate-400 flex justify-between">
            <span>lines: {content.split('\n').length}</span>
            <span>NetExpanse Editor v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
