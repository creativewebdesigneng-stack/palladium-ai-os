import { useEffect, useState } from 'react';
import { FileText, Loader2, ReceiptText } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { listBillingEvents } from '@/lib/billing/billing.functions';
import { StatusBadge } from './shared';

export default function InvoicesTable() {
  const { session, activeOrgId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let cancelled = false;
    listBillingEvents({ data: { orgId: activeOrgId } })
      .then((res) => { if (!cancelled) setEvents(res.events.filter((e) => e.kind !== 'subscription')); })
      .catch((e) => { console.error('[billing]', e); if (!cancelled) setError('Could not load billing history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, activeOrgId]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>;
  if (error) return <p className="p-4 text-xs text-rose-300">{error}</p>;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center">
        <ReceiptText className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
        <p className="text-sm text-zinc-400">No invoices yet.</p>
        <p className="mt-1 text-[11px] text-zinc-600">Purchases and subscription charges will appear here once billed.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Description</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {events.map((inv) => (
            <tr key={inv.id} className="text-zinc-300 hover:bg-white/[.02]">
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-zinc-500" /><span className="text-xs">{inv.title}</span></span>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td className="px-4 py-2.5 text-white">{inv.amount != null ? `£${inv.amount.toFixed(2)}` : '—'}</td>
              <td className="px-4 py-2.5"><StatusBadge status={inv.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
