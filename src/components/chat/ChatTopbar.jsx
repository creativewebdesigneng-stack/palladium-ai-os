import { MODELS, MODES } from './chatData';
import { ChevronDown, Share2, Download, Bell, Settings, Check, X, Globe } from 'lucide-react';
import { useState } from 'react';
import ModelSelector from './ModelSelector';

export default function ChatTopbar({ title, model, onModel, onRename, onToggleLeft, onToggleRight }) {
  const [modelOpen, setModelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const active = MODELS.find(m => m.id === model);

  return (
    <div className="relative flex items-center gap-2 border-b border-white/10 bg-white/[.02] px-3 py-2.5 sm:px-4">
      <button onClick={onToggleLeft} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 lg:hidden" aria-label="Toggle sidebar">
        <ChevronDown className="h-4 w-4 -rotate-90" />
      </button>

      {/* Workspace selector */}
      <button className="hidden items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/5 sm:flex">
        <span className="grid h-5 w-5 place-items-center rounded bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-semibold text-white">P</span>
        Palladium
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {/* Conversation title */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onRename(val); setEditing(false); }} onKeyDown={e => { if (e.key === 'Enter') { onRename(val); setEditing(false); } }} className="w-full rounded-md border border-violet-500/40 bg-black/30 px-2 py-1 text-sm text-white outline-none" />
            <button onClick={() => { onRename(val); setEditing(false); }} className="rounded p-1 text-emerald-400 hover:bg-white/5"><Check className="h-4 w-4" /></button>
            <button onClick={() => { setVal(title); setEditing(false); }} className="rounded p-1 text-zinc-500 hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button onClick={() => { setVal(title); setEditing(true); }} className="truncate text-sm font-medium text-white hover:text-violet-300" title="Rename">{title}</button>
        )}
      </div>

      {/* Model selector trigger */}
      <div className="relative">
        <button onClick={() => setModelOpen(o => !o)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/5">
          <span className={`grid h-5 w-5 place-items-center rounded bg-gradient-to-br ${active.grad} text-[10px] font-semibold text-white`}>{active.letter}</span>
          <span className="hidden sm:inline">{active.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
        {modelOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2"><ModelSelector model={model} onSelect={onModel} onClose={() => setModelOpen(false)} /></div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 text-zinc-400">
        <button className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Share"><Share2 className="h-4 w-4" /></button>
        <button className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Export"><Download className="h-4 w-4" /></button>
        <button className="relative rounded-lg p-1.5 hover:bg-white/5" aria-label="Notifications"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" /></button>
        <button className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Settings"><Settings className="h-4 w-4" /></button>
        <button onClick={onToggleRight} className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Toggle context panel"><Globe className="h-4 w-4" /></button>
        <span className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-semibold text-white">PA</span>
      </div>
    </div>
  );
}