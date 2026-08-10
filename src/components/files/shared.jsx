import { motion } from 'framer-motion';

export function SectionHead({ icon: Icon, title, count, grad, action }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </span>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {count !== undefined && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">{count}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function Progress({ value, grad = 'from-violet-500 to-indigo-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${grad}`}
        />
      </div>
      <span className="text-[10px] tabular-nums text-zinc-500">{value}%</span>
    </div>
  );
}

export function Sparkline({ data, grad = 'from-violet-500 to-indigo-500' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  const id = `spark-${grad.replace(/[^a-z]/gi, '')}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(139,92,246,.3)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke="rgba(139,92,246,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatusDot({ status }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${status.dot}`} />
      <span className={`text-[11px] ${status.text}`}>{status.label}</span>
    </span>
  );
}