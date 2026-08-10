import { Telescope, Send, Gauge, PenLine, Captions, Sparkles, Loader2 } from 'lucide-react';
import { AI_FEATURES } from './crmData';

const ICONS = { Telescope, Send, Gauge, PenLine, Captions };

export default function AIFeaturesPanel({ onRun, running }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">AI Features</h3></div>
      <div className="space-y-2">
        {AI_FEATURES.map((f) => { const I = ICONS[f.icon]; return (
          <button key={f.id} onClick={() => onRun(f.id)} disabled={running === f.id} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-violet-400/30 hover:bg-white/5 disabled:opacity-60">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${f.tone}`}>{running === f.id ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <I className="h-4 w-4 text-white" />}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-white">{f.label}</p>
              <p className="truncate text-[11px] text-zinc-500">{f.desc}</p>
            </div>
          </button>
        ); })}
      </div>
    </div>
  );
}