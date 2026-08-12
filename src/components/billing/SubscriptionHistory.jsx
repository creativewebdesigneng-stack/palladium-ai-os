import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { listBillingEvents } from '@/lib/billing/billing.functions';

export default function SubscriptionHistory() {
  const { session, activeOrgId } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let cancelled = false;
    listBillingEvents({ data: { orgId: activeOrgId } })
      .then((res) => { if (!cancelled) setRows(res.events.filter((e) => e.kind === 'subscription')); })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError('Could not load subscription history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId]);

  if (loading) return <div className="flex items-center gap-2 py-3 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>;
  if (error) return <p className="py-3 text-xs text-rose-300">{error}</p>;
  if (rows.length === 0) return <p className="py-3 text-xs text-zinc-500">No subscription changes recorded yet.</p>;

  return (
    <div className="divide-y divide-white/5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p className="text-zinc-200">{r.title}</p>
            <p className="text-[11px] text-zinc-500">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
