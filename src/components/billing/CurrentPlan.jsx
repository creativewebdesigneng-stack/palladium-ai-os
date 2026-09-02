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
  return <div><div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-zinc-400"><Icon className="h-3.5 w-3.5 text-violet-300/75" />{label}</span><span className="text-zinc-500">{displayUsed} / {displayMax}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-300/80 shadow-[0_0_14px_rgba(196,181,253,.28)]" style={{ width: `${pct}%` }} /></div></div>;
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

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[24px] border border-violet-300/12 bg-[linear-gradient(145deg,rgba(13,10,20,.94),rgba(5,5,9,.97))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
    <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.07]"><Sparkles className="h-5 w-5 text-violet-300" /></span><div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/65">Blackstar subscription</p><div className="mt-1 flex items-center gap-2"><h2 className="text-xl font-semibold text-white">{display.name}{display.subtitle ? ` — ${display.subtitle}` : ''}</h2><StatusBadge status={status} /></div><p className="mt-1 text-sm text-zinc-400"><span className="text-white">£{plan.monthly ?? 0}</span> / month{isPaid ? '' : ' · no charge'}</p></div></div>
      <div className="flex flex-wrap gap-2">{isFree ? <Link to="/payment?plan=pro" className="flex items-center gap-1.5 rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#09070d] hover:bg-violet-200"><Sparkles className="h-4 w-4" />Upgrade to Pro</Link> : <button onClick={onUpgrade} className="flex items-center gap-1.5 rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#09070d] hover:bg-violet-200"><Sparkles className="h-4 w-4" />Upgrade</button>}<button onClick={onChange} className="flex items-center gap-1.5 rounded-xl border border-violet-300/10 bg-white/[.025] px-4 py-2 text-sm text-zinc-300 hover:bg-violet-400/[.04]"><RefreshCw className="h-4 w-4" />Change plan</button>{isPaid && <button onClick={onManage} className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/[.035] px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"><X className="h-4 w-4" />Manage / Cancel</button>}</div>
    </div>
    <div className="relative mt-5 grid gap-4 border-t border-violet-300/[.07] pt-5 sm:grid-cols-3">{limits.map(l => <UsageBar key={l.label} {...l} />)}</div>
  </motion.div>;
}