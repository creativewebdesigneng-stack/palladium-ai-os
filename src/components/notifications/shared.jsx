import { motion } from 'framer-motion';
import { Bell, Star, AtSign, XCircle, Inbox } from 'lucide-react';

export function Panel({ icon: Icon, title, grad, desc, children, action }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${grad}`}><Icon className="h-4 w-4 text-white" /></span>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {desc && <p className="text-[11px] text-zinc-500">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    critical: 'bg-red-500/15 text-red-300 ring-red-400/20',
    high: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
    medium: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',
    low: 'bg-zinc-500/15 text-zinc-400 ring-white/10',
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase ring-1 ${map[priority] || map.low}`}>{priority}</span>;
}

export function UnreadDot({ read }) {
  return !read ? <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400 ring-4 ring-violet-400/10" /> : null;
}

export function EmptyState({ title, desc, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10">
        <Bell className="h-6 w-6 text-violet-300" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-zinc-500">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-violet-500' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </button>
  );
}