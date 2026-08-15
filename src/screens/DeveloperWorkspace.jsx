import { useNavigate } from 'react-router-dom';
import { Code2, KeyRound, Server, ShieldCheck, TerminalSquare } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const AREAS = [
  { icon: KeyRound, title: 'Developer Portal', text: 'Create and manage real API keys, webhooks, usage and platform access.', to: '/developer-portal' },
  { icon: Code2, title: 'Code Explorer', text: 'Repository editing remains disabled until an authenticated source-control provider is connected.', to: '/code-explorer' },
  { icon: TerminalSquare, title: 'Terminal', text: 'Command execution remains disabled until an isolated, audited runner is available.', to: '/terminal' },
  { icon: Server, title: 'Deployments', text: 'Deployment controls stay unavailable until a real deployment provider is configured.', to: '/deployments' },
];

export default function DeveloperWorkspace() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Developer Workspace" description="The sample browser IDE has been removed. Developer capabilities now link to their authoritative live or explicitly unavailable surfaces." />
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><ShieldCheck className="h-5 w-5 text-violet-300" /></div>
        <h2 className="text-xl font-semibold text-white">No simulated IDE state</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">The previous workspace opened fixture files, mock Git/output/problem panels and browser-only code state. PalladiumAI will not present those samples as a connected development environment.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {AREAS.map(({ icon: Icon, title, text, to }) => (
            <button key={title} onClick={() => navigate(to)} className="rounded-xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/[.04]">
              <Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
