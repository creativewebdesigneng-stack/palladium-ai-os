import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useUsage, getPlanLimits, USAGE_METRIC_LABELS } from '@/lib/usage';
import { getPlanKey } from '@/lib/permissions';

const NEXT_PLAN = { free: { name: 'Builder' }, pro: { name: 'Business' }, business: { name: 'Enterprise' } };

export default function UpgradeRecommendation({ onUpgrade }) {
  const { user } = useAuth();
  const key = getPlanKey(user);
  const usage = useUsage();
  const limits = getPlanLimits(user);
  const next = NEXT_PLAN[key];

  let hottest = null;
  for (const id of Object.keys(USAGE_METRIC_LABELS)) {
    const max = limits[id];
    if (!max) continue;
    const pct = Math.min(100, Math.round(((usage[id] || 0) / max) * 100));
    if (!hottest || pct > hottest.pct) hottest = { id, pct, value: usage[id] || 0, max };
  }

  if (!next || !hottest || hottest.pct < 75) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/[.06] to-transparent p-5">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
            <Lightbulb className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Usage recommendation</h3>
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{hottest.pct}% used</span>
            </div>
            <p className="mt-1 text-sm font-medium text-amber-200">
              Your organisation is approaching its {USAGE_METRIC_LABELS[hottest.id].toLowerCase()} limit.
            </p>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-zinc-400">
              You have used {hottest.value.toLocaleString()} of {hottest.max.toLocaleString()} ({hottest.pct}%). Upgrading to {next.name} raises this limit.
            </p>
          </div>
        </div>
        <button onClick={onUpgrade}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-900/20 hover:opacity-90">
          <Sparkles className="h-4 w-4" /> Upgrade to {next.name} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
