import { useState } from 'react';
import { CreditCard, Wallet, Gauge, ReceiptText, History, BarChart3, Sparkles, Building2, Search, ShieldCheck } from 'lucide-react';
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
import { useWorkspace } from '@/hooks/use-workspace';

const CUSTOMER_TABS = ['Overview', 'Plans', 'Usage', 'Invoices', 'History', 'Compare', 'Enterprise'];
const ADMIN_TABS = ['Overview', 'Usage', 'Invoices', 'History'];

export default function Billing() {
  const { entitlements } = useWorkspace();
  const isPlatformAdmin = entitlements?.isPlatformAdmin === true;
  const tabs = isPlatformAdmin ? ADMIN_TABS : CUSTOMER_TABS;
  const [tab, setTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [portalError, setPortalError] = useState(null);

  // Plan codes only — the backend maps them to approved Stripe prices.
  const choosePlan = (planId) => {
    if (isPlatformAdmin) return;
    const code = normalizePlanCode(planId);
    if (!code || code === 'explorer') { setTab('Plans'); return; }
    setCheckoutPlan(code);
    setTab('Plans');
  };

  const openPortal = async () => {
    if (isPlatformAdmin) return;
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
      {isPlatformAdmin ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200">
          <ShieldCheck className="h-4 w-4" /> Internal unlimited access
        </span>
      ) : (
        <button onClick={() => setTab('Plans')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90">
          Manage plan
        </button>
      )}
    </div>
  );

  return (
    <>
      {!isPlatformAdmin && <PaymentTestModeBanner />}
      <PageHeader eyebrow="Workspace" title="Billing & Subscription" description={isPlatformAdmin ? 'Platform-admin access is internal, unlimited and does not require a subscription.' : 'Manage your PalladiumAI plan, usage and payments.'} action={headerActions} />

      {isPlatformAdmin && (
        <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-200"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <h2 className="font-semibold text-white">Platform Admin — internal unlimited access</h2>
              <p className="mt-1 text-sm text-zinc-400">All configured PalladiumAI features and unlimited platform limits are enabled by your trusted admin role. No Stripe subscription, checkout, renewal or payment method is required. Usage is still recorded for audit and observability.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5"><BillingOverviewCards /></div>

      {portalError && (
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{portalError}</div>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[.025] p-1.5">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${tab === t ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${isPlatformAdmin ? '' : 'xl:grid-cols-[1fr_17rem]'}`}>
        <div className="min-w-0 space-y-6">
          {tab === 'Overview' && (
            isPlatformAdmin ? (
              <>
                <UsageDashboard />
                <Panel icon={Gauge} title="Usage" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel>
                <Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel>
              </>
            ) : (
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
            )
          )}
          {!isPlatformAdmin && tab === 'Plans' && (
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
              {!isPlatformAdmin && <UpgradeRecommendation onUpgrade={() => setTab('Plans')} />}
            </>
          )}
          {tab === 'Invoices' && (
            <Panel icon={ReceiptText} title="Invoices" grad="from-amber-500 to-orange-500"><InvoicesTable /></Panel>
          )}
          {tab === 'History' && (
            <Panel icon={History} title="Payment history" grad="from-sky-500 to-cyan-500"><PaymentHistory /></Panel>
          )}
          {!isPlatformAdmin && tab === 'Compare' && (
            <>
              <Panel icon={Sparkles} title="Plan comparison" grad="from-violet-500 to-indigo-500"><PlanComparison /></Panel>
              <EnterpriseSection />
            </>
          )}
          {!isPlatformAdmin && tab === 'Enterprise' && <EnterpriseSection />}
        </div>

        {!isPlatformAdmin && (
          <div className="hidden xl:block">
            <div className="sticky top-6"><BillingRightSidebar /></div>
          </div>
        )}
      </div>
    </>
  );
}
