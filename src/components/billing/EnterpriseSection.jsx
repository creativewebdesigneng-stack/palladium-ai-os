import { motion } from 'framer-motion';
import { BadgeDollarSign, Headset, KeyRound, ShieldCheck, SlidersHorizontal, Server, FileSignature, Mail } from 'lucide-react';
import { ENTERPRISE_FEATURES } from './billingData';

const ICONS = { BadgeDollarSign, Headset, KeyRound, ShieldCheck, SlidersHorizontal, Server, FileSignature };

export default function EnterpriseSection() {
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
            <p className="text-[11px] text-zinc-400">Built for scale, security and governance.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_FEATURES.map((f) => {
            const Icon = ICONS[f.icon] || ShieldCheck;
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
        <button className="mt-5 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/20 hover:opacity-90">
          <Mail className="h-4 w-4" /> Contact Sales
        </button>
      </div>
    </motion.div>
  );
}