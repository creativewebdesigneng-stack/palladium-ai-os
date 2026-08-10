import { useState } from 'react';
import { GitFork, GitBranch, GitCommit, FilePen, GitPullRequest, CircleDot, Tag, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import RepositoriesPanel from '@/components/git/RepositoriesPanel';
import BranchesPanel from '@/components/git/BranchesPanel';
import CommitsPanel from '@/components/git/CommitsPanel';
import ChangesPanel from '@/components/git/ChangesPanel';
import PullRequestsPanel from '@/components/git/PullRequestsPanel';
import IssuesPanel from '@/components/git/IssuesPanel';
import TagsPanel from '@/components/git/TagsPanel';
import AIFeaturesPanel from '@/components/git/AIFeaturesPanel';

const NAV = [
  { id: 'repos', label: 'Repositories', icon: GitFork },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'commits', label: 'Commits', icon: GitCommit },
  { id: 'changes', label: 'Changes', icon: FilePen },
  { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'ai', label: 'AI Features', icon: Sparkles },
];

export default function GitControl() {
  const [active, setActive] = useState('repos');
  const [repo, setRepo] = useState('palladium-app');
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Git & Version Control" description="Manage repositories, branches, pull requests, issues, and tags with AI-assisted review." />
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/[.03] p-2">
            <div className="mb-2 border-b border-white/10 px-2 pb-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Active repo</p>
              <p className="truncate font-mono text-[11px] text-white">{repo}</p>
            </div>
            <nav className="space-y-0.5">
              {NAV.map((n) => { const I = n.icon; return (
                <button key={n.id} onClick={() => setActive(n.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-medium ${active === n.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                  <I className="h-4 w-4 shrink-0" />{n.label}
                </button>
              ); })}
            </nav>
          </div>
        </aside>
        <div>
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1 lg:hidden">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setActive(n.id)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${active === n.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400'}`}>{n.label}</button>
            ))}
          </div>
          {active === 'repos' && <RepositoriesPanel active={repo} setActive={setRepo} />}
          {active === 'branches' && <BranchesPanel onToast={flash} />}
          {active === 'commits' && <CommitsPanel />}
          {active === 'changes' && <ChangesPanel onToast={flash} />}
          {active === 'prs' && <PullRequestsPanel onToast={flash} />}
          {active === 'issues' && <IssuesPanel />}
          {active === 'tags' && <TagsPanel onToast={flash} />}
          {active === 'ai' && <AIFeaturesPanel />}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}