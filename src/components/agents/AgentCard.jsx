import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Copy, Trash2, Play, Brain, Clock, Cpu } from 'lucide-react';
import { STATUS_STYLE } from './agentsData';
import AgentActivityEffect from '@/components/visual/AgentActivityEffect';

function Cap({ label }) {
  return <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{label}</span>;
}

export default function AgentCard({ agent, onEdit, onDuplicate, onDelete, onRun }) {
  const st = STATUS_STYLE[agent.status] || STATUS_STYLE.Idle;
  return (
    <div className="group relative pcard pglass pmetal-border flex flex-col overflow-hidden rounded-2xl p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <AgentActivityEffect status={agent.status} />

      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${agent.grad} text-base font-semibold text-white shadow-lg`}>{agent.letter}</div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0c0d13] ${st.dot}`} />
          <span aria-hidden className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-violet-400/40 animate-ping" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{agent.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className={`grid h-4 w-4 place-items-center rounded bg-gradient-to-br ${agent.modelGrad} text-[8px] font-bold text-white`}>{agent.model[0]}</span>
            {agent.model}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 ${st.bg} ${st.text}`}>● {agent.status}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-400">{agent.desc}</p>

      <div className="mt-3 flex flex-wrap gap-1">{agent.caps.slice(0, 4).map(c => <Cap key={c} label={c} />)}</div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1" title="Memory"><Brain className={`h-3.5 w-3.5 ${agent.memory ? 'text-violet-400' : 'text-zinc-700'}`} />{agent.memory ? 'Memory' : 'No memory'}</span>
        <span className="flex items-center gap-1" title="Last run"><Clock className="h-3.5 w-3.5" />{agent.lastRun}</span>
        <span className="flex items-center gap-1" title="Performance"><Cpu className="h-3.5 w-3.5" />{agent.score}%</span>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-white/10 pt-3">
        <Link to={`/agents/${agent.id}`} className="pbtn pbtn-secondary flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5" />Open</Link>
        <button onClick={() => onRun?.(agent)} className="pbtn pbtn-primary flex items-center gap-1 rounded-lg bg-violet-600/90 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-500"><Play className="h-3.5 w-3.5" />Run</button>
        <div className="ml-auto flex items-center gap-0.5 text-zinc-500">
          <button onClick={() => onEdit?.(agent)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-white" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDuplicate?.(agent)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-white" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete?.(agent)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-rose-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}