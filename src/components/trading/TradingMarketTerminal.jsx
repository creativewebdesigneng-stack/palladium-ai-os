import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, BarChart3, DatabaseZap, Loader2, RefreshCw, Search } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { enrichTradingCandles } from '@/lib/trading/indicators';
import { getTradingMarketSeries } from '@/lib/trading/market-data.functions';

const QUICK = [
  ['equity', 'MSFT'], ['equity', 'AAPL'], ['fx', 'EUR/USD'], ['fx', 'GBP/USD'], ['crypto', 'BTC/USD'], ['crypto', 'ETH/USD'],
];

function demoSeries() {
  const start = new Date('2026-06-01T00:00:00Z');
  let last = 100;
  return Array.from({ length: 72 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const drift = Math.sin(index / 5) * 0.9 + Math.cos(index / 11) * 0.45 + 0.18;
    const open = last;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + 0.8 + (index % 3) * 0.12;
    const low = Math.min(open, close) - 0.7 - (index % 4) * 0.08;
    last = close;
    return {
      time: date.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: 100000 + (index * 3179) % 55000,
    };
  });
}

const demoResult = {
  provider: 'blackstar-demo',
  sourceLabel: 'Blackstar deterministic demo tape',
  freshness: 'demo',
  symbol: 'DEMO',
  kind: 'equity',
  asOf: '2026-08-11',
  candles: demoSeries(),
};

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function TradingMarketTerminal() {
  const marketFn = useServerFn(getTradingMarketSeries);
  const [kind, setKind] = useState('equity');
  const [symbol, setSymbol] = useState('MSFT');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [providerMessage, setProviderMessage] = useState(null);
  const [series, setSeries] = useState(demoResult);

  const enriched = useMemo(() => enrichTradingCandles(series.candles || []), [series]);
  const latest = enriched.at(-1);
  const first = enriched.at(0);
  const change = latest && first && first.close ? ((latest.close / first.close) - 1) * 100 : null;

  const load = async (nextKind = kind, nextSymbol = symbol) => {
    if (pending) return;
    setPending(true);
    setError(null);
    setProviderMessage(null);
    try {
      const response = await marketFn({ data: { kind: nextKind, symbol: nextSymbol } });
      if (!response.configured) {
        setProviderMessage(response.message);
        return;
      }
      setSeries(response.series);
    } catch (requestError) {
      setError(friendlyMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  const quickLoad = ([nextKind, nextSymbol]) => {
    setKind(nextKind);
    setSymbol(nextSymbol);
    void load(nextKind, nextSymbol);
  };

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-300" /><h2 className="font-medium text-white">Market terminal</h2></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Daily OHLCV workspace with deterministic SMA, EMA, RSI, ATR and Bollinger calculations. Provider data is server-fetched; the built-in tape is visibly labelled DEMO.</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] ${series.freshness === 'demo' ? 'border-amber-300/20 bg-amber-300/[.06] text-amber-100' : 'border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100'}`}>{series.freshness}</span>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-[140px_minmax(0,1fr)_120px]">
        <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2.5 text-xs text-zinc-200">
          <option value="equity">Equity / ETF</option><option value="fx">FX pair</option><option value="crypto">Crypto pair</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Search className="h-3.5 w-3.5 text-zinc-600" /><input value={symbol} onChange={(event) => setSymbol(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none" placeholder={kind === 'equity' ? 'MSFT' : 'EUR/USD'} /></label>
        <button onClick={() => void load()} disabled={pending} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Load</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">{QUICK.map((item) => <button key={`${item[0]}-${item[1]}`} onClick={() => quickLoad(item)} className="rounded-lg border border-white/[.07] bg-black/20 px-2.5 py-1.5 text-[10px] text-zinc-500 hover:border-violet-300/20 hover:text-white">{item[1]}</button>)}</div>

      {providerMessage && <div className="mt-4 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.045] p-3 text-xs leading-5 text-amber-100/80"><DatabaseZap className="mt-0.5 h-4 w-4 shrink-0" /><span>{providerMessage} The demo tape stays active so charts and indicators remain testable without pretending it is live data.</span></div>}
      {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-3 text-xs text-rose-100">{error}</div>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Instrument" value={series.symbol} hint={series.sourceLabel} />
        <Metric label="Latest close" value={formatPrice(latest?.close)} hint={`As of ${series.asOf || 'unknown'}`} />
        <Metric label="Tape change" value={change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`} hint={`${enriched.length} observations`} />
        <Metric label="RSI 14" value={latest?.rsi14 == null ? '—' : latest.rsi14.toFixed(1)} hint="Deterministic, observed closes" />
        <Metric label="ATR 14" value={latest?.atr14 == null ? '—' : formatPrice(latest.atr14)} hint="Deterministic true range" />
      </div>

      <div className="mt-4 h-[360px] rounded-2xl border border-white/[.07] bg-black/20 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={enriched} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
            <XAxis dataKey="time" minTickGap={34} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip contentStyle={{ background: '#0b0b0f', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, fontSize: 11 }} formatter={(value, name) => [formatPrice(value), name]} />
            <Area type="monotone" dataKey="close" name="Close" fill="rgba(139,92,246,.08)" stroke="#a78bfa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#67e8f9" strokeWidth={1.25} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="ema20" name="EMA 20" stroke="#f0abfc" strokeWidth={1.15} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="bollingerUpper" name="Bollinger upper" stroke="#52525b" strokeDasharray="4 4" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="bollingerLower" name="Bollinger lower" stroke="#52525b" strokeDasharray="4 4" dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-zinc-600"><Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Indicator values are mathematical transformations of the loaded observations, not predictions. Real-time exchange entitlements and provider licensing still determine actual freshness.</span></div>
    </section>
  );
}

function Metric({ label, value, hint }) {
  return <div className="rounded-xl border border-white/[.07] bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-1 truncate text-base font-semibold text-white">{value}</p><p className="mt-1 truncate text-[9px] text-zinc-600">{hint}</p></div>;
}
