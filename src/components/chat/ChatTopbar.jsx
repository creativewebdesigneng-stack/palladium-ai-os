import { Check, ChevronDown, Cpu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ChatTopbar({ title, provider, model, onRename, onToggleLeft }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => setValue(title), [title]);

  const saveTitle = () => {
    const next = value.trim() || 'New chat';
    onRename(next);
    setValue(next);
    setEditing(false);
  };

  return (
    <div className="relative flex items-center gap-2 border-b border-white/10 bg-white/[.02] px-3 py-2.5 sm:px-4">
      <button onClick={onToggleLeft} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 lg:hidden" aria-label="Toggle sidebar">
        <ChevronDown className="h-4 w-4 -rotate-90" />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex max-w-md items-center gap-1">
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value.slice(0, 80))}
              onBlur={saveTitle}
              onKeyDown={(event) => { if (event.key === 'Enter') saveTitle(); if (event.key === 'Escape') { setValue(title); setEditing(false); } }}
              className="w-full rounded-md border border-violet-500/40 bg-black/30 px-2 py-1 text-sm text-white outline-none"
            />
            <button onMouseDown={(event) => event.preventDefault()} onClick={saveTitle} className="rounded p-1 text-emerald-400 hover:bg-white/5" aria-label="Save title"><Check className="h-4 w-4" /></button>
            <button onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(title); setEditing(false); }} className="rounded p-1 text-zinc-500 hover:bg-white/5" aria-label="Cancel rename"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="truncate text-sm font-medium text-white hover:text-violet-300" title="Rename this session conversation">{title}</button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-300" title="Model is selected by the server-side assistant configuration">
        <Cpu className="h-3.5 w-3.5 text-violet-300" />
        <span className="hidden sm:inline">{provider && model ? `${provider} · ${model}` : 'Server-managed model'}</span>
        <span className="sm:hidden">AI</span>
      </div>
    </div>
  );
}
