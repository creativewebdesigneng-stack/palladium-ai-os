import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck, Sparkles, Mail } from 'lucide-react';
import { PLANS, FREEMIUM_PLANS } from '@/components/site/pricingPlans';
import { useAuth } from '@/lib/AuthContext';
import PalladiumCheckout from '@/components/payments/PalladiumCheckout';
import { PaymentTestModeBanner } from '@/components/payments/PaymentTestModeBanner';

export default function Payment() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan') || 'pro';
  const billing = params.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const allPlans = [...FREEMIUM_PLANS, ...PLANS];
  const plan = allPlans.find((p) => p.id === planId) || FREEMIUM_PLANS[0] || PLANS[0];
  const isContact = !!plan?.contactSales;
  const isLegacyFreePlan = plan?.id === 'free';
  const price = billing === 'yearly' ? plan?.yearly ?? 0 : plan?.monthly ?? 0;
  const period = billing === 'yearly' ? '/year' : '/month';
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { checkUserAuth, user, isAuthenticated } = useAuth();

  const continueLegacyFree = async () => {
    setLegacyLoading(true);
    try { await checkUserAuth(); } catch { /* legacy entitlement resolves server-side */ }
    window.location.href = '/dashboard';
  };

  if (!plan) {
    return <div className="grid min-h-screen place-items-center bg-[#07070a] px-4 text-zinc-100"><div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-6 text-sm text-rose-200">No purchasable Blackstar plan is currently available.</div></div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070a] text-zinc-100">
      <PaymentTestModeBanner />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.13),transparent_30%),linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
      <div className="relative px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/pricing" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-200"><ArrowLeft className="h-3.5 w-3.5" />Back to pricing</Link>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.26em] text-violet-300/65">Blackstar Commerce</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-white">{isContact ? 'Enterprise access' : 'Secure checkout'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{isContact ? `Tell us about your infrastructure requirements and we'll prepare a tailored ${plan.name} proposal.` : <>Activate <span className="text-violet-200">{plan.name}</span> with <span className="text-zinc-300">{billing}</span> billing through the protected payment flow.</>}</p>

          <div className="mt-8 grid gap-5 md:grid-cols-[1fr_320px]">
            <section className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(13,10,20,.94),rgba(5,5,9,.97))] p-6 shadow-[0_22px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
              {isContact ? (
                <div className="text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.07]"><Mail className="h-5 w-5 text-violet-300" /></span>
                  <h2 className="mt-4 text-lg font-semibold text-white">{plan.name} infrastructure enquiry</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">The enterprise team can scope dedicated intelligence infrastructure, governance, integrations and deployment requirements for your organisation.</p>
                  <a href="mailto:sales@palladiumai.com" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 px-6 py-3 text-sm font-semibold text-[#09070d] hover:bg-violet-200"><Mail className="h-4 w-4" />Contact sales</a>
                </div>
              ) : isLegacyFreePlan ? (
                <><p className="text-sm font-medium text-white">Legacy Explorer entitlement</p><p className="mt-2 text-[11px] leading-relaxed text-zinc-500">This route remains available only for backwards compatibility with existing accounts. Blackstar's current public plans are paid.</p><button onClick={continueLegacyFree} disabled={legacyLoading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 py-3 text-sm font-semibold text-[#09070d] hover:bg-violet-200 disabled:opacity-60">{legacyLoading ? 'Continuing…' : 'Continue to Blackstar'}</button></>
              ) : !isAuthenticated ? (
                <div className="text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.07]"><Lock className="h-5 w-5 text-violet-300" /></span><h2 className="mt-4 text-lg font-semibold text-white">Sign in to continue</h2><p className="mt-2 text-sm text-zinc-400">Your subscription is linked to your Blackstar account and workspace entitlements.</p><Link to={`/login?returnTo=/payment?plan=${plan.id}%26billing=${billing}`} className="mt-5 inline-flex rounded-xl border border-violet-200/20 bg-violet-300 px-6 py-3 text-sm font-semibold text-[#09070d] hover:bg-violet-200">Sign in</Link></div>
              ) : (
                <><p className="text-sm font-medium text-white">Protected payment execution</p><p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Secure checkout is handled by the configured payment provider. Card details never pass through Blackstar application servers.</p>{checkoutOpen ? <div className="mt-5"><PalladiumCheckout planCode={plan.id} interval={billing} returnUrl={`${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`} /></div> : <button onClick={() => setCheckoutOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200/20 bg-violet-300 py-3 text-sm font-semibold text-[#09070d] hover:bg-violet-200"><Lock className="h-4 w-4" />{`Pay £${price.toLocaleString()}${period}`}</button>}<p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5" />Encrypted checkout · Cancel anytime{user?.email ? ` · ${user.email}` : ''}</p></>
              )}
            </section>

            <aside className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-black/35 p-6 backdrop-blur-xl">
              <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-violet-300/60">Order intelligence</p><p className="mt-1 text-sm font-medium text-white">Subscription summary</p>
              <div className="mt-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Sparkles className="h-4 w-4 text-violet-300" /></span><span className="text-sm text-white">{plan.name}</span></div>
              <div className="mt-5 flex items-baseline justify-between border-t border-violet-300/[.07] pt-4"><span className="text-sm capitalize text-zinc-400">{billing} plan</span><span className="text-lg font-semibold text-white">£{price.toLocaleString()}{period}</span></div>
              {!isContact && !isLegacyFreePlan && <>{billing === 'yearly' && <div className="mt-2 flex items-baseline justify-between"><span className="text-sm text-zinc-400">Yearly saving</span><span className="text-sm text-emerald-400">£{((plan.monthly ?? 0) * 12 - (plan.yearly ?? 0)).toLocaleString()}/yr</span></div>}<div className="mt-4 flex items-baseline justify-between border-t border-violet-300/[.07] pt-4"><span className="text-sm text-zinc-300">Due today</span><span className="text-xl font-semibold text-white">£{price.toLocaleString()}.00</span></div><p className="mt-3 text-[11px] leading-5 text-zinc-600">{billing === 'yearly' ? `Billed once per year (£${((plan.yearly ?? 0) / 12).toFixed(2)}/mo equivalent).` : `Billed each month. £${plan.monthly}/mo.`}</p></>}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
