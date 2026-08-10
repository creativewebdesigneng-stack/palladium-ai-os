import { useState } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { PROMPT_CATEGORIES } from './chatData';

export default function PromptLibrary({ open, onClose, onUse }) {
  const [cat, setCat] = useState(PROMPT_CATEGORIES[0].id);
  const [q, setQ] = useState('');
  if (!open) return null;
  const active = PROMPT_CATEGORIES.find(c => c.id === cat);
  const prompts = active.prompts.filter(p => p.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-medium text-white">Prompt Library</h2></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search prompts…" className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROMPT_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${cat === c.id ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>{c.label}</button>
          ))}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {prompts.map(p => (
            <button key={p} onClick={() => { onUse?.(p); onClose(); }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-3 text-left hover:bg-white/5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-semibold text-white">{p[0]}</span>
              <span className="text-sm text-zinc-200">{p}</span>
            </button>
          ))}
          {!prompts.length && <p className="py-10 text-center text-sm text-zinc-600">No prompts match “{q}”.</p>}
        </div>
      </div>
    </div>
  );
}