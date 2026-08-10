import { Search } from 'lucide-react';
import { DEPARTMENTS, AGENTS, STATUSES, PRIORITIES, PROJECTS, MODELS, CATEGORIES, TAGS } from './tasksData';

const FILTER_GROUPS = [
  { key: 'department', label: 'Department', options: DEPARTMENTS },
  { key: 'agent', label: 'Agent', options: AGENTS },
  { key: 'status', label: 'Status', options: STATUSES },
  { key: 'priority', label: 'Priority', options: PRIORITIES },
  { key: 'project', label: 'Project', options: PROJECTS },
  { key: 'model', label: 'Model', options: MODELS },
  { key: 'category', label: 'Category', options: CATEGORIES },
  { key: 'tag', label: 'Tag', options: TAGS },
];

export default function TaskToolbar({ query, onQuery, filters, onFilter, view, onView, onClearFilters }) {
  const active = Object.values(filters).flat().filter(Boolean).length;
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 lg:w-80">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search tasks, projects, agents…"
          className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        {query && <button onClick={() => onQuery('')} className="text-zinc-600 hover:text-white">✕</button>}
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_GROUPS.map(g => (
          <select
            key={g.key}
            value={filters[g.key] || ''}
            onChange={e => onFilter(g.key, e.target.value || null)}
            className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs text-zinc-300 outline-none hover:bg-white/[.07]"
          >
            <option value="">{g.label}</option>
            {g.options.map(o => <option key={o} value={o} className="bg-[#14151d]">{o}</option>)}
          </select>
        ))}
        {active > 0 && (
          <button onClick={onClearFilters} className="shrink-0 rounded-xl border border-white/10 px-3 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">
            Clear ({active})
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.04] p-1">
        {[
          { k: 'list', label: 'List' },
          { k: 'board', label: 'Board' },
          { k: 'calendar', label: 'Calendar' },
          { k: 'timeline', label: 'Timeline' },
        ].map(v => (
          <button
            key={v.k}
            onClick={() => onView(v.k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === v.k ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}