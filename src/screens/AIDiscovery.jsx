import { useNavigate } from 'react-router-dom';
import { Bot, Compass, Cpu, Store, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const DESTINATIONS = [
  { icon: Cpu, title: 'Runtime Models', text: 'Inspect providers configured on this deployment, real agent assignments and recent model usage.', to: '/models' },
  { icon: Wrench, title: 'Tools Framework', text: 'Manage executable tools, permissions, browser policy, integrations and execution logs.', to: '/tools-framework' },
  { icon: Bot, title: 'Agent Marketplace', text: 'Browse persisted Blackstar marketplace agents and deploy them into your intelligence network.', to: '/agent-marketplace' },
  { icon: Store, title: 'Marketplace', text: 'Open persisted marketplace and installed-template infrastructure.', to: '/marketplace' },
];

export default function AIDiscovery() {
  const navigate = useNavigate();
  return <>
    <PageHeader eyebrow="Blackstar Discovery" title="Intelligence Discovery" description="Navigate live Blackstar model, tool and marketplace surfaces backed by authoritative platform state." />
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[26px] border border-violet-300/10 bg-black/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,.24)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Compass className="h-5 w-5 text-violet-300" /></div>
      <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/60">Authoritative platform state</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Discover executable intelligence</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Blackstar routes discovery toward real configured systems rather than simulated rankings, sample ratings or hard-coded ecosystem data.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">{DESTINATIONS.map(({icon:Icon,title,text,to}) => <button key={title} onClick={()=>navigate(to)} className="group rounded-2xl border border-violet-300/10 bg-black/25 p-4 text-left transition hover:border-violet-300/20 hover:bg-violet-400/[.035]"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-400/[.05]"><Icon className="h-4 w-4 text-violet-300" /></div><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></button>)}</div>
    </div>
  </>;
}
