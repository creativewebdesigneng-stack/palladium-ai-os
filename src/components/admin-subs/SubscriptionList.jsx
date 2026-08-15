import { Search, Eye, CreditCard, Calendar, User, Building2, Activity } from 'lucide-react';

const STATUS_CLS = { active: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', past_due: 'text-amber-300 bg-amber-400/10 border-amber-400/20', canceled: 'text-rose-300 bg-rose-400/10 border-rose-400/20', trialing: 'text-sky-300 bg-sky-400/10 border-sky-400/20' };

export default function SubscriptionList({ subscriptions, onView, filters, setFilters }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const planNames = [...new Set(subscriptions.map((s) => s.plan).filter(Boolean))].sort();
  const statuses = [...new Set(subscriptions.map((s) => s.status).filter(Boolean))].sort();
  const filtered = subscriptions.filter(s => {
    if (filters.status !== 'all' && s.status !== filters.status) return false;
    if (filters.plan !== 'all' && s.plan !== filters.plan) return false;
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      if (![s.customer, s.email, s.org, s.plan].some((value) => String(value ?? '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={filters.q} onChange={e => set('q', e.target.value)} placeholder="Search customer, organisation or plan…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </div>
        <select value={filters.plan} onChange={e => set('plan', e.target.value)} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-2 text-[11px] text-zinc-200 [&>option]:bg-[#10121a]"><option value="all">All plans</option>{planNames.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select>
        <select value={filters.status} onChange={e => set('status', e.target.value)} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-2 text-[11px] capitalize text-zinc-200 [&>option]:bg-[#10121a]"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-white/[.03] text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Normalised MRR</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">Renews</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-white/[.02]">
                <td className="px-3 py-2.5"><p className="text-[12px] font-medium text-white">{s.customer}</p>{s.email ? <p className="text-[10px] text-zinc-500">{s.email}</p> : null}</td>
                <td className="px-3 py-2.5"><span className="rounded-md bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">{s.plan}</span></td>
                <td className="px-3 py-2.5 text-zinc-300">£{Number(s.mrr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[s.status] ?? 'border-white/10 bg-white/5 text-zinc-300'}`}>{s.status}</span></td>
                <td className="px-3 py-2.5 text-zinc-400">{s.started}</td>
                <td className="px-3 py-2.5 text-zinc-400">{s.renews}</td>
                <td className="px-3 py-2.5 text-right"><button onClick={() => onView(s)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />View</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-zinc-500">No subscriptions match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SubscriptionDetail({ sub, onClose, onAction }) {
  if (!sub) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-semibold text-white">{sub.customer[0]}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{sub.customer}</p>{sub.email ? <p className="text-[11px] text-zinc-500">{sub.email}</p> : null}</div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_CLS[sub.status] ?? 'border-white/10 bg-white/5 text-zinc-300'}`}>{sub.status}</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 text-[13px]">
          <Row icon={User} label="Customer" value={sub.customer} />
          <Row icon={Building2} label="Organisation / account" value={sub.org} />
          <Row icon={CreditCard} label="Plan" value={sub.plan} />
          <Row icon={CreditCard} label="Recurring price" value={sub.recurringPriceLabel} />
          <Row icon={CreditCard} label="Payment method" value={sub.method} />
          <Row icon={Calendar} label="Started" value={sub.started} />
          <Row icon={Calendar} label="Renews" value={sub.renews} />
          <Row icon={Activity} label="Normalised MRR" value={`£${Number(sub.mrr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
          <button onClick={() => onAction('upgrade', sub)} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 py-2.5 text-xs text-emerald-300 hover:bg-emerald-400/20">Upgrade</button>
          <button onClick={() => onAction('downgrade', sub)} className="rounded-xl border border-amber-400/20 bg-amber-400/10 py-2.5 text-xs text-amber-300 hover:bg-amber-400/20">Downgrade</button>
          <button onClick={() => onAction('cancel', sub)} className="rounded-xl border border-rose-400/20 bg-rose-400/10 py-2.5 text-xs text-rose-300 hover:bg-rose-400/20">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"><span className="flex items-center gap-1.5 text-zinc-500"><Icon className="h-3.5 w-3.5" />{label}</span><span className="text-right text-zinc-200">{value}</span></div>;
}