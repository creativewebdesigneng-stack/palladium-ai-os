import { Calendar, Building2, Bot, FolderKanban, Users, ChevronDown } from 'lucide-react';
import { FILTERS } from './biData';

function Select({ icon: I, label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <I className="h-3.5 w-3.5 text-zinc-500" />
      <span className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none rounded-lg bg-transparent py-0.5 pl-2 pr-6 text-xs text-zinc-200 outline-none">
          {options.map((o) => <option key={o} value={o} className="bg-[#10121a]">{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}

export default function BIFilters({ filters, setFilters }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select icon={Calendar} label="Date" options={FILTERS.dates} value={filters.date} onChange={(v) => set('date', v)} />
      <Select icon={Building2} label="Dept" options={FILTERS.departments} value={filters.department} onChange={(v) => set('department', v)} />
      <Select icon={Bot} label="Agent" options={FILTERS.agents} value={filters.agent} onChange={(v) => set('agent', v)} />
      <Select icon={FolderKanban} label="Project" options={FILTERS.projects} value={filters.project} onChange={(v) => set('project', v)} />
      <Select icon={Users} label="Team" options={FILTERS.teams} value={filters.team} onChange={(v) => set('team', v)} />
    </div>
  );
}