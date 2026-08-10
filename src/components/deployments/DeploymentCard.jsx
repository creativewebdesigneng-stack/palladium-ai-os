import { useState } from 'react';
import { GitCommit, Clock, User, RotateCcw, RefreshCw, X, Rocket } from 'lucide-react';
import { STATUS_STYLE, STATUS_DOT, ENV_COLOR, DEPLOYMENT_ACTIONS } from './deploymentsData';

const ACTION_ICON = { Deploy: Rocket, Rollback: RotateCcw, Redeploy: RefreshCw, Cancel: X };

export default function DeploymentCard({ d, onAction }) {
  const [busy, setBusy] = useState(null);
  const act = (a) => { setBusy(a); setTimeout(() => setBusy(null), 1200); onAction(a, d); };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 rounded-full border px-2 py-px text-[10px] font-medium ${STATUS_STYLE[d.status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[d.status]} ${d.status === 'Building' || d.status === 'Deploying' ? 'animate-pulse' : ''}`} />{d.status}
        </span>
        <span className={`rounded-full border px-2 py-px text-[10px] font-medium ${ENV_COLOR[d.env]}`}>{d.env}</span>
        <span className="ml-auto font-mono text-[11px] text-zinc-400">{d.id}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{d.version}</span>
        <span className="text-[11px] text-zinc-400">·</span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400"><GitCommit className="h-3 w-3" />{d.commit}</span>
      </div>
      <p className="mt-1 truncate text-[12px] text-zinc-300">{d.msg}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div className="flex items-center gap-1 text-zinc-500"><Clock className="h-3 w-3" />{d.time}</div>
        <div className="text-zinc-500">{d.duration}</div>
        <div className="flex items-center gap-1 text-zinc-500"><User className="h-3 w-3" />{d.author}</div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {DEPLOYMENT_ACTIONS.map((a) => { const I = ACTION_ICON[a]; const disabled = busy || (a === 'Cancel' && (d.status === 'Live' || d.status === 'Cancelled' || d.status === 'Failed')); return (
          <button key={a} disabled={disabled} onClick={() => act(a)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${disabled ? 'cursor-not-allowed border-white/5 text-zinc-700' : a === 'Cancel' ? 'border-rose-400/20 text-rose-300 hover:bg-rose-500/15' : a === 'Deploy' ? 'border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}>
            {busy === a ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> : <I className="h-3 w-3" />}{a}
          </button>
        ); })}
      </div>
    </div>
  );
}