import { Search, Filter, X } from 'lucide-react';
import { PLANS, STATUSES } from './orgsData';

export default function OrgFilters({ filters, setFilters, resultCount }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clear = () => setFilters({ q: '', plan: 'all', status: 'all' });
  const activeCount = ['plan','status'].filter(k => filters[k] !== 'all').length + (filters.q ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={filters.q} onChange={e => set('q', e.target.value)} placeholder="Search organisations or owners…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Filter className="h-3.5 w-3.5" />{activeCount} active{activeCount > 0 && <button onClick={clear} className="ml-1 flex items-center text-violet-400 hover:underline">Clear <X className="h-3 w-3" /></button>}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Select label="Plan" value={filters.plan} onChange={v => set('plan', v)} options={['all', ...PLANS]} />
        <Select label="Status" value={filters.status} onChange={v => set('status', v)} options={['all', ...STATUSES]} />
        <Select label="Date" value={filters.date} onChange={v => set('date', v)} options={['all','7d','30d','90d','1y']} labels={{ all:'All time', '7d':'Last 7 days', '30d':'Last 30 days', '90d':'Last 90 days', '1y':'Last year' }} />
      </div>
      <p className="text-[11px] text-zinc-500">{resultCount} organisations</p>
    </div>
  );
}

function Select({ label, value, onChange, options, labels }) {
  const lbl = (o) => (labels && labels[o]) || (o === 'all' ? 'All' : o);
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-[11px] text-zinc-200 capitalize focus:outline-none [&>option]:bg-[#10121a]">
        {options.map(o => <option key={o} value={o}>{lbl(o)}</option>)}
      </select>
    </label>
  );
}