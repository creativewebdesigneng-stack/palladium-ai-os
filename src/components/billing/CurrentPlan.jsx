import { Sparkles, RefreshCw, X, Bot, Zap, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey, planDisplay, getUsageLimits } from '@/lib/permissions';
import { PLANS, FREEMIUM_PLANS } from '@/components/site/pricingPlans';
import { StatusBadge } from './shared';

const ALL_PLANS = [...FREEMIUM_PLANS, ...PLANS];

function UsageBar({ icon: Icon, label, used, max, unit }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const displayMax = max == null ? 'Unlimited' : `${max}${unit ? unit : ''}`;
  const displayUsed = max == null ? '—' : `${used}${unit ? unit : ''}`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-zinc-400"><Icon className="h-3.5 w-3.5" />{label}</span>
        <span className="text-zinc-500">{displayUsed} / {displayMax}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CurrentPlan({ onUpgrade, onChange, onManage }) {
  const { user } = useAuth();
  const key = getPlanKey(user);
  const plan = ALL_PLANS.find(p => p.id === key) || FREEMIUM_PLANS[0];
  const display = planDisplay(key);
  const usage = getUsageLimits(user);
  const status = user?.subscription_status || 'active';
  const isFree = key === 'free';
  const isPaid = !isFree;
  const limits = [
    { icon: Bot, label: 'Active agents', used: usage.activeAgents.used, max: usage.activeAgents.max },
    { icon: Zap, label: 'Monthly runs', used: usage.monthlyRuns.used, max: usage.monthlyRuns.max },
    { icon: HardDrive, label: 'Storage', used: usage.storage.used, max: usage.storage.max, unit: usage.storage.unit || 'GB' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/15 via-indigo-600/10 to-transparent p-5">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">{display.name}{display.subtitle ? ` — ${display.subtitle}` : ''}</h2>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              <span className="text-white">£{plan.monthly ?? 0}</span> / month{isPaid ? '' : ' · no charge'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isFree ? (
            <Link to="/payment?plan=pro" className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Upgrade to Pro
            </Link>
          ) : (
            <button onClick={onUpgrade} className="pbtn pbtn-primary flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Upgrade
            </button>
          )}
          <button onClick={onChange} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <RefreshCw className="h-4 w-4" /> Change Plan
          </button>
          {isPaid && (
            <button onClick={onManage} className="pbtn pbtn-secondary flex items-center gap-1.5 rounded-xl border border-red-400/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
              <X className="h-4 w-4" /> Manage / Cancel
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
        {limits.map(l => <UsageBar key={l.label} {...l} />)}
      </div>
    </motion.div>
  );
}