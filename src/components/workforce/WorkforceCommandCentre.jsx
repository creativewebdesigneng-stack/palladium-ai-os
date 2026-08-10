import { motion } from 'framer-motion';
import { Bot, Activity, CheckCircle2, AlertTriangle, Gauge, Cpu } from 'lucide-react';
import { SectionHead } from './wfShared';

const METRICS = [
  { key: 'activeAgents', label: 'Active agents', icon: Bot, color: 'from-violet-500 to-indigo-600' },
  { key: 'runningTasks', label: 'Running tasks', icon: Activity, color: 'from-emerald-500 to-teal-600' },
  { key: 'completedTasks', label: 'Completed tasks', icon: CheckCircle2, color: 'from-amber-500 to-orange-600' },
  { key: 'failedTasks', label: 'Failed tasks', icon: AlertTriangle, color: 'from-rose-500 to-red-600' },
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

function MetricCard({ m, value, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.color} shadow-lg shadow-black/30`}>
        <m.icon className="h-4 w-4 text-white" />
      </span>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="text-xs text-zinc-400">{m.label}</p>
    </motion.div>
  );
}

function TaskBreakdown({ overview }) {
  const { runningTasks, pendingTasks, completedTasks, failedTasks, totalTasks } = overview;
  const segments = [
    { label: 'Running', value: runningTasks, cls: 'bg-emerald-500' },
    { label: 'Pending', value: pendingTasks, cls: 'bg-zinc-500' },
    { label: 'Completed', value: completedTasks, cls: 'bg-violet-500' },
    { label: 'Failed', value: failedTasks, cls: 'bg-rose-500' },
  ];
  const total = Math.max(1, totalTasks);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="text-xs font-semibold text-white">Task status</p>
      <p className="text-[10px] text-zinc-500">{totalTasks} task{totalTasks === 1 ? '' : 's'} total</p>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
        {segments.map((s) => s.value > 0 && (
          <div key={s.label} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${s.cls}`} />
            <span className="text-[11px] text-zinc-300">{s.label}</span>
            <span className="ml-auto text-[11px] font-medium text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsagePanel({ usage }) {
  const entries = Object.entries(usage || {}).filter(([, v]) => v);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="text-xs font-semibold text-white">Usage this period</p>
      <p className="text-[10px] text-zinc-500">current billing cycle</p>
      {entries.length ? (
        <div className="mt-3 space-y-2.5">
          {entries.map(([k, v]) => {
            const max = Math.max(...entries.map(([, n]) => n), 1);
            return (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">{USAGE_LABELS[k] || k}</span>
                  <span className="font-medium text-white">{v.toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-zinc-600">No usage recorded this period.</p>
      )}
    </div>
  );
}

export default function WorkforceCommandCentre({ overview, loading }) {
  const o = overview || {};
  return (
    <section className="mb-8">
      <SectionHead icon={Gauge} title="Command centre" desc="real-time workforce metrics" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((m, i) => (
          <MetricCard key={m.key} m={m} value={loading ? '—' : (o[m.key] ?? 0)} i={i} />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600"><Cpu className="h-3 w-3" />Performance</div>
            <p className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : `${o.performance ?? 0}%`}</p>
            <p className="text-[10px] text-zinc-500">completed ÷ (completed + failed)</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600"><Bot className="h-3 w-3" />Workforce size</div>
            <p className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : (o.totalAgents ?? 0)}</p>
            <p className="text-[10px] text-zinc-500">{o.activeAgents ?? 0} active · {(o.totalAgents ?? 0) - (o.activeAgents ?? 0)} other</p>
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