import { MODELS } from './chatData';
import { Check, Zap, Brain, Gauge } from 'lucide-react';

function Bars({ value, color = 'bg-violet-400' }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`h-2.5 w-1 rounded-full ${i <= value ? color : 'bg-white/10'}`} />
      ))}
    </span>
  );
}

export default function ModelSelector({ model, onSelect, onClose }) {
  return (
    <div className="w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#0c0d13] p-2 shadow-2xl">
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-xs font-medium text-zinc-300">Select a model</p>
        <button onClick={onClose} className="text-[11px] text-zinc-500 hover:text-white">Close</button>
      </div>
      <div className="max-h-[60vh] space-y-1.5 overflow-y-auto p-1">
        {MODELS.map(m => {
          const active = m.id === model;
          return (
            <button key={m.id} onClick={() => { onSelect(m.id); onClose?.(); }}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/5 bg-white/[.02] hover:bg-white/5'}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.grad} text-sm font-semibold text-white shadow`}>{m.letter}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  {active && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{m.desc}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />Speed <Bars value={m.speed} color="bg-cyan-400" /></span>
                  <span className="flex items-center gap-1"><Brain className="h-3 w-3" />Reason <Bars value={m.reasoning} /></span>
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{m.context}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}