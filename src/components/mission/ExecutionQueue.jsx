import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, CircleDashed, Clock3, ShieldAlert, XCircle } from 'lucide-react';

const STATUS = {
  running: { icon: CircleDashed, text: 'Running', cls: 'text-emerald-200', bar: 'bg-emerald-300/70' },
  in_progress: { icon: CircleDashed, text: 'Running', cls: 'text-emerald-200', bar: 'bg-emerald-300/70' },
  pending: { icon: Clock3, text: 'Queued', cls: 'text-zinc-300', bar: 'bg-zinc-500/60' },
  queued: { icon: Clock3, text: 'Queued', cls: 'text-zinc-300', bar: 'bg-zinc-500/60' },
  waiting_for_approval: { icon: ShieldAlert, text: 'Approval', cls: 'text-amber-200', bar: 'bg-amber-300/70' },
  completed: { icon: CheckCircle2, text: 'Complete', cls: 'text-emerald-200', bar: 'bg-emerald-300/50' },
  failed: { icon: XCircle, text: 'Failed', cls: 'text-rose-200', bar: 'bg-rose-300/70' },
};

export default function ExecutionQueue({ tasks = [], loading = false }) {
  const reduced = useReducedMotion();
  const ordered = [...tasks].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 7);
  return (
    <section className="rounded-[24px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-emerald-300/55">Execution fabric</p><h2 className="mt-1 text-sm font-semibold text-white">Active missions / queue</h2></div><span className="text-[9px] uppercase tracking-[.16em] text-zinc-600">state driven</span></div>
      {loading ? <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[.03]" />)}</div> : ordered.length ? <div className="space-y-2">{ordered.map((task) => { const s = STATUS[task.status] || STATUS.pending; const Icon = s.icon; const moving = ['running','in_progress'].includes(task.status); return <div key={task.id} className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[.02] px-3 py-2.5"><div className="flex items-center gap-2.5"><Icon className={`h-3.5 w-3.5 shrink-0 ${s.cls} ${moving && !reduced ? 'animate-spin' : ''}`} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-zinc-200">{task.title || task.name || 'Untitled mission'}</p><p className="mt-0.5 text-[9px] text-zinc-600">{task.model || task.category || 'Blackstar runtime'}</p></div><span className={`text-[9px] font-semibold uppercase tracking-[.12em] ${s.cls}`}>{s.text}</span></div><div className="mt-2 h-px overflow-hidden bg-white/5">{moving ? <motion.div className={`h-full w-1/3 ${s.bar}`} animate={reduced ? undefined : { x: ['-100%', '400%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} /> : <div className={`h-full ${task.status === 'completed' ? 'w-full' : task.status === 'failed' ? 'w-full' : 'w-1/4'} ${s.bar}`} />}</div></div>; })}</div> : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[11px] text-zinc-600">No mission executions are currently visible.</div>}
    </section>
  );
}
