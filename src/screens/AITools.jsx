import { useNavigate } from 'react-router-dom';
import { Blocks, Plug, ScrollText, ShieldCheck, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AITools() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Directory" title="AI Tools" description="The illustrative tools directory has been removed. Use the live Tools Framework for executable tools, permissions, integrations and execution history." />
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><Wrench className="h-5 w-5 text-violet-300" /></div>
        <h2 className="text-xl font-semibold text-white">Tools are managed by the runtime</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">The old directory displayed hard-coded product listings, pricing labels and capabilities. PalladiumAI already has a real tool registry and permission system, so this entry point now directs to that source of truth.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Blocks, 'Executable tools', 'View tools the runtime actually knows about and can execute.'],
            [ShieldCheck, 'Permissions', 'Enable tools, approvals, spend caps and allowed domains through persisted policy.'],
            [Plug, 'Integrations', 'Connect supported services through the real integration backend.'],
            [ScrollText, 'Execution log', 'Inspect recorded tool executions instead of sample activity.'],
          ].map(([Icon, title, text]) => <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => navigate('/tools-framework')} className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Open Tools Framework</button>
          <button onClick={() => navigate('/tool-marketplace')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[.04]">Tool Marketplace</button>
        </div>
      </div>
    </>
  );
}
