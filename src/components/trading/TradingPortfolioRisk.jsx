import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CircleDollarSign, ShieldAlert } from 'lucide-react';
import { listFinanceHoldings } from '@/lib/business/finance-holdings.functions';
import { summarizeManualPortfolioExposure } from '@/lib/trading/trading-risk';

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
  } catch {
    return currency + ' ' + (Number(value) || 0).toFixed(2);
  }
}

export default function TradingPortfolioRisk() {
  const [holdings, setHoldings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listFinanceHoldings({ data: {} })
      .then((rows) => { if (active) setHoldings(rows ?? []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load portfolio exposure context.'); });
    return () => { active = false; };
  }, []);

  const summaries = useMemo(() => summarizeManualPortfolioExposure(holdings), [holdings]);
  const missing = summaries.reduce((sum, group) => sum + group.unvaluedCount, 0);

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300"><BriefcaseBusiness className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Portfolio risk context</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Exposure without duplicating Finance</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Reads Blackstar Finance holdings directly. Manual values stay grouped by currency and are never presented as live market prices or converted without an authenticated FX source.</p>
        </div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.04] px-3 py-2 text-[10px] leading-4 text-amber-100/75">
          {missing ? missing + ' holding' + (missing === 1 ? '' : 's') + ' missing a manual valuation.' : 'All stored holdings have a manual valuation.'}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] px-3 py-2 text-xs text-rose-200">{error}</div>}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {summaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">No Finance holdings are available yet. Add holdings in Blackstar Finance to populate portfolio risk context.</div>
        ) : summaries.map((group) => (
          <article key={group.currency} className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{group.currency} manual exposure</p>
                <p className="mt-1 text-xl font-semibold text-white">{money(group.total, group.currency)}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{group.valuedCount} valued · {group.unvaluedCount} unvalued</p>
              </div>
              <CircleDollarSign className="h-4 w-4 text-cyan-300" />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Metric label="Largest holding" value={group.largestSymbol || 'Unavailable'} />
              <Metric label="Largest concentration" value={group.total > 0 ? group.largestPercent.toFixed(1) + '%' : 'Unavailable'} />
            </div>

            <div className="mt-4 space-y-2">
              {group.assetExposure.map((asset) => (
                <div key={asset.assetType} className="rounded-xl border border-white/[.06] px-3 py-2">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs capitalize text-zinc-300">{asset.assetType}</span><span className="text-[10px] text-zinc-500">{asset.percent.toFixed(1)}%</span></div>
                  <p className="mt-1 text-[10px] text-zinc-600">{money(asset.value, group.currency)} user-supplied value</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[.03] p-3 text-[10px] leading-4 text-cyan-100/65">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Concentration percentages describe only stored manual values inside the same currency bucket. They exclude unvalued holdings and do not estimate liquidity, leverage, derivatives exposure, FX risk or current market value.
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-white/[.06] p-2.5"><p className="text-[9px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></div>;
}
