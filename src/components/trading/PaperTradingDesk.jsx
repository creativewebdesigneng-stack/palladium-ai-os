import { useMemo, useState } from 'react';
import { BookOpenCheck, FlaskConical, Plus, Trash2 } from 'lucide-react';
import { paperPositionPnl, simulatePaperOrder } from '@/lib/trading/paper-trading';

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-violet-300/25';

export default function PaperTradingDesk() {
  const [form, setForm] = useState({ symbol: 'MSFT', side: 'buy', orderType: 'market', quantity: '10', referencePrice: '100', limitPrice: '99' });
  const [mark, setMark] = useState('100');
  const [error, setError] = useState(null);
  const [fills, setFills] = useState([]);

  const preview = useMemo(() => {
    const quantity = Number(form.quantity);
    const price = Number(form.referencePrice);
    return Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0;
  }, [form.quantity, form.referencePrice]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const place = () => {
    setError(null);
    try {
      const fill = simulatePaperOrder({
        symbol: form.symbol,
        side: form.side,
        orderType: form.orderType,
        quantity: Number(form.quantity),
        referencePrice: Number(form.referencePrice),
        limitPrice: form.orderType === 'limit' ? Number(form.limitPrice) : null,
      });
      setFills((current) => [{ ...fill, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current].slice(0, 25));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Paper order could not be simulated.');
    }
  };

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-fuchsia-300" /><h2 className="font-medium text-white">Paper trading desk</h2></div><p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Simulate market and limit orders against a reference price, then journal paper fills and mark-to-market P&amp;L. This module cannot contact a broker.</p></div>
        <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/[.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-fuchsia-100">Simulation only</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Symbol"><input value={form.symbol} onChange={set('symbol')} className={inputClass} /></Field>
            <Field label="Side"><select value={form.side} onChange={set('side')} className={inputClass}><option value="buy">Buy / long</option><option value="sell">Sell / short</option></select></Field>
            <Field label="Order type"><select value={form.orderType} onChange={set('orderType')} className={inputClass}><option value="market">Market</option><option value="limit">Limit</option></select></Field>
            <Field label="Quantity"><input type="number" min="0" step="any" value={form.quantity} onChange={set('quantity')} className={inputClass} /></Field>
            <Field label="Reference price"><input type="number" min="0" step="any" value={form.referencePrice} onChange={set('referencePrice')} className={inputClass} /></Field>
            {form.orderType === 'limit' && <Field label="Limit price"><input type="number" min="0" step="any" value={form.limitPrice} onChange={set('limitPrice')} className={inputClass} /></Field>}
          </div>
          <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><p className="text-[9px] uppercase tracking-[.12em] text-zinc-600">Paper notional</p><p className="mt-1 text-lg font-semibold text-white">{Number.isFinite(preview) ? preview.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</p><p className="mt-1 text-[9px] leading-4 text-zinc-600">Reference-price calculation only. Fees, spread, slippage, liquidity and tax are not inferred.</p></div>
          {error && <p className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-2.5 text-[10px] text-rose-100">{error}</p>}
          <button onClick={place} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-500/90 px-4 py-2.5 text-xs font-semibold text-black hover:bg-fuchsia-400"><Plus className="h-3.5 w-3.5" />Simulate paper order</button>
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><BookOpenCheck className="h-3.5 w-3.5 text-fuchsia-300" /><h3 className="text-xs font-semibold text-white">Session journal</h3></div><p className="mt-1 text-[10px] text-zinc-600">Paper fills remain in this browser session in this first simulator slice.</p></div><label className="text-[9px] uppercase tracking-[.1em] text-zinc-600">Mark price<input type="number" min="0" step="any" value={mark} onChange={(event) => setMark(event.target.value)} className="ml-2 w-28 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white outline-none" /></label></div>
          <div className="mt-3 space-y-2">{fills.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">No paper orders in this session yet.</div>}{fills.map((fill) => {
            const pnl = fill.status === 'filled' ? paperPositionPnl({ side: fill.side, quantity: fill.quantity, entryPrice: fill.fillPrice, currentPrice: Number(mark) }) : 0;
            return <article key={fill.id} className="rounded-xl border border-white/[.06] bg-white/[.018] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white">{fill.side.toUpperCase()} {fill.quantity} {fill.symbol}</p><p className="mt-1 text-[10px] text-zinc-600">{fill.orderType} · {fill.status} · reference/fill {fill.fillPrice.toLocaleString()}</p></div><div className="text-right"><p className={`text-xs font-semibold ${pnl > 0 ? 'text-emerald-300' : pnl < 0 ? 'text-rose-300' : 'text-zinc-400'}`}>{fill.status === 'filled' ? `${pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Pending'}</p><button onClick={() => setFills((current) => current.filter((item) => item.id !== fill.id))} className="mt-1 text-zinc-700 hover:text-rose-300" aria-label="Remove paper order"><Trash2 className="ml-auto h-3 w-3" /></button></div></div><p className="mt-2 text-[9px] leading-4 text-zinc-600">{fill.reason}</p></article>;
          })}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <label className="block text-[9px] font-medium uppercase tracking-[.1em] text-zinc-600">{label}{children}</label>;
}
