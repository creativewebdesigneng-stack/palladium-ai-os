import { Calendar, User, Users, Bot, FolderKanban, Cpu, ChevronDown, Download } from 'lucide-react';
import { FILTERS } from './analyticsData';

function Select({ icon: I, label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <I className="h-3.5 w-3.5 text-zinc-500" />
      <span className="hidden text-[10px] uppercase tracking-wide text-zinc-600 sm:inline">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none rounded-lg bg-transparent py-0.5 pl-2 pr-6 text-xs text-zinc-200 outline-none">
          {options.map((o) => <option key={o} value={o} className="bg-[#10121a]">{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}

export default function AnalyticsFilters({ filters, setFilters, onExport }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select icon={Calendar} label="Date" options={FILTERS.dates} value={filters.date} onChange={(v) => set('date', v)} />
      <Select icon={User} label="User" options={FILTERS.users} value={filters.user} onChange={(v) => set('user', v)} />
      <Select icon={Users} label="Team" options={FILTERS.teams} value={filters.team} onChange={(v) => set('team', v)} />
      <Select icon={Bot} label="Agent" options={FILTERS.agents} value={filters.agent} onChange={(v) => set('agent', v)} />
      <Select icon={FolderKanban} label="Project" options={FILTERS.projects} value={filters.project} onChange={(v) => set('project', v)} />
      <Select icon={Cpu} label="Model" options={FILTERS.models} value={filters.model} onChange={(v) => set('model', v)} />
      <button onClick={onExport} className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"><Download className="h-3.5 w-3.5" />Export CSV</button>
    </div>
  );
}