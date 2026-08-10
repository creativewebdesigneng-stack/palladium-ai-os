import { motion } from 'framer-motion';
import { Bot, Zap, Cpu, Workflow, BrainCircuit, HardDrive, Code2, Wrench, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey, planDisplay } from '@/lib/permissions';
import { useUsage, getPlanLimits, USAGE_METRIC_LABELS, resetUsage } from '@/lib/usage';

const METRICS = [
  { key: 'agentExecutions', icon: Zap, unit: 'runs' },
  { key: 'activeAgents', icon: Bot, unit: 'agents' },
  { key: 'aiModelUsage', icon: Cpu, unit: 'tokens' },
  { key: 'workflowRuns', icon: Workflow, unit: 'runs' },
  { key: 'memory', icon: BrainCircuit, unit: 'GB' },
  { key: 'storage', icon: HardDrive, unit: 'GB' },
  { key: 'apiCalls', icon: Code2, unit: 'calls' },
  { key: 'toolUsage', icon: Wrench, unit: 'ops' },
];

function fmt(n) {
  if (n == null) return '∞';
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function MetricCard({ icon: Icon, label, used, max, unit, i }) {
  const unlimited = max == null;
  const pct = unlimited || !max ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-4"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-violet-300">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-lg font-semibold text-white">{fmt(used)}</span>
        <span className="text-[11px] text-zinc-500">/ {unlimited ? 'Unlimited' : `${fmt(max)} ${unit}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${unlimited ? 100 : pct}%` }} />
      </div>
      {!unlimited && <p className="mt-1.5 text-[10px] text-zinc-600">{pct}% used this month</p>}
    </motion.div>
  );
}

// Dynamic usage dashboard: shows the current plan and this-month usage across
// all tracked metrics vs the plan's limits. Usage is reactive to trackUsage();
// limits scale dramatically for the Business / Business Plus tiers.
export default function UsageDashboard() {
  const { user } = useAuth();
  const key = getPlanKey(user);
  const display = planDisplay(key);
  const limits = getPlanLimits(user);
  const usage = useUsage(user);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">Current plan</p>
          <h2 className="text-xl font-semibold text-white">{display.name}{display.subtitle ? ` — ${display.subtitle}` : ''}</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Usage this month · resets at the start of each billing cycle</p>
        </div>
        <button onClick={resetUsage} className="flex w-fit items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo usage
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m, i) => (
          <MetricCard key={m.key} icon={m.icon} label={USAGE_METRIC_LABELS[m.key]} used={usage[m.key] || 0} max={limits[m.key]} unit={m.unit} i={i} />
        ))}
      </div>
    </div>
  );
}