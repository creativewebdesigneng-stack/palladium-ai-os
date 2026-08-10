import { NODE_TYPES, TRIGGERS, ACTIONS } from './workflowsData';
import { ChevronDown, Plus } from 'lucide-react';

export default function WorkflowBuilder({ workflow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      {/* canvas */}
      <div className="relative rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Flow</h4>
          <span className="text-[10px] text-zinc-600">{workflow.nodes.length} nodes</span>
        </div>
        <div className="flex flex-col items-center">
          {workflow.nodes.map((n, i) => {
            const nt = NODE_TYPES[n.type];
            const I = nt.icon;
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={`group w-full max-w-sm rounded-xl border border-white/10 bg-gradient-to-br ${nt.grad} p-[1px]`}>
                  <div className="rounded-xl bg-[#0c0d13]/90 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${nt.grad} text-white`}><I className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{n.type}</p>
                        <p className="truncate text-sm font-medium text-white">{n.label}</p>
                      </div>
                    </div>
                    {n.config && <p className="mt-2 rounded-lg bg-black/30 px-2 py-1 font-mono text-[10px] text-zinc-400">{n.config}</p>}
                  </div>
                </div>
                {i < workflow.nodes.length - 1 && <div className="flex flex-col items-center"><span className="h-4 w-px bg-white/15" /><ChevronDown className="h-3 w-3 text-zinc-600" /></div>}
              </div>
            );
          })}
          <button className="mt-1 flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-[11px] text-zinc-500 hover:bg-white/5"><Plus className="h-3 w-3" />Add node</button>
        </div>
      </div>

      {/* toolbox */}
      <div className="space-y-4">
        <ToolGroup title="Triggers" items={TRIGGERS} />
        <ToolGroup title="Actions" items={ACTIONS} />
      </div>
    </div>
  );
}

function ToolGroup({ title, items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h4>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((it) => {
          const I = it.icon;
          return (
            <button key={it.label} className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-left text-[11px] text-zinc-300 transition hover:border-violet-400/30 hover:bg-white/5">
              <I className="h-3 w-3 shrink-0 text-violet-300" /><span className="truncate">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}