import { useNavigate } from 'react-router-dom';
import { Bot, Compass, Cpu, Store, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const DESTINATIONS = [
  { icon: Cpu, title: 'Runtime Models', text: 'See providers actually configured on this deployment, real agent assignments and recent model usage.', to: '/models' },
  { icon: Wrench, title: 'Tools Framework', text: 'Manage real executable tools, permissions, browser policy, integrations and execution logs.', to: '/tools-framework' },
  { icon: Bot, title: 'Agent Marketplace', text: 'Browse marketplace agent listings backed by the PalladiumAI marketplace service.', to: '/agent-marketplace' },
  { icon: Store, title: 'Marketplace', text: 'Open the persisted marketplace and installed-template surfaces.', to: '/marketplace' },
];

export default function AIDiscovery() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Discovery" title="AI Discovery" description="The illustrative ecosystem directory has been removed. Use PalladiumAI's live model, tool and marketplace surfaces instead." />
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><Compass className="h-5 w-5 text-violet-300" /></div>
        <h2 className="text-xl font-semibold text-white">Discover from real platform state</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">The previous page ranked hard-coded tools, companies, models and research items with sample ratings and trending flags. Those listings are no longer presented as current ecosystem data.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DESTINATIONS.map(({ icon: Icon, title, text, to }) => (
            <button key={title} onClick={() => navigate(to)} className="rounded-xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/[.04]">
              <Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
