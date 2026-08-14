import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { listFinance, saveTransaction, deleteTransaction } from '@/lib/business/finance.functions';
import {
  Stat, Tabs, Empty, Loading, Failed, Table, Pill,
  formatMoney, formatNumber, formatDate,
} from '@/components/business/live';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expenses' },
  { id: 'pending', label: 'Pending' },
];
const EMPTY_FORM = {
  occurred_on: new Date().toISOString().slice(0, 10),
  direction: 'income', category: '', description: '', amount: '', currency: 'GBP', status: 'settled',
};

export default function Finance() {
  const qc = useQueryClient();
  const session = useSessionReady();
  const [tab, setTab] = useState('all');
  const [form, setForm] = useState(null);

  const listFn = useServerFn(listFinance);
  const saveFn = useServerFn(saveTransaction);
  const deleteFn = useServerFn(deleteTransaction);

  const finance = useQuery({
    queryKey: ['finance'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance'] });
  const fail = (e) => toast({ title: 'Action failed', description: friendlyMessage(e), variant: 'destructive' });

  const save = useMutation({
    mutationFn: (payload) => saveFn({ data: payload }),
    onSuccess: () => { setForm(null); invalidate(); toast({ title: 'Transaction recorded' }); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast({ title: 'Transaction deleted' }); },
    onError: fail,
  });

  const transactions = finance.data?.transactions ?? [];
  const summary = finance.data?.summary;
  const series = finance.data?.series ?? [];
  const categories = finance.data?.categories ?? [];
  const currency = summary?.currency ?? 'GBP';

  const visible = useMemo(() => {
    if (tab === 'all') return transactions;
    if (tab === 'pending') return transactions.filter((t) => t.status === 'pending');
    return transactions.filter((t) => t.direction === tab);
  }, [transactions, tab]);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Finance Centre"
        description="Recorded transactions only. Revenue, expenses and profit are computed from your ledger — nothing here is projected."
        action={
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Record transaction
          </button>
        }
      />

      {session === 'no' && <Failed message="Sign in to view your finance ledger." />}
      {session === 'yes' && finance.isLoading && <Loading />}
      {finance.isError && <Failed message={friendlyMessage(finance.error)} onRetry={() => finance.refetch()} />}

      {finance.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Revenue (recorded)" value={summary.count ? formatMoney(summary.revenue, currency) : null} tone="text-emerald-300" />
            <Stat label="Expenses" value={summary.count ? formatMoney(summary.expenses, currency) : null} tone="text-rose-300" />
            <Stat label="Profit" value={summary.count ? formatMoney(summary.profit, currency) : null} />
            <Stat label="Pending" value={summary.count ? formatMoney(summary.outstanding, currency) : null} tone="text-amber-300" />
            <Stat label="AI model spend" value={finance.data.aiSpend ? `$${finance.data.aiSpend.toFixed(2)}` : null} hint="From metered usage" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
              <h3 className="text-sm font-medium text-white">Income vs expenses by month</h3>
              {series.length === 0 ? (
                <Empty title="No data yet" desc="Record transactions to see monthly trends." />
              ) : (
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#0c0d13', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                      <Area type="monotone" dataKey="income" stroke="#34d399" fill="rgba(52,211,153,0.15)" />
                      <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="rgba(251,113,133,0.15)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
              <h3 className="text-sm font-medium text-white">Expenses by category</h3>
              {categories.length === 0 ? (
                <Empty title="No data yet" desc="Categorised expenses will appear here." />
              ) : (
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#0c0d13', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                      <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

          <div className="mt-4">
            <Table
              columns={['Date', 'Description', 'Category', 'Direction', 'Status', 'Amount', '']}
              rows={visible}
              empty={
                <Empty
                  icon={Receipt}
                  title={transactions.length ? 'Nothing in this view' : 'No transactions yet'}
                  desc={transactions.length ? 'Try a different filter.' : 'Record your first transaction to build a real ledger.'}
                  action={
                    <button onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white hover:bg-white/10">
                      Record transaction
                    </button>
                  }
                />
              }
              renderRow={(t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                  <td className="px-4 py-3 text-zinc-400">{formatDate(t.occurred_on)}</td>
                  <td className="px-4 py-3 text-white">{t.description || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{t.category || '—'}</td>
                  <td className="px-4 py-3">
                    <Pill tone={t.direction === 'income' ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10' : 'text-rose-300 border-rose-400/20 bg-rose-400/10'}>
                      {t.direction}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.status}</td>
                  <td className="px-4 py-3 text-zinc-100">{formatMoney(t.amount, t.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove.mutate(t.id)} className="text-zinc-500 hover:text-rose-300" aria-label="Delete transaction">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )}
            />
            {transactions.length > 0 && (
              <p className="mt-2 text-[11px] text-zinc-600">{formatNumber(transactions.length)} recorded transactions.</p>
            )}
          </div>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5">
            <h2 className="text-sm font-semibold text-white">Record transaction</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] text-zinc-400">
                Date
                <input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[11px] text-zinc-400">
                Direction
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white">
                  <option value="income">income</option>
                  <option value="expense">expense</option>
                </select>
              </label>
              <label className="text-[11px] text-zinc-400">
                Amount
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[11px] text-zinc-400">
                Currency
                <input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[11px] text-zinc-400">
                Category
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[11px] text-zinc-400">
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white">
                  {['settled', 'pending', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="col-span-full text-[11px] text-zinc-400">
                Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
              <button
                disabled={!form.amount || save.isPending}
                onClick={() => save.mutate({ ...form, amount: Number(form.amount) })}
                className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
