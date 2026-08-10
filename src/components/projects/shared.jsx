import { Star } from 'lucide-react';
import { STATUS_STYLE, DEPLOY_STYLE } from './projectsData';

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.planning;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

export function DeployBadge({ deploy }) {
  const d = DEPLOY_STYLE[deploy] || DEPLOY_STYLE.none;
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${d.chip}`}>{d.label}</span>;
}

export function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      <Star className="h-3 w-3 fill-amber-400" />
      <span className="text-[11px] font-medium text-zinc-300">{value}</span>
    </span>
  );
}

export function Avatar({ initials, grad, size = 'sm' }) {
  const sz = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'md' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return <span className={`grid ${sz} place-items-center rounded-full bg-gradient-to-br ${grad} font-semibold text-white ring-2 ring-black/30`}>{initials}</span>;
}

export function CollaboratorStack({ list, max = 3 }) {
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <span key={n} className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-zinc-600 to-slate-700 text-[9px] font-semibold text-white ring-2 ring-black/40" style={{ zIndex: 10 - i }}>
          {n.split(' ').map(w => w[0]).join('')}
        </span>
      ))}
      {extra > 0 && <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-800 text-[9px] font-medium text-zinc-400 ring-2 ring-black/40">+{extra}</span>}
    </div>
  );
}

export function Progress({ value, grad = 'from-violet-500 to-indigo-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-medium text-zinc-400">{value}%</span>
    </div>
  );
}

export function SectionHead({ icon: Icon, title, count, grad = 'from-violet-500 to-indigo-500', action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {count !== undefined && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">{count}</span>}
      </div>
      {action}
    </div>
  );
}