import { motion, useReducedMotion } from 'framer-motion';
import { Activity, Bot, Network, Radio, ShieldAlert, Workflow } from 'lucide-react';

const NODE_DEFS = [
  { key: 'activeAgents', label: 'Agent mesh', icon: Bot, pos: 'left-[7%] top-[20%]' },
  { key: 'runningTasks', label: 'Executions', icon: Activity, pos: 'right-[7%] top-[20%]' },
  { key: 'activeWorkforces', label: 'Networks', icon: Network, pos: 'left-[7%] bottom-[18%]' },
  { key: 'runningWorkforceRuns', label: 'Workflows', icon: Workflow, pos: 'right-[7%] bottom-[18%]' },
];

function Node({ item, value, reduced }) {
  const Icon = item.icon;
  const active = Number(value || 0) > 0;
  return (
    <motion.div
      className={`absolute ${item.pos} z-20 w-[108px] rounded-xl border border-white/10 bg-black/70 p-2.5 shadow-2xl backdrop-blur-xl sm:w-[128px]`}
      animate={reduced ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]' : 'bg-zinc-600'}`} /><Icon className="h-3 w-3 text-violet-300" /><span className="truncate text-[9px] uppercase tracking-[.15em] text-zinc-500">{item.label}</span></div>
      <p className="mt-1.5 text-lg font-semibold text-white">{value ?? 0}</p>
    </motion.div>
  );
}

export default function MissionOperationsCore({ metrics = {}, pendingCount = 0, loading = false }) {
  const reduced = useReducedMotion();
  const live = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  const exceptions = Number(metrics.failedTasks || 0);
  return (
    <section className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-violet-300/10 bg-black/45 shadow-[0_35px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(139,92,246,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,.08)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,.16),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(6,182,212,.07),transparent_42%)]" />
      <div className="relative z-10 flex items-start justify-between gap-4 p-5">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.32em] text-violet-300/60">Mission operations core</p><h2 className="mt-1 text-base font-semibold text-white">Blackstar intelligence network</h2></div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-2.5 py-1 text-[9px] uppercase tracking-[.18em] text-emerald-200"><Radio className="h-3 w-3" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />Realtime</div>
      </div>

      <div className="absolute left-1/2 top-[55%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 sm:h-[350px] sm:w-[350px]">
        {[1, .76, .5].map((scale, i) => <motion.div key={scale} className="absolute inset-0 m-auto rounded-full border border-violet-300/10" style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }} animate={reduced ? undefined : { rotate: i % 2 ? -360 : 360 }} transition={{ duration: 26 + i * 9, repeat: Infinity, ease: 'linear' }}><span className="absolute left-1/2 top-[-3px] h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,.9)]" /></motion.div>)}
        <motion.div className="absolute inset-[18%] rounded-full border border-cyan-300/10 bg-[conic-gradient(from_90deg,transparent,rgba(34,211,238,.09),transparent_35%)]" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
        <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-300/20 bg-black/80 shadow-[0_0_55px_rgba(124,58,237,.18)]">
          <motion.div animate={reduced ? undefined : { scale: [1, 1.06, 1], opacity: [.8, 1, .8] }} transition={{ duration: 2.8, repeat: Infinity }} className="grid h-16 w-16 place-items-center rounded-full border border-violet-300/15 bg-violet-400/[.07]"><Network className="h-7 w-7 text-violet-200" /></motion.div>
          <div className="absolute top-[78px] text-center"><p className="text-[8px] uppercase tracking-[.24em] text-violet-300/55">Core</p><p className="text-[10px] font-semibold text-white">{loading ? 'SYNC' : live > 0 ? `${live} LIVE` : 'STANDBY'}</p></div>
        </div>
      </div>

      {NODE_DEFS.map((item, i) => <Node key={item.key} item={item} value={loading ? '—' : metrics[item.key]} reduced={reduced || i > 1} />)}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-white/8 bg-black/60 px-3 py-2 text-[9px] uppercase tracking-[.14em] text-zinc-500 backdrop-blur-xl"><span className="text-emerald-300">{live} in flight</span><span className="h-3 w-px bg-white/10" /><span className={pendingCount ? 'text-amber-300' : ''}>{pendingCount} gates</span><span className="h-3 w-px bg-white/10" /><span className={exceptions ? 'text-rose-300' : ''}>{exceptions} exceptions</span></div>
    </section>
  );
}
