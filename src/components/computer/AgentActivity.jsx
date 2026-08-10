import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { ACTION_FLOW } from './computerData';

export default function AgentActivity() {
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState([{ ...ACTION_FLOW[0], status: 'running' }]);

  useEffect(() => {
    const t = setInterval(() => {
      setLog((l) => {
        const updated = l.map((a, i) => i === 0 ? { ...a, status: 'done' } : a);
        const next = { ...ACTION_FLOW[(idx + 1) % ACTION_FLOW.length], status: 'running' };
        return [next, ...updated].slice(0, 6);
      });
      setIdx((i) => (i + 1) % ACTION_FLOW.length);
    }, 2200);
    return () => clearInterval(t);
  }, [idx]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Agent actions</h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />live</span>
      </div>
      <div className="space-y-1.5">
        {log.map((a, i) => { const I = a.icon; return (
          <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${a.status === 'running' ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/10 bg-black/20'}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-white`}><I className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-white">{a.label}</p>
              <p className="truncate text-[10px] text-zinc-500">{a.detail}</p>
            </div>
            {a.status === 'running' ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" /> : <span className="text-[9px] text-emerald-400">done</span>}
          </div>
        ); })}
      </div>
    </div>
  );
}