import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

const STATUS = {
  operational: { label: 'Operational', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', Icon: ShieldCheck },
  degraded: { label: 'Degraded', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/20', Icon: AlertTriangle },
  outage: { label: 'Outage', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/20', Icon: ShieldAlert },
};

export default function SystemHealth({ services }) {
  return (
    <div className="space-y-2">
      {services.map(s => {
        const st = STATUS[s.status];
        return (
          <div key={s.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <st.Icon className={`h-4 w-4 ${st.cls.split(' ')[0]}`} />
              <span className="text-[13px] text-zinc-200">{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">{s.latency}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}