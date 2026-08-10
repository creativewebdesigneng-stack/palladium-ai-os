import { useState } from 'react';
import { GitBranch, Plus, GitMerge, Trash2, GitCompareArrows, Lock } from 'lucide-react';
import { BRANCH_GROUPS } from './gitData';

export default function BranchesPanel({ onToast }) {
  const [groups, setGroups] = useState(BRANCH_GROUPS);
  const [comparing, setComparing] = useState(null);
  const [creating, setCreating] = useState(false);

  const removeBranch = (gid, name) => { setGroups((g) => g.map((grp) => grp.id === gid ? { ...grp, branches: grp.branches.filter((b) => b.name !== name) } : grp)); onToast?.(`Branch ${name} deleted`); };
  const merge = (name) => onToast?.(`Merging ${name} → main`); 
  const compare = (name) => { setComparing(name); onToast?.(`Comparing ${name} with main`); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Branches</h2>
        <button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create branch</button>
      </div>

      {creating && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
          <input placeholder="branch-name" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none" />
          <select className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none">
            {['main', 'develop', 'feature', 'bugfix'].map((b) => <option key={b} className="bg-[#10121a]">from {b}</option>)}
          </select>
          <button onClick={() => { setCreating(false); onToast?.('Branch created'); }} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white">Create</button>
          <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Cancel</button>
        </div>
      )}

      {comparing && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-zinc-200">
          <span className="flex items-center gap-1.5 font-medium"><GitCompareArrows className="h-4 w-4 text-sky-400" />Comparing <code className="rounded bg-black/40 px-1.5 py-px font-mono">{comparing}</code> with <code className="rounded bg-black/40 px-1.5 py-px font-mono">main</code></span>
          <p className="mt-1 text-zinc-500">12 commits ahead · 3 commits behind · 8 files changed</p>
          <button onClick={() => setComparing(null)} className="mt-1 text-sky-400">Dismiss</button>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{g.label}</span>
              <span className="rounded-full bg-white/5 px-2 py-px text-[10px] text-zinc-400">{g.branches.length}</span>
            </div>
            <div className="space-y-2">
              {g.branches.map((b) => (
                <div key={b.name} className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{b.name}</span>
                    {b.protected && <span className="flex items-center gap-1 rounded bg-amber-400/15 px-1.5 py-px text-[9px] font-medium text-amber-300"><Lock className="h-2.5 w-2.5" />protected</span>}
                    <span className="ml-auto font-mono text-[10px] text-zinc-500">{b.lastCommit}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-500">
                    <span className="text-emerald-400">↑ {b.ahead}</span><span className="text-rose-400">↓ {b.behind}</span>
                    <span>by {b.author}</span><span>{b.time}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => merge(b.name)} disabled={b.protected && b.name === 'main'} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"><GitMerge className="h-3 w-3" />Merge</button>
                    <button onClick={() => compare(b.name)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><GitCompareArrows className="h-3 w-3" />Compare</button>
                    <button onClick={() => removeBranch(g.id, b.name)} disabled={b.protected} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"><Trash2 className="h-3 w-3" />Delete</button>
                  </div>
                </div>
              ))}
              {!g.branches.length && <p className="px-1 text-[11px] text-zinc-600">No branches in this group.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}