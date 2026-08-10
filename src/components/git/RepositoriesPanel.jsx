import { GitBranch, GitFork, Star, GitPullRequest, CircleDot, Clock } from 'lucide-react';
import { REPOSITORIES } from './gitData';

export default function RepositoriesPanel({ active, setActive }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Repositories</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPOSITORIES.map((r) => (
          <button key={r.id} onClick={() => setActive(r.id)} className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition ${active === r.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[.03] hover:border-white/20'}`}>
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold text-white">{r.name}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500"><Star className="h-3 w-3" />{r.stars}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{r.branches} branches</span>
              <span className="flex items-center gap-1"><GitPullRequest className="h-3 w-3" />{r.openPRs} PRs</span>
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3" />{r.openIssues} issues</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500"><Clock className="h-3 w-3" />Updated {r.updated}</div>
          </button>
        ))}
      </div>
    </div>
  );
}