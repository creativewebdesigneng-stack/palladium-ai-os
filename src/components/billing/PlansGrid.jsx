import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Loader2 } from 'lucide-react';
import { listPlans } from '@/lib/platform/platform.functions';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey } from '@/lib/permissions';

const GRAD = { explorer: 'from-zinc-400 to-zinc-600', builder: 'from-violet-500 to-indigo-500', business: 'from-emerald-500 to-teal-500', enterprise: 'from-fuchsia-500 to-purple-500' };
const CODE_TO_KEY = { explorer: 'free', builder: 'pro', business: 'business', enterprise: 'enterprise' };

export default function PlansGrid({ onSelect }) {
  const { user } = useAuth();
  const currentKey = getPlanKey(user);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listPlans()
      .then((res) => { if (!cancelled) { if (res.error) setError(res.error); else setPlans(res.plans ?? []); } })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError('Pricing is temporarily unavailable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex items-center gap-2 p-6 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading plans…</div>;
  if (error) return <p className="p-4 text-xs text-rose-300">{error}</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p, i) => {
        const isCurrent = CODE_TO_KEY[p.code] === currentKey;
        const isContact = p.code === 'enterprise';
        const isFree = p.code === 'explorer';
        const price = (p.price_pence ?? 0) / 100;
        const limits = p.limits ?? {};
        return (
          <motion.div key={p.code} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`relative flex flex-col rounded-2xl border p-4 ${p.code === 'builder' ? 'border-violet-400/40 bg-violet-500/[.06]' : 'border-white/10 bg-white/[.035]'}`}>
            {p.code === 'builder' && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-2.5 py-0.5 text-[10px] font-medium text-white">
                <Star className="mr-1 inline h-2.5 w-2.5" />Popular
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${GRAD[p.code] ?? 'from-violet-500 to-indigo-500'}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
              </span>
              <h3 className="text-sm font-semibold text-white">{p.name}</h3>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold text-white">{isContact ? 'Custom' : `£${price}`}</span>
              {!isContact && <span className="text-[11px] text-zinc-500"> / {p.billing_interval ?? 'month'}</span>}
            </div>
            {p.description && <p className="mt-2 text-[11px] text-zinc-500">{p.description}</p>}
            <div className="mt-4 space-y-2 text-[11px]">
              {Object.entries(limits).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-zinc-300">{v === -1 ? 'Unlimited' : v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onSelect?.(CODE_TO_KEY[p.code] ?? p.code)}
              disabled={isCurrent}
              className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-medium ${isCurrent ? 'cursor-default border border-white/10 text-zinc-500' : isContact ? 'border border-fuchsia-400/30 text-fuchsia-300 hover:bg-fuchsia-500/10' : isFree ? 'border border-white/10 text-zinc-300 hover:bg-white/5' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90'}`}>
              {isCurrent ? 'Current Plan' : isContact ? 'Contact Sales' : isFree ? 'Downgrade' : `Choose ${p.name}`}
            </button>
          </motion.div>
        );
      })}
      {plans.length === 0 && <p className="col-span-full text-xs text-zinc-500">No plans are available right now.</p>}
    </div>
  );
}
