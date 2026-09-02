import { useEffect, useState } from 'react';
import { Receipt, Clock, TrendingUp, HelpCircle, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { getBillingOverview, listBillingEvents } from '@/lib/billing/billing.functions';
import { friendlyMessage } from '@/lib/errors';
import { StatusBadge, Panel } from './shared';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BillingRightSidebar() {
  const { session, activeOrgId } = useWorkspace();
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let cancelled = false;
    Promise.all([
      getBillingOverview({ data: { orgId: activeOrgId } }),
      listBillingEvents({ data: { orgId: activeOrgId } }),
    ])
      .then(([o, e]) => { if (!cancelled) { setOverview(o); setEvents(e.events ?? []); } })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError(friendlyMessage(e, 'Could not load billing details.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId]);

  if (loading) return <div className="flex items-center gap-2 p-3 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Synchronising billing intelligence…</div>;
  if (error) return <p className="p-3 text-xs text-rose-300">{error}</p>;

  const sub = overview?.subscription ?? null;
  const paymentEvents = events.filter((e) => e.amount != null).slice(0, 4);
  const spend = events.filter((e) => e.amount != null).slice(0, 7).reverse();
  const maxSpend = Math.max(1, ...spend.map((s) => s.amount || 0));
  const avg = spend.length ? spend.reduce((a, s) => a + (s.amount || 0), 0) / spend.length : 0;

  return <div className="space-y-4">
    <Panel icon={Clock} title="Renewal state" grad="from-violet-500 to-indigo-500"><p className="text-sm text-white">{sub?.current_period_end ? fmtDate(sub.current_period_end) : 'No active subscription'}</p><p className="text-[11px] text-zinc-500">{sub?.cancel_at_period_end ? 'Cancels at period end' : sub ? 'Auto-renews' : 'Choose a plan to start billing'}</p></Panel>
    <Panel icon={Receipt} title="Recent payments" grad="from-violet-500 to-indigo-500">{paymentEvents.length === 0 ? <p className="text-[11px] text-zinc-600">No payments recorded yet.</p> : <div className="space-y-2">{paymentEvents.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-violet-300/[.06] bg-black/20 px-2.5 py-2 text-[11px]"><div className="min-w-0"><p className="truncate text-zinc-300">{p.title}</p><p className="text-zinc-600">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p></div><div className="flex items-center gap-2"><span className="text-white">£{Number(p.amount).toFixed(2)}</span><StatusBadge status={p.status} /></div></div>)}</div>}</Panel>
    <Panel icon={TrendingUp} title="Spend telemetry" grad="from-violet-500 to-indigo-500">{spend.length === 0 ? <p className="text-[11px] text-zinc-600">No spend history yet.</p> : <><div className="flex h-20 items-end gap-1.5">{spend.map((s, i) => <div key={i} className="flex-1 rounded-t bg-violet-300/55 shadow-[0_0_10px_rgba(196,181,253,.12)]" style={{ height: `${Math.max(4, (s.amount / maxSpend) * 80)}px` }} />)}</div><p className="mt-2 text-[11px] text-zinc-500">Last {spend.length} charges · avg £{avg.toFixed(2)}</p></>}</Panel>
    <Panel icon={HelpCircle} title="Billing support" grad="from-violet-500 to-indigo-500"><p className="text-[11px] leading-5 text-zinc-400">Need help with invoices, tax or refunds? Contact the billing team through the existing support channel.</p><a href="mailto:billing@palladiumai.com" className="mt-3 block w-full rounded-lg border border-violet-300/10 bg-violet-400/[.025] px-3 py-2 text-center text-[11px] text-zinc-300 hover:bg-violet-400/[.05]">Contact billing</a></Panel>
  </div>;
}