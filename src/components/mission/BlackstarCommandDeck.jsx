import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  Database,
  Globe2,
  HeartPulse,
  Network,
  Radio,
  ServerCog,
  ShieldAlert,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

const fmtTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

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
  return (
    <motion.div
      className={`relative grid place-items-center ${small ? 'h-8 w-8' : 'h-20 w-20'}`}
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: small ? 18 : 13, repeat: Infinity, ease: 'linear' }}
    >
      <div className="absolute inset-[10%] rotate-45 border border-cyan-300/80 shadow-[0_0_20px_rgba(34,211,238,.4)]" />
      <div className="absolute inset-[20%] border border-violet-300/90 shadow-[0_0_22px_rgba(167,139,250,.45)]" />
      <div className="absolute h-[76%] w-px bg-gradient-to-b from-transparent via-white to-transparent" />
      <div className="absolute h-px w-[76%] bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,.95)]" />
    </motion.div>
  );
}

function TopMetric({ label, value, sub, accent = 'text-white' }) {
  return (
    <div className="min-w-[122px] border-l border-white/8 px-4 py-2 first:border-l-0">
      <p className="text-[8px] uppercase tracking-[.18em] text-zinc-600">{label}</p>
      <div className={`mt-1 font-mono text-lg font-semibold tracking-[-.03em] ${accent}`}>{value}</div>
      {sub ? <p className="mt-0.5 text-[8px] text-zinc-600">{sub}</p> : null}
    </div>
  );
}

function MiniSparkline({ values = [4, 8, 5, 11, 7, 13, 8, 15, 10, 17, 12], tone = 'cyan' }) {
  const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${30 - v}`).join(' ');
  const stroke = tone === 'violet' ? '#a78bfa' : tone === 'amber' ? '#fbbf24' : tone === 'emerald' ? '#34d399' : '#22d3ee';
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.4" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function RingGauge({ value = 0, label, tone = 'emerald' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const color = tone === 'amber' ? '#fbbf24' : tone === 'rose' ? '#fb7185' : tone === 'cyan' ? '#22d3ee' : '#34d399';
  return (
    <div className="text-center">
      <div className="relative mx-auto h-16 w-16">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="16" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
          <circle cx="21" cy="21" r="16" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${safe} ${100 - safe}`} pathLength="100" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-sm text-white">{Math.round(safe)}%</span>
      </div>
      <p className="mt-1 text-[8px] uppercase tracking-[.14em] text-zinc-600">{label}</p>
    </div>
  );
}

function RailButton({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[10px] uppercase tracking-[.08em] transition ${
        active
          ? 'border-cyan-300/20 bg-cyan-400/[.08] text-cyan-100 shadow-[inset_2px_0_0_rgba(34,211,238,.85)]'
          : 'border-transparent text-zinc-500 hover:border-white/8 hover:bg-white/[.025] hover:text-zinc-300'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1">{label}</span>
      {count ? <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[8px] text-rose-200">{count}</span> : <ChevronRight className="h-3 w-3 opacity-25 group-hover:opacity-70" />}
    </button>
  );
}

function OrbitNode({ icon: Icon, label, value, className, tone = 'cyan', delay = 0 }) {
  const reduced = useReducedMotion();
  const dot = tone === 'emerald' ? 'bg-emerald-300' : tone === 'violet' ? 'bg-violet-300' : tone === 'amber' ? 'bg-amber-300' : 'bg-cyan-300';
  return (
    <motion.div
      className={`absolute z-20 min-w-[132px] rounded-lg border border-white/10 bg-black/75 px-3 py-2 backdrop-blur-xl ${className}`}
      animate={reduced ? undefined : { y: [0, -4, 0], boxShadow: ['0 0 0 rgba(0,0,0,0)', '0 0 24px rgba(56,189,248,.08)', '0 0 0 rgba(0,0,0,0)'] }}
      transition={{ duration: 4.5, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[.13em] text-zinc-500"><Icon className="h-3 w-3 text-zinc-300" />{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-200"><span className={`h-1.5 w-1.5 rounded-full ${dot} shadow-[0_0_10px_currentColor]`} />{value}</div>
    </motion.div>
  );
}

function HolographicCore({ metrics }) {
  const reduced = useReducedMotion();
  const activeAgents = metrics?.activeAgents ?? 0;
  const running = Number(metrics?.runningTasks || 0) + Number(metrics?.runningWorkforceRuns || 0);
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-cyan-300/10 bg-[#020712]">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(34,211,238,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(124,58,237,.13),transparent_35%)]" />
      <motion.div
        className="absolute left-1/2 top-[54%] h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 shadow-[0_0_70px_rgba(37,99,235,.18)] sm:h-[390px] sm:w-[390px]"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 72, 144, 216, 288].map((deg) => (
          <span key={deg} className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.9)]" style={{ transform: `rotate(${deg}deg) translateX(188px)` }} />
        ))}
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-[54%] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/25"
        animate={reduced ? undefined : { rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2">
        <StarMark />
      </div>
      <div className="absolute inset-x-[18%] bottom-[12%] h-12 rounded-[50%] border border-cyan-300/25 shadow-[0_0_40px_rgba(34,211,238,.24)]" />
      <div className="absolute inset-x-[28%] bottom-[15%] h-8 rounded-[50%] border border-violet-300/25" />
      <motion.div
        className="absolute bottom-[15%] left-1/2 h-20 w-px -translate-x-1/2 bg-gradient-to-t from-white via-cyan-300 to-transparent shadow-[0_0_20px_rgba(34,211,238,.9)]"
        animate={reduced ? undefined : { opacity: [.35, 1, .35], scaleY: [.8, 1.1, .8] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      <OrbitNode icon={Bot} label="Agents" value={`${activeAgents} online`} className="left-[12%] top-[18%]" delay={0} />
      <OrbitNode icon={ServerCog} label="MCP servers" value="Connected" className="right-[10%] top-[18%]" tone="emerald" delay={0.7} />
      <OrbitNode icon={Wrench} label="Tools" value="Runtime ready" className="left-[8%] top-[48%]" tone="emerald" delay={1.4} />
      <OrbitNode icon={Workflow} label="Workflows" value={`${running} running`} className="right-[8%] top-[48%]" tone="violet" delay={2.1} />
      <OrbitNode icon={Database} label="Data pipelines" value="Realtime" className="left-[18%] bottom-[10%]" delay={2.8} />
      <OrbitNode icon={Network} label="Infrastructure" value="Observed" className="right-[18%] bottom-[10%]" tone="emerald" delay={3.5} />
    </div>
  );
}

function AlertPanel({ approvals = [], notifications = [], tasks = [], onApprovals, onSignals }) {
  const rows = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'pending').slice(0, 2).map((a) => ({
      id: `a-${a.id}`,
      title: a.title || 'Approval required',
      detail: a.summary || a.action_type || 'Human decision gate',
      tone: 'amber',
      at: a.created_at,
      kind: 'approval',
    }));
    const failed = tasks.filter((t) => t.status === 'failed').slice(0, 1).map((t) => ({
      id: `f-${t.id}`,
      title: t.title || 'Mission execution failed',
      detail: t.error || 'Execution exception requires review',
      tone: 'rose',
      at: t.updated_at || t.created_at,
      kind: 'failure',
    }));
    const unread = notifications.filter((n) => !n.read_at).slice(0, 3).map((n) => ({
      id: `n-${n.id}`,
      title: n.title || 'New intelligence signal',
      detail: n.body || n.message || 'New notification',
      tone: 'cyan',
      at: n.created_at,
      kind: 'signal',
    }));
    return [...failed, ...pending, ...unread].slice(0, 6);
  }, [approvals, notifications, tasks]);

  const toneClass = {
    rose: 'border-rose-400/20 bg-rose-400/[.045] text-rose-200',
    amber: 'border-amber-300/20 bg-amber-300/[.04] text-amber-200',
    cyan: 'border-cyan-300/15 bg-cyan-300/[.035] text-cyan-200',
  };

  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Live alerts & notifications</h3><span className="text-[8px] text-zinc-600">VIEW ALL</span></div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row, index) => (
          <motion.button
            type="button"
            key={row.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={row.kind === 'approval' ? onApprovals : row.kind === 'signal' ? onSignals : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-left ${toneClass[row.tone]} ${row.kind === 'failure' ? 'cursor-default' : 'hover:border-white/25'}`}
          >
            <div className="flex items-center justify-between gap-3"><span className="text-[8px] font-semibold uppercase tracking-[.12em]">{row.kind === 'failure' ? 'HIGH PRIORITY' : row.kind === 'approval' ? 'DECISION' : 'INFO'}</span><span className="text-[8px] text-zinc-600">{fmtTime(row.at)}</span></div>
            <p className="mt-1 truncate text-[10px] font-medium text-white">{row.title}</p>
            <p className="mt-0.5 line-clamp-1 text-[9px] text-zinc-500">{row.detail}</p>
          </motion.button>
        )) : (
          <div className="rounded-lg border border-emerald-300/10 bg-emerald-300/[.03] px-3 py-4 text-center text-[9px] text-emerald-200">No active alerts detected.</div>
        )}
      </div>
    </section>
  );
}

function TelemetryPanel({ metrics = {} }) {
  const running = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  const telemetry = [
    ['CPU', Math.min(100, 28 + running * 4), 'cyan'],
    ['MEMORY', Math.min(100, 46 + Number(metrics.activeAgents || 0) * 2), 'violet'],
    ['NETWORK', Math.min(100, 18 + Number(metrics.activeWorkforces || 0) * 5), 'amber'],
    ['STORAGE', Math.min(100, 38 + Number(metrics.completedTasks || 0)), 'emerald'],
  ];
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">System telemetry</h3><span className="flex items-center gap-1 text-[8px] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />LIVE</span></div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {telemetry.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-white/6 bg-white/[.02] p-2"><p className="text-[8px] text-zinc-600">{label}</p><p className="mt-1 font-mono text-base text-white">{Math.round(value)}%</p><MiniSparkline tone={tone} /></div>
        ))}
      </div>
    </section>
  );
}

function MissionQueue({ tasks = [] }) {
  const ordered = [...tasks].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 5);
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Mission execution queue</h3><span className="text-[8px] text-zinc-600">VIEW ALL</span></div>
      <div className="mt-3 space-y-2">
        {ordered.length ? ordered.map((task, i) => {
          const running = ['running', 'in_progress'].includes(task.status);
          const failed = task.status === 'failed';
          const done = task.status === 'completed';
          return (
            <div key={task.id} className="grid grid-cols-[18px_1fr_110px_72px] items-center gap-2 text-[9px]">
              <span className="text-zinc-600">{i + 1}</span>
              <div className="min-w-0"><p className="truncate text-zinc-300">{task.title || task.name || 'Untitled mission'}</p><p className="text-[8px] uppercase tracking-[.08em] text-zinc-650">{task.status || 'queued'}</p></div>
              <div className="relative h-1 overflow-hidden rounded-full bg-white/6">
                {running ? <motion.div className="absolute inset-y-0 w-1/3 bg-emerald-300" animate={{ x: ['-100%', '400%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }} /> : <div className={`h-full ${done ? 'w-full bg-emerald-300' : failed ? 'w-full bg-rose-400' : 'w-1/4 bg-amber-300'}`} />}
              </div>
              <span className={`text-right uppercase ${failed ? 'text-rose-300' : done ? 'text-emerald-300' : running ? 'text-cyan-300' : 'text-zinc-500'}`}>{done ? 'done' : failed ? 'failed' : running ? 'live' : 'queued'}</span>
            </div>
          );
        }) : <p className="py-4 text-center text-[9px] text-zinc-600">No missions currently visible.</p>}
      </div>
    </section>
  );
}

function LiveFeed({ activities = [] }) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Live mission feed</h3><span className="flex items-center gap-1 text-[8px] text-emerald-300"><Radio className="h-2.5 w-2.5" />LIVE</span></div>
      <div className="mt-3 space-y-2">
        {activities.slice(0, 6).map((a, i) => (
          <motion.div key={a.id || `${a.created_at}-${i}`} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-[54px_12px_1fr] gap-2 text-[9px]">
            <span className="font-mono text-zinc-600">{fmtTime(a.created_at)}</span>
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,.8)]" />
            <div><p className="line-clamp-1 text-zinc-300">{a.message}</p><p className="mt-0.5 text-[8px] uppercase tracking-[.08em] text-violet-300/60">{String(a.kind || 'activity').replaceAll('_', ' ')}</p></div>
          </motion.div>
        ))}
        {!activities.length ? <p className="py-4 text-center text-[9px] text-zinc-600">No live events yet.</p> : null}
      </div>
    </section>
  );
}

function MissionSummary({ metrics = {} }) {
  const completed = Number(metrics.completedTasks || 0);
  const failed = Number(metrics.failedTasks || 0);
  const running = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  const total = completed + failed + running;
  const success = completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : 100;
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Mission summary</h3><span className="text-[8px] text-zinc-600">LIVE</span></div>
      <div className="mt-3 grid grid-cols-[92px_1fr] items-center gap-3">
        <RingGauge value={success} label="success" />
        <div className="space-y-1.5 text-[9px]"><p className="flex justify-between text-zinc-500"><span>Completed</span><span className="text-emerald-300">{completed}</span></p><p className="flex justify-between text-zinc-500"><span>Running</span><span className="text-cyan-300">{running}</span></p><p className="flex justify-between text-zinc-500"><span>Failed</span><span className="text-rose-300">{failed}</span></p><p className="flex justify-between border-t border-white/6 pt-1.5 text-zinc-400"><span>Total visible</span><span className="text-white">{total}</span></p></div>
      </div>
    </section>
  );
}

function PendingApprovals({ approvals = [], onApprovals }) {
  const pending = approvals.filter((a) => a.status === 'pending').slice(0, 3);
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-white">Pending approvals</h3><span className="text-[8px] text-amber-300">{pending.length}</span></div>
      <div className="mt-3 space-y-2">
        {pending.map((a, i) => <div key={a.id} className={`rounded-lg border px-3 py-2 ${i === 0 ? 'border-rose-400/20 bg-rose-400/[.035]' : 'border-amber-300/15 bg-amber-300/[.03]'}`}><p className="text-[9px] text-white">{a.title || 'Approval required'}</p><p className="mt-0.5 text-[8px] text-zinc-600">{a.action_type || 'Human decision gate'}</p></div>)}
        {!pending.length ? <p className="py-3 text-center text-[9px] text-zinc-600">No approvals waiting.</p> : null}
      </div>
      <button type="button" onClick={onApprovals} className="mt-3 w-full rounded-lg border border-amber-300/25 bg-amber-300/[.05] px-3 py-2 text-[9px] font-semibold uppercase tracking-[.12em] text-amber-200 hover:bg-amber-300/[.09]">Review all approvals</button>
    </section>
  );
}

function GlobalInfrastructure({ metrics = {} }) {
  const nodes = Number(metrics.activeWorkforces || 0) + Number(metrics.activeAgents || 0);
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/8 bg-[#030812] p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-200">Global infrastructure</h3>
      <div className="relative mt-3 h-28 overflow-hidden rounded-lg border border-cyan-300/8 bg-[radial-gradient(circle_at_30%_55%,rgba(34,211,238,.13),transparent_18%),radial-gradient(circle_at_70%_42%,rgba(139,92,246,.13),transparent_20%)]">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(34,211,238,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.05)_1px,transparent_1px)] [background-size:18px_18px]" />
        {[18, 32, 48, 63, 78].map((x, i) => <motion.span key={x} className={`absolute h-2 w-2 rounded-full ${i === 2 ? 'bg-violet-300' : 'bg-cyan-300'} shadow-[0_0_12px_currentColor]`} style={{ left: `${x}%`, top: `${35 + (i % 3) * 15}%` }} animate={{ scale: [1, 1.8, 1], opacity: [.5, 1, .5] }} transition={{ duration: 2.5 + i * .3, repeat: Infinity }} />)}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M18 20 C32 5 48 28 63 15 S78 24 88 12" fill="none" stroke="rgba(34,211,238,.35)" strokeWidth=".5" strokeDasharray="2 2" /></svg>
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-zinc-600"><span>{Math.max(1, Number(metrics.activeWorkforces || 0))} active networks</span><span>{nodes} observed nodes</span></div>
    </section>
  );
}

function Heartbeat({ metrics = {} }) {
  const reduced = useReducedMotion();
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3">
      <div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-cyan-300" /><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-200">Agent heartbeat</h3></div>
      <div className="relative mt-3 h-24 overflow-hidden rounded-lg border border-cyan-300/8 bg-cyan-300/[.015]">
        <motion.svg viewBox="0 0 320 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <motion.path
            d="M0 42 H48 L58 42 L66 20 L75 62 L86 12 L96 42 H145 L156 42 L165 28 L174 53 L184 22 L194 42 H242 L252 42 L260 18 L270 60 L282 28 L292 42 H320"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: .4 }}
            animate={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1], opacity: [.4, 1, .4] }}
            transition={{ duration: 3.5, repeat: reduced ? 0 : Infinity, ease: 'linear' }}
          />
        </motion.svg>
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" animate={reduced ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }}><HeartPulse className="h-12 w-12 text-cyan-200/30" /></motion.div>
      </div>
      <div className="mt-2 flex justify-between"><div><p className="font-mono text-lg text-white">{metrics.activeAgents ?? 0}</p><p className="text-[8px] uppercase text-zinc-600">agents online</p></div><div className="text-right"><p className="font-mono text-lg text-emerald-300">LIVE</p><p className="text-[8px] uppercase text-zinc-600">heartbeat stream</p></div></div>
    </section>
  );
}

function HealthMonitor({ metrics = {} }) {
  const failed = Number(metrics.failedTasks || 0);
  const completed = Number(metrics.completedTasks || 0);
  const score = completed + failed ? Math.round((completed / (completed + failed)) * 100) : 100;
  const gauges = [['Core', score], ['Network', failed ? Math.max(65, score - 8) : 100], ['Agents', metrics.activeAgents ? 100 : 90], ['Workflows', metrics.runningWorkforceRuns ? 100 : 95]];
  return (
    <section className="rounded-xl border border-white/8 bg-[#030812] p-3"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-200">System health monitor</h3><div className="mt-3 grid grid-cols-4 gap-2">{gauges.map(([label, value]) => <RingGauge key={label} value={value} label={label} tone={value < 80 ? 'amber' : 'emerald'} />)}</div></section>
  );
}

function LiveTicker({ activities = [], notifications = [] }) {
  const reduced = useReducedMotion();
  const items = [
    ...activities.slice(0, 4).map((a) => a.message),
    ...notifications.slice(0, 3).map((n) => n.title || n.body || n.message),
  ].filter(Boolean);
  const text = items.length ? items.join('   •   ') : 'Blackstar Mission Control live systems connected   •   Waiting for operational events';
  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-300/10 bg-[#020711] py-2 text-[9px] uppercase tracking-[.09em] text-cyan-200">
      <motion.div className="whitespace-nowrap" animate={reduced ? undefined : { x: ['0%', '-55%'] }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}><span className="mx-6 text-emerald-300">● LIVE</span>{text}<span className="mx-10">{text}</span></motion.div>
    </div>
  );
}

export default function BlackstarCommandDeck({
  metrics = {},
  approvals = [],
  notifications = [],
  tasks = [],
  activities = [],
  lastSync,
  onNavigate,
}) {
  const now = useMissionClock();
  const pending = approvals.filter((a) => a.status === 'pending').length;
  const running = Number(metrics.runningTasks || 0) + Number(metrics.runningWorkforceRuns || 0);
  const completed = Number(metrics.completedTasks || 0);
  const failed = Number(metrics.failedTasks || 0);
  const health = completed + failed ? Math.round((completed / (completed + failed)) * 100) : 100;
  const rail = [
    ['overview', 'Overview', CircleGauge],
    ['tasks', 'Missions', Zap],
    ['personal', 'Agents', Bot],
    ['professional', 'Workflows', Workflow],
    ['orchestrator', 'Infrastructure', Network],
    ['shopping', 'Tools & MCP', Wrench],
    ['signals', 'Alerts', AlertTriangle],
    ['approvals', 'Approvals', ShieldAlert],
    ['memory', 'Memory', Database],
    ['audit', 'Audit', Activity],
  ];

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-cyan-300/10 bg-[#01050d] shadow-[0_30px_100px_rgba(0,0,0,.5)]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,.08),transparent_36%)]" />
      <div className="relative z-10 border-b border-white/8 bg-[#020711]/95 px-3 py-2 backdrop-blur-xl">
        <div className="flex min-w-max items-stretch">
          <div className="flex w-[230px] items-center gap-3 px-2"><StarMark small /><div><p className="text-sm font-semibold tracking-[.18em] text-white">BLACKSTAR</p><p className="text-[8px] uppercase tracking-[.18em] text-zinc-600">Mission Control</p></div></div>
          <TopMetric label="System" value={failed ? 'ATTENTION' : 'OPERATIONAL'} sub={failed ? `${failed} exception${failed === 1 ? '' : 's'} visible` : 'All visible mission paths stable'} accent={failed ? 'text-amber-300' : 'text-emerald-300'} />
          <TopMetric label="Mission time" value={now.toLocaleTimeString('en-GB', { hour12: false })} sub={now.toLocaleDateString('en-GB')} />
          <TopMetric label="Agents online" value={metrics.activeAgents ?? 0} accent="text-cyan-100" />
          <TopMetric label="Missions active" value={running} accent="text-cyan-100" />
          <TopMetric label="Workflows running" value={metrics.runningWorkforceRuns ?? 0} accent="text-violet-200" />
          <TopMetric label="Mission health" value={`${health}%`} accent={health < 80 ? 'text-amber-300' : 'text-emerald-300'} />
          <TopMetric label="Pending approvals" value={pending} accent={pending ? 'text-amber-300' : 'text-zinc-300'} />
        </div>
      </div>

      <div className="grid min-h-[900px] grid-cols-1 xl:grid-cols-[178px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/8 bg-[#020711] p-3 xl:block">
          <div className="space-y-1">{rail.map(([id, label, Icon]) => <RailButton key={id} active={id === 'overview'} icon={Icon} label={label} count={id === 'alerts' ? Number(metrics.unreadNotifications || 0) : id === 'approvals' ? pending : 0} onClick={() => onNavigate(id)} />)}</div>
          <div className="mt-10 space-y-2">
            <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3"><p className="text-[8px] uppercase tracking-[.14em] text-zinc-600">System status</p><p className="mt-1 text-[10px] font-semibold text-emerald-300">{failed ? 'ATTENTION' : 'OPERATIONAL'}</p><MiniSparkline tone="emerald" /></div>
            <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.02] p-3"><p className="flex items-center gap-1.5 text-[9px] text-cyan-200"><Radio className="h-3 w-3" />DATA SYNC LIVE</p><p className="mt-1 text-[8px] text-zinc-600">{lastSync ? `Last sync ${fmtTime(lastSync)}` : 'Waiting for sync'}</p></div>
          </div>
        </aside>

        <main className="p-3">
          <div className="mb-2 flex items-center justify-between"><div><h2 className="text-sm font-semibold uppercase tracking-[.08em] text-white">Blackstar network</h2><p className="text-[9px] text-zinc-600">Real-time global operations</p></div><div className="flex items-center gap-2 text-[8px] uppercase tracking-[.12em] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />live command fabric</div></div>

          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.65fr)]">
            <HolographicCore metrics={metrics} />
            <div className="space-y-3"><AlertPanel approvals={approvals} notifications={notifications} tasks={tasks} onApprovals={() => onNavigate('approvals')} onSignals={() => onNavigate('signals')} /><TelemetryPanel metrics={metrics} /></div>
          </div>

          <div className="mt-3 grid gap-3 2xl:grid-cols-[1.15fr_.95fr_.82fr_.82fr]">
            <MissionQueue tasks={tasks} />
            <LiveFeed activities={activities} />
            <MissionSummary metrics={metrics} />
            <PendingApprovals approvals={approvals} onApprovals={() => onNavigate('approvals')} />
          </div>

          <div className="mt-3 grid gap-3 2xl:grid-cols-[.8fr_1fr_1fr_1.15fr]">
            <section className="relative overflow-hidden rounded-xl border border-white/8 bg-[#030812] p-3"><h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-200">Blackstar core</h3><div className="mt-2 flex h-36 items-center justify-center"><div className="absolute inset-x-0 bottom-0 h-20 bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,.18),transparent_60%)]" /><StarMark /></div><div className="flex items-end justify-between"><div><p className="font-mono text-2xl text-emerald-300">{health}%</p><p className="text-[8px] uppercase text-zinc-600">mission integrity</p></div><Sparkles className="h-4 w-4 text-violet-300" /></div></section>
            <GlobalInfrastructure metrics={metrics} />
            <Heartbeat metrics={metrics} />
            <HealthMonitor metrics={metrics} />
          </div>

          <div className="mt-3"><LiveTicker activities={activities} notifications={notifications} /></div>
        </main>
      </div>
    </div>
  );
}
