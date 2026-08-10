import { useState } from 'react';
import { Bolt, Bot, ListChecks, Play, Pause, Pencil, Copy } from 'lucide-react';
import { STATUS_STYLE } from './automationData';

export default function AutomationCard({ auto, onToast }) {
  const [status, setStatus] = useState(auto.status);
  const togglePause = () => { setStatus((s) => s === 'paused' ? 'active' : 'paused'); onToast?.(`${auto.name} ${status === 'paused' ? 'resumed' : 'paused'}`); };
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{auto.name}</span>
        <span className={`ml-auto rounded-full border px-2 py-px text-[10px] font-medium ${STATUS_STYLE[status]}`}>{status}</span>
      </div>

      <div className="mt-3 space-y-2 text-[11px]">
        <div className="flex items-start gap-2">
          <Bolt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div><p className="text-[10px] uppercase tracking-wide text-zinc-500">Trigger</p><p className="text-zinc-300">{auto.trigger}</p></div>
        </div>
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
          <div><p className="text-[10px] uppercase tracking-wide text-zinc-500">Agent</p><p className="text-zinc-300">{auto.agent}</p></div>
        </div>
        <div className="flex items-start gap-2">
          <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Actions</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {auto.actions.map((a, i) => <span key={i} className="rounded-lg border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-zinc-300">{a}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <div><p className="text-[10px] uppercase tracking-wide text-zinc-500">Runs</p><p className="text-sm font-semibold text-white">{auto.runs.toLocaleString()}</p></div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Success rate</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{auto.successRate}%</p>
            <div className="h-1.5 flex-1 rounded-full bg-white/5"><div className={`h-1.5 rounded-full ${auto.successRate >= 90 ? 'bg-emerald-400' : auto.successRate >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${auto.successRate}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        <button onClick={togglePause} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium ${status === 'active' ? 'border-amber-400/20 text-amber-300 hover:bg-amber-500/15' : 'border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/15'}`}>
          {status === 'active' ? <><Pause className="h-3 w-3" />Pause</> : <><Play className="h-3 w-3" />Resume</>}
        </button>
        <button onClick={() => onToast?.(`Editing ${auto.name}`)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Pencil className="h-3 w-3" />Edit</button>
        <button onClick={() => onToast?.(`Duplicated ${auto.name}`)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Copy className="h-3 w-3" />Duplicate</button>
      </div>
    </div>
  );
}