import { useNavigate } from 'react-router-dom';
import { Bot, Cpu, Server, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AIModelHub() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Model Hub" title="AI Model Hub" description="The illustrative model catalogue and simulated Use/Connect/Test actions have been removed. Runtime Models is the authoritative model surface." />
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><Cpu className="h-5 w-5 text-violet-300" /></div>
        <h2 className="text-xl font-semibold text-white">Use live runtime model state</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">PalladiumAI already has a production model-management screen that reads server provider configuration, persisted agent model assignments and recent execution telemetry. Maintaining a separate hard-coded catalogue would create conflicting provider/model state.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[['Configured providers', Server, 'Server-side configuration status without exposing credentials.'], ['Agent assignments', Bot, 'The provider and model actually persisted on each agent.'], ['Runtime safety', ShieldCheck, 'Credentials remain server-side and usage comes from executed tasks.']].map(([title, Icon, text]) => <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>)}
        </div>
        <button onClick={() => navigate('/models')} className="mt-6 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Open Runtime Models</button>
      </div>
    </>
  );
}
