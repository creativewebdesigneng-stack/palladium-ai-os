import { Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { AI_ANSWER } from './webData';

export default function AIAnswer({ loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.08] to-transparent p-5">
        <div className="flex items-center gap-2 text-sm text-zinc-400"><Sparkles className="h-4 w-4 animate-pulse text-violet-400" />Generating AI answer…</div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-full animate-pulse rounded bg-white/5" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.08] to-transparent p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Sparkles className="h-4 w-4 text-white" /></span>
        <p className="text-sm font-semibold text-white">AI Answer</p>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500"><Clock className="h-3 w-3" />{AI_ANSWER.confidence}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-zinc-200">{AI_ANSWER.summary}</p>
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Key takeaways</p>
        <div className="space-y-1.5">
          {AI_ANSWER.keyPoints.map(p => (
            <p key={p} className="flex items-start gap-2 text-[12px] text-zinc-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}