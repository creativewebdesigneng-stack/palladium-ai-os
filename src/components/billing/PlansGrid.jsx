import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { PLANS } from './billingData';
import { FREEMIUM_PLANS } from '@/components/site/pricingPlans';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey } from '@/lib/permissions';

const LIMIT_LABELS = {
  projects: 'Projects', agents: 'AI Agents', aiUsage: 'AI Usage', storage: 'Storage',
  members: 'Team Members', integrations: 'Integrations', automation: 'Automation', support: 'Support',
};

const ALL = [...FREEMIUM_PLANS, ...PLANS];

export default function PlansGrid({ onSelect }) {
  const { user } = useAuth();
  const currentId = getPlanKey(user);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {ALL.map((p, i) => {
        const isCurrent = p.id === currentId;
        const isContact = !!p.contactSales;
        const isFree = p.id === 'free';
        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`relative flex flex-col rounded-2xl border p-4 ${p.highlight ? 'border-violet-400/40 bg-violet-500/[.06]' : 'border-white/10 bg-white/[.035]'}`}>
            {p.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-2.5 py-0.5 text-[10px] font-medium text-white">
                <Star className="mr-1 inline h-2.5 w-2.5" />Popular
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${p.grad}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
              </span>
              <h3 className="text-sm font-semibold text-white">
                {p.name}{p.subtitle ? <span className="ml-1 text-[10px] font-normal text-zinc-500">{p.subtitle}</span> : null}
              </h3>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold text-white">{isContact ? 'Custom' : `£${p.price ?? p.monthly}`}</span>
              {!isContact && <span className="text-[11px] text-zinc-500"> / month</span>}
            </div>
            <div className="mt-4 space-y-2 text-[11px]">
              {Object.entries(p.limits).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-zinc-500">{LIMIT_LABELS[k]}</span>
                  <span className="font-medium text-zinc-300">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onSelect?.(p.id)}
              disabled={isCurrent}
              className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-medium ${isCurrent ? 'cursor-default border border-white/10 text-zinc-500' : isContact ? 'border border-fuchsia-400/30 text-fuchsia-300 hover:bg-fuchsia-500/10' : isFree ? 'border border-white/10 text-zinc-300 hover:bg-white/5' : p.highlight ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
              {isCurrent ? 'Current Plan' : isContact ? 'Contact Sales' : isFree ? 'Downgrade' : `Choose ${p.name}`}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}