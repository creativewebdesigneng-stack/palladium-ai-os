import { Search, Plus } from 'lucide-react';

export default function KnowledgeToolbar({ query, onQuery, onNew }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Filter knowledge bases…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40 sm:w-80" />
      </div>
      <button onClick={onNew} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-3.5 w-3.5" />New Knowledge Base</button>
    </div>
  );
}