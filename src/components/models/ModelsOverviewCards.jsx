import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './modelsData';

export default function ModelsOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${m.grad} p-4 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20`}
        >
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{m.label}</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
              <m.icon className="h-4 w-4 text-white" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{m.value}</p>
          <p className="mt-0.5 text-[11px] text-white/60">{m.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}