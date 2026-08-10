import { useState, useMemo } from 'react';
import { Lock, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';
import SubsMetricCards from '@/components/admin-subs/SubsMetricCards';
import PlanManager from '@/components/admin-subs/PlanManager';
import SubscriptionList, { SubscriptionDetail } from '@/components/admin-subs/SubscriptionList';
import { METRICS, PLAN_DEFAULTS, SUBSCRIPTIONS } from '@/components/admin-subs/subsData';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState(PLAN_DEFAULTS);
  const [subscriptions] = useState(SUBSCRIPTIONS);
  const [filters, setFilters] = useState({ q: '', plan: 'all', status: 'all' });
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const mrr = useMemo(() => subscriptions.reduce((sum, s) => sum + s.mrr, 0), [subscriptions]);

  const handleAction = (type, sub) => {
    const labels = { upgrade: `Upgrading ${sub.customer} (placeholder)`, downgrade: `Downgrading ${sub.customer} (placeholder)`, cancel: `Canceling ${sub.customer} subscription (placeholder)` };
    flash(labels[type]); setSelected(null);
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Subscription Management" description="Manage plans, subscriptions and billing — access is restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Restricted area. All actions are audited. Data shown is illustrative mock data — backend-ready for live subscription APIs.</p></div>

      <SubsMetricCards metrics={METRICS} />

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Plan Management" subtitle="Configure pricing, limits and features" className="xl:col-span-1"><PlanManager plans={plans} setPlans={setPlans} /></Panel>
        <Panel title="Subscriptions" subtitle={`${subscriptions.length} active · MRR £${mrr.toLocaleString()}`} className="xl:col-span-2"><SubscriptionList subscriptions={subscriptions} onView={setSelected} filters={filters} setFilters={setFilters} /></Panel>
      </div>

      <SubscriptionDetail sub={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}