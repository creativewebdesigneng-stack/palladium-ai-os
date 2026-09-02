import { motion } from 'framer-motion';
import { Briefcase, Users, Bot, Play, CheckCircle2, XCircle, Clock, Network } from 'lucide-react';

const RUN_STYLE = {
  running: { icon: Play, cls: 'text-violet-200' }, queued: { icon: Clock, cls: 'text-white/45' },
  succeeded: { icon: CheckCircle2, cls: 'text-emerald-300' }, completed: { icon: CheckCircle2, cls: 'text-emerald-300' },
  failed: { icon: XCircle, cls: 'text-rose-300' }, cancelled: { icon: XCircle, cls: 'text-white/35' },
};
const when = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const Surface = ({ children }) => <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.022] p-5 backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/20 to-transparent" /><div className="relative">{children}</div></section>;

export default function ProfessionalPanel({ agents = [], workforces = [], runs = [], agentRuns = [], loading }) {
  if (loading) return <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[.025]" />)}</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-violet-300/12 bg-violet-300/[.035] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/65">Blackstar Business Intelligence</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Professional operations network</h2><p className="mt-1 text-xs leading-5 text-white/40">Authoritative agent, workforce and execution state from the orchestration layer.</p></div><div className="flex gap-2 text-[10px]"><span className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-white/45">{agents.length} nodes</span><span className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-white/45">{workforces.length} networks</span></div></div>
      </div>

      <Surface><div className="mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Professional intelligence nodes</h2><span className="ml-auto text-[10px] uppercase tracking-wider text-white/25">{agents.length} registered</span></div>{agents.length === 0 ? <p className="text-xs text-white/30">No professional agents yet. Create one in Workforce to staff a department.</p> : <ul className="grid gap-3 sm:grid-cols-2">{agents.map((a,i) => <motion.li key={a.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.03,.2)}} className="rounded-xl border border-white/7 bg-black/20 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-200" /><p className="truncate text-sm font-medium text-white">{a.name}</p><span className="ml-auto rounded-full border border-white/8 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/35">{a.status}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/42">{a.purpose || a.description || 'No purpose recorded.'}</p><p className="mt-2 text-[10px] text-white/25">{a.category} · {a.autonomy} · {a.model}</p></motion.li>)}</ul>}</Surface>

      <Surface><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Coordinated workforce networks</h2><span className="ml-auto text-[10px] uppercase tracking-wider text-white/25">{workforces.length} configured</span></div>{workforces.length === 0 ? <p className="text-xs text-white/30">No workforces yet.</p> : <ul className="grid gap-3 sm:grid-cols-2">{workforces.map((w) => <li key={w.id} className="rounded-xl border border-white/7 bg-black/20 p-4"><div className="flex items-center gap-2"><Network className="h-4 w-4 text-violet-200" /><p className="truncate text-sm font-medium text-white">{w.name}</p><span className="ml-auto rounded-full border border-white/8 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/35">{w.status}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/42">{w.purpose || w.description || 'No purpose recorded.'}</p>{w.department ? <p className="mt-2 text-[10px] text-white/25">{w.department}</p> : null}</li>)}</ul>}</Surface>

      <div className="grid gap-4 xl:grid-cols-2">
        <RunList title="Recent orchestration runs" empty="No workflow runs recorded yet." rows={runs.slice(0,12)} text={(r) => r.input || r.output || 'Workflow run'} date={(r) => when(r.started_at || r.completed_at)} />
        <RunList title="Recent agent executions" empty="No agent runs recorded yet." rows={agentRuns.slice(0,12)} text={(r) => r.title || 'Agent run'} date={(r) => `${r.model || r.provider || ''} · ${when(r.created_at)}`} />
      </div>
    </div>
  );
}

function RunList({ title, empty, rows, text, date }) {
  return <Surface><h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>{rows.length === 0 ? <p className="text-xs text-white/30">{empty}</p> : <ul className="space-y-2">{rows.map((r) => { const meta=RUN_STYLE[r.status] ?? RUN_STYLE.queued; const Icon=meta.icon; return <li key={r.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5"><Icon className={`h-3.5 w-3.5 shrink-0 ${meta.cls}`} /><p className="min-w-0 flex-1 truncate text-xs text-white/55">{text(r)}</p><span className="shrink-0 text-[9px] text-white/22">{date(r)}</span></li>;})}</ul>}</Surface>;
}
