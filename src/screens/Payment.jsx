import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck, Sparkles, Mail } from 'lucide-react';
import { setSubscriptionPlan, isDevAdminSession } from '@/lib/access';
import { PLANS, FREEMIUM_PLANS } from '@/components/site/pricingPlans';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { priceIdFor } from '@/lib/stripe';
import PalladiumCheckout from '@/components/payments/PalladiumCheckout';
import { PaymentTestModeBanner } from '@/components/payments/PaymentTestModeBanner';

// Checkout page — paid plans open the built-in embedded checkout; the free plan
// activates instantly and Enterprise+ enquiries route to sales.
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { checkUserAuth, user, isAuthenticated } = useAuth();
  const priceId = priceIdFor(plan.id, billing);

  const activateFree = async () => {
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
    <div className="min-h-screen bg-[#090a0f] text-zinc-100">
      <PaymentTestModeBanner />
      <div className="px-4 py-10">
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
            ) : isFreePlan ? (
              <>
                <p className="text-sm font-medium text-white">Free Explorer plan</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">No card required. You can upgrade to a paid plan at any time from Billing.</p>
                <button onClick={activateFree} disabled={demoLoading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {demoLoading ? 'Activating…' : 'Start free Explorer plan'}
                </button>
              </>
            ) : !isAuthenticated ? (
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500"><Lock className="h-5 w-5 text-white" /></span>
                <h2 className="mt-4 text-lg font-semibold text-white">Sign in to continue</h2>
                <p className="mt-2 text-sm text-zinc-400">Your subscription is linked to your PalladiumAI account.</p>
                <Link to={`/login?returnTo=/payment?plan=${plan.id}%26billing=${billing}`} className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Sign in</Link>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-white">Payment details</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Secure checkout is handled by our payment provider — no card details touch PalladiumAI servers.</p>
                {checkoutOpen && priceId ? (
                  <div className="mt-5">
                    <PalladiumCheckout
                      priceId={priceId}
                      returnUrl={`${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    disabled={!priceId}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Lock className="h-4 w-4" /> {priceId ? `Pay £${price.toLocaleString()}${period}` : 'Plan unavailable'}
                  </button>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5" />Encrypted checkout · Cancel anytime{user?.email ? ` · ${user.email}` : ''}</p>
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