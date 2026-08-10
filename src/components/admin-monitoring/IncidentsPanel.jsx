import { AlertOctagon, TriangleAlert, CheckCircle2, Clock, Activity } from 'lucide-react';
import { HEALTH } from './monitoringData';

const fmt = (iso) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const SEV = {
  operational: { Icon: CheckCircle2, cls: 'text-emerald-300' },
  degraded: { Icon: TriangleAlert, cls: 'text-amber-300' },
  down: { Icon: AlertOctagon, cls: 'text-rose-300' },
};

export default function IncidentsPanel({ incidents }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-violet-400" /><p className="text-[13px] font-semibold text-white">Recent incidents</p></div>
      <div className="space-y-2.5">
        {incidents.map(i => {
          const sev = SEV[i.severity] || SEV.degraded;
          const h = HEALTH[i.severity] || HEALTH.degraded;
          return (
            <div key={i.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start gap-2">
                <sev.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${sev.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-white">{i.title}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${h.tone}`}>{i.status}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{i.service} · {i.id}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">{i.summary}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-600"><Clock className="h-3 w-3" />Started {fmt(i.started)} · Updated {fmt(i.updated)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}