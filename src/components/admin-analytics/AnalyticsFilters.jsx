import { Globe, CreditCard, Building2, Bot, Cpu } from 'lucide-react';
import { REGIONS, PLANS, ORGS, AGENTS, MODELS } from './analyticsData';

const CONFIG = [
  { key: 'region', label: 'Region', icon: Globe, options: REGIONS },
  { key: 'plan', label: 'Plan', icon: CreditCard, options: PLANS },
  { key: 'org', label: 'Organisation', icon: Building2, options: ORGS },
  { key: 'agent', label: 'Agent', icon: Bot, options: AGENTS },
  { key: 'model', label: 'Model', icon: Cpu, options: MODELS },
];

export default function AnalyticsFilters({ filters, setFilters }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONFIG.map(({ key, label, icon: Icon, options }) => (
        <label key={key} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
          <Icon className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
          <select value={filters[key]} onChange={e => set(key, e.target.value)} className="bg-transparent text-[11px] text-zinc-200 [&>option]:bg-[#10121a]">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}