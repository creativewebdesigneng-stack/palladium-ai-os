import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Globe2,
  HeartPulse,
  Network,
  Radio,
  ServerCog,
  ShieldAlert,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

const fmtTime = (value) => value
  ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  : '';

function useMissionClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function StarMark({ small = false }) {
  const reduced = useReducedMotion();
  const sizeClass = small ? 'h-9 w-9' : 'h-28 w-28';
  const outerDuration = small ? 22 : 16;
  const innerDuration = small ? 16 : 10;

  return (
    <div className={`relative grid place-items-center ${sizeClass}`} aria-label="Blackstar core">
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: reduced ? outerDuration * 1.8 : outerDuration, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 160 160" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="blackstarOuter" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="#67e8f9" stopOpacity="0.95" />
              <stop offset="0.5" stopColor="#f8fafc" stopOpacity="0.9" />
              <stop offset="1" stopColor="#a78bfa" stopOpacity="0.95" />
            </linearGradient>
            <filter id="blackstarGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="80" cy="80" r="72" fill="none" stroke="url(#blackstarOuter)" strokeWidth="1.2" strokeDasharray="3 10" opacity="0.72" filter="url(#blackstarGlow)" />
          <circle cx="80" cy="80" r="63" fill="none" stroke="#67e8f9" strokeWidth="0.6" strokeDasharray="1 7" opacity="0.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 80 80)`}>
              <path d="M80 2 L83 14 L80 20 L77 14 Z" fill="#e0f2fe" opacity="0.9" />
              <circle cx="80" cy="8" r="1.7" fill="#ffffff" />
            </g>
          ))}
        </svg>
      </motion.div>

      <motion.div
        className="absolute inset-[11%]"
        animate={{ rotate: -360 }}
        transition={{ duration: reduced ? innerDuration * 1.8 : innerDuration, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 160 160" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="blackstarBlade" x1="38" y1="24" x2="126" y2="138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="0.28" stopColor="#67e8f9" />
              <stop offset="0.72" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#312e81" />
            </linearGradient>
            <radialGradient id="blackstarMetal" cx="0" cy="0" r="1" gradientTransform="translate(68 60) rotate(47) scale(74)">
              <stop stopColor="#273449" />
              <stop offset="0.42" stopColor="#090d16" />
              <stop offset="1" stopColor="#02040a" />
            </radialGradient>
            <filter id="blackstarBladeGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M80 4 L94 55 L145 44 L103 72 L156 80 L103 88 L145 116 L94 105 L80 156 L66 105 L15 116 L57 88 L4 80 L57 72 L15 44 L66 55 Z" fill="url(#blackstarMetal)" stroke="url(#blackstarBlade)" strokeWidth="2.4" filter="url(#blackstarBladeGlow)" />
          <path d="M80 20 L90 61 L131 52 L98 76 L140 80 L98 84 L131 108 L90 99 L80 140 L70 99 L29 108 L62 84 L20 80 L62 76 L29 52 L70 61 Z" fill="none" stroke="#7dd3fc" strokeWidth="0.9" opacity="0.55" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute inset-[30%] rounded-full border border-cyan-100/35 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,.35),rgba(34,211,238,.12)_28%,rgba(7,10,18,.95)_60%)] shadow-[inset_0_0_18px_rgba(56,189,248,.22),0_0_30px_rgba(56,189,248,.28)]"
        animate={{ scale: reduced ? [1, 1.015, 1] : [1, 1.08, 1], boxShadow: ['inset 0 0 16px rgba(56,189,248,.18),0 0 16px rgba(56,189,248,.18)', 'inset 0 0 24px rgba(167,139,250,.3),0 0 38px rgba(56,189,248,.48)', 'inset 0 0 16px rgba(56,189,248,.18),0 0 16px rgba(56,189,248,.18)'] }}
        transition={{ duration: reduced ? 5.5 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-[24%] rounded-full border border-violet-300/50 bg-black/80" />
        <motion.div className="absolute inset-[39%] rounded-full bg-white" animate={{ opacity: [0.55, 1, 0.55], scale: [0.8, 1.22, 0.8] }} transition={{ duration: 1.55, repeat: Infinity }} />
      </motion.div>

      {!small ? (
        <>
          <motion.div className="absolute -inset-[14%] rounded-full border border-cyan-300/10" animate={{ scale: [0.92, 1.05, 0.92], opacity: [0.15, 0.55, 0.15] }} transition={{ duration: 3.2, repeat: Infinity }} />
          <motion.div className="absolute left-1/2 top-1/2 h-[135%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-100/45 to-transparent" animate={{ opacity: [0.1, 0.55, 0.1] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.div className="absolute left-1/2 top-1/2 h-px w-[135%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-200/45 to-transparent" animate={{ opacity: [0.55, 0.1, 0.55] }} transition={{ duration: 2, repeat: Infinity }} />
        </>
      ) : null}
    </div>
  );
}

function Heartbeat() {
  const reduced = useReducedMotion();
  return (
    <div className="relative h-7 w-20 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent blur-[1px]"
        animate={{ x: ['-120%', '240%'] }}
        transition={{ duration: reduced ? 4 : 1.8, repeat: Infinity, ease: 'linear' }}
      />
      <svg viewBox="0 0 100 28" className="relative h-full w-full" aria-hidden="true">
        <motion.polyline
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.5"
          points="0,15 16,15 24,15 30,5 37,23 43,11 50,15 64,15 72,15 78,7 84,20 90,15 100,15"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: reduced ? 3.5 : 1.25, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

function LiveTicker({ notifications = [], activities = [] }) {
  const reduced = useReducedMotion();
  const items = useMemo(() => {
    const signals = notifications.slice(0, 4).map((item) => item.title || item.body || 'New Blackstar signal');
    const events = activities.slice(0, 4).map((item) => item.message || item.title || item.action || 'Mission activity updated');
    return [...signals, ...events].filter(Boolean).slice(0, 8);
  }, [notifications, activities]);
  const text = items.length ? items.join('   •   ') : 'Blackstar realtime mesh connected   •   Mission telemetry active   •   Awaiting new operational events';
  return (
    <div className="relative overflow-hidden border-y border-cyan-300/10 bg-cyan-300/[.025] py-2">
      <motion.div
        className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[.15em] text-cyan-200/75"
        animate={{ x: ['100%', '-120%'] }}
        transition={{ duration: reduced ? 55 : 26, repeat: Infinity, ease: 'linear' }}
      >
        {text}   •   {text}
      </motion.div>
    </div>
  );
}

function OrbitNode({ icon: Icon, label, value, className, delay = 0, tone = 'cyan' }) {
  const reduced = useReducedMotion();
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'violet' ? 'text-violet-300' : tone === 'amber' ? 'text-amber-300' : 'text-cyan-300';
  return (
    <motion.div
      className={`absolute z-20 min-w-[130px] rounded-lg border border-white/10 bg-black/75 px-3 py-2 backdrop-blur-xl ${className}`}
      animate={{ y: reduced ? [0, -1.5, 0] : [0, -6, 0], scale: reduced ? [1, 1.005, 1] : [1, 1.025, 1] }}
      transition={{ duration: reduced ? 8 : 4.2, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[.13em] text-zinc-500"><Icon className={`h-3 w-3 ${toneClass}`} />{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-200"><motion.span className={`h-1.5 w-1.5 rounded-full bg-current ${toneClass}`} animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.4, repeat: Infinity, delay }} />{value}</div>
    </motion.div>
  );
}

function HolographicCore({ metrics = {} }) {
  const reduced = useReducedMotion();
  const activeAgents = Number(metrics.activeAgents || 0);
  const running = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-xl border border-cyan-300/10 bg-[#020712]">
      <motion.div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(34,211,238,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.05)_1px,transparent_1px)] [background-size:32px_32px]" animate={{ backgroundPosition: reduced ? ['0px 0px', '16px 16px'] : ['0px 0px', '32px 32px'] }} transition={{ duration: reduced ? 18 : 9, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(124,58,237,.14),transparent_35%)]" animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: reduced ? 7 : 3.4, repeat: Infinity }} />

      <motion.div
        className="absolute left-1/2 top-[52%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/25 shadow-[0_0_70px_rgba(37,99,235,.18)] sm:h-[390px] sm:w-[390px]"
        animate={{ rotate: 360 }}
        transition={{ duration: reduced ? 50 : 22, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 72, 144, 216, 288].map((deg) => <span key={deg} className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.9)]" style={{ transform: `rotate(${deg}deg) translateX(188px)` }} />)}
      </motion.div>

      <motion.div className="absolute left-1/2 top-[52%] h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/25" animate={{ rotate: -360 }} transition={{ duration: reduced ? 38 : 15, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute left-1/2 top-[52%] h-[205px] w-[205px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-100/15" animate={{ rotate: 360 }} transition={{ duration: reduced ? 30 : 11, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2"><StarMark /></div>

      <motion.div className="absolute inset-x-[18%] bottom-[10%] h-12 rounded-[50%] border border-cyan-300/25" animate={{ scaleX: [0.92, 1.04, 0.92], opacity: [0.35, 0.9, 0.35] }} transition={{ duration: reduced ? 6 : 2.4, repeat: Infinity }} />
      <motion.div className="absolute bottom-[13%] left-1/2 h-24 w-px -translate-x-1/2 bg-gradient-to-t from-white via-cyan-300 to-transparent" animate={{ opacity: [.25, 1, .25], scaleY: [.75, 1.15, .75] }} transition={{ duration: reduced ? 5 : 1.9, repeat: Infinity }} />

      <OrbitNode icon={Bot} label="Agents" value={`${activeAgents} online`} className="left-[8%] top-[16%]" delay={0} />
      <OrbitNode icon={ServerCog} label="MCP servers" value="Connected" className="right-[8%] top-[16%]" tone="emerald" delay={0.5} />
      <OrbitNode icon={Wrench} label="Tools" value="Runtime ready" className="left-[6%] top-[48%]" tone="emerald" delay={1} />
      <OrbitNode icon={Workflow} label="Workflows" value={`${running} running`} className="right-[6%] top-[48%]" tone="violet" delay={1.5} />
      <OrbitNode icon={Database} label="Data pipelines" value="Realtime" className="left-[15%] bottom-[8%]" delay={2} />
      <OrbitNode icon={Network} label="Infrastructure" value="Observed" className="right-[15%] bottom-[8%]" tone="emerald" delay={2.5} />
    </div>
  );
}

function AlertPanel({ approvals = [], notifications = [], tasks = [], onNavigate }) {
  const rows = useMemo(() => {
    const failed = tasks.filter((t) => t.status === 'failed').slice(0, 2).map((t) => ({ id: `f-${t.id}`, title: t.title || 'Mission failed', detail: t.error || 'Execution exception', tone: 'rose', kind: 'failure', at: t.updated_at || t.created_at }));
    const pending = approvals.filter((a) => a.status === 'pending').slice(0, 2).map((a) => ({ id: `a-${a.id}`, title: a.title || 'Approval required', detail: a.summary || a.action_type || 'Decision required', tone: 'amber', kind: 'approval', at: a.created_at }));
    const unread = notifications.filter((n) => !n.read_at).slice(0, 3).map((n) => ({ id: `n-${n.id}`, title: n.title || 'New signal', detail: n.body || n.message || 'Blackstar update', tone: 'cyan', kind: 'signal', at: n.created_at }));
    return [...failed, ...pending, ...unread].slice(0, 6);
  }, [approvals, notifications, tasks]);

  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Live alerts & notifications</h3><Radio className="h-3.5 w-3.5 text-cyan-300" /></div>
      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {rows.length ? rows.map((row, index) => (
            <motion.button key={row.id} type="button" layout initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ delay: index * 0.04 }} onClick={() => row.kind === 'approval' ? onNavigate?.('approvals') : row.kind === 'signal' ? onNavigate?.('signals') : undefined} className={`w-full rounded-lg border px-3 py-2 text-left ${row.tone === 'rose' ? 'border-rose-400/20 bg-rose-400/[.045]' : row.tone === 'amber' ? 'border-amber-300/20 bg-amber-300/[.04]' : 'border-cyan-300/15 bg-cyan-300/[.035]'}`}>
              <div className="flex items-center justify-between text-[8px] uppercase tracking-[.12em]"><span className={row.tone === 'rose' ? 'text-rose-200' : row.tone === 'amber' ? 'text-amber-200' : 'text-cyan-200'}>{row.kind === 'failure' ? 'HIGH PRIORITY' : row.kind === 'approval' ? 'DECISION' : 'INFO'}</span><span className="text-zinc-600">{fmtTime(row.at)}</span></div>
              <p className="mt-1 truncate text-[10px] font-medium text-white">{row.title}</p><p className="mt-0.5 line-clamp-1 text-[9px] text-zinc-500">{row.detail}</p>
            </motion.button>
          )) : <motion.div animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity }} className="rounded-lg border border-emerald-300/10 bg-emerald-300/[.03] px-3 py-4 text-center text-[9px] text-emerald-200">No active alerts detected.</motion.div>}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Telemetry({ metrics = {} }) {
  const items = [
    ['Agent mesh', metrics.activeAgents ?? 0, Bot],
    ['Executions', metrics.runningTasks ?? 0, Zap],
    ['Networks', metrics.activeWorkforces ?? 0, Network],
    ['Workflow runs', metrics.runningWorkforceRuns ?? 0, Workflow],
    ['Pending approvals', metrics.pendingApprovals ?? 0, ShieldAlert],
    ['Exceptions', metrics.failedTasks ?? 0, AlertTriangle],
  ];
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">System telemetry</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
        {items.map(([label, value, Icon], index) => <motion.div key={label} className="rounded-lg border border-white/7 bg-white/[.02] p-3" animate={{ borderColor: ['rgba(255,255,255,.06)', 'rgba(34,211,238,.18)', 'rgba(255,255,255,.06)'] }} transition={{ duration: 3.2, repeat: Infinity, delay: index * 0.35 }}><div className="flex items-center gap-2 text-[8px] uppercase tracking-[.13em] text-zinc-500"><Icon className="h-3 w-3 text-cyan-300" />{label}</div><div className="mt-2 font-mono text-xl text-white">{value}</div></motion.div>)}
      </div>
    </section>
  );
}

function MissionQueue({ tasks = [], onNavigate }) {
  const rows = tasks.filter((task) => ['running', 'in_progress', 'pending', 'queued', 'waiting_for_approval'].includes(task.status)).slice(0, 6);
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Mission execution queue</h3><button type="button" onClick={() => onNavigate?.('tasks')} className="text-[8px] text-zinc-500 hover:text-white">OPEN TASKS</button></div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((task) => {
          const running = ['running', 'in_progress'].includes(task.status);
          return <div key={task.id} className="rounded-lg border border-white/7 bg-black/30 p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-[10px] text-zinc-200">{task.title || task.request || 'Mission task'}</span><span className="font-mono text-[8px] uppercase text-cyan-300">{task.status}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">{running ? <motion.div className="h-full w-1/3 rounded-full bg-cyan-300" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} /> : <div className="h-full w-1/5 rounded-full bg-violet-300/70" />}</div></div>;
        }) : <div className="rounded-lg border border-white/7 bg-black/30 px-3 py-4 text-center text-[9px] text-zinc-500">No missions currently in flight.</div>}
      </div>
    </section>
  );
}

function MissionFeed({ activities = [] }) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Live mission feed</h3><Heartbeat /></div>
      <div className="mt-2 max-h-[240px] space-y-1.5 overflow-y-auto">
        <AnimatePresence initial={false}>{activities.slice(0, 10).map((item, index) => <motion.div key={item.id || `${item.created_at}-${index}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-lg border border-white/5 bg-white/[.015] px-3 py-2"><motion.span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.1 }} /><div className="min-w-0 flex-1"><p className="truncate text-[9px] text-zinc-300">{item.message || item.title || item.action || 'Mission event'}</p><p className="mt-0.5 font-mono text-[8px] text-zinc-600">{fmtTime(item.created_at)}</p></div></motion.div>)}</AnimatePresence>
        {!activities.length ? <div className="px-3 py-4 text-center text-[9px] text-zinc-500">Waiting for live mission events.</div> : null}
      </div>
    </section>
  );
}

function RailButton({ icon: Icon, label, count, onClick }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-[9px] uppercase tracking-[.08em] text-zinc-500 transition hover:border-white/8 hover:bg-white/[.025] hover:text-zinc-200"><Icon className="h-3.5 w-3.5" /><span className="flex-1">{label}</span>{count ? <span className="rounded-full bg-amber-400/15 px-1.5 text-amber-200">{count}</span> : <ChevronRight className="h-3 w-3 opacity-40" />}</button>;
}

export default function BlackstarCommandDeck({ metrics = {}, approvals = [], notifications = [], tasks = [], activities = [], lastSync, loading = false, onNavigate }) {
  const now = useMissionClock();
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending').length;
  const failedTasks = tasks.filter((task) => task.status === 'failed').length;
  const health = failedTasks ? 'Attention required' : pendingApprovals ? 'Decisions pending' : 'Operational';

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#01050d] shadow-[0_30px_80px_rgba(0,0,0,.45)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/7 bg-black/35 px-4 py-3">
        <div className="flex items-center gap-3"><StarMark small /><div><p className="text-[8px] uppercase tracking-[.22em] text-cyan-300">Blackstar Operations</p><h1 className="text-sm font-semibold text-white">MISSION CONTROL</h1></div></div>
        <div className="ml-auto flex flex-wrap items-center gap-4 font-mono text-[9px] text-zinc-400"><span className="flex items-center gap-1.5"><motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-300" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity }} />REALTIME</span><span>{now.toLocaleTimeString('en-GB')}</span><span className={failedTasks ? 'text-rose-300' : pendingApprovals ? 'text-amber-300' : 'text-emerald-300'}>{health}</span></div>
      </div>

      <LiveTicker notifications={notifications} activities={activities} />

      <div className="grid xl:grid-cols-[180px_minmax(0,1fr)_300px]">
        <aside className="border-r border-white/7 p-3"><p className="px-3 pb-2 text-[8px] uppercase tracking-[.18em] text-zinc-700">Subsystems</p><RailButton icon={Activity} label="Overview" onClick={() => onNavigate?.('overview')} /><RailButton icon={Network} label="Orchestrator" onClick={() => onNavigate?.('orchestrator')} /><RailButton icon={ShieldAlert} label="Approvals" count={pendingApprovals} onClick={() => onNavigate?.('approvals')} /><RailButton icon={Bell} label="Signals" count={notifications.filter((n) => !n.read_at).length} onClick={() => onNavigate?.('signals')} /><RailButton icon={Database} label="Memory" onClick={() => onNavigate?.('memory')} /><div className="mt-5 rounded-lg border border-white/6 bg-white/[.015] p-3"><div className="flex items-center gap-2 text-[8px] uppercase text-zinc-600"><Globe2 className="h-3 w-3 text-cyan-300" />Global infrastructure</div><motion.div className="mt-3 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300 to-cyan-300/0" animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.45, 1, 0.45] }} transition={{ duration: 2.3, repeat: Infinity }} /><p className="mt-2 text-[9px] text-zinc-500">Realtime data plane connected.</p></div></aside>

        <main className="space-y-3 p-3">
          <HolographicCore metrics={metrics} />
          <div className="grid gap-3 lg:grid-cols-2"><Telemetry metrics={metrics} /><MissionQueue tasks={tasks} onNavigate={onNavigate} /></div>
          <MissionFeed activities={activities} />
        </main>

        <aside className="space-y-3 border-l border-white/7 p-3">
          <AlertPanel approvals={approvals} notifications={notifications} tasks={tasks} onNavigate={onNavigate} />
          <section className="rounded-xl border border-white/8 bg-[#030812] p-3"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Pending approvals</h3><div className="mt-3 flex items-center justify-between"><div className="font-mono text-3xl text-amber-200">{pendingApprovals}</div><ShieldAlert className="h-6 w-6 text-amber-300/60" /></div><button type="button" onClick={() => onNavigate?.('approvals')} className="mt-3 w-full rounded-lg border border-amber-300/15 bg-amber-300/[.04] py-2 text-[9px] uppercase tracking-[.1em] text-amber-200">Open decision queue</button></section>
          <section className="rounded-xl border border-white/8 bg-[#030812] p-3"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">System health monitor</h3><div className="mt-3 flex items-center gap-3"><motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}><HeartPulse className={failedTasks ? 'h-6 w-6 text-rose-300' : 'h-6 w-6 text-emerald-300'} /></motion.div><div><p className="text-[10px] text-white">{health}</p><p className="text-[8px] text-zinc-600">{failedTasks} visible exceptions</p></div></div><div className="mt-3"><Heartbeat /></div></section>
          <section className="rounded-xl border border-white/8 bg-[#030812] p-3"><div className="flex items-center gap-2 text-[9px] uppercase tracking-[.1em] text-zinc-400"><Clock3 className="h-3.5 w-3.5 text-cyan-300" />Last synchronization</div><p className="mt-2 font-mono text-[10px] text-white">{lastSync ? new Date(lastSync).toLocaleTimeString('en-GB') : loading ? 'Synchronizing…' : 'Awaiting sync'}</p><motion.div className="mt-3 h-1 rounded-full bg-cyan-300" animate={{ scaleX: [0.15, 1, 0.15], opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ transformOrigin: 'left' }} /></section>
        </aside>
      </div>
    </div>
  );
}
