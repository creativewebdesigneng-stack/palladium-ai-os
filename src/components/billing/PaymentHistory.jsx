import { CheckCircle2, XCircle } from 'lucide-react';
import { PAYMENT_HISTORY } from './billingData';
import { StatusBadge } from './shared';

export default function PaymentHistory() {
  return (
    <div className="space-y-2">
      {PAYMENT_HISTORY.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {p.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
            <div>
              <p className="text-xs font-medium text-white">{p.id}</p>
              <p className="text-[10px] text-zinc-500">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.method}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white">£{p.amount.toFixed(2)}</span>
            <StatusBadge status={p.status} />
          </div>
        </div>
      ))}
    </div>
  );
}