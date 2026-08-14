/**
 * Shared presentation pieces for the live business modules.
 * Every value rendered here comes from backend records; when a figure is
 * unavailable the components show "No data yet" rather than a placeholder.
 */
import { Inbox } from 'lucide-react';

export const NO_DATA = 'No data yet';

export function formatMoney(value, currency = 'GBP') {
  if (value == null || Number.isNaN(Number(value))) return NO_DATA;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return NO_DATA;
  return new Intl.NumberFormat('en-GB').format(Number(value));
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return NO_DATA;
  return `${Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1)}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatRelative(value) {
  if (!value) return '—';
  const diff = Date.now() - Date.parse(value);
  if (Number.isNaN(diff)) return '—';
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function Stat({ label, value, hint, tone = 'text-white' }) {
  const empty = value === NO_DATA || value == null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${empty ? 'text-zinc-500' : tone}`}>
        {empty ? NO_DATA : value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-xl border px-3 py-2 text-xs transition ${
            active === t.id
              ? 'border-violet-400/40 bg-violet-500/15 text-white'
              : 'border-white/10 bg-white/[.03] text-zinc-400 hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title = 'No data yet', desc, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.02] px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-500">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-xs text-zinc-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading live data…' }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] py-14">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function Failed({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-6 text-center">
      <p className="text-sm text-rose-200">{message || 'We could not load this data.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white hover:bg-white/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Table({ columns, rows, renderRow, empty }) {
  if (!rows.length) return empty ?? <Empty />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.02]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

export function Pill({ children, tone = 'text-zinc-300 border-white/10 bg-white/5' }) {
  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] ${tone}`}>
      {children}
    </span>
  );
}

export const STATUS_TONE = {
  open: 'text-sky-300 border-sky-400/20 bg-sky-400/10',
  pending: 'text-amber-300 border-amber-400/20 bg-amber-400/10',
  resolved: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10',
  closed: 'text-zinc-400 border-white/10 bg-white/5',
  active: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10',
  paused: 'text-amber-300 border-amber-400/20 bg-amber-400/10',
  draft: 'text-zinc-400 border-white/10 bg-white/5',
  scheduled: 'text-sky-300 border-sky-400/20 bg-sky-400/10',
  completed: 'text-violet-300 border-violet-400/20 bg-violet-400/10',
  won: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10',
  lost: 'text-rose-300 border-rose-400/20 bg-rose-400/10',
};
