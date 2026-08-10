import { useState } from 'react';
import { Sparkles, ScanEye, MessageSquareText, Bug, GitCommitHorizontal, Loader2, TriangleAlert, Lightbulb, Info } from 'lucide-react';
import { AI_ACTIONS, AI_OUTPUT } from './gitData';

const ICONS = { ScanEye, MessageSquareText, Bug, GitCommitHorizontal };

const SEV_STYLE = {
  high: 'text-rose-400 bg-rose-400/10', warning: 'text-amber-400 bg-amber-400/10',
  medium: 'text-amber-400 bg-amber-400/10', info: 'text-sky-400 bg-sky-400/10',
  suggestion: 'text-violet-400 bg-violet-400/10',
};
const SEV_ICON = { high: TriangleAlert, warning: TriangleAlert, medium: TriangleAlert, info: Info, suggestion: Lightbulb };

export default function AIFeaturesPanel() {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = (id) => {
    setActive(id); setLoading(true); setResult(null);
    setTimeout(() => { setResult(AI_OUTPUT[id]); setLoading(false); }, 900);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">AI Features</h2></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {AI_ACTIONS.map((a) => { const I = ICONS[a.icon]; const isActive = active === a.id; return (
          <button key={a.id} onClick={() => run(a.id)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${isActive ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[.03] hover:border-white/20'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><I className="h-4 w-4 text-white" /></span>
            <div>
              <p className="text-sm font-medium text-white">{a.label}</p>
              <p className="text-[11px] text-zinc-500">{a.desc}</p>
            </div>
          </button>
        ); })}
      </div>

      {active && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">{AI_ACTIONS.find((a) => a.id === active).label}</span>
            {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-violet-400" />}
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          ) : active === 'explain' || active === 'commit' ? (
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-zinc-200">{result}</pre>
          ) : (
            <div className="space-y-2">
              {result.map((r, i) => { const S = SEV_ICON[r.severity]; return (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[.02] p-3">
                  <S className={`mt-0.5 h-4 w-4 shrink-0 ${SEV_STYLE[r.severity].split(' ')[0]}`} />
                  <div>
                    <p className="text-[12px] text-zinc-200">{r.msg}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">{r.file}:{r.line}</p>
                  </div>
                  <span className={`ml-auto rounded px-1.5 py-px text-[9px] font-medium uppercase ${SEV_STYLE[r.severity]}`}>{r.severity}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}