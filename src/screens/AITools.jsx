import { useNavigate } from 'react-router-dom';
import { Blocks, Plug, ScrollText, ShieldCheck, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AITools() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Blackstar Tool Network" title="Executable Tools" description="Use the authoritative Tools Framework for executable capabilities, permissions, integrations and recorded execution history." />
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[24px] border border-violet-300/10 bg-black/35 p-6 backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" /><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Wrench className="h-5 w-5 text-violet-300" /></div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/60">Runtime capabilities</p><h2 className="mt-2 text-xl font-semibold text-white">Tools are governed by the runtime</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">The old directory displayed hard-coded product listings, pricing labels and sample capabilities. Blackstar uses the real tool registry and permission system as its single source of truth.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Blocks,'Executable tools','View tools the runtime actually knows about and can execute.'],[ShieldCheck,'Permissions','Manage approvals, spend caps, allowed domains and tool access through persisted policy.'],[Plug,'Integrations','Connect supported services through the live integration backend.'],[ScrollText,'Execution ledger','Inspect recorded tool executions instead of sample activity.']].map(([Icon,title,text])=><div key={title} className="rounded-xl border border-violet-300/[.08] bg-black/25 p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>)}</div>
        <div className="mt-6 flex flex-wrap gap-2"><button onClick={()=>navigate('/tools-framework')} className="rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#09070d] hover:bg-violet-200">Open Tools Framework</button><button onClick={()=>navigate('/tool-marketplace')} className="rounded-xl border border-violet-300/10 px-4 py-2 text-sm text-zinc-300 hover:bg-violet-400/[.04]">Tool Marketplace</button></div>
      </div>
    </>
  );
}
