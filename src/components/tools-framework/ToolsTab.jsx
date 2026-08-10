import { useState } from 'react';
import { Search, Loader2, Power } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ToolCard from './ToolCard';
import ToolDetailDrawer from './ToolDetailDrawer';
import { TOOL_CATEGORIES } from './toolsData';

export default function ToolsTab({ tools, loading, isAdmin, onRunTool, onToggleTool }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  const filtered = tools.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (query) { const q = query.toLowerCase(); if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false; }
    return true;
  });
  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <>
      <PageHeader eyebrow="Framework" title="Tools" description="Modular capabilities your agents can call — search, files, data, APIs, databases and code."
        action={
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{tools.length} tools</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{enabledCount} enabled</span>
          </div>
        } />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TOOL_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${category === c.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{c.label}</button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No tools match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => <ToolCard key={t.id} tool={t} onOpen={setOpen} onRun={(tool) => setOpen(tool)} />)}
        </div>
      )}

      <ToolDetailDrawer tool={open} isAdmin={isAdmin} onClose={() => setOpen(null)} onToggle={onToggleTool} onRun={onRunTool} />
    </>
  );
}