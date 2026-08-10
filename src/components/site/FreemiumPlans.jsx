import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X as XIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getPlanKey } from '@/lib/permissions';
import { FREEMIUM_PLANS } from '@/components/site/pricingPlans';

// Freemium tier showcase (Free "Explorer" + Pro "Builder") shown on the public
// pricing page. Sits above the existing premium tier grid. Highlights the
// user's current plan when signed in.
export default function FreemiumPlans() {
  const { user } = useAuth();
  const current = getPlanKey(user);

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      {FREEMIUM_PLANS.map((p, i) => {
        const isCurrent = p.id === current;
        const isPro = p.id === 'pro';
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`relative flex flex-col rounded-3xl border p-7 ${
              isPro
                ? 'border-violet-400/50 bg-gradient-to-b from-violet-500/[.12] via-violet-500/[.04] to-transparent shadow-[0_0_50px_rgba(139,92,246,.18)]'
                : 'border-white/10 bg-white/[.025]'
            }`}
          >
            {isPro && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-900/40">
                Recommended
              </span>
            )}
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${p.grad}`}>
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <h3 className="text-lg font-semibold text-white">
                {p.name} <span className="font-normal text-zinc-400">— {p.subtitle}</span>
              </h3>
            </div>
            <p className="mt-2 text-[13px] text-zinc-400">{p.tagline}</p>

            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-white">£{p.monthly}</span>
              <span className="mb-1.5 text-sm text-zinc-500">/month</span>
            </div>

            {isCurrent && (
              <span className="mt-3 inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                Current plan
              </span>
            )}

            <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-zinc-300">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" /> {f}
                </li>
              ))}
            </ul>
            {p.notIncluded && (
              <ul className="mt-3 space-y-2 text-[12px] text-zinc-600">
                {p.notIncluded.slice(0, 4).map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700" /> {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6">
              {isCurrent ? (
                <span className="block rounded-xl border border-white/10 py-3 text-center text-sm text-zinc-500">Your current plan</span>
              ) : (
                <Link
                  to={p.ctaTo}
                  className={`pbtn block rounded-xl py-3 text-center text-sm font-semibold transition ${
                    isPro
                      ? 'pbtn-primary bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-900/30 hover:opacity-90'
                      : 'pbtn-secondary border border-white/15 text-white hover:bg-white/10'
                  }`}
                >
                  {p.cta}
                </Link>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}