import { Search, User, Building2, Activity, Database, Calendar, CheckCircle2 } from 'lucide-react';
import { FILTER_OPTIONS } from './auditData';

const CFG = [
  { key: 'user', label: 'User', icon: User, options: FILTER_OPTIONS.user },
  { key: 'org', label: 'Org', icon: Building2, options: FILTER_OPTIONS.org },
  { key: 'action', label: 'Action', icon: Activity, options: FILTER_OPTIONS.action },
  { key: 'resource', label: 'Resource', icon: Database, options: FILTER_OPTIONS.resource },
  { key: 'result', label: 'Result', icon: CheckCircle2, options: FILTER_OPTIONS.result },
];

export default function AuditToolbar({ query, setQuery, filters, setFilters, onExport, count }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative max-w-xs flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search user, action, resource, IP…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CFG.map(({ key, label, icon: Icon, options }) => (
          <label key={key} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
            <Icon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
            <select value={filters[key]} onChange={e => set(key, e.target.value)} className="bg-transparent text-[11px] text-zinc-200 [&>option]:bg-[#10121a]">
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Date</span>
          <input type="date" value={filters.date} onChange={e => set('date', e.target.value)} className="bg-transparent text-[11px] text-zinc-200 [color-scheme:dark]" />
        </label>
        <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 ring-1 ring-violet-400/20 hover:bg-violet-500/30">Export</button>
      </div>
    </div>
  );
}