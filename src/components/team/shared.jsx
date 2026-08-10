import { motion } from 'framer-motion';
import { STATUS } from './teamData';

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
  const s = STATUS[status] || STATUS.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    Owner: 'bg-amber-500/10 text-amber-300',
    Administrator: 'bg-rose-500/10 text-rose-300',
    Manager: 'bg-cyan-500/10 text-cyan-300',
    Developer: 'bg-violet-500/10 text-violet-300',
    Employee: 'bg-sky-500/10 text-sky-300',
    Analyst: 'bg-emerald-500/10 text-emerald-300',
    Viewer: 'bg-zinc-500/10 text-zinc-400',
    'Custom Role': 'bg-fuchsia-500/10 text-fuchsia-300',
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${map[role] || 'bg-white/5 text-zinc-400'}`}>{role}</span>;
}

export function Avatar({ initials, grad, size = 'h-8 w-8', text = 'text-[11px]' }) {
  return <span className={`grid ${size} place-items-center rounded-full bg-gradient-to-br ${grad} ${text} font-semibold text-white`}>{initials}</span>;
}

export function Sparkline({ data, grad = 'from-violet-500 to-indigo-500', className = 'h-7' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`w-full ${className}`}>
      <motion.polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`bg-gradient-to-r ${grad} text-violet-400`} vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
    </svg>
  );
}

export function Panel({ icon: Icon, title, grad, children, action }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-3.5 w-3.5 text-white" /></span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}