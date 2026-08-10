import { Sparkles, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { AI_INSIGHTS } from './analyticsData';

const TONE = {
  up: { icon: TrendingUp, cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  down: { icon: TrendingDown, cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  warn: { icon: AlertTriangle, cls: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
};

export default function AIInsights() {
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.08] to-transparent p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-300"><Sparkles className="h-4 w-4" /></span>
        <div><p className="text-sm font-semibold text-white">AI-Generated Platform Insights</p><p className="text-[11px] text-zinc-500">Synthesised from platform telemetry</p></div>
      </div>
      <div className="mt-3 space-y-2">
        {AI_INSIGHTS.map((ins, i) => {
          const { icon: Icon, cls } = TONE[ins.tone];
          return (
            <div key={i} className="flex gap-2.5 rounded-xl border border-white/10 bg-black/20 p-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${cls}`}><Icon className="h-3.5 w-3.5" /></span>
              <div><p className="text-[13px] font-medium text-white">{ins.title}</p><p className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">{ins.body}</p></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}