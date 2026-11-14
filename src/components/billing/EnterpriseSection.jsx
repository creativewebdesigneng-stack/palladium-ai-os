import { motion } from 'framer-motion';
import { Headset, KeyRound, ShieldCheck, SlidersHorizontal, Server, Sparkles } from 'lucide-react';
import { pricePenceForPlan } from '@/lib/billing/catalog';

const ENTERPRISE_FEATURES = [
  { icon: Headset, title: 'Enterprise workforce', desc: 'The published Enterprise feature set, including team and governance controls.' },
  { icon: KeyRound, title: 'SSO', desc: 'Single sign-on is part of the Enterprise plan description in the catalogue.' },
  { icon: ShieldCheck, title: 'Advanced security', desc: 'Security controls listed on the Enterprise plan. No extra certification is claimed here.' },
  { icon: SlidersHorizontal, title: 'Higher limits', desc: 'Agent, task, seat and storage ceilings from the Enterprise plan record.' },
  { icon: Server, title: 'Priority infrastructure', desc: 'Priority infrastructure is included in the self-serve Enterprise price.' },
  { icon: Sparkles, title: 'Self-serve checkout', desc: 'Enterprise is a paid plan. Checkout uses the server-side price catalogue.' },
];

export default function EnterpriseSection({ onSubscribe, interval = 'monthly' }) {
  const pence = pricePenceForPlan('enterprise', interval);
  const price = pence == null ? null : (pence / 100).toLocaleString('en-GB');
  const period = interval === 'yearly' ? 'year' : 'month';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-600/15 via-teal-600/10 to-transparent p-6">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
            <ShieldCheck className="h-5 w-5 text-white" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">Enterprise</h3>
            <p className="text-[11px] text-zinc-400">
              {price ? `£${price} / ${period}. Paid plan, resolved on the server.` : 'Paid plan, resolved on the server.'}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/[.03] p-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15"><Icon className="h-3.5 w-3.5 text-emerald-300" /></span>
                  <p className="text-xs font-medium text-white">{f.title}</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => onSubscribe?.()} className="mt-5 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/20 hover:opacity-90">
          <Sparkles className="h-4 w-4" /> {price ? `Choose Enterprise · £${price}/${period}` : 'Choose Enterprise'}
        </button>
      </div>
    </motion.div>
  );
}
