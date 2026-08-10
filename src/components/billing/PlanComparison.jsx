import { Check, Minus } from 'lucide-react';
import { PLANS, COMPARISON_ROWS } from './billingData';

const EXTRAS = {
  sso: { basic: false, professional: false, business: false, enterprise: true, 'enterprise-plus': true },
  security: { basic: false, professional: false, business: true, enterprise: true, 'enterprise-plus': true },
  sla: { basic: false, professional: false, business: false, enterprise: true, 'enterprise-plus': true },
};

function cellValue(plan, row) {
  if (row.key === 'price') return plan.contactSales ? 'Custom' : `£${plan.price}`;
  const v = plan.limits[row.key];
  if (v !== undefined) return v;
  const extra = EXTRAS[row.key];
  return extra ? extra[plan.id] : null;
}

export default function PlanComparison({ currentId = 'professional' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-white/[.03] text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Feature</th>
            {PLANS.map((p) => (
              <th key={p.id} className={`px-4 py-3 font-medium ${p.id === currentId ? 'text-violet-300' : 'text-zinc-300'}`}>
                {p.name}{p.id === currentId && <span className="ml-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] text-violet-300">Current</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.key} className="hover:bg-white/[.02]">
              <td className="px-4 py-2.5 text-xs text-zinc-400">{row.feature}</td>
              {PLANS.map((p) => {
                const val = cellValue(p, row);
                const isBool = typeof val === 'boolean';
                return (
                  <td key={p.id} className="px-4 py-2.5 text-xs">
                    {isBool ? (
                      val ? <Check className="h-4 w-4 text-emerald-400" /> : <Minus className="h-4 w-4 text-zinc-600" />
                    ) : (
                      <span className="text-zinc-300">{val}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}