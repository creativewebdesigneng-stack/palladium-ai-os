import { useState, useMemo } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Info, Loader2, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import SubscriptionList, { SubscriptionDetail } from '@/components/admin-subs/SubscriptionList';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAllSubscriptions } from '@/lib/admin/admin.functions';
import { friendlyMessage } from '@/lib/errors';

export default function AdminSubscriptions() {
  const { session } = useWorkspace();
  const listFn = useServerFn(listAllSubscriptions);
  const q = useQuery({ queryKey: ['admin-subs'], queryFn: () => listFn(), enabled: session === 'yes', retry: false });

  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all' });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const subs = useMemo(() => (q.data?.forbidden ? [] : (q.data?.subscriptions || []).map(s => ({
    id: s.id, customer: s.customer, email: '', org: s.customer, plan: s.plan, price: s.mrr, status: s.status,
    started: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—',
    renews: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—',
    method: '—', mrr: s.mrr,
  }))), [q.data]);
  const plans = q.data?.forbidden ? [] : (q.data?.plans || []);
  const mrr = useMemo(() => subs.reduce((sum, s) => sum + (s.status === 'active' ? s.mrr : 0), 0), [subs]);
  const activeCount = subs.filter(s => s.status === 'active').length;

  const handleAction = (type, sub) => { flash(`${type} is not yet wired to a backend endpoint.`); setSelected(null); };
  const forbidden = q.data?.forbidden;
  const headerAction = <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>;

  if (session !== 'yes' || q.isLoading) {
    return (<><PageHeader eyebrow="Admin" title="Subscription Management" description="Manage plans, subscriptions and billing — access is restricted to administrators." action={headerAction} />
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading subscriptions…</div></>);
  }
  if (forbidden || q.error) {
    if (q.error) console.error('[AdminSubscriptions]', q.error);
    return (<><PageHeader eyebrow="Admin" title="Subscription Management" description="Manage plans, subscriptions and billing — access is restricted to administrators." action={headerAction} />
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-10 text-center">
        <ShieldOff className="h-8 w-8 text-rose-300" />
        <p className="text-sm font-medium text-rose-200">{forbidden ? "You don't have permission to view this page." : friendlyMessage(q.error)}</p>
        <p className="text-xs text-rose-200/70">Admin access is required. Contact a platform administrator if you believe this is a mistake.</p>
      </div></>);
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Subscription Management" description="Manage plans, subscriptions and billing — access is restricted to administrators." action={headerAction} />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All admin reads are re-verified server-side. Upgrade/downgrade/cancel actions are not yet wired to a backend endpoint.</p></div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Plans" value={String(plans.length)} />
        <MetricCard label="Subscribers" value={String(subs.length)} />
        <MetricCard label="MRR" value={`£${mrr.toLocaleString()}`} />
        <MetricCard label="Active Subscriptions" value={String(activeCount)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Plan Catalogue" subtitle="From the live plans table" className="xl:col-span-1">
          {plans.length ? (
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.code} className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                  <div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{p.name}</p><span className="text-[12px] text-violet-300">£{Math.round((p.price_pence || 0) / 100)}/{p.billing_interval || 'mo'}</span></div>
                  <p className="mt-1 text-[11px] text-zinc-500">{p.is_active ? 'Active' : 'Inactive'} · {p.code}</p>
                </div>
              ))}
            </div>
          ) : <div className="grid place-items-center rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No plans configured yet.</div>}
        </Panel>
        <Panel title="Subscriptions" subtitle={`${subs.length} total · MRR £${mrr.toLocaleString()}`} className="xl:col-span-2">
          {subs.length ? <SubscriptionList subscriptions={subs} onView={setSelected} filters={filters} setFilters={setFilters} /> : <div className="grid place-items-center rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No subscriptions yet.</div>}
        </Panel>
      </div>

      <SubscriptionDetail sub={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}

function MetricCard({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-2xl font-semibold text-white">{value}</p><p className="text-[11px] text-zinc-500">{label}</p></div>;
}
