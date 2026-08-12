import { useEffect, useState } from 'react';
import { Check, Minus, Loader2 } from 'lucide-react';
import { listPlans } from '@/lib/platform/platform.functions';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey } from '@/lib/permissions';
import { friendlyMessage } from '@/lib/errors';

const CODE_TO_KEY = { explorer: 'free', builder: 'pro', business: 'business', enterprise: 'enterprise' };
const FEATURE_ORDER = ['price', 'projects', 'agents', 'aiUsage', 'storage', 'members', 'integrations', 'automation', 'support'];
const FEATURE_LABELS = { price: 'Price', projects: 'Projects', agents: 'AI Agents', aiUsage: 'AI Usage', storage: 'Storage', members: 'Team Members', integrations: 'Integrations', automation: 'Automation', support: 'Support' };

export default function PlanComparison() {
  const { user } = useAuth();
  const currentKey = getPlanKey(user);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listPlans()
      .then((res) => { if (!cancelled) { if (res.error) setError(res.error); else setPlans(res.plans ?? []); } })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError(friendlyMessage(e, 'Pricing is temporarily unavailable.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex items-center gap-2 p-6 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading plan comparison…</div>;
  if (error) return <p className="p-4 text-xs text-rose-300">{error}</p>;
  if (plans.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center text-xs text-zinc-500">No plans are available right now.</div>;
  }

  const rows = FEATURE_ORDER.filter((key) => key === 'price' || plans.some((p) => p.limits && Object.prototype.hasOwnProperty.call(p.limits, key)));

  function cellValue(plan, key) {
    if (key === 'price') return plan.code === 'enterprise' ? 'Custom' : `£${(plan.price_pence ?? 0) / 100}`;
    const v = plan.limits?.[key];
    if (v === undefined) return null;
    return v === -1 ? 'Unlimited' : v;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Feature</th>
            {plans.map((p) => {
              const isCurrent = CODE_TO_KEY[p.code] === currentKey;
              return <th key={p.code} className={`px-4 py-3 font-medium ${isCurrent ? 'text-violet-300' : 'text-zinc-300'}`}>{p.name}{isCurrent && <span className="ml-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] text-violet-300">Current</span>}</th>;
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((key) => (
            <tr key={key} className="hover:bg-white/[.02]">
              <td className="px-4 py-2.5 text-xs text-zinc-400">{FEATURE_LABELS[key] ?? key}</td>
              {plans.map((p) => {
                const val = cellValue(p, key);
                const isBool = typeof val === 'boolean';
                return (
                  <td key={p.code} className="px-4 py-2.5 text-xs">
                    {val == null ? <Minus className="h-4 w-4 text-zinc-600" /> : isBool ? (val ? <Check className="h-4 w-4 text-emerald-400" /> : <Minus className="h-4 w-4 text-zinc-600" />) : <span className="text-zinc-300">{val}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
