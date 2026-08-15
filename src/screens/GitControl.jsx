import { useNavigate } from 'react-router-dom';
import { GitBranch, KeyRound, ShieldCheck, Webhook } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const REQUIRED = [
  { icon: KeyRound, title: 'Provider authentication', text: 'Connect GitHub, GitLab or another provider with OAuth/App credentials kept server-side.' },
  { icon: GitBranch, title: 'Repository discovery', text: 'Persist the repositories a user or organisation has explicitly connected and their allowed scopes.' },
  { icon: Webhook, title: 'Live repository events', text: 'Ingest signed provider webhooks for commits, pull requests, issues, branches and deployment events.' },
  { icon: ShieldCheck, title: 'Protected write actions', text: 'Require owner-scoped permissions and approval gates before branch, commit, PR or issue mutations.' },
];

export default function GitControl() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Git & Version Control"
        description="A source-control provider is not connected yet. PalladiumAI no longer displays simulated repositories, commits, branches, pull requests or issues."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]">
            <GitBranch className="h-5 w-5 text-violet-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Git provider integration required</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            The previous repository selector and its branches, commits, changes, pull requests, issues, tags and AI-review actions were backed by local fixture data. Those records and buttons have been removed until a real provider connection is available.
          </p>

          <div className="mt-6 space-y-3">
            {REQUIRED.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[.04] text-zinc-300"><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">What works today</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Use PalladiumAI's persisted runtime areas while source control remains unconnected.</p>
          <div className="mt-5 space-y-2.5">
            <button onClick={() => navigate('/workflows')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="block text-sm font-medium text-white">Workflow runtime</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Queue and execute real persisted workflow runs.</span>
            </button>
            <button onClick={() => navigate('/mcp-hub')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="block text-sm font-medium text-white">MCP Hub</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Inspect the OAuth-protected MCP tools that actually ship with PalladiumAI.</span>
            </button>
            <button onClick={() => navigate('/integrations')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
              <span className="block text-sm font-medium text-white">Integrations</span>
              <span className="mt-1 block text-[11px] text-zinc-500">Manage currently supported provider connections.</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
