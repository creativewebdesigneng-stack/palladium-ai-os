import { X, ShieldCheck } from 'lucide-react';

const STATUS_CLS = {
  active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  inactive: 'text-zinc-300 bg-white/5 border-white/10',
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

/** Read-only account panel built entirely from database fields. */
export default function UserDetail({ user, onClose, planLabels = {} }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold text-white">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[user.status] ?? STATUS_CLS.inactive}`}>
            {user.status}
          </span>
          <button onClick={onClose} className="ml-1 text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4 text-[13px]">
          <Row label="User ID" value={user.id} mono />
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Plan" value={planLabels[user.plan] ?? user.plan} />
          <Row label="Subscription" value={user.status} />
          <Row label="Platform roles" value={user.platformRoles?.length ? user.platformRoles.join(', ') : 'user'} />
          <Row label="Created" value={formatDate(user.createdAt)} />
        </div>

        <div className="flex items-start gap-2 border-t border-white/10 p-4 text-[11px] text-zinc-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p>
            This panel is read-only. Plan and role changes are made through billing and the roles
            table so that every change is attributable and audited.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/[.02] px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`min-w-0 break-all text-right text-zinc-200 ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
