import { GitCommit, FileDiff, Plus, Minus } from 'lucide-react';
import { COMMITS } from './gitData';

const AVATAR_COLOR = { A: 'bg-violet-500/30 text-violet-200', D: 'bg-sky-500/30 text-sky-200', F: 'bg-emerald-500/30 text-emerald-200' };

export default function CommitsPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><GitCommit className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Commits</h2></div>
      <div className="space-y-2">
        {COMMITS.map((c) => (
          <div key={c.sha} className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
            <div className="flex items-center gap-2">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${AVATAR_COLOR[c.avatar]}`}>{c.avatar}</span>
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{c.message}</p>
                <p className="text-[10px] text-zinc-500">{c.author} · {c.date}</p>
              </div>
              <span className="ml-auto rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-zinc-400">{c.sha}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><FileDiff className="h-3 w-3" />{c.files} files changed</span>
              <span className="flex items-center gap-1 text-emerald-400"><Plus className="h-3 w-3" />{c.additions}</span>
              <span className="flex items-center gap-1 text-rose-400"><Minus className="h-3 w-3" />{c.deletions}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}