import { motion } from 'framer-motion';
import { USAGE_METRICS } from './billingData';

export default function UsageMetrics() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {USAGE_METRICS.map((m) => {
        const pct = Math.min(100, Math.round((m.value / m.max) * 100));
        const warn = pct >= 85;
        return (
          <div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">{m.label}</p>
              <p className={`text-[10px] ${warn ? 'text-amber-400' : 'text-zinc-500'}`}>{pct}% used</p>
            </div>
            <p className="mt-1 text-sm font-medium text-white">
              {m.value.toLocaleString()} <span className="text-[11px] font-normal text-zinc-500">/ {m.max.toLocaleString()} {m.unit}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div className={`h-full rounded-full bg-gradient-to-r ${m.grad}`}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}