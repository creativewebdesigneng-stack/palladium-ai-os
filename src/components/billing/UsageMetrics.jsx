import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useUsage, getPlanLimits, USAGE_METRIC_LABELS } from '@/lib/usage';

const GRAD = { agentExecutions: 'from-violet-500 to-indigo-500', activeAgents: 'from-sky-500 to-cyan-500', aiModelUsage: 'from-fuchsia-500 to-pink-500', workflowRuns: 'from-amber-500 to-orange-500', memory: 'from-emerald-500 to-teal-500', storage: 'from-rose-500 to-red-500', apiCalls: 'from-cyan-500 to-blue-500', toolUsage: 'from-indigo-500 to-purple-500' };

export default function UsageMetrics() {
  const { user } = useAuth();
  const usage = useUsage();
  const limits = getPlanLimits(user);

  const metrics = Object.keys(USAGE_METRIC_LABELS).map((id) => ({
    id, label: USAGE_METRIC_LABELS[id], value: usage[id] || 0, max: limits[id], grad: GRAD[id] ?? 'from-violet-500 to-indigo-500',
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {metrics.map((m) => {
        const unlimited = m.max == null;
        const pct = unlimited || !m.max ? 0 : Math.min(100, Math.round((m.value / m.max) * 100));
        const warn = pct >= 85;
        return (
          <div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">{m.label}</p>
              {!unlimited && <p className={`text-[10px] ${warn ? 'text-amber-400' : 'text-zinc-500'}`}>{pct}% used</p>}
            </div>
            <p className="mt-1 text-sm font-medium text-white">
              {m.value.toLocaleString()} <span className="text-[11px] font-normal text-zinc-500">/ {unlimited ? 'Unlimited' : m.max.toLocaleString()}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div className={`h-full rounded-full bg-gradient-to-r ${m.grad}`}
                initial={{ width: 0 }} animate={{ width: `${unlimited ? 100 : pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
