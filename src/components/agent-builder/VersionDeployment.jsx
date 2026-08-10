import { History, Rocket, Circle } from 'lucide-react';
import { VERSIONS, DEPLOYMENT_STATES } from './builderData';

export default function VersionDeployment({ deployment, setDeployment }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-violet-400" />Version history</h3>
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <div key={v.v} className="flex gap-3">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${v.status === 'current' ? 'bg-emerald-400 ring-4 ring-emerald-400/10' : 'bg-zinc-600'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-white">{v.v}</p>
                  {v.status === 'current' && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">current</span>}
                </div>
                <p className="text-[11px] text-zinc-400">{v.summary}</p>
                <p className="text-[10px] text-zinc-600">{v.date} · {v.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Rocket className="h-4 w-4 text-violet-400" />Deployment</h3>
        <div className="grid grid-cols-4 gap-2">
          {DEPLOYMENT_STATES.map((s, i) => {
            const active = DEPLOYMENT_STATES.indexOf(deployment) >= i;
            const isCurrent = deployment === s;
            return (
              <button key={s} onClick={() => setDeployment(s)} className="flex flex-col items-center gap-1.5">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${isCurrent ? 'bg-violet-500 text-white' : active ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-zinc-500'}`}>
                  <Circle className={`h-3 w-3 ${isCurrent ? 'fill-white text-white' : 'fill-current'}`} />
                </span>
                <span className={`text-[10px] ${isCurrent ? 'font-medium text-white' : 'text-zinc-500'}`}>{s}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-zinc-400">
          <p className="font-medium text-white">Status: {deployment}</p>
          <p className="mt-1">{deployment === 'Published' ? 'Live and available in your workforce.' : deployment === 'Testing' ? 'Being evaluated in sandbox.' : deployment === 'Paused' ? 'Temporarily stopped.' : 'Not yet deployed.'}</p>
        </div>
      </div>
    </div>
  );
}