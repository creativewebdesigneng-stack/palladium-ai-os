import { useState } from 'react';
import { Sparkles, TrendingUp, TriangleAlert, Lightbulb, RefreshCw } from 'lucide-react';
import { AI_INSIGHTS, INSIGHT_TONE } from './biData';

const ICONS = { TrendingUp, TriangleAlert, Lightbulb };

export default function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => { setLoading(true); setTimeout(() => { setLoading(false); setVersion((v) => v + 1); }, 800); };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><Sparkles className="h-4 w-4 text-white" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">AI-Generated Insights</h3>
          <p className="text-[11px] text-zinc-500">Synthesized from your business data</p>
        </div>
        <button onClick={refresh} className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{loading ? 'Analyzing…' : 'Regenerate'}
        </button>
      </div>
      <div className="space-y-2">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)
        ) : (
          AI_INSIGHTS.map((ins) => { const tone = INSIGHT_TONE[ins.tone]; const I = ICONS[tone.icon]; return (
            <div key={ins.id} className={`rounded-xl border p-3 ${tone.cls}`}>
              <div className="flex items-center gap-2">
                <I className="h-4 w-4 shrink-0" />
                <p className="text-[12px] font-medium text-white">{ins.title}</p>
              </div>
              <p className="mt-1 pl-6 text-[11px] text-zinc-400">{ins.detail}</p>
            </div>
          ); })
        )}
      </div>
    </div>
  );
}