import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './projectsData';

export default function ProjectsOverviewCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4"
        >
          <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${m.grad} opacity-10 blur-xl transition-opacity group-hover:opacity-20`} />
          <div className="flex items-start justify-between">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}>
              <m.icon className="h-4 w-4 text-white" />
            </span>
            <svg className="h-10 w-20" viewBox="0 0 80 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`spk-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={m.trend.map((v, idx) => `${(idx / (m.trend.length - 1)) * 80},${40 - (v / Math.max(...m.trend)) * 36}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400" />
              <polygon points={`0,40 ${m.trend.map((v, idx) => `${(idx / (m.trend.length - 1)) * 80},${40 - (v / Math.max(...m.trend)) * 36}`).join(' ')} 80,40`} fill={`url(#spk-${i})`} />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{m.value}</p>
          <p className="text-xs text-zinc-400">{m.label}</p>
          <p className="mt-1 text-[11px] text-zinc-600">{m.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}