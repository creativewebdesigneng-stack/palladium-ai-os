import { useState } from 'react';
import { Sparkles, Wand2, BookOpen, FileCode2, ChevronRight } from 'lucide-react';
import { AI_DEBUG, ERRORS } from './browserData';

const ICON = { 'Fix Automatically': Wand2, Explain: BookOpen, 'Open File': FileCode2 };

export default function AIDebugPanel({ onAction }) {
  const [out, setOut] = useState(null);
  const run = (action) => { setOut(action); onAction?.(action); };
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-500/[.06]">
      <div className="flex items-center gap-2 border-b border-violet-400/20 px-3 py-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">AI Debugging</h3>
        <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-px text-[10px] font-medium text-rose-300">{AI_DEBUG.summary}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-[11px] leading-relaxed text-zinc-300">{AI_DEBUG.detail}</p>
        <div className="space-y-1">
          {AI_DEBUG.fixes.map((f) => { const I = ICON[f.action]; return (
            <button key={f.action} onClick={() => run(f.action)} className="group flex w-full items-start gap-2 rounded-xl border border-white/10 bg-black/30 p-2.5 text-left hover:border-violet-400/30 hover:bg-violet-500/10">
              <I className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white">{f.action}</p>
                <p className="text-[10px] text-zinc-400">{f.desc}</p>
              </div>
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-violet-300" />
            </button>
          ); })}
        </div>
        {out && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold text-emerald-300">{out}</p>
            <p className="mt-0.5 text-[11px] text-zinc-300">
              {out === 'Open File' ? `Opening ${ERRORS[0].file}:${ERRORS[0].line}…` : 'Patch generated — review and apply to your workspace.'}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Related errors</p>
          <div className="space-y-1">
            {ERRORS.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-[10px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span className="truncate text-zinc-300">{e.title}</span>
                <span className="ml-auto font-mono text-zinc-500">{e.file.split('/').pop()}:{e.line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}