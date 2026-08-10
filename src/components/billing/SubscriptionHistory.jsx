import { useAuth } from '@/lib/AuthContext';
import { getPlanKey, planDisplay } from '@/lib/permissions';
import { SUBSCRIPTION_HISTORY } from './billingData';

// Lightweight subscription history panel for the billing Overview tab. Shows
// the user's active plan plus prior events. Replace SUBSCRIPTION_HISTORY with
// backend billing events when available.
export default function SubscriptionHistory() {
  const { user } = useAuth();
  const display = planDisplay(getPlanKey(user));
  const rows = [
    { date: new Date().toISOString().slice(0, 10), event: `Active on ${display.name}${display.subtitle ? ` ${display.subtitle}` : ''} plan`, plan: display.name },
    ...SUBSCRIPTION_HISTORY,
  ];
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p className="text-zinc-200">{r.event}</p>
            <p className="text-[11px] text-zinc-500">{r.date}</p>
          </div>
          <span className="text-xs text-zinc-400">{r.plan}</span>
        </div>
      ))}
    </div>
  );
}