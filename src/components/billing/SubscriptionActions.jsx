import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, XCircle, RotateCcw, ExternalLink, ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { getStripeEnvironment } from '@/lib/stripe';
import {
  getBillingData,
  cancelSubscription,
  resumeSubscription,
  createPortalSession,
} from '@/utils/payments.functions';

const PLAN_LABEL = { explorer: 'Explorer', builder: 'Builder', business: 'Business', enterprise: 'Enterprise' };

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Authoritative subscription controls. Everything shown here comes from the
 * server (database row + Stripe), never from local state or storage, and every
 * action is a verified server function — the UI only reflects the result.
 */
export default function SubscriptionActions({ onChangePlan }) {
  const { session } = useWorkspace();
  const [state, setState] = useState({ loading: true, subscription: null, error: null });
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const environment = (() => {
    try { return getStripeEnvironment(); } catch { return null; }
  })();

  const load = useCallback(async () => {
    if (!environment) { setState({ loading: false, subscription: null, error: 'Payments are not configured for this build.' }); return; }
    try {
      const res = await getBillingData({ data: { environment } });
      if ('error' in res) throw new Error(res.error);
      setState({ loading: false, subscription: res.subscription, error: null });
    } catch (e) {
      setState({ loading: false, subscription: null, error: e?.message || 'Could not load your subscription.' });
    }
  }, [environment]);

  useEffect(() => { if (session === 'yes') load(); }, [session, load]);

  const run = async (key, fn) => {
    setBusy(key); setNotice(null);
    try {
      const res = await fn({ data: { environment } });
      if (res && 'error' in res) throw new Error(res.error);
      if (key === 'portal') { window.open(res.url, '_blank'); }
      else { setNotice('Updated. Stripe confirms the change through a verified webhook — this may take a moment.'); await load(); }
    } catch (e) {
      setNotice(e?.message || 'That action could not be completed.');
    } finally { setBusy(null); }
  };

  if (session !== 'yes') return null;
  if (state.loading) {
    return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-5 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading subscription…</div>;
  }
  if (state.error) {
    return <p className="rounded-2xl border border-rose-400/20 bg-rose-500/[.08] p-4 text-xs text-rose-200">{state.error}</p>;
  }

  const sub = state.subscription;
  const planLabel = PLAN_LABEL[sub?.planCode] || (sub?.planCode ?? 'Explorer');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified subscription
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">
            {sub ? `${planLabel} · ${sub.status}` : 'Explorer (free) — no paid subscription'}
          </h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            {sub
              ? sub.cancelAtPeriodEnd
                ? `Cancels on ${formatDate(sub.currentPeriodEnd)} — access continues until then.`
                : `Renews on ${formatDate(sub.currentPeriodEnd)}.`
              : 'Upgrade any time. Card details are handled entirely by Stripe.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onChangePlan}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white hover:opacity-90">
            <ArrowUpRight className="h-3.5 w-3.5" /> {sub ? 'Change plan' : 'Upgrade'}
          </button>
          {sub && (
            <button disabled={busy === 'portal'} onClick={() => run('portal', createPortalSession)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50">
              <ExternalLink className="h-3.5 w-3.5" /> Payment method & invoices
            </button>
          )}
          {sub && !sub.cancelAtPeriodEnd && sub.status !== 'canceled' && (
            <button disabled={busy === 'cancel'} onClick={() => run('cancel', cancelSubscription)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 px-4 py-2 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          {sub && sub.cancelAtPeriodEnd && (
            <button disabled={busy === 'resume'} onClick={() => run('resume', resumeSubscription)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" /> Resume
            </button>
          )}
        </div>
      </div>

      {notice && <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-zinc-300">{notice}</p>}
    </div>
  );
}
