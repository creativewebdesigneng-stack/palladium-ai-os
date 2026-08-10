import { TRANSACTIONS, INVOICES, INVOICE_STATUS, CUSTOMERS, CUSTOMER_STATUS, EXPENSES, REPORTS, BUDGET } from './financeData';
import { ArrowUpRight, ArrowDownRight, FileText, Download, Eye, Plus, Receipt } from 'lucide-react';

export function TransactionsView() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-zinc-500">
            <th className="px-2 py-1.5 font-medium">DATE</th><th className="px-2 py-1.5 font-medium">DESCRIPTION</th>
            <th className="px-2 py-1.5 font-medium">ACCOUNT</th><th className="px-2 py-1.5 font-medium text-right">AMOUNT</th>
          </tr></thead>
          <tbody>
            {TRANSACTIONS.map((t) => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="px-2 py-2 text-zinc-400">{t.date}</td>
                <td className="px-2 py-2 text-zinc-200">{t.desc}</td>
                <td className="px-2 py-2 text-zinc-500">{t.account}</td>
                <td className={`px-2 py-2 text-right font-mono font-medium ${t.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  <span className="mr-1 inline-flex">{t.type === 'income' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}</span>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InvoicesView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {INVOICES.map((inv) => (
        <div key={inv.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-400" />
            <p className="text-[12px] font-medium text-white">{inv.id}</p>
            <span className={`ml-auto rounded-full border px-2 py-px text-[10px] font-medium ${INVOICE_STATUS[inv.status]}`}>{inv.status}</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold text-white">${inv.amount.toLocaleString()}</p>
          <p className="text-[11px] text-zinc-500">{inv.customer}</p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Issued {inv.issued}</span><span>Due {inv.due}</span>
          </div>
          <div className="mt-3 flex gap-1.5">
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />View</button>
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Download className="h-3 w-3" />PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomersView() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-zinc-500">
            <th className="px-2 py-1.5 font-medium">CUSTOMER</th><th className="px-2 py-1.5 font-medium text-right">OUTSTANDING (AR)</th>
            <th className="px-2 py-1.5 font-medium text-right">LIFETIME VALUE</th><th className="px-2 py-1.5 font-medium">LAST PAID</th><th className="px-2 py-1.5 font-medium">STATUS</th>
          </tr></thead>
          <tbody>
            {CUSTOMERS.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-2 py-2 text-zinc-200">{c.name}</td>
                <td className="px-2 py-2 text-right font-mono text-amber-300">${c.ar.toLocaleString()}</td>
                <td className="px-2 py-2 text-right font-mono text-emerald-300">${c.ltv.toLocaleString()}</td>
                <td className="px-2 py-2 text-zinc-500">{c.lastPaid}</td>
                <td className="px-2 py-2"><span className={`rounded-full px-2 py-px text-[10px] font-medium ${CUSTOMER_STATUS[c.status]}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExpensesView() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-white">Recent Expenses</h3>
        <div className="space-y-2">
          {EXPENSES.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <Receipt className="h-4 w-4 text-rose-400" />
              <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-zinc-200">{e.vendor}</p><p className="text-[10px] text-zinc-500">{e.date} · {e.category}</p></div>
              <span className="font-mono text-[12px] text-rose-300">-${e.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Budget vs Spend</h3>
        <div className="space-y-3">
          {BUDGET.map((b) => {
            const pct = Math.round((b.spent / b.budget) * 100);
            return (
              <div key={b.category}>
                <div className="flex justify-between text-[11px]"><span className="text-zinc-300">{b.category}</span><span className="text-zinc-500">{pct}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-white/5"><div className={`h-2 rounded-full ${pct > 90 ? 'bg-rose-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} /></div>
                <p className="mt-0.5 text-[10px] text-zinc-600">${(b.spent / 1000).toFixed(0)}k of ${(b.budget / 1000).toFixed(0)}k</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ReportsView() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {REPORTS.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-violet-400" /><p className="text-[13px] font-medium text-white">{r.name}</p></div>
          <p className="mt-1 text-[11px] text-zinc-500">{r.type} · {r.period}</p>
          <p className="mt-3 text-[10px] text-zinc-600">Updated {r.updated}</p>
          <div className="mt-3 flex gap-1.5">
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />Open</button>
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Download className="h-3 w-3" />Export</button>
          </div>
        </div>
      ))}
    </div>
  );
}