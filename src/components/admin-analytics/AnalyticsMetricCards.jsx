import { Users, DollarSign, Sparkles, Bot, FolderKanban, Plug, GitBranch, AlertTriangle } from 'lucide-react';

const ICONS = { users: Users, dollar: DollarSign, sparkles: Sparkles, bot: Bot, folder: FolderKanban, plug: Plug, git: GitBranch, alert: AlertTriangle };

export default function AnalyticsMetricCards({ metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(m => {
        const Icon = ICONS[m.icon] || Users;
        const up = m.trend === 'up';
        return (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon className="h-4 w-4" /></span>
              <span className={`text-[10px] font-medium ${up ? 'text-emerald-300' : 'text-emerald-300'}`}>{m.change}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{m.value}</p>
            <p className="text-[11px] text-zinc-500">{m.label}</p>
          </div>
        );
      })}
    </div>
  );
}