import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, FlaskConical, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { getQuantStudioOverview, runQuantBacktest, saveQuantStrategy } from '@/lib/quant/quant-studio.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

function parseReturns(raw) {
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [date, value] = line.split(',').map((part) => part.trim());
    const returnPct = Number(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(returnPct)) throw new Error(`Invalid historical return on line ${index + 1}. Use YYYY-MM-DD,percent.`);
    return { date, returnPct };
  });
}

export default function QuantStudio() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getQuantStudioOverview);
  const saveFn = useServerFn(saveQuantStrategy);
  const runFn = useServerFn(runQuantBacktest);
  const [form, setForm] = useState({ name: '', assetClass: 'multi-asset', universe: '', baseCurrency: 'GBP', riskTarget: '0.10' });
  const [strategyId, setStrategyId] = useState('');
  const [startingCapital, setStartingCapital] = useState('100000');
  const [returnsText, setReturnsText] = useState('');

  const overview = useQuery({ queryKey: ['quant-studio'], queryFn: () => overviewFn({ data: undefined }), enabled: session === 'yes', retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['quant-studio'] });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { ...form, universe: form.universe.split(',').map((item) => item.trim()).filter(Boolean), riskTarget: Number(form.riskTarget) } }),
    onSuccess: async (row) => { setStrategyId(row.id); setForm((current) => ({ ...current, name: '' })); await refresh(); toast({ title: 'Strategy saved' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save strategy', description: friendlyMessage(error) }),
  });
  const run = useMutation({
    mutationFn: () => {
      const points = parseReturns(returnsText);
      const dates = points.map((point) => point.date).sort();
      return runFn({ data: { strategyId, periodStart: dates[0], periodEnd: dates[dates.length - 1], startingCapital: Number(startingCapital), returns: points } });
    },
    onSuccess: async () => { await refresh(); toast({ title: 'Backtest completed' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Backtest failed', description: friendlyMessage(error) }),
  });

  const strategies = overview.data?.strategies ?? [];
  const runs = overview.data?.runs ?? [];
  const latest = runs[0];
  const metrics = latest?.metrics ?? {};
  const selected = useMemo(() => strategies.find((item) => item.id === strategyId), [strategies, strategyId]);

  return <>
    <PageHeader eyebrow="Business · Research" title="Quant Studio" description="Systematic strategy research and deterministic backtesting using your real historical return series. Blackstar stores strategy/risk configuration and results; it does not fabricate market data or place trades." />
    {session === 'no' && <Failed message="Sign in to use Quant Studio." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><TrendingUp className="h-4 w-4 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Strategy definition</h2><p className="text-xs text-zinc-500">Native research metadata, universe and risk target.</p></div></div>
          <div className="mt-4 space-y-3">
            <Field label="Name"><input className={control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trend portfolio" /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Asset class"><select className={control} value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value })}><option>multi-asset</option><option>equities</option><option>futures</option><option>fx</option><option>crypto</option></select></Field><Field label="Base currency"><input className={control} maxLength={3} value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value.toUpperCase() })} /></Field></div>
            <Field label="Universe (comma separated)"><input className={control} value={form.universe} onChange={(e) => setForm({ ...form, universe: e.target.value })} placeholder="SPY, TLT, GLD" /></Field>
            <Field label="Annual risk target (0–1)"><input className={control} type="number" min="0.001" max="1" step="0.01" value={form.riskTarget} onChange={(e) => setForm({ ...form, riskTarget: e.target.value })} /></Field>
            <button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save strategy</button>
          </div>
        </section>
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />Research-only by default. Live order execution must go through Blackstar integrations, agent permissions and approval controls; Quant Studio never stores broker secrets in strategy JSON.</section>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex items-center gap-3"><FlaskConical className="h-4 w-4 text-violet-300" /><div><h2 className="text-sm font-semibold text-white">Backtest real observations</h2><p className="text-xs text-zinc-500">Paste daily historical returns as YYYY-MM-DD,percent. No generated prices.</p></div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Strategy"><select className={control} value={strategyId} onChange={(e) => setStrategyId(e.target.value)}><option value="">Select strategy</option>{strategies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Starting capital"><input className={control} type="number" min="1" value={startingCapital} onChange={(e) => setStartingCapital(e.target.value)} /></Field></div>
          <Field label="Historical daily returns"><textarea className={`${control} mt-1 min-h-40 font-mono`} value={returnsText} onChange={(e) => setReturnsText(e.target.value)} placeholder={'2026-01-02,0.42\n2026-01-05,-0.18\n2026-01-06,0.31'} /></Field>
          <button disabled={!strategyId || !returnsText.trim() || run.isPending} onClick={() => run.mutate()} className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200 disabled:opacity-40">{run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}Run deterministic backtest</button>
          {selected && <p className="mt-2 text-[10px] text-zinc-600">Selected risk target: {(Number(selected.risk_target) * 100).toFixed(1)}%</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <h2 className="text-sm font-semibold text-white">Latest result</h2>
          {!latest ? <Empty icon={Activity} title="No backtests yet" desc="Create a strategy and provide real historical returns." /> : <><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Total return" value={`${Number(metrics.totalReturnPct ?? 0).toFixed(2)}%`} /><Metric label="Annual volatility" value={`${Number(metrics.annualizedVolatilityPct ?? 0).toFixed(2)}%`} /><Metric label="Max drawdown" value={`${Number(metrics.maxDrawdownPct ?? 0).toFixed(2)}%`} /><Metric label="Sharpe" value={Number(metrics.sharpe ?? 0).toFixed(2)} /><Metric label="Ending capital" value={Number(metrics.endingCapital ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} /><Metric label="Observations" value={String(metrics.observations ?? 0)} /></div><p className="mt-3 text-[10px] text-zinc-600">Stored run: {new Date(latest.created_at).toLocaleString()}</p></>}
        </section>
      </div>
    </div>
  </>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
function Metric({ label, value }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>; }
