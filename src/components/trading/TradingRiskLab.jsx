import { useMemo, useState } from 'react';
import { Calculator, ShieldAlert, Target } from 'lucide-react';
import {
  calculateExposurePercent,
  calculatePositionSize,
  calculateRiskAmount,
  calculateRiskReward,
  calculateUnitRisk,
} from '@/lib/trading/trading-risk';

const fieldClass = 'mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/40';

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toFixed(2)}`;
  }
}

export default function TradingRiskLab() {
  const [form, setForm] = useState({
    account: '25000',
    riskPct: '1',
    entry: '100',
    stop: '97.5',
    target: '107.5',
    currency: 'GBP',
  });

  const result = useMemo(() => {
    const account = Math.max(0, n(form.account));
    const riskPct = Math.max(0, n(form.riskPct));
    const entry = Math.max(0, n(form.entry));
    const stop = Math.max(0, n(form.stop));
    const target = Math.max(0, n(form.target));
    const riskBudget = calculateRiskAmount(account, riskPct);
    const unitRisk = calculateUnitRisk(entry, stop);
    const units = calculatePositionSize(account, riskPct, entry, stop);
    const notional = units * entry;
    const rewardRisk = calculateRiskReward(entry, stop, target);
    const notionalPct = calculateExposurePercent(notional, account);
    return { riskBudget, unitRisk, units, notional, rewardRisk, notionalPct };
  }, [form]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.025] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300"><Calculator className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Risk lab</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Position sizing before prediction</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Deterministic planning calculator. It uses only the values you enter; it does not fetch a quote, recommend a trade or submit an order.</p>
        </div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.04] px-3 py-2 text-[11px] leading-5 text-amber-100/75">Leverage, fees, slippage, gaps, currency conversion and contract multipliers can make realised risk materially different.</div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account / strategy capital"><input className={fieldClass} type="number" min="0" step="any" value={form.account} onChange={set('account')} /></Field>
          <Field label="Maximum risk %"><input className={fieldClass} type="number" min="0" step="0.1" value={form.riskPct} onChange={set('riskPct')} /></Field>
          <Field label="Currency"><input className={fieldClass} maxLength={3} value={form.currency} onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} /></Field>
          <Field label="Planned entry"><input className={fieldClass} type="number" min="0" step="any" value={form.entry} onChange={set('entry')} /></Field>
          <Field label="Invalidation / stop"><input className={fieldClass} type="number" min="0" step="any" value={form.stop} onChange={set('stop')} /></Field>
          <Field label="Scenario target"><input className={fieldClass} type="number" min="0" step="any" value={form.target} onChange={set('target')} /></Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Risk budget" value={money(result.riskBudget, form.currency)} hint="Capital × risk %" />
          <Metric label="Risk per unit" value={money(result.unitRisk, form.currency)} hint="Absolute entry-stop distance" />
          <Metric label="Indicative units" value={result.units.toLocaleString(undefined, { maximumFractionDigits: 4 })} hint="Before lot-size / contract rules" />
          <Metric label="Indicative notional" value={money(result.notional, form.currency)} hint={`${result.notionalPct.toFixed(1)}% of entered capital`} />
          <Metric label="Reward / risk" value={`${result.rewardRisk.toFixed(2)}R`} hint="Scenario target distance ÷ stop distance" icon={Target} />
          <Metric label="Risk discipline" value={n(form.riskPct) <= 1 ? 'Conservative input' : n(form.riskPct) <= 2 ? 'Elevated input' : 'High input'} hint="Label only—not a recommendation" icon={ShieldAlert} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <label className="block text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500">{label}{children}</label>;
}

function Metric({ label, value, hint, icon: Icon }) {
  return <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">{Icon && <Icon className="mb-3 h-4 w-4 text-cyan-300" />}<p className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{hint}</p></div>;
}
