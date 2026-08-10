import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CreditCard, ArrowLeft, ShieldCheck, Sparkles, Mail } from 'lucide-react';
import { setSubscriptionPlan, isDevAdminSession } from '@/lib/access';
import { PLANS, FREEMIUM_PLANS } from '@/components/site/pricingPlans';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Checkout page — structured for a future Stripe integration. No real payment
// is processed here. Paid plans show a Stripe-ready checkout placeholder; the
// Enterprise+ plan routes to a "Contact Sales" flow. A clearly-labelled demo
// activation lets the gated app be previewed in this frontend-only build.
export default function Payment() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan') || 'pro';
  const billing = params.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const plan = [...FREEMIUM_PLANS, ...PLANS].find((p) => p.id === planId) || FREEMIUM_PLANS[1];
  const isContact = !!plan.contactSales;
  const isFreePlan = plan.id === 'free';
  const price = billing === 'yearly' ? plan.yearly : plan.monthly;
  const period = billing === 'yearly' ? '/year' : '/month';
  const [demoLoading, setDemoLoading] = useState(false);
  const { checkUserAuth } = useAuth();

  // Records a real subscription on the backend (createSubscription persists
  // plan + status on the User and Organisation), then reloads so the new plan
  // is the source of truth. Dev-admin (frontend-only) sessions fall back to
  // the localStorage plan; any backend failure also falls back gracefully.
  const activateDemo = async () => {
    setDemoLoading(true);
    try {
      if (isDevAdminSession()) {
        setSubscriptionPlan(plan.id);
      } else {
        await base44.functions.invoke('createSubscription', { plan: plan.id, interval: billing, currency: 'GBP' });
        try { await checkUserAuth(); } catch {}
      }
    } catch {
      setSubscriptionPlan(plan.id);
    }
    setTimeout(() => { window.location.href = '/dashboard'; }, 700);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <Link to="/pricing" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to pricing</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{isContact ? 'Talk to sales' : 'Checkout'}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isContact
            ? `Tell us about your needs and we'll prepare a tailored ${plan.name} proposal.`
            : <>You're starting the <span className="text-violet-300">{plan.name}</span> plan — <span className="text-zinc-300">{billing}</span> billing. Cancel anytime.</>}
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
            {isContact ? (
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-500"><Mail className="h-5 w-5 text-white" /></span>
                <h2 className="mt-4 text-lg font-semibold text-white">{plan.name} enquiry</h2>
                <p className="mt-2 text-sm text-zinc-400">Our enterprise team will reach out to design a custom AI workforce, dedicated infrastructure and bespoke integrations for your organisation.</p>
                <a href="mailto:sales@palladiumai.com" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90"><Mail className="h-4 w-4" /> Contact Sales</a>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-white">Payment details</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">PalladiumAI uses Stripe for secure billing. Online checkout will be enabled here once your Stripe account is connected — no card is stored on PalladiumAI servers.</p>
                <div className="mt-5 space-y-3 opacity-60">
                  <div><label className="text-xs text-zinc-400">Card number</label>
                    <div className="relative mt-1.5"><CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input disabled placeholder="4242 4242 4242 4242" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-zinc-400">Expiry</label><input disabled placeholder="MM / YY" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none" /></div>
                    <div><label className="text-xs text-zinc-400">CVC</label>
                      <div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input disabled placeholder="123" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm outline-none" /></div>
                    </div>
                  </div>
                </div>
                {isFreePlan ? (
                  <button onClick={activateDemo} disabled={demoLoading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                    {demoLoading ? 'Activating…' : 'Start free Explorer plan'}
                  </button>
                ) : (
                  <>
                    <button disabled className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-zinc-300 cursor-not-allowed">
                      <Lock className="h-4 w-4" /> Checkout pending Stripe connection
                    </button>
                    <button onClick={activateDemo} disabled={demoLoading} className="mt-3 w-full rounded-xl border border-violet-400/30 bg-violet-500/10 py-2.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-60">
                      {demoLoading ? 'Activating preview…' : 'Activate demo subscription (preview only)'}
                    </button>
                  </>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5" />Secured by Stripe · No real charge in preview</p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
            <p className="text-sm font-medium text-white">Order summary</p>
            <div className="mt-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /><span className="text-sm text-white">{plan.name}</span></div>
            <div className="mt-4 flex items-baseline justify-between"><span className="text-sm text-zinc-400">{billing} plan</span><span className="text-lg font-semibold text-white">£{price.toLocaleString()}{period}</span></div>
            {!isContact && (
              <>
                {billing === 'yearly' && <div className="mt-2 flex items-baseline justify-between"><span className="text-sm text-zinc-400">Yearly saving</span><span className="text-sm text-emerald-400">£{(plan.monthly * 12 - plan.yearly).toLocaleString()}/yr</span></div>}
                <div className="mt-4 border-t border-white/10 pt-4 flex items-baseline justify-between"><span className="text-sm text-zinc-300">Due today</span><span className="text-xl font-semibold text-white">£{price.toLocaleString()}.00</span></div>
                <p className="mt-3 text-[11px] text-zinc-600">{billing === 'yearly' ? `Billed once per year (£${(plan.yearly / 12).toFixed(2)}/mo equivalent).` : `Billed each month. £${plan.monthly}/mo.`}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}