import { useState } from 'react';
import { GitBranch, GitCommit, GitPullRequest, Plus, Check } from 'lucide-react';
import { GIT } from './devData';

const STATUS_STYLE = { M: 'text-amber-400', A: 'text-emerald-400', D: 'text-rose-400', U: 'text-sky-400' };
const PR_STYLE = { open: 'text-emerald-400 bg-emerald-400/10', merged: 'text-violet-400 bg-violet-400/10', draft: 'text-zinc-400 bg-white/10' };

export default function Git() {
  const [tab, setTab] = useState('branches');
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Source Control</h3><span className="ml-auto rounded bg-violet-500/15 px-1.5 py-px text-[10px] text-violet-300">{GIT.current}</span></div>
      <div className="mb-2 flex gap-1">
        {[['branches', 'Branches'], ['changes', 'Changes'], ['commits', 'Commits'], ['prs', 'PRs']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-2 py-1 text-[10px] ${tab === k ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>{l}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'branches' && <div className="space-y-1.5">
          {GIT.branches.map((b) => (
            <div key={b.name} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${b.active ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/10 bg-black/20'}`}>
              <GitBranch className={`h-3.5 w-3.5 ${b.active ? 'text-violet-300' : 'text-zinc-500'}`} />
              <span className="text-[11px] text-zinc-200">{b.name}</span>
              {b.active && <span className="rounded bg-violet-500/20 px-1.5 py-px text-[9px] text-violet-300">current</span>}
              <span className="ml-auto text-[10px] text-zinc-500">↑{b.ahead} ↓{b.behind}</span>
            </div>
          ))}
        </div>}
        {tab === 'changes' && <div className="space-y-1">
          {GIT.changes.map((c) => (
            <div key={c.file} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/5">
              <span className={`w-4 text-center font-mono font-bold ${STATUS_STYLE[c.status]}`}>{c.status}</span>
              <span className="truncate text-zinc-300">{c.file}</span>
            </div>
          ))}
          <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-[11px] font-medium text-white"><Check className="h-3.5 w-3.5" />Commit all</button>
        </div>}
        {tab === 'commits' && <div className="space-y-1.5">
          {GIT.commits.map((c) => (
            <div key={c.hash} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <GitCommit className="mt-0.5 h-3.5 w-3.5 text-zinc-500" />
              <div className="min-w-0">
                <p className="truncate text-[11px] text-zinc-200">{c.msg}</p>
                <p className="font-mono text-[10px] text-zinc-500">{c.hash} · {c.author} · {c.time}</p>
              </div>
            </div>
          ))}
        </div>}
        {tab === 'prs' && <div className="space-y-1.5">
          {GIT.prs.map((p) => (
            <div key={p.n} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-200">#{p.n} {p.title}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded px-1.5 py-px text-[9px] capitalize ${PR_STYLE[p.state]}`}>{p.state}</span>
                <span className="text-[10px] text-zinc-500">by {p.author}</span>
              </div>
            </div>
          ))}
          <button className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11px] text-zinc-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" />New pull request</button>
        </div>}
      </div>
    </div>
  );
}