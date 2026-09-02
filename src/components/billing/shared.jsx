import { motion } from 'framer-motion';

export function Panel({ icon: Icon, title, grad, children, action }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(13,10,20,.88),rgba(6,6,10,.94))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" />
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-300/15 bg-violet-400/[.07]"><Icon className="h-3.5 w-3.5 text-violet-300" /></span>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function SectionHead({ icon: Icon, title, count, grad, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-300/15 bg-violet-400/[.07]"><Icon className="h-3.5 w-3.5 text-violet-300" /></span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {count != null && <span className="rounded-md border border-violet-300/10 bg-violet-400/[.03] px-1.5 py-0.5 text-[10px] text-zinc-400">{count}</span>}
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
            <stop className={`bg-gradient-to-r ${grad}`} stopColor="rgb(196,181,253)" offset="0%" />
            <stop className={`bg-gradient-to-r ${grad}`} stopColor="rgb(124,58,237)" offset="100%" />
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