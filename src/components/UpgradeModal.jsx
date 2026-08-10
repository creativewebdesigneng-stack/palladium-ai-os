import { Link } from 'react-router-dom';
import { Lock, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useUpgrade } from '@/lib/upgradeContext';
import { getPlanKey, planDisplay, FEATURE_LABELS } from '@/lib/permissions';
import { FREEMIUM_PLANS } from '@/components/site/pricingPlans';

// Shown when a user attempts a feature their plan doesn't include. Explains
// the requirement, lists Pro benefits, shows the current plan, and links to
// checkout. Driven by the upgrade context (src/lib/upgradeContext.jsx).
export default function UpgradeModal() {
  const { user } = useAuth();
  const { activeFeature, close } = useUpgrade();
  if (!activeFeature) return null;

  const currentKey = getPlanKey(user);
  const current = planDisplay(currentKey);
  const pro = FREEMIUM_PLANS.find(p => p.id === 'pro');
  const benefits = [
    FEATURE_LABELS[activeFeature] || 'This feature',
    'Create & deploy custom AI agents',
    'Run AI workforce tasks',
    'Basic workflow builder & agent templates',
    'Agent memory, analytics & integrations',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d13] p-7 shadow-2xl">
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_30px_rgba(139,92,246,.4)]">
            <Lock className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              Current plan · {current.name}{current.subtitle ? ` ${current.subtitle}` : ''}
            </p>
            <h2 className="text-lg font-semibold text-white">Upgrade to PalladiumAI Pro</h2>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          This feature requires PalladiumAI Pro (£20/month). Upgrade to unlock the full builder experience.
        </p>

        <div className="mt-4 flex items-end gap-1.5">
          <span className="text-3xl font-semibold text-white">£{pro.monthly}</span>
          <span className="mb-1 text-sm text-zinc-500">/month</span>
        </div>

        <ul className="mt-4 space-y-2.5 text-[13px] text-zinc-300">
          {benefits.map(b => (
            <li key={b} className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" /> {b}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex gap-2">
          <Link to="/payment?plan=pro" className="pbtn pbtn-primary flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:opacity-90">
            <Sparkles className="h-4 w-4" /> Upgrade to Pro
          </Link>
          <button onClick={close} className="pbtn pbtn-secondary rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}