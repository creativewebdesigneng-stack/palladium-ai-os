import { Star, BadgeCheck, Sparkles } from 'lucide-react';

export function Avatar({ grad, initials, size = 'h-10 w-10' }) {
  return <span className={`grid ${size} shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} text-sm font-semibold text-white shadow-lg`}>{initials}</span>;
}

export function RatingStars({ rating, count, compact }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium text-white">{rating.toFixed(1)}</span>
      {!compact && count != null && <span className="text-[10px] text-zinc-500">({count})</span>}
    </div>
  );
}

export function PriceBadge({ price }) {
  const free = price === 'Free';
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${free ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20' : 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20'}`}>{price}</span>;
}

export function VerifiedBadge({ verified, label = 'Verified' }) {
  if (!verified) return null;
  return <span className="flex items-center gap-1 rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-medium text-sky-300 ring-1 ring-sky-400/20"><BadgeCheck className="h-3 w-3" />{label}</span>;
}

export function Flag({ show, label, grad }) {
  if (!show) return null;
  return <span className={`rounded-md bg-gradient-to-r ${grad} px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white`}>{label}</span>;
}

export function Chip({ children }) {
  return <span className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-[11px] text-zinc-300">{children}</span>;
}

export function Panel({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">{Icon && <Icon className="h-4 w-4 text-violet-400" />}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export const BADGE_GRADS = { new: 'from-emerald-500 to-teal-500', popular: 'from-amber-500 to-orange-500', enterprise: 'from-violet-500 to-indigo-500' };