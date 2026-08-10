import { Receipt, Clock, TrendingUp, HelpCircle } from 'lucide-react';
import { PAYMENT_HISTORY } from './billingData';
import { StatusBadge, Panel } from './shared';

export default function BillingRightSidebar() {
  const recent = PAYMENT_HISTORY.slice(0, 4);
  return (
    <div className="space-y-4">
      <Panel icon={Clock} title="Next renewal" grad="from-violet-500 to-indigo-500">
        <p className="text-sm text-white">7 Sep 2026</p>
        <p className="text-[11px] text-zinc-500">Auto-renews on Visa •••• 4242</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Pause</button>
          <button className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Switch to annual</button>
        </div>
      </Panel>

      <Panel icon={Receipt} title="Recent payments" grad="from-sky-500 to-cyan-500">
        <div className="space-y-2">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[11px]">
              <div>
                <p className="text-zinc-300">{p.id}</p>
                <p className="text-zinc-600">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white">£{p.amount.toFixed(2)}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={TrendingUp} title="Spend trend" grad="from-emerald-500 to-teal-500">
        <div className="flex h-20 items-end gap-1.5">
          {[48, 48, 64, 64, 79, 79, 79].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-600/30 to-emerald-400" style={{ height: h + 'px' }} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">Last 7 invoices · avg £350.00</p>
      </Panel>

      <Panel icon={HelpCircle} title="Billing support" grad="from-amber-500 to-orange-500">
        <p className="text-[11px] text-zinc-400">Need help with invoices, tax or refunds? Reach out to our billing team.</p>
        <button className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5">Contact billing</button>
      </Panel>
    </div>
  );
}