import { Search, Filter, LayoutGrid, List, Columns3, GanttChart } from 'lucide-react';

const FILTERS = ['Status', 'Department', 'Framework', 'Language', 'Owner', 'Priority', 'Tags', 'AI Model', 'Deployment'];
const VIEWS = [
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'kanban', label: 'Kanban', icon: Columns3 },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
];

export default function ProjectsToolbar({ view, setView, query, setQuery }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, files, tasks, agents, comments, tags…"
            className="input pl-9"
          />
        </div>
        <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
          <Filter className="h-3.5 w-3.5" /> Filters
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <span key={f} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200">{f}</span>
          ))}
        </div>
        <div className="flex items-center rounded-lg border border-white/10 bg-white/[.03] p-0.5">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${view === v.key ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <v.icon className="h-3.5 w-3.5" />{v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}