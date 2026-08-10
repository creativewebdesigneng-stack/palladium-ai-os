import { GitPullRequest, GitMerge, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PULL_REQUESTS, PR_STATUS_STYLE } from './gitData';

const AVATAR_COLOR = { A: 'bg-violet-500/30 text-violet-200', D: 'bg-sky-500/30 text-sky-200', F: 'bg-emerald-500/30 text-emerald-200' };

export default function PullRequestsPanel({ onToast }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><GitPullRequest className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Pull Requests</h2></div>
      <div className="space-y-2">
        {PULL_REQUESTS.map((pr) => (
          <div key={pr.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-px text-[10px] font-medium ${PR_STATUS_STYLE[pr.status]}`}>{pr.status}</span>
              <span className="text-sm font-medium text-white">{pr.id} {pr.title}</span>
              <span className="ml-auto font-mono text-[10px] text-zinc-500">{pr.branch}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold ${AVATAR_COLOR[pr.avatar]}`}>{pr.avatar}</span>{pr.author}
              </span>
              <span className="flex items-center gap-1">Reviewers:
                <span className="flex -space-x-1.5">{pr.reviewers.map((r) => { const k = r[0]; return <span key={r} className={`grid h-5 w-5 place-items-center rounded-full border border-[#10121a] text-[9px] font-semibold ${AVATAR_COLOR[k] || 'bg-zinc-500/30 text-zinc-200'}`}>{k}</span>; })}</span>
              </span>
              <span>{pr.changes} files changed</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />{pr.checks.passing}
                {pr.checks.failing > 0 && <><XCircle className="h-3 w-3 text-rose-400" />{pr.checks.failing}</>}
                {pr.checks.pending > 0 && <><Clock className="h-3 w-3 text-amber-400" />{pr.checks.pending}</>}
              </span>
            </div>
            <div className="mt-3 flex gap-1.5">
              <button onClick={() => onToast?.(`Merging ${pr.id}`)} disabled={pr.status === 'merged' || pr.status === 'closed' || pr.checks.failing > 0} className="flex items-center gap-1 rounded-lg bg-violet-600/20 px-2 py-1 text-[10px] font-medium text-violet-200 hover:bg-violet-600/30 disabled:opacity-40"><GitMerge className="h-3 w-3" />Merge</button>
              <button onClick={() => onToast?.(`Opened ${pr.id}`)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}