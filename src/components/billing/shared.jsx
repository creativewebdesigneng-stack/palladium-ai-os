import { motion } from 'framer-motion';

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
  const map = {
    paid: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
    success: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
    failed: 'bg-red-500/10 text-red-300 ring-red-400/20',
    pending: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
    active: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ring-1 ${map[status] || 'bg-white/5 text-zinc-400 ring-white/10'}`}>{status}</span>;
}

export function ProgressRing({ value, max, grad = 'from-violet-500 to-indigo-500', label }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }} transition={{ duration: 1, ease: 'easeOut' }} />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop className={`bg-gradient-to-r ${grad}`} stopColor="rgb(139,92,246)" offset="0%" />
            <stop className={`bg-gradient-to-r ${grad}`} stopColor="rgb(99,102,241)" offset="100%" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-semibold text-white">{pct}%</p>
        {label && <p className="text-[10px] text-zinc-500">{label}</p>}
      </div>
    </div>
  );
}

export function MiniBar({ items }) {
  const max = Math.max(...items.map(i => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.name}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">{i.name}</span>
            <span className="font-medium text-zinc-300">{i.value}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div className={`h-full rounded-full ${i.color}`} initial={{ width: 0 }} animate={{ width: `${(i.value / max) * 100}%` }} transition={{ duration: 0.7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}