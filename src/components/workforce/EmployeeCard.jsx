import { ExternalLink, Settings, ClipboardPlus, Pause, Square, Copy, Brain, Wrench, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STATUS_STYLE } from './workforceData';

function Stars({ n }) {
  return <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-3 w-3 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />)}</span>;
}

export default function EmployeeCard({ e, onPause, onStop, onDuplicate }) {
  const st = STATUS_STYLE[e.status] || STATUS_STYLE.Idle;
  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_20px_60px_rgba(139,92,246,.1)]">
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${e.grad} text-base font-semibold text-white shadow-lg`}>{e.letter}</div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0c0d13] ${st.dot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{e.name}</h3>
          <p className="truncate text-[11px] text-zinc-500">{e.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="rounded bg-white/5 px-1.5 py-0.5">{e.dept}</span>
            <span className={`grid h-3.5 w-3.5 place-items-center rounded bg-gradient-to-br ${e.modelGrad} text-[7px] font-bold text-white`}>{e.model[0]}</span>{e.model}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${st.bg} ${st.text}`}>{e.status}</span>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">Current task</p>
        <p className="truncate text-xs text-zinc-300">{e.task}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5"><Brain className={`h-3.5 w-3.5 ${e.memory ? 'text-violet-400' : 'text-zinc-700'}`} />{e.memory ? 'Memory on' : 'No memory'}</span>
        <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-cyan-400" />{e.tools} tools</span>
        <span className="flex items-center gap-1.5">Level <span className="text-zinc-200">{e.level}</span></span>
        <span className="flex items-center gap-1.5">Done <span className="text-zinc-200">{e.completed}</span></span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Stars n={e.rating} />
        <span className="text-[10px] text-zinc-600">{e.completed} tasks</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-white/10 pt-3">
        <Link to="/agents/a1" className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5" />Open</Link>
        <button className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10"><Settings className="h-3.5 w-3.5" />Manage</button>
        <button className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10"><ClipboardPlus className="h-3.5 w-3.5" />Assign</button>
        <div className="ml-auto flex items-center gap-0.5 text-zinc-500">
          <button onClick={() => onPause?.(e)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-white" title="Pause"><Pause className="h-3.5 w-3.5" /></button>
          <button onClick={() => onStop?.(e)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-rose-400" title="Stop"><Square className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDuplicate?.(e)} className="rounded-lg p-1.5 hover:bg-white/5 hover:text-white" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}