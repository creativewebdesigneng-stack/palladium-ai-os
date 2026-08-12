import { motion } from 'framer-motion';

const STATUS = {
  active: { label: 'Active', badge: 'bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  owner: { label: 'Owner', badge: 'bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
};

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

export function StatusBadge({ status = 'active' }) {
  const s = STATUS[status] || STATUS.active;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    owner: 'bg-amber-500/10 text-amber-300',
    admin: 'bg-rose-500/10 text-rose-300',
    member: 'bg-sky-500/10 text-sky-300',
  };
  const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${map[role] || 'bg-white/5 text-zinc-400'}`}>{label}</span>;
}

export function Avatar({ initials, grad = 'from-violet-500 to-indigo-500', size = 'h-8 w-8', text = 'text-[11px]' }) {
  return <span className={`grid ${size} place-items-center rounded-full bg-gradient-to-br ${grad} ${text} font-semibold text-white`}>{initials}</span>;
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

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-lg"><Icon className="h-5 w-5 text-white" /></span>
      <h4 className="mt-3 text-sm font-semibold text-white">{title}</h4>
      {desc && <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">{desc}</p>}
      {action}
    </div>
  );
}

export function nameInitials(name) {
  return (name || '?').split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export { motion };
