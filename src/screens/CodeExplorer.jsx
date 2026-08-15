import { Code2, FileSearch, GitBranch, LockKeyhole, Search, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function CodeExplorer() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Code Explorer"
        description="Repository browsing and source mutation are not connected to a live Git provider in this deployment."
      />

      <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-100">No repository is mounted</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-amber-100/70">
              PalladiumAI does not currently have a GitHub/GitLab repository connection behind Code Explorer. No sample source tree is presented as real, and create, rename, delete, move, replace or AI-refactor actions are disabled until a repository provider is connected.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StateCard icon={FileSearch} title="Files" value="No repository" text="File names and source contents are not simulated." />
        <StateCard icon={Search} title="Search" value="Unavailable" text="Search requires indexed contents from a real connected repository." />
        <StateCard icon={GitBranch} title="Git status" value="Unavailable" text="Branches, diffs and working-tree state require a real Git provider." />
        <StateCard icon={Sparkles} title="AI code actions" value="Disabled" text="AI edits will only operate on authenticated, scoped repository content." />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Required repository controls" icon={GitBranch}>
          <ul className="space-y-2 text-xs leading-5 text-zinc-400">
            <li>• OAuth/App installation with repository-level permissions.</li>
            <li>• Persisted repository connection and workspace ownership records.</li>
            <li>• Server-side branch/ref validation before every read or mutation.</li>
            <li>• Protected-branch and approval rules before commits or pull requests.</li>
            <li>• Audit records for file reads, edits, commits and AI-generated patches.</li>
          </ul>
        </Panel>
        <Panel title="Planned safe workflow" icon={Code2}>
          <p className="text-xs leading-6 text-zinc-400">
            Once a Git provider is connected, Code Explorer can load the real tree and file contents, prepare AI-assisted patches, show an exact diff, and require an explicit commit or pull-request action. Browser-only edits will never be presented as saved repository changes.
          </p>
        </Panel>
      </div>
    </>
  );
}

function StateCard({ icon: Icon, title, value, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">{title}</h2></div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
