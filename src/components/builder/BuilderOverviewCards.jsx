import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './builderData';

export default function BuilderOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${m.grad} p-3.5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20`}
        >
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{m.label}</span>
            <m.icon className="h-4 w-4 text-white/70" />
          </div>
          <p className="mt-2 text-lg font-semibold tracking-tight text-white">{m.value}</p>
          <p className="text-[10px] text-white/50">{m.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}