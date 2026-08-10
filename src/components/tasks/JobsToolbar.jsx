import { Search, Plus, Filter } from 'lucide-react';
import { VIEWS, STATUSES } from './jobsData';

export default function JobsToolbar({ view, onView, query, onQuery, status, onStatus, onNew }) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => onView(v.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${view === v.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <v.icon className="h-3.5 w-3.5" />{v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search tasks…" className="w-56 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40" />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <select value={status} onChange={(e) => onStatus(e.target.value)} className="bg-transparent text-xs text-zinc-200 outline-none">
            <option value="All" className="bg-[#101119]">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s} className="bg-[#101119]">{s}</option>)}
          </select>
        </div>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-3.5 w-3.5" />New Task</button>
      </div>
    </div>
  );
}