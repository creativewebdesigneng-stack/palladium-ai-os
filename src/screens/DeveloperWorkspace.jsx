import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from 'react-router-dom';
import { Bot, Code2, KeyRound, Loader2, Server, ShieldCheck, TerminalSquare } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import RemoteDeveloperSessionsPanel from '@/components/developer/RemoteDeveloperSessionsPanel';
import { getAutomationProviderStatus } from '@/lib/integrations/automation-providers.functions';

const AREAS = [
  { icon: KeyRound, title: 'Developer Portal', text: 'Create and manage real API keys, webhooks, usage and platform access.', to: '/developer-portal' },
  { icon: Code2, title: 'Code Explorer', text: 'Repository access and source-control activity remain governed by PalladiumAI Git controls.', to: '/code-explorer' },
  { icon: TerminalSquare, title: 'Terminal', text: 'Command execution remains isolated, permissioned and audited by PalladiumAI.', to: '/terminal' },
  { icon: Server, title: 'Deployments', text: 'Manage connected Coolify deployment targets and lifecycle actions.', to: '/deployments' },
];

export default function DeveloperWorkspace() {
  const navigate = useNavigate();
  const providerFn = useServerFn(getAutomationProviderStatus);
  const providers = useQuery({ queryKey: ['automation-provider-status'], queryFn: () => providerFn({ data: undefined }), retry: false });
  const openHands = providers.data?.openHands;

  return <>
    <PageHeader eyebrow="Workspace" title="Developer Workspace" description="PalladiumAI's authoritative developer surfaces, with optional external coding-agent and remote-session providers behind existing Git, approval, audit, terminal and deployment controls." />
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><ShieldCheck className="h-5 w-5 text-violet-300" /></div>
        <h2 className="text-xl font-semibold text-white">No duplicate developer runtime</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">External developer-session and coding-agent providers are connection surfaces, not second IDE, account, Git, terminal or deployment stacks. PalladiumAI remains responsible for approvals, audit, source control, terminal boundaries and deployment actions.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{AREAS.map(({ icon: Icon, title, text, to }) => <button key={title} onClick={() => navigate(to)} className="rounded-xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/[.04]"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></button>)}</div>
      </section>

      <RemoteDeveloperSessionsPanel />

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex flex-wrap items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><Bot className="h-5 w-5 text-violet-300" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-white">OpenHands coding-agent provider</h2>{providers.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : <span className={`rounded-full border px-2 py-0.5 text-[10px] ${openHands?.configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{openHands?.configured ? 'Configured' : 'Needs env'}</span>}</div><p className="mt-2 text-xs leading-5 text-zinc-500">{openHands?.detail ?? 'Configure OPENHANDS_SERVER_URL to expose an external coding-agent server through PalladiumAI.'}</p><p className="mt-2 text-[10px] text-zinc-600">This integration intentionally does not import OpenHands Agent Canvas or create a parallel agent runtime.</p></div></div>
      </section>
    </div>
  </>;
}
