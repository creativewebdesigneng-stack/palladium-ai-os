import { Download, FileText } from 'lucide-react';
import { INVOICES } from './billingData';
import { StatusBadge } from './shared';

export default function InvoicesTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Invoice</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Download</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {INVOICES.map((inv) => (
            <tr key={inv.id} className="text-zinc-300 hover:bg-white/[.02]">
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-zinc-500" /><span className="font-mono text-xs">{inv.id}</span></span>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td className="px-4 py-2.5 text-white">£{inv.amount.toFixed(2)}</td>
              <td className="px-4 py-2.5"><StatusBadge status={inv.status} /></td>
              <td className="px-4 py-2.5 text-right">
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5">
                  <Download className="h-3 w-3" /> PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}