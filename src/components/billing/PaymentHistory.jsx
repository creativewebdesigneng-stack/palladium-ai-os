import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, History, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { listBillingEvents } from '@/lib/billing/billing.functions';
import { StatusBadge } from './shared';

export default function PaymentHistory() {
  const { session, activeOrgId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (session !== 'yes') {
      setEvents([]);
      setError(session === 'no' ? 'Sign in to view payment history.' : null);
      setLoading(session === 'unknown');
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);
    listBillingEvents({ data: { orgId: activeOrgId } })
      .then((res) => {
        if (cancelled) return;
        if (!Array.isArray(res?.events)) throw new Error('Payment history returned an invalid response.');
        setEvents(res.events);
      })
      .catch((e) => {
        console.error('[billing]', e);
        if (!cancelled) setError('Could not load payment history. Check your connection and try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId, retry]);

  if (loading) return <div role="status" className="flex items-center gap-2 p-4 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{session === 'unknown' ? 'Checking your session…' : 'Loading payment history…'}</div>;
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[.06] p-4 text-xs text-rose-200"><span>{error}</span>{session === 'yes' && <button onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-zinc-200 hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}</div>;
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
        <History className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
        <p className="text-sm text-zinc-400">No payment activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((payment) => (
        <div key={payment.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {payment.status === 'succeeded' || payment.status === 'active' || payment.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-500" />}
            <div>
              <p className="text-xs font-medium text-white">{payment.title}</p>
              <p className="text-[10px] text-zinc-500">{new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {payment.amount != null && <span className="text-sm text-white">£{payment.amount.toFixed(2)}</span>}
            <StatusBadge status={payment.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
