import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { getBillingOverview } from '@/lib/billing/billing.functions';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BillingOverviewCards() {
  const { session, activeOrgId, entitlements, isLoading: wsLoading } = useWorkspace();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let cancelled = false;
    setLoading(true);
    getBillingOverview({ data: { orgId: activeOrgId } })
      .then((res) => { if (!cancelled) setOverview(res); })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError('Could not load billing overview.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId]);

  if (session !== 'yes') return null;

  if (loading || wsLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[.025]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div>;
  }

  const sub = overview?.subscription ?? null;
  const seatsMax = entitlements?.limits?.seats;
  const seatsUsed = entitlements?.usage?.seats ?? 0;
  const planName = entitlements?.planName ?? 'Free';
  const isPlatformAdmin = entitlements?.isPlatformAdmin === true;

  const cards = [
    {
      label: 'Current plan',
      value: planName,
      detail: isPlatformAdmin ? 'Trusted platform-admin entitlement' : sub ? `Status: ${sub.status}` : 'No active subscription',
      grad: 'from-violet-500 to-indigo-500',
    },
    {
      label: 'Seats',
      value: seatsMax === -1 || seatsMax == null ? `${seatsUsed}` : `${seatsUsed} / ${seatsMax}`,
      detail: seatsMax === -1 ? 'Unlimited seats' : 'Active seats in this workspace',
      grad: 'from-emerald-500 to-teal-500',
    },
    {
      label: isPlatformAdmin ? 'Renewal' : 'Renewal',
      value: isPlatformAdmin ? 'Not required' : sub?.current_period_end ? fmtDate(sub.current_period_end) : '—',
      detail: isPlatformAdmin ? 'Internal access does not expire with billing' : sub?.cancel_at_period_end ? 'Cancels at period end' : sub ? 'Auto-renews' : 'No billing cycle yet',
      grad: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Billing environment',
      value: isPlatformAdmin ? 'Internal' : sub?.environment ?? '—',
      detail: isPlatformAdmin ? 'No Stripe subscription required' : sub ? `Seats on this plan: ${sub.seats}` : 'Choose a plan to get started',
      grad: 'from-sky-500 to-cyan-500',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((o, i) => (
        <motion.div key={o.label}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <div className="flex items-start justify-between">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${o.grad}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            </span>
          </div>
          <p className="mt-3 truncate text-2xl font-semibold capitalize text-white">{o.value}</p>
          <p className="text-[11px] text-zinc-500">{o.label}</p>
          <p className="mt-1 text-[10px] text-zinc-600">{o.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}
