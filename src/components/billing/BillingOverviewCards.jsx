import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OVERVIEW } from './billingData';

export default function BillingOverviewCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {OVERVIEW.map((o, i) => (
        <motion.div key={o.label}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <div className="flex items-start justify-between">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${o.grad}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            </span>
            <span className={`flex items-center gap-1 text-[10px] ${o.up ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {o.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{o.trend}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{o.value}</p>
          <p className="text-[11px] text-zinc-500">{o.label}</p>
          <p className="mt-1 text-[10px] text-zinc-600">{o.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}