import { GitBranch, GitCommitHorizontal } from 'lucide-react';
import { GIT_STATUS, GIT_STYLE } from './codeExplorerData';

export default function GitStatus({ files }) {
  const entries = Object.entries(GIT_STATUS);
  const counts = entries.reduce((a, [_, s]) => { a[s] = (a[s] || 0) + 1; return a; }, {});
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([s, n]) => (
          <span key={s} className={`rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-mono ${GIT_STYLE[s]}`}>{s} · {n}</span>
        ))}
      </div>
      <div className="space-y-1">
        {entries.map(([path, st]) => (
          <div key={path} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/5">
            <span className={`w-4 text-center font-mono font-bold ${GIT_STYLE[st]}`}>{st}</span>
            <span className="truncate text-zinc-300">{path}</span>
          </div>
        ))}
        {!entries.length && <p className="px-2 text-[11px] text-zinc-600">Working tree clean</p>}
      </div>
    </div>
  );
}