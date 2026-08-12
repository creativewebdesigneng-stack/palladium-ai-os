import { useState } from 'react';
import { CreditCard, Wallet, Gauge, ReceiptText, History, BarChart3, Sparkles, Building2, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import BillingOverviewCards from '@/components/billing/BillingOverviewCards';
import CurrentPlan from '@/components/billing/CurrentPlan';
import PlansGrid from '@/components/billing/PlansGrid';
import UsageMetrics from '@/components/billing/UsageMetrics';
import PaymentMethod from '@/components/billing/PaymentMethod';
import InvoicesTable from '@/components/billing/InvoicesTable';
import PaymentHistory from '@/components/billing/PaymentHistory';
import UsageBreakdown from '@/components/billing/UsageBreakdown';
import UpgradeRecommendation from '@/components/billing/UpgradeRecommendation';
import PlanComparison from '@/components/billing/PlanComparison';
import EnterpriseSection from '@/components/billing/EnterpriseSection';
import BillingRightSidebar from '@/components/billing/BillingRightSidebar';
import SubscriptionHistory from '@/components/billing/SubscriptionHistory';
import UsageDashboard from '@/components/billing/UsageDashboard';
import { Panel } from '@/components/billing/shared';
import PalladiumCheckout from '@/components/payments/PalladiumCheckout';
import { PaymentTestModeBanner } from '@/components/payments/PaymentTestModeBanner';
import { getStripeEnvironment } from '@/lib/stripe';
import { normalizePlanCode } from '@/lib/billing/catalog';
import { createPortalSession } from '@/utils/payments.functions';
import SubscriptionActions from '@/components/billing/SubscriptionActions';

const TABS = ['Overview', 'Plans', 'Usage', 'Invoices', 'History', 'Compare', 'Enterprise'];

export default function Billing() {
  const [tab, setTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [portalError, setPortalError] = useState(null);

  // Plan codes only — the backend maps them to approved Stripe prices.
  const choosePlan = (planId) => {
    const code = normalizePlanCode(planId);
    if (!code || code === 'explorer') { setTab('Plans'); return; }
    setCheckoutPlan(code);
    setTab('Plans');
  };

  const openPortal = async () => {
    setPortalError(null);
    try {
      const result = await createPortalSession({
        data: { returnUrl: `${window.location.origin}/billing`, environment: getStripeEnvironment() },
      });
      if ('error' in result) throw new Error(result.error);
      window.open(result.url, '_blank');
    } catch (e) {
      setPortalError(e?.message || 'Could not open the billing portal.');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="relative hidden sm:block">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices…"
          className="w-44 rounded-xl border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      </div>
      <button onClick={() => setTab('Plans')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
        Manage plan
      </button>
    </div>
  );


  return (
    <>
      <PaymentTestModeBanner />
      <PageHeader eyebrow="Workspace" title="Billing & Subscription" description="Manage your PalladiumAI plan, usage and payments." action={headerActions} />

      <div className="mb-5"><BillingOverviewCards /></div>

      {portalError && (
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{portalError}</div>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[.025] p-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${tab === t ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_17rem]">
        <div className="min-w-0 space-y-6">
          {tab === 'Overview' && (
            <>
              <CurrentPlan onUpgrade={() => setTab('Plans')} onChange={() => setTab('Plans')} onManage={openPortal} />
              <SubscriptionActions onChangePlan={() => setTab('Plans')} />
              <UsageDashboard />
              <UpgradeRecommendation onUpgrade={() => setTab('Plans')} />
              <Panel icon={Gauge} title="Usage" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel>
              <Panel icon={CreditCard} title="Payment method" grad="from-sky-500 to-cyan-500"><PaymentMethod onAdd={openPortal} /></Panel>
              <Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel>
              <Panel icon={History} title="Subscription history" grad="from-violet-500 to-indigo-500"><SubscriptionHistory /></Panel>
            </>
          )}
          {tab === 'Plans' && (
            <>
              <CurrentPlan onUpgrade={() => setTab('Compare')} onChange={() => setTab('Compare')} onManage={openPortal} />
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[.025] p-1.5 w-fit">
                {['monthly', 'yearly'].map((c) => (
                  <button key={c} onClick={() => { setCycle(c); setCheckoutPlan(null); }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-medium capitalize transition ${cycle === c ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                    {c} billing
                  </button>
                ))}
              </div>
              {checkoutPlan ? (
                <Panel icon={CreditCard} title="Complete your upgrade" grad="from-violet-500 to-indigo-500">
                  <PalladiumCheckout planCode={checkoutPlan} interval={cycle} returnUrl={`${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`} />
                  <button onClick={() => setCheckoutPlan(null)} className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
                </Panel>
              ) : (
                <Panel icon={Wallet} title="Choose a plan" grad="from-violet-500 to-indigo-500"><PlansGrid onSelect={choosePlan} /></Panel>
              )}
              <EnterpriseSection />
            </>
          )}

          {tab === 'Usage' && (
            <>
              <UsageDashboard />
              <Panel icon={Gauge} title="Usage metrics" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel>
              <Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel>
              <UpgradeRecommendation onUpgrade={() => setTab('Plans')} />
            </>
          )}
          {tab === 'Invoices' && (
            <Panel icon={ReceiptText} title="Invoices" grad="from-amber-500 to-orange-500"><InvoicesTable /></Panel>
          )}
          {tab === 'History' && (
            <Panel icon={History} title="Payment history" grad="from-sky-500 to-cyan-500"><PaymentHistory /></Panel>
          )}
          {tab === 'Compare' && (
            <>
              <Panel icon={Sparkles} title="Plan comparison" grad="from-violet-500 to-indigo-500"><PlanComparison /></Panel>
              <EnterpriseSection />
            </>
          )}
          {tab === 'Enterprise' && <EnterpriseSection />}
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-6"><BillingRightSidebar /></div>
        </div>
      </div>
    </>
  );
}