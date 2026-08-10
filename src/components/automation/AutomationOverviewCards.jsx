import { motion } from 'framer-motion';
import { OVERVIEW_METRICS } from './automationData';

function Sparkline({ data, grad }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id={`spark-${grad}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(139,92,246,.4)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="rgba(139,92,246,.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,100 ${pts} 100,100`} fill={`url(#spark-${grad})`} />
    </svg>
  );
}

export default function AutomationOverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {OVERVIEW_METRICS.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.3) }}
          whileHover={{ y: -3 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-4"
        >
          <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${m.grad} opacity-20 blur-2xl`} />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500">{m.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{m.value}</p>
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.grad} text-white shadow-lg`}>
              <m.icon className="h-5 w-5" />
            </span>
          </div>
          <div className="relative mt-2">
            <Sparkline data={m.trend} grad={m.grad.replace(/\s/g,'')} />
          </div>
          <p className="relative mt-1 text-[11px] text-zinc-500">{m.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}