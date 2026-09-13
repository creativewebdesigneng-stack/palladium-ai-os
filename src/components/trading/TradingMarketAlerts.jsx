import { useEffect, useMemo, useState } from 'react';
import { BellRing, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import {
  deleteTradingMarketAlert,
  evaluateTradingMarketAlerts,
  listTradingMarketAlerts,
  saveTradingMarketAlert,
} from '@/lib/trading/trading-alerts.functions';

const inputClass = 'rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none transition focus:border-violet-300/30';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-400/[.07] px-3 py-2 text-xs text-violet-100 transition hover:bg-violet-400/[.11] disabled:cursor-not-allowed disabled:opacity-50';

function numberLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—';
}

function statusClass(status) {
  if (status === 'triggered') return 'border-amber-300/15 bg-amber-300/[.05] text-amber-100';
  if (status === 'clear') return 'border-emerald-300/15 bg-emerald-300/[.05] text-emerald-100';
  return 'border-white/[.08] bg-white/[.025] text-zinc-500';
}

export default function TradingMarketAlerts() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [form, setForm] = useState({
    name: '',
    kind: 'equity',
    symbol: '',
    operator: 'above',
    threshold: '',
    cooldown_minutes: '1440',
    enabled: true,
  });

  async function load() {
    try {
      setError('');
      setRows(await listTradingMarketAlerts({ data: {} }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load market observation alerts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trading alert action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    await run(async () => {
      await saveTradingMarketAlert({
        data: {
          ...form,
          threshold: Number(form.threshold),
          cooldown_minutes: Number(form.cooldown_minutes),
        },
      });
      setForm((current) => ({ ...current, name: '', symbol: '', threshold: '' }));
      await load();
    });
  }

  async function remove(id) {
    await run(async () => {
      await deleteTradingMarketAlert({ data: { id } });
      await load();
    });
  }

  async function evaluate() {
    await run(async () => {
      const result = await evaluateTradingMarketAlerts({ data: {} });
      setEvaluation(result);
      await load();
    });
  }

  const resultById = useMemo(
    () => new Map((evaluation?.results ?? []).map((item) => [item.id, item])),
    [evaluation],
  );
  const summary = useMemo(() => {
    const results = evaluation?.results ?? [];
    return {
      triggered: results.filter((item) => item.status === 'triggered').length,
      clear: results.filter((item) => item.status === 'clear').length,
      unavailable: results.filter((item) => item.status === 'unavailable').length,
    };
  }, [evaluation]);

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-300"><BellRing className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Market observation alerts</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Thresholds with provider provenance</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Evaluate saved thresholds against the latest daily close returned by Blackstar's configured market-data provider. This is not a live quote stream, price guarantee, recommendation or broker order trigger.</p>
        </div>
        <button disabled={busy || rows.length === 0} onClick={evaluate} className={buttonClass}><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Evaluate now</button>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[.035] p-3 text-[10px] leading-4 text-cyan-100/70">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Rules are private to their owner. Notifications include the provider, observation date and observed value. Repeated triggers respect a minimum one-hour cooldown and default to 24 hours.</span>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alert name" className={inputClass} />
        <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value, symbol: '' })} className={inputClass}>
          <option value="equity">Equity / ETF</option><option value="fx">FX</option><option value="crypto">Crypto</option>
        </select>
        <input required maxLength={32} value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} placeholder={form.kind === 'equity' ? 'AAPL' : form.kind === 'fx' ? 'EUR/USD' : 'BTC/USD'} className={inputClass} />
        <select value={form.operator} onChange={(event) => setForm({ ...form, operator: event.target.value })} className={inputClass}><option value="above">Daily close above</option><option value="below">Daily close below</option></select>
        <input required type="number" min="0.00000001" step="any" value={form.threshold} onChange={(event) => setForm({ ...form, threshold: event.target.value })} placeholder="Threshold" className={inputClass} />
        <button disabled={busy} className={buttonClass}><Plus className="h-3.5 w-3.5" />Save alert</button>
        <label className="flex items-center gap-2 text-[10px] text-zinc-600 md:col-span-2 xl:col-span-6">Notification cooldown
          <select value={form.cooldown_minutes} onChange={(event) => setForm({ ...form, cooldown_minutes: event.target.value })} className="rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-zinc-300">
            <option value="60">1 hour</option><option value="360">6 hours</option><option value="720">12 hours</option><option value="1440">24 hours</option><option value="4320">3 days</option><option value="10080">7 days</option>
          </select>
        </label>
      </form>

      {error && <p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.05] px-3 py-2 text-xs text-rose-200">{error}</p>}
      {evaluation && <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500"><span>Evaluation {new Date(evaluation.evaluated_at).toLocaleString()}</span><span>·</span><span>{summary.triggered} triggered</span><span>·</span><span>{summary.clear} clear</span><span>·</span><span>{summary.unavailable} unavailable</span><span>·</span><span>{evaluation.provider_reads} provider read{evaluation.provider_reads === 1 ? '' : 's'}</span></div>}

      <div className="mt-4 space-y-2">
        {loading ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">Loading market observation alerts…</div> : null}
        {!loading && rows.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">No market observation alerts saved.</div> : rows.map((row) => {
          const result = resultById.get(row.id);
          const status = result?.status ?? (row.last_evaluated_at ? 'observed' : 'not evaluated');
          return <article key={row.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-white">{row.name}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[.1em] ${statusClass(status)}`}>{status}</span></div>
                <p className="mt-1 text-xs text-zinc-400">{row.symbol} · {row.kind} · daily close {row.operator} {numberLabel(row.threshold)}</p>
              </div>
              <button disabled={busy} onClick={() => remove(row.id)} aria-label={`Delete ${row.name}`} className="self-start rounded-lg p-1.5 text-zinc-700 transition hover:bg-rose-400/[.06] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Datum label="Last observed" value={row.last_value == null ? 'Not evaluated' : numberLabel(row.last_value)} />
              <Datum label="Observation date" value={row.last_as_of || '—'} />
              <Datum label="Provider" value={row.last_provider || '—'} />
              <Datum label="Last notification" value={row.last_triggered_at ? new Date(row.last_triggered_at).toLocaleString() : 'None'} />
            </div>
            {result?.status === 'unavailable' && <p className="mt-3 text-[10px] leading-4 text-amber-100/70">Unavailable: {result.reason}</p>}
          </article>;
        })}
      </div>
    </section>
  );
}

function Datum({ label, value }) {
  return <div className="rounded-xl border border-white/[.06] px-3 py-2"><p className="text-[9px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-[11px] text-zinc-400">{value}</p></div>;
}
