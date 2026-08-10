import { Cpu, Wrench, Brain } from 'lucide-react';

function Row({ k, v }) {
  return <div className="flex justify-between"><dt className="text-zinc-500">{k}</dt><dd className="text-zinc-200">{String(v)}</dd></div>;
}

// Right-hand sidebar summarising the agent's model, tools and memory settings
// pulled live from the backend agent record.
export default function AgentConfigPanel({ agent }) {
  const tools = agent.allowed_tools || agent.tools || [];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Cpu className="h-3.5 w-3.5 text-violet-400" />Model</p>
        <dl className="mt-3 space-y-1.5 text-xs">
          <Row k="Provider" v={agent.model_provider || 'lovable'} />
          <Row k="Model" v={agent.model || '—'} />
          <Row k="Temperature" v={agent.temperature ?? 0.7} />
          <Row k="Max tokens" v={agent.max_tokens ?? 4096} />
          <Row k="Autonomy" v={agent.autonomy || 'assist'} />
        </dl>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Wrench className="h-3.5 w-3.5 text-violet-400" />Enabled tools</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tools.length ? tools.map((t) => (
            <span key={t} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{t}</span>
          )) : <span className="text-[11px] text-zinc-600">None configured</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-white"><Brain className="h-3.5 w-3.5 text-violet-400" />Memory</p>
        <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
          <div className="flex justify-between">
            <span>Long-term memory</span>
            <span className={agent.memory_enabled === false ? 'text-zinc-600' : 'text-emerald-400'}>{agent.memory_enabled === false ? 'Off' : 'On'}</span>
          </div>
          <div className="flex justify-between">
            <span>Approval required</span>
            <span className={agent.requires_approval ? 'text-amber-300' : 'text-zinc-600'}>{agent.requires_approval ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
