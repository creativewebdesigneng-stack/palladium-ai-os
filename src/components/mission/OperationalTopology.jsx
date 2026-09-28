import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell, Bot, Network, ServerCog, ShieldAlert, Workflow } from 'lucide-react';

const ACTIVE_TASK_STATUSES = new Set(['running', 'in_progress', 'pending', 'queued']);

function TopologyNode({ icon: Icon, label, count, detail, active, position, tone = 'violet' }) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-300/20 text-emerald-200'
    : tone === 'amber'
      ? 'border-amber-300/20 text-amber-200'
      : tone === 'cyan'
        ? 'border-cyan-300/20 text-cyan-200'
        : 'border-violet-300/20 text-violet-200';

  return (
    <div className={`absolute hidden w-[180px] rounded-xl border bg-black/75 p-3 backdrop-blur-xl md:block ${toneClass} ${position}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[8px] uppercase tracking-[.14em] text-zinc-500">
          <Icon className="h-3.5 w-3.5" />{label}
        </span>
        <span className="font-mono text-base text-white">{count}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-zinc-400">{detail}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[8px] uppercase tracking-[.12em]">
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-current' : 'bg-zinc-700'}`} />
        {active ? 'live path' : 'idle'}
      </div>
    </div>
  );
}

function Path({ d, active, delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <>
      <path d={d} fill="none" stroke="rgba(167,139,250,.14)" strokeWidth="1" />
      {active ? (
        <motion.path
          d={d}
          fill="none"
          stroke="rgba(125,211,252,.72)"
          strokeWidth="1.4"
          strokeDasharray="8 24"
          initial={false}
          animate={reduced ? undefined : { strokeDashoffset: [0, -64] }}
          transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: 'linear', delay }}
        />
      ) : null}
    </>
  );
}

export default function OperationalTopology({
  metrics = {},
  tasks = [],
  approvals = [],
  notifications = [],
  activities = [],
  connectedIntegrations = [],
}) {
  const reduced = useReducedMotion();
  const state = useMemo(() => {
    const inFlight = tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status));
    const pendingApprovals = approvals.filter((approval) => approval.status === 'pending');
    const unreadSignals = notifications.filter((notification) => !notification.read_at);
    const latestActivity = activities.find((item) => item?.message || item?.title || item?.action);
    const providerNames = connectedIntegrations
      .map((integration) => integration?.name || integration?.provider)
      .filter(Boolean)
      .slice(0, 3);
    const taskNames = inFlight
      .map((task) => task?.title || task?.request)
      .filter(Boolean)
      .slice(0, 2);

    return {
      providers: connectedIntegrations.length,
      providerDetail: providerNames.length ? providerNames.join(' · ') : 'No external provider links detected.',
      missions: inFlight.length,
      missionDetail: taskNames.length ? taskNames.join(' · ') : 'No missions currently in flight.',
      approvals: pendingApprovals.length,
      approvalDetail: pendingApprovals[0]?.title || pendingApprovals[0]?.summary || 'No approval gates waiting.',
      signals: unreadSignals.length,
      signalDetail: unreadSignals[0]?.title || unreadSignals[0]?.body || unreadSignals[0]?.message || 'No unread signals.',
      workforces: Number(metrics.activeWorkforces || 0),
      workforceDetail: Number(metrics.activeWorkforces || 0)
        ? `${Number(metrics.activeWorkforces || 0)} active workforce${Number(metrics.activeWorkforces || 0) === 1 ? '' : 's'}`
        : 'No active workforce runs detected.',
      latestActivity: latestActivity?.message || latestActivity?.title || latestActivity?.action || 'Awaiting the next operational event.',
    };
  }, [activities, approvals, connectedIntegrations, metrics.activeWorkforces, notifications, tasks]);

  const activePaths = state.providers + state.missions + state.approvals + state.signals + state.workforces;

  const mobileNodes = [
    ['Provider links', state.providers, state.providerDetail, ServerCog],
    ['Missions', state.missions, state.missionDetail, Workflow],
    ['Approval gates', state.approvals, state.approvalDetail, ShieldAlert],
    ['Signals', state.signals, state.signalDetail, Bell],
    ['Workforces', state.workforces, state.workforceDetail, Bot],
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-cyan-300/10 bg-[#02060f]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/7 px-4 py-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.15em] text-white">Live operational topology</p>
          <p className="mt-1 text-[8px] uppercase tracking-[.12em] text-zinc-600">Logical topology · live account state · not geographic telemetry</p>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[9px] text-cyan-200">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-cyan-300"
            animate={reduced || activePaths === 0 ? undefined : { opacity: [0.25, 1, 0.25] }}
            transition={reduced || activePaths === 0 ? undefined : { duration: 1.2, repeat: Infinity }}
          />
          {activePaths} active path{activePaths === 1 ? '' : 's'}
        </div>
      </div>

      <div className="relative min-h-[380px] overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(125,211,252,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,.035)_1px,transparent_1px)] [background-size:30px_30px]" />
        <svg aria-hidden="true" viewBox="0 0 1000 380" className="absolute inset-0 hidden h-full w-full md:block">
          <Path d="M500 190 C390 145 315 100 205 82" active={state.providers > 0} delay={0} />
          <Path d="M500 190 C390 235 315 275 205 298" active={state.missions > 0} delay={0.4} />
          <Path d="M500 190 C610 145 685 100 795 82" active={state.approvals > 0} delay={0.8} />
          <Path d="M500 190 C610 235 685 275 795 298" active={state.signals > 0} delay={1.2} />
          <Path d="M500 190 C500 235 500 290 500 337" active={state.workforces > 0} delay={1.6} />
        </svg>

        <motion.div
          className="absolute left-1/2 top-[46%] hidden h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/[.055] shadow-[0_0_60px_rgba(124,58,237,.16)] md:flex"
          animate={reduced || activePaths === 0 ? undefined : { boxShadow: ['0 0 28px rgba(124,58,237,.08)', '0 0 70px rgba(124,58,237,.22)', '0 0 28px rgba(124,58,237,.08)'] }}
          transition={reduced || activePaths === 0 ? undefined : { duration: 3.8, repeat: Infinity }}
        >
          <div className="text-center">
            <Network className="mx-auto h-6 w-6 text-violet-200" />
            <p className="mt-2 text-[8px] uppercase tracking-[.13em] text-zinc-400">Orchestration mesh</p>
            <p className="mt-1 font-mono text-lg text-white">{activePaths}</p>
          </div>
        </motion.div>

        <TopologyNode icon={ServerCog} label="Provider links" count={state.providers} detail={state.providerDetail} active={state.providers > 0} position="left-[3%] top-[9%]" tone="emerald" />
        <TopologyNode icon={Workflow} label="Missions" count={state.missions} detail={state.missionDetail} active={state.missions > 0} position="bottom-[9%] left-[3%]" tone="violet" />
        <TopologyNode icon={ShieldAlert} label="Approval gates" count={state.approvals} detail={state.approvalDetail} active={state.approvals > 0} position="right-[3%] top-[9%]" tone="amber" />
        <TopologyNode icon={Bell} label="Signals" count={state.signals} detail={state.signalDetail} active={state.signals > 0} position="bottom-[9%] right-[3%]" tone="cyan" />
        <TopologyNode icon={Bot} label="Workforces" count={state.workforces} detail={state.workforceDetail} active={state.workforces > 0} position="bottom-[3%] left-1/2 -translate-x-1/2" tone="emerald" />

        <div className="grid gap-2 p-3 md:hidden">
          {mobileNodes.map(([label, count, detail, Icon]) => (
            <div key={label} className="rounded-lg border border-white/7 bg-black/35 p-3">
              <div className="flex items-center gap-2 text-[8px] uppercase tracking-[.12em] text-zinc-500"><Icon className="h-3.5 w-3.5 text-violet-300" />{label}<span className="ml-auto font-mono text-sm text-white">{count}</span></div>
              <p className="mt-1.5 line-clamp-2 text-[9px] text-zinc-400">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-white/7 bg-black/25 px-4 py-2.5">
        <span className="shrink-0 text-[8px] uppercase tracking-[.13em] text-zinc-600">Latest event</span>
        <p className="min-w-0 truncate text-[9px] text-zinc-300">{state.latestActivity}</p>
      </div>
    </section>
  );
}
