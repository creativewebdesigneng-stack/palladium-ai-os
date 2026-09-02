import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Search, PackageSearch, CheckCircle2, ShieldAlert, ThumbsUp, ThumbsDown, XCircle, Bot, Cog, Wrench, ArrowLeftRight, Play } from 'lucide-react';

const KIND = {
  task_started: { icon: Play, cls: 'text-violet-300', dot: 'bg-violet-300' }, run_started: { icon: Play, cls: 'text-violet-300', dot: 'bg-violet-300' },
  working: { icon: Cog, cls: 'text-violet-300', dot: 'bg-violet-300' }, searching: { icon: Search, cls: 'text-cyan-300', dot: 'bg-cyan-300' },
  results_found: { icon: PackageSearch, cls: 'text-sky-300', dot: 'bg-sky-300' }, preparing_action: { icon: Wrench, cls: 'text-amber-300', dot: 'bg-amber-300' },
  tool_call: { icon: Wrench, cls: 'text-cyan-300', dot: 'bg-cyan-300' }, handoff: { icon: ArrowLeftRight, cls: 'text-indigo-300', dot: 'bg-indigo-300' },
  completed: { icon: CheckCircle2, cls: 'text-emerald-300', dot: 'bg-emerald-300' }, run_completed: { icon: CheckCircle2, cls: 'text-emerald-300', dot: 'bg-emerald-300' },
  awaiting_approval: { icon: ShieldAlert, cls: 'text-amber-300', dot: 'bg-amber-300' }, approval_required: { icon: ShieldAlert, cls: 'text-amber-300', dot: 'bg-amber-300' },
  approved: { icon: ThumbsUp, cls: 'text-emerald-300', dot: 'bg-emerald-300' }, rejected: { icon: ThumbsDown, cls: 'text-rose-300', dot: 'bg-rose-300' },
  action_completed: { icon: CheckCircle2, cls: 'text-emerald-300', dot: 'bg-emerald-300' }, failed: { icon: XCircle, cls: 'text-rose-300', dot: 'bg-rose-300' },
  run_failed: { icon: XCircle, cls: 'text-rose-300', dot: 'bg-rose-300' }, cancelled: { icon: XCircle, cls: 'text-zinc-400', dot: 'bg-zinc-500' },
  agent_created: { icon: Bot, cls: 'text-violet-300', dot: 'bg-violet-300' }, info: { icon: Radio, cls: 'text-zinc-400', dot: 'bg-zinc-500' },
};
const time = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

export default function ActivityStream({ activities = [], loading }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
      <div className="mb-3 flex items-center gap-2"><Radio className="h-3.5 w-3.5 text-cyan-300" /><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-cyan-300/55">Operations feed</p><h2 className="text-sm font-semibold text-white">Live event stream</h2></div><span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-300/[.04] px-2 py-1 text-[8px] uppercase tracking-[.16em] text-emerald-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> live</span></div>
      {loading ? <div className="space-y-1.5">{[0,1,2,3,4].map(i => <div key={i} className="h-11 animate-pulse rounded-lg bg-white/[.03]" />)}</div> : activities.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[11px] text-zinc-600">No operational events yet. Dispatch a mission to activate the feed.</div> : <div className="max-h-[470px] overflow-y-auto pr-1"><AnimatePresence initial={false}>{activities.map((a, i) => { const meta = KIND[a.kind] ?? KIND.info; const Icon = meta.icon; return <motion.div layout key={a.id ?? `${a.created_at}-${i}`} initial={{ opacity: 0, x: -10, backgroundColor: 'rgba(139,92,246,.09)' }} animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,.015)' }} transition={{ duration: .35 }} className="group mb-1.5 grid grid-cols-[58px_18px_1fr] items-start gap-2 rounded-lg border border-white/[.055] px-2.5 py-2"><span className="pt-0.5 font-mono text-[9px] text-zinc-600">{time(a.created_at)}</span><span className="relative mt-0.5 grid h-4 w-4 place-items-center"><span className={`absolute h-1.5 w-1.5 rounded-full ${meta.dot}`} /><Icon className={`h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 ${meta.cls}`} /></span><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{String(a.kind || 'info').replaceAll('_',' ')}</p><p className="mt-0.5 text-[11px] leading-4 text-zinc-300">{a.message}</p></div></motion.div>; })}</AnimatePresence></div>}
    </section>
  );
}
