import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { PLANS } from '@/components/site/pricingPlans';

function PlanCard({ plan, billing }) {
  const isContact = !!plan.contactSales;
  const price = billing === 'yearly' ? plan.yearly : plan.monthly;
  const period = billing === 'yearly' ? '/yr' : '/mo';
  const monthlyEq = billing === 'yearly' ? plan.yearly / 12 : plan.monthly;
  const yearlySave = plan.monthly * 12 - plan.yearly;
  const ctaTo = `${plan.ctaTo}&billing=${billing}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5 }}
      className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 ${
        plan.highlight
          ? 'border-violet-400/50 bg-gradient-to-b from-violet-500/[.12] via-violet-500/[.04] to-transparent shadow-[0_0_50px_rgba(139,92,246,.18)] lg:-translate-y-3'
          : 'border-white/10 bg-white/[.025] hover:border-white/20 hover:bg-white/[.04]'
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-900/40">
          Most Popular
        </span>
      )}

      <h3 className="text-lg font-semibold tracking-tight text-white">{plan.name}</h3>
      <p className="mt-2 min-h-[2.5rem] text-[13px] leading-relaxed text-zinc-400">{plan.description}</p>

      {/* Price */}
      <div className="mt-5 flex items-end gap-1.5">
        <span className="text-4xl font-semibold tracking-tight text-white">{plan.currency}{price.toLocaleString()}</span>
        <span className="mb-1.5 text-sm text-zinc-500">{period}</span>
      </div>
      <div className="mt-1 h-5 text-[11px]">
        {billing === 'yearly' ? (
          <span className="text-emerald-300">
            £{monthlyEq.toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo billed yearly · save £{yearlySave.toLocaleString()}
          </span>
        ) : (
          <span className="text-zinc-600">billed monthly</span>
        )}
      </div>

      {/* CTA */}
      <Link
        to={ctaTo}
        className={`mt-6 rounded-xl py-3 text-center text-sm font-semibold transition ${
          plan.highlight
            ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-900/30 hover:opacity-90'
            : isContact
            ? 'border border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/10'
            : 'border border-white/15 text-white hover:bg-white/10'
        }`}
      >
        {plan.cta}
      </Link>

      {/* Features */}
      <ul className="mt-6 flex-1 space-y-3 text-[13px] text-zinc-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${plan.highlight ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-zinc-300'}`}>
              <Check className="h-3 w-3" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function PricingCards() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Billing toggle */}
      <div className="mb-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[.03] p-1">
          {(['monthly', 'yearly']).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`rounded-full px-5 py-2 text-xs font-medium capitalize transition ${billing === b ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-medium text-emerald-300">
          <Sparkles className="h-3 w-3" /> Save 15% yearly
        </span>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-5">
        {PLANS.map((p) => <PlanCard key={p.id} plan={p} billing={billing} />)}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        All prices in GBP (£). VAT may apply. Free and Pro plans are available above — premium tiers scale for teams and enterprises.
      </p>
    </div>
  );
}