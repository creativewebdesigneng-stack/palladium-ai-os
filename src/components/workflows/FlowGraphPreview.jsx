import { Bot, Bell, Clock3, GitBranch, ShieldCheck, Workflow } from 'lucide-react';

const ICONS = { agent: Bot, notification: Bell, delay: Clock3, approval: ShieldCheck };

export default function FlowGraphPreview({ triggerType, steps }) {
  const nodes = [{ key: 'trigger', kind: 'trigger', name: `${triggerType || 'manual'} trigger` }, ...steps];
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0b0d13] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Visual flow</h2></div>
        <span className="text-[10px] text-zinc-600">Langflow-inspired · native PalladiumAI runtime</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-2">
          {nodes.map((node, index) => {
            const Icon = node.kind === 'trigger' ? Workflow : ICONS[node.kind] ?? Workflow;
            return <div key={node.key ?? `${node.kind}-${index}`} className="flex items-center gap-2">
              {index > 0 && <div className="h-px w-8 bg-gradient-to-r from-violet-500/60 to-indigo-500/20" />}
              <div className="w-44 rounded-xl border border-white/10 bg-white/[.03] p-3 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
                <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/10"><Icon className="h-3.5 w-3.5 text-violet-300" /></span><div className="min-w-0"><p className="truncate text-[11px] font-medium text-zinc-200">{node.name?.trim() || `Step ${index}`}</p><p className="text-[9px] uppercase tracking-wide text-zinc-600">{node.kind}</p></div></div>
              </div>
            </div>;
          })}
        </div>
      </div>
    </section>
  );
}
