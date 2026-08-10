import { Zap } from 'lucide-react';
import { STATUS_STYLE, NODE_TYPES, TRIGGERS } from './workflowsData';

export default function WorkflowCard({ wf, onOpen }) {
  const st = STATUS_STYLE[wf.status];
  const triggerIcon = (TRIGGERS.find((t) => t.label === wf.trigger) || {}).icon || Zap;
  return (
    <button onClick={() => onOpen(wf)} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[.05]">
      <div className="flex items-start gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${NODE_TYPES.Trigger.grad} text-white`}><triggerIcon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{wf.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{wf.description}</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{wf.status}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {wf.nodes.slice(0, 6).map((n, i) => {
          const nt = NODE_TYPES[n.type];
          const I = nt.icon;
          return (
            <div key={i} className="flex items-center">
              <span className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${nt.grad} text-white`}><I className="h-3 w-3" /></span>
              {i < Math.min(wf.nodes.length, 6) - 1 && <span className="mx-0.5 h-px w-3 bg-white/15" />}
            </div>
          );
        })}
        {wf.nodes.length > 6 && <span className="ml-1 text-[10px] text-zinc-600">+{wf.nodes.length - 6}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500">
        <span>{wf.nodes.length} nodes · {wf.trigger}</span>
        <span>{wf.runs} runs · {wf.successRate}% success</span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">Last run {wf.lastRun} · {wf.owner}</p>
    </button>
  );
}