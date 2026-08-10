import { Shield, Eye, Lock, Key, Ban, Users, TrendingUp, TrendingDown } from 'lucide-react';

const ICONS = { shield: Shield, eye: Eye, lock: Lock, key: Key, ban: Ban, users: Users };
const TONE = {
  rose: 'bg-rose-500/15 text-rose-300',
  amber: 'bg-amber-500/15 text-amber-300',
  violet: 'bg-violet-500/15 text-violet-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
};

export default function SecurityMetricCards({ metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(m => {
        const Icon = ICONS[m.icon] || Shield;
        const down = m.detail.includes('-');
        return (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONE[m.tone]}`}><Icon className="h-4 w-4" /></span>
              {down ? <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-300"><TrendingDown className="h-3 w-3" />{m.detail}</span> : <span className="flex items-center gap-0.5 text-[10px] font-medium text-zinc-400"><TrendingUp className="h-3 w-3" />{m.detail}</span>}
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{m.value}</p>
            <p className="text-[11px] text-zinc-500">{m.label}</p>
          </div>
        );
      })}
    </div>
  );
}