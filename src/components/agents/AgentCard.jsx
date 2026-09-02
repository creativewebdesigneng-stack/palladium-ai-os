import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Copy, Trash2, Play, Brain, Clock, Cpu, Radio } from 'lucide-react';
import { STATUS_STYLE } from './agentsData';
import AgentActivityEffect from '@/components/visual/AgentActivityEffect';

function Cap({ label }) {
  return <span className="rounded-md border border-violet-300/10 bg-violet-400/[.025] px-1.5 py-0.5 text-[9px] uppercase tracking-[.08em] text-zinc-500">{label}</span>;
}

export default function AgentCard({ agent, onEdit, onDuplicate, onDelete, onRun }) {
  const st = STATUS_STYLE[agent.status] || STATUS_STYLE.Idle;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-violet-300/[.10] bg-[linear-gradient(145deg,rgba(14,11,20,.92),rgba(7,7,11,.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_18px_60px_rgba(0,0,0,.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_22px_70px_rgba(0,0,0,.32),0_0_40px_rgba(124,58,237,.05)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/[.08] opacity-40 blur-2xl transition group-hover:opacity-80" />
      <AgentActivityEffect status={agent.status} />

      <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[.2em] text-zinc-600">
        <span>Blackstar Agent Node</span>
        <span className="flex items-center gap-1"><Radio className="h-3 w-3 text-violet-400" />Live</span>
      </div>

      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`grid h-12 w-12 place-items-center rounded-xl border border-white/[.08] bg-gradient-to-br ${agent.grad} text-base font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,.35)]`}>{agent.letter}</div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#09080d] ${st.dot}`} />
          {agent.status === 'Running' && <span aria-hidden className="absolute -bottom-1 -right-1 h-5 w-5 animate-ping rounded-full border border-violet-300/35" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight text-white">{agent.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
            <span className={`grid h-4 w-4 place-items-center rounded bg-gradient-to-br ${agent.modelGrad} text-[8px] font-bold text-white`}>{agent.model[0]}</span>
            <span className="truncate">{agent.model}</span>
            <span className={`ml-1 rounded-full border border-white/[.06] px-1.5 py-0.5 ${st.bg} ${st.text}`}>● {agent.status}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-400">{agent.desc}</p>

      <div className="mt-3 flex flex-wrap gap-1">{agent.caps.slice(0, 4).map(c => <Cap key={c} label={c} />)}</div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-violet-300/[.08] bg-black/20 p-2.5 text-[10px] text-zinc-500">
        <span className="flex min-w-0 items-center gap-1" title="Memory"><Brain className={`h-3.5 w-3.5 shrink-0 ${agent.memory ? 'text-violet-300' : 'text-zinc-700'}`} /><span className="truncate">{agent.memory ? 'Memory' : 'No memory'}</span></span>
        <span className="flex min-w-0 items-center gap-1" title="Last run"><Clock className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{agent.lastRun}</span></span>
        <span className="flex min-w-0 items-center gap-1" title="Performance"><Cpu className="h-3.5 w-3.5 shrink-0 text-violet-300/70" /><span className="truncate">{agent.score}%</span></span>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-violet-300/[.08] pt-3">
        <Link to={`/agents/${agent.id}`} className="flex items-center gap-1 rounded-lg border border-violet-300/10 bg-violet-400/[.03] px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 transition hover:border-violet-300/20 hover:bg-violet-400/[.07]"><ExternalLink className="h-3.5 w-3.5" />Inspect</Link>
        <button onClick={() => onRun?.(agent)} className="flex items-center gap-1 rounded-lg border border-violet-200/20 bg-violet-300 px-2.5 py-1.5 text-[10px] font-semibold text-[#09070d] shadow-[0_0_20px_rgba(167,139,250,.12)] transition hover:bg-violet-200"><Play className="h-3.5 w-3.5" />Execute</button>
        <div className="ml-auto flex items-center gap-0.5 text-zinc-600">
          <button onClick={() => onEdit?.(agent)} className="rounded-lg p-1.5 transition hover:bg-violet-400/[.06] hover:text-white" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDuplicate?.(agent)} className="rounded-lg p-1.5 transition hover:bg-violet-400/[.06] hover:text-white" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete?.(agent)} className="rounded-lg p-1.5 transition hover:bg-rose-400/[.05] hover:text-rose-300" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
