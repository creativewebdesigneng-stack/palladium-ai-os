import { Sparkles } from 'lucide-react';
import { ACTIVITY_STEPS } from './aiBuilderData';

export default function AIActivity({ active, busy }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white"><Sparkles className="h-4 w-4" /></span>
      <div className="flex shrink-0 items-center gap-2">
        {ACTIVITY_STEPS.map((s, i) => { const I = s.icon; const done = busy && i < active; const run = busy && i === active; return (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${run ? 'border-violet-400/40 bg-violet-500/15' : done ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}>
              <I className={`h-3.5 w-3.5 ${run ? 'text-violet-300' : done ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={`text-[11px] font-medium ${run ? 'text-white' : done ? 'text-emerald-300' : 'text-zinc-500'}`}>{s.label}</span>
              {run && <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />}
            </div>
            {i < ACTIVITY_STEPS.length - 1 && <span className="text-zinc-700">›</span>}
          </div>
        ); })}
      </div>
    </div>
  );
}