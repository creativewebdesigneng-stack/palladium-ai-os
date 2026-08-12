import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { listBillingEvents } from '@/lib/billing/billing.functions';
import { StatusBadge } from './shared';

export default function PaymentHistory() {
  const { session, activeOrgId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let cancelled = false;
    listBillingEvents({ data: { orgId: activeOrgId } })
      .then((res) => { if (!cancelled) setEvents(res.events); })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError('Could not load payment history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId]);

  if (loading) return <div className="flex items-center gap-2 p-4 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>;
  if (error) return <p className="p-4 text-xs text-rose-300">{error}</p>;
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
      {events.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {p.status === 'succeeded' || p.status === 'active' || p.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-500" />}
            <div>
              <p className="text-xs font-medium text-white">{p.title}</p>
              <p className="text-[10px] text-zinc-500">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {p.amount != null && <span className="text-sm text-white">£{p.amount.toFixed(2)}</span>}
            <StatusBadge status={p.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
