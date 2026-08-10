import { motion } from 'framer-motion';
import { STATUS } from './integrationsData';

export function SectionHead({ icon: Icon, title, count, grad, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-3.5 w-3.5 text-white" /></span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {count != null && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{count}</span>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

export function StatusDot({ status }) {
  const s = STATUS[status] || STATUS.disconnected;
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />;
}

export function Sparkline({ data, grad = 'from-violet-500 to-indigo-500', className = 'h-7' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  const id = `sl-${grad.replace(/[^a-z]/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`w-full ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={`text-violet-500`} stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`bg-gradient-to-r ${grad} text-violet-400`} vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
    </svg>
  );
}

export function CapChips({ caps, max = 4 }) {
  const shown = caps.slice(0, max);
  const rest = caps.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(c => <span key={c} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{c}</span>)}
      {rest > 0 && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-500">+{rest}</span>}
    </div>
  );
}

export function Avatar({ initials, grad }) {
  return <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${grad} text-[10px] font-semibold text-white`}>{initials}</span>;
}