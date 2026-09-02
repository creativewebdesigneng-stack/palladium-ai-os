import { useState } from 'react';
import { CreditCard, Wallet, Gauge, ReceiptText, History, BarChart3, Sparkles, Search, ShieldCheck } from 'lucide-react';
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
      const result = await createPortalSession({ data: { returnUrl: `${window.location.origin}/billing`, environment: getStripeEnvironment() } });
      if ('error' in result) throw new Error(result.error);
      window.open(result.url, '_blank');
    } catch (e) {
      setPortalError(e?.message || 'Could not open the billing portal.');
    }
  };

  const headerActions = <div className="flex items-center gap-2"><div className="relative hidden sm:block"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices…" className="w-44 rounded-xl border border-violet-300/10 bg-black/30 py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-300/30 focus:outline-none" /></div>{isPlatformAdmin ? <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200"><ShieldCheck className="h-4 w-4" />Internal unlimited access</span> : <button onClick={() => setTab('Plans')} className="rounded-xl border border-violet-200/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#09070d] shadow-[0_0_28px_rgba(167,139,250,.12)] transition hover:bg-violet-200">Manage plan</button>}</div>;

  return <>
    {!isPlatformAdmin && <PaymentTestModeBanner />}
    <PageHeader eyebrow="Blackstar Commercial Control" title="Billing & Subscription" description={isPlatformAdmin ? 'Platform-admin access is internal, unlimited and does not require a subscription.' : 'Manage your Blackstar plan, infrastructure usage and payment state.'} action={headerActions} />
    {isPlatformAdmin && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.055] p-5 backdrop-blur-xl"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-200"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-semibold text-white">Platform Admin · internal unlimited access</h2><p className="mt-1 text-sm text-zinc-400">All configured Blackstar capabilities and platform limits are enabled by your trusted admin role. No Stripe subscription, checkout, renewal or payment method is required. Usage is still recorded for audit and observability.</p></div></div></div>}
    <div className="mb-5"><BillingOverviewCards /></div>
    {portalError && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{portalError}</div>}
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-violet-300/10 bg-black/25 p-1.5">{tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${tab === t ? 'bg-violet-400/[.10] text-violet-100 ring-1 ring-violet-300/15' : 'text-zinc-500 hover:bg-violet-400/[.035] hover:text-zinc-300'}`}>{t}</button>)}</div>
    <div className={`grid gap-5 ${isPlatformAdmin ? '' : 'xl:grid-cols-[1fr_17rem]'}`}><div className="min-w-0 space-y-6">
      {tab === 'Overview' && (isPlatformAdmin ? <><UsageDashboard /><Panel icon={Gauge} title="Infrastructure usage" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel><Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel></> : <><CurrentPlan onUpgrade={() => setTab('Plans')} onChange={() => setTab('Plans')} onManage={openPortal} /><SubscriptionActions onChangePlan={() => setTab('Plans')} /><UsageDashboard /><UpgradeRecommendation onUpgrade={() => setTab('Plans')} /><Panel icon={Gauge} title="Infrastructure usage" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel><Panel icon={CreditCard} title="Payment method" grad="from-sky-500 to-cyan-500"><PaymentMethod onAdd={openPortal} /></Panel><Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel><Panel icon={History} title="Subscription history" grad="from-violet-500 to-indigo-500"><SubscriptionHistory /></Panel></>)}
      {!isPlatformAdmin && tab === 'Plans' && <><CurrentPlan onUpgrade={() => setTab('Compare')} onChange={() => setTab('Compare')} onManage={openPortal} /><div className="flex w-fit items-center gap-1.5 rounded-2xl border border-violet-300/10 bg-black/25 p-1.5">{['monthly','yearly'].map((c) => <button key={c} onClick={() => { setCycle(c); setCheckoutPlan(null); }} className={`rounded-xl px-3.5 py-1.5 text-xs font-medium capitalize transition ${cycle === c ? 'bg-violet-400/[.10] text-violet-100 ring-1 ring-violet-300/15' : 'text-zinc-500 hover:bg-violet-400/[.035] hover:text-zinc-300'}`}>{c} billing</button>)}</div>{checkoutPlan ? <Panel icon={CreditCard} title="Complete your upgrade" grad="from-violet-500 to-indigo-500"><PalladiumCheckout planCode={checkoutPlan} interval={cycle} returnUrl={`${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`} /><button onClick={() => setCheckoutPlan(null)} className="mt-3 rounded-xl border border-violet-300/10 px-4 py-2 text-xs text-zinc-300 hover:bg-violet-400/[.04]">Cancel</button></Panel> : <Panel icon={Wallet} title="Choose a plan" grad="from-violet-500 to-indigo-500"><PlansGrid onSelect={choosePlan} /></Panel>}<EnterpriseSection /></>}
      {tab === 'Usage' && <><UsageDashboard /><Panel icon={Gauge} title="Usage metrics" grad="from-violet-500 to-indigo-500"><UsageMetrics /></Panel><Panel icon={BarChart3} title="Usage breakdown" grad="from-emerald-500 to-teal-500"><UsageBreakdown /></Panel>{!isPlatformAdmin && <UpgradeRecommendation onUpgrade={() => setTab('Plans')} />}</>}
      {tab === 'Invoices' && <Panel icon={ReceiptText} title="Invoices" grad="from-amber-500 to-orange-500"><InvoicesTable /></Panel>}
      {tab === 'History' && <Panel icon={History} title="Payment history" grad="from-sky-500 to-cyan-500"><PaymentHistory /></Panel>}
      {!isPlatformAdmin && tab === 'Compare' && <><Panel icon={Sparkles} title="Plan comparison" grad="from-violet-500 to-indigo-500"><PlanComparison /></Panel><EnterpriseSection /></>}
      {!isPlatformAdmin && tab === 'Enterprise' && <EnterpriseSection />}
    </div>{!isPlatformAdmin && <div className="hidden xl:block"><div className="sticky top-6"><BillingRightSidebar /></div></div>}</div>
  </>;
}
