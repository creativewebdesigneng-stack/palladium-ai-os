import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './tasksData';

function Sparkline({ data, className = 'stroke-violet-400' }) {
  const w = 96, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} />
    </svg>
  );
}

export default function TaskOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4"
        >
          <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${m.grad} opacity-20 blur-2xl`} />
          <div className="flex items-start justify-between">
            <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}>
              <m.icon className="h-4 w-4 text-white" />
            </div>
            <Sparkline data={m.trend} className="stroke-white/60" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{m.value}</p>
          <p className="text-xs text-zinc-400">{m.label}</p>
          <p className="mt-1 text-[10px] text-zinc-600">{m.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}