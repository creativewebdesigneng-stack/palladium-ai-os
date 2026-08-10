import { useState } from 'react';
import { FilePen, Plus, Minus, GitCommitHorizontal, RotateCcw } from 'lucide-react';
import { CHANGES, CHANGE_STATUS_STYLE } from './gitData';

export default function ChangesPanel({ onToast }) {
  const [staged, setStaged] = useState(new Set());
  const toggle = (f) => setStaged((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });
  const totalAdd = CHANGES.reduce((a, c) => a + c.additions, 0);
  const totalDel = CHANGES.reduce((a, c) => a + c.deletions, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><FilePen className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Changes</h2>
        <span className="ml-auto text-[11px] text-zinc-500">{CHANGES.length} files · <span className="text-emerald-400">+{totalAdd}</span> <span className="text-rose-400">-{totalDel}</span></span>
      </div>
      <div className="space-y-2">
        {CHANGES.map((c) => {
          const isStaged = staged.has(c.file);
          return (
            <div key={c.file} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2">
              <button onClick={() => toggle(c.file)} className={`grid h-5 w-5 place-items-center rounded border ${isStaged ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300' : 'border-white/10 text-zinc-600 hover:text-white'}`}>
                {isStaged ? <Plus className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
              </button>
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">{c.file}</code>
              <span className={`rounded px-1.5 py-px text-[9px] font-medium uppercase ${CHANGE_STATUS_STYLE[c.status]}`}>{c.status}</span>
              <span className="hidden text-[10px] text-emerald-400 sm:inline">+{c.additions}</span>
              <span className="hidden text-[10px] text-rose-400 sm:inline">-{c.deletions}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onToast?.(`Committed ${staged.size} staged files`)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><GitCommitHorizontal className="h-3.5 w-3.5" />Commit {staged.size} staged</button>
        <button onClick={() => { setStaged(new Set()); onToast?.('Changes discarded'); }} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" />Discard</button>
      </div>
    </div>
  );
}