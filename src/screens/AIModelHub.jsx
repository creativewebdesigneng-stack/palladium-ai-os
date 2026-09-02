import { useNavigate } from 'react-router-dom';
import { Bot, Cpu, Server, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AIModelHub() {
  const navigate = useNavigate();
  const cards = [
    ['Configured providers', Server, 'Server-side configuration state without exposing credentials.'],
    ['Agent assignments', Bot, 'The provider and model actually persisted on each intelligence agent.'],
    ['Runtime safety', ShieldCheck, 'Credentials remain server-side and usage telemetry comes from real executed tasks.'],
  ];
  return <>
    <PageHeader eyebrow="Blackstar Model Infrastructure" title="Model Intelligence" description="Runtime Models is the authoritative Blackstar surface for configured providers, agent assignments and live execution telemetry." />
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[26px] border border-violet-300/10 bg-black/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,.24)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Cpu className="h-5 w-5 text-violet-300" /></div>
      <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/60">Authoritative model state</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Operate from live runtime models</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">Blackstar reads real server provider configuration, persisted agent-model assignments and recent execution telemetry. A separate simulated model catalogue would create conflicting state, so this surface routes directly to the runtime system of record.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{cards.map(([title,Icon,text]) => <div key={title} className="rounded-2xl border border-violet-300/10 bg-black/25 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-400/[.05]"><Icon className="h-4 w-4 text-violet-300" /></div><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>)}</div>
      <button onClick={() => navigate('/models')} className="mt-6 rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#09070d] shadow-[0_0_28px_rgba(167,139,250,.12)] transition hover:bg-violet-200">Open Runtime Models</button>
    </div>
  </>;
}
