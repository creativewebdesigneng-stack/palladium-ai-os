import { Users, Activity, Wallet, CreditCard, Zap, Bot, FolderKanban, AlertTriangle, ShieldCheck, Circle } from 'lucide-react';

const ICONS = { Users, Activity, Wallet, CreditCard, Zap, Bot, FolderKanban, AlertTriangle, ShieldCheck };
const TONES = {
  violet: 'text-violet-300 bg-violet-400/10',
  emerald: 'text-emerald-300 bg-emerald-400/10',
  sky: 'text-sky-300 bg-sky-400/10',
  amber: 'text-amber-300 bg-amber-400/10',
  fuchsia: 'text-fuchsia-300 bg-fuchsia-400/10',
  blue: 'text-blue-300 bg-blue-400/10',
  rose: 'text-rose-300 bg-rose-400/10',
};

export default function AdminMetricCards({ metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map(m => {
        const Icon = ICONS[m.icon] || Circle;
        return (
          <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${TONES[m.tone]}`}><Icon className="h-4 w-4" /></span>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{m.label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{m.value}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{m.detail}</p>
          </div>
        );
      })}
    </div>
  );
}