import { motion } from 'framer-motion';
import { Bot, Activity, CheckCircle2, AlertTriangle, Gauge, Cpu } from 'lucide-react';
import { SectionHead } from './wfShared';

const METRICS = [
  { key: 'activeAgents', label: 'Active nodes', icon: Bot, tone: 'violet' },
  { key: 'runningTasks', label: 'Executing', icon: Activity, tone: 'cyan' },
  { key: 'completedTasks', label: 'Completed', icon: CheckCircle2, tone: 'emerald' },
  { key: 'failedTasks', label: 'Exceptions', icon: AlertTriangle, tone: 'rose' },
];

const USAGE_LABELS = {
  agentExecutions: 'Agent executions',
  aiModelUsage: 'AI model usage',
  workflowRuns: 'Workflow runs',
  memory: 'Memory (MB)',
  storage: 'Storage (MB)',
  apiCalls: 'API calls',
  toolUsage: 'Tool usage',
  activeAgents: 'Active agents',
};

const TONES = {
  violet: 'border-violet-300/15 bg-violet-400/[.06] text-violet-200',
  cyan: 'border-cyan-300/15 bg-cyan-400/[.055] text-cyan-200',
  emerald: 'border-emerald-300/15 bg-emerald-400/[.05] text-emerald-200',
  rose: 'border-rose-300/15 bg-rose-400/[.05] text-rose-200',
};

function MetricCard({ m, value, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl ${TONES[m.tone]}`}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/25">
        <m.icon className="h-4 w-4" />
      </span>
      <p className="mt-4 text-2xl font-semibold tracking-[-.04em] text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.17em] opacity-70">{m.label}</p>
    </motion.div>
  );
}

function TaskBreakdown({ overview }) {
  const { runningTasks, pendingTasks, completedTasks, failedTasks, totalTasks } = overview;
  const segments = [
    { label: 'Executing', value: runningTasks, cls: 'bg-cyan-300' },
    { label: 'Queued', value: pendingTasks, cls: 'bg-zinc-500' },
    { label: 'Completed', value: completedTasks, cls: 'bg-violet-400' },
    { label: 'Exceptions', value: failedTasks, cls: 'bg-rose-400' },
  ];
  const total = Math.max(1, totalTasks);
  return (
    <div className="rounded-2xl border border-white/[.065] bg-black/25 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold text-white">Execution ledger</p>
      <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-600">{totalTasks} task{totalTasks === 1 ? '' : 's'} observed</p>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/[.06]">
        {segments.map((s) => s.value > 0 && (
          <div key={s.label} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border border-white/[.05] bg-white/[.02] px-2.5 py-2">
            <span className={`h-1.5 w-1.5 rounded-full ${s.cls}`} />
            <span className="text-[10px] text-zinc-500">{s.label}</span>
            <span className="ml-auto text-[11px] font-medium text-zinc-200">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsagePanel({ usage }) {
  const entries = Object.entries(usage || {}).filter(([, v]) => v);
  return (
    <div className="rounded-2xl border border-white/[.065] bg-black/25 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold text-white">Infrastructure consumption</p>
      <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-600">Current billing cycle</p>
      {entries.length ? (
        <div className="mt-4 space-y-3">
          {entries.map(([k, v]) => {
            const max = Math.max(...entries.map(([, n]) => n), 1);
            return (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">{USAGE_LABELS[k] || k}</span>
                  <span className="font-medium text-zinc-200">{v.toLocaleString()}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-violet-300/70" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-zinc-600">No infrastructure consumption recorded this period.</p>
      )}
    </div>
  );
}

export default function WorkforceCommandCentre({ overview, loading }) {
  const o = overview || {};
  return (
    <section className="mb-8 rounded-3xl border border-white/[.06] bg-gradient-to-b from-white/[.025] to-black/20 p-4 shadow-[0_20px_80px_rgba(0,0,0,.22)] backdrop-blur-2xl sm:p-5">
      <SectionHead icon={Gauge} title="Workforce telemetry" desc="live autonomous operations" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((m, i) => (
          <MetricCard key={m.key} m={m} value={loading ? '—' : (o[m.key] ?? 0)} i={i} />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[.065] bg-black/25 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600"><Cpu className="h-3 w-3" />Completion reliability</div>
            <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white">{loading ? '—' : `${o.performance ?? 0}%`}</p>
            <p className="mt-1 text-[10px] text-zinc-600">successful completions vs terminal runs</p>
          </div>
          <div className="rounded-2xl border border-white/[.065] bg-black/25 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600"><Bot className="h-3 w-3" />Network capacity</div>
            <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white">{loading ? '—' : (o.totalAgents ?? 0)}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{o.activeAgents ?? 0} active · {(o.totalAgents ?? 0) - (o.activeAgents ?? 0)} standby</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <TaskBreakdown overview={o} />
          <UsagePanel usage={o.usage} />
        </div>
      </div>
    </section>
  );
}
