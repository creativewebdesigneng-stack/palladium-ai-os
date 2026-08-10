import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './filesData';
import { Sparkline } from './shared';

export default function FilesOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.3) }}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-white/10 bg-white/[.035] p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${m.grad} shadow-lg`}>
              <m.icon className="h-4 w-4 text-white" />
            </span>
          </div>
          <p className="text-lg font-bold tabular-nums text-white">{m.value}</p>
          <p className="text-[11px] text-zinc-500">{m.label}</p>
          <p className="mt-0.5 text-[10px] text-emerald-400">{m.detail}</p>
          <div className="mt-2"><Sparkline data={m.trend} grad={m.grad} /></div>
        </motion.div>
      ))}
    </div>
  );
}