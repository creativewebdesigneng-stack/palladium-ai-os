import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Eye, FlaskConical, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  deleteTradingJournalEntry,
  deleteTradingSimulation,
  deleteTradingWatchlist,
  deleteTradingWatchlistItem,
  listTradingWorkspace,
  saveTradingJournalEntry,
  saveTradingSimulation,
  saveTradingWatchlist,
  saveTradingWatchlistItem,
} from '@/lib/trading/trading-workspace.functions';
import {
  calculateMaximumLoss,
  calculatePercentageReturn,
  calculatePositionExposure,
  calculateRiskReward,
  calculateSimulationPnl,
} from '@/lib/trading/trading-risk';

const TABS = [
  ['watchlists', 'Watchlists', Eye],
  ['simulations', 'Paper simulations', FlaskConical],
  ['journal', 'Trade journal', BookOpenText],
];
const ASSET_TYPES = ['stock', 'etf', 'fund', 'bond', 'fx', 'future', 'option', 'commodity', 'crypto', 'index', 'other'];
const STATUSES = ['planned', 'open', 'closed', 'cancelled'];
const inputClass = 'rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none transition focus:border-violet-300/30';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-400/[.07] px-3 py-2 text-xs text-violet-100 transition hover:bg-violet-400/[.11] disabled:cursor-not-allowed disabled:opacity-50';

const emptyWorkspace = { watchlists: [], watchlistItems: [], journal: [], simulations: [] };

function parseTags(value) {
  return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
}

function optionalNumber(value) {
  return value === '' || value == null ? undefined : Number(value);
}

function formatMoney(value, currency = 'GBP') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
}

export default function TradingWorkspace() {
  const [tab, setTab] = useState('watchlists');
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [watchlistForm, setWatchlistForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ symbol: '', name: '', market: '', asset_type: 'stock', thesis: '', tags: '', watch_level: '', target_level: '', notes: '' });
  const [simulationForm, setSimulationForm] = useState({ symbol: '', side: 'long', quantity: '1', asset_type: 'stock', market: '', entry_price: '', stop_price: '', target_price: '', exit_price: '', currency: 'GBP', status: 'planned', strategy: '', thesis: '', tags: '', notes: '' });
  const [journalForm, setJournalForm] = useState({ simulation_id: '', symbol: '', side: 'neutral', status: 'planned', setup: '', catalyst: '', thesis: '', entry_reasoning: '', risk_plan: '', strategy: '', plan: '', discipline_notes: '', mistakes: '', outcome: '', lessons: '', tags: '' });

  async function load(preferredWatchlistId) {
    try {
      setError('');
      const result = await listTradingWorkspace({ data: {} });
      setWorkspace(result ?? emptyWorkspace);
      const lists = result?.watchlists ?? [];
      setSelectedWatchlistId((current) => {
        const preferred = preferredWatchlistId || current;
        return lists.some((list) => list.id === preferred) ? preferred : (lists[0]?.id ?? '');
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the trading workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selectedWatchlist = workspace.watchlists.find((list) => list.id === selectedWatchlistId) ?? null;
  const selectedItems = useMemo(
    () => workspace.watchlistItems.filter((item) => item.watchlist_id === selectedWatchlistId),
    [workspace.watchlistItems, selectedWatchlistId],
  );

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trading workspace action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function createWatchlist(event) {
    event.preventDefault();
    await run(async () => {
      const saved = await saveTradingWatchlist({ data: watchlistForm });
      setWatchlistForm({ name: '', description: '' });
      await load(saved?.id);
    });
  }

  async function removeWatchlist(id) {
    await run(async () => {
      await deleteTradingWatchlist({ data: { id } });
      await load();
    });
  }

  async function addWatchlistItem(event) {
    event.preventDefault();
    if (!selectedWatchlistId) return;
    await run(async () => {
      await saveTradingWatchlistItem({ data: { ...itemForm, watchlist_id: selectedWatchlistId, tags: parseTags(itemForm.tags), watch_level: optionalNumber(itemForm.watch_level), target_level: optionalNumber(itemForm.target_level) } });
      setItemForm({ symbol: '', name: '', market: '', asset_type: 'stock', thesis: '', tags: '', watch_level: '', target_level: '', notes: '' });
      await load(selectedWatchlistId);
    });
  }

  async function removeWatchlistItem(id) {
    await run(async () => {
      await deleteTradingWatchlistItem({ data: { id } });
      await load(selectedWatchlistId);
    });
  }

  async function saveSimulation(event) {
    event.preventDefault();
    await run(async () => {
      await saveTradingSimulation({
        data: {
          ...simulationForm,
          quantity: Number(simulationForm.quantity),
          entry_price: Number(simulationForm.entry_price),
          stop_price: optionalNumber(simulationForm.stop_price),
          target_price: optionalNumber(simulationForm.target_price),
          exit_price: optionalNumber(simulationForm.exit_price),
          tags: parseTags(simulationForm.tags),
        },
      });
      setSimulationForm({ symbol: '', side: 'long', quantity: '1', asset_type: 'stock', market: '', entry_price: '', stop_price: '', target_price: '', exit_price: '', currency: 'GBP', status: 'planned', strategy: '', thesis: '', tags: '', notes: '' });
      await load(selectedWatchlistId);
    });
  }

  async function removeSimulation(id) {
    await run(async () => {
      await deleteTradingSimulation({ data: { id } });
      await load(selectedWatchlistId);
    });
  }

  async function saveJournal(event) {
    event.preventDefault();
    await run(async () => {
      await saveTradingJournalEntry({
        data: {
          ...journalForm,
          simulation_id: journalForm.simulation_id || undefined,
          symbol: journalForm.symbol.trim() || undefined,
          tags: parseTags(journalForm.tags),
        },
      });
      setJournalForm({ simulation_id: '', symbol: '', side: 'neutral', status: 'planned', setup: '', catalyst: '', thesis: '', entry_reasoning: '', risk_plan: '', strategy: '', plan: '', discipline_notes: '', mistakes: '', outcome: '', lessons: '', tags: '' });
      await load(selectedWatchlistId);
    });
  }

  async function removeJournal(id) {
    await run(async () => {
      await deleteTradingJournalEntry({ data: { id } });
      await load(selectedWatchlistId);
    });
  }

  return (
    <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[.16em]">Private trader workspace</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Watch, simulate, journal, review</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Persistent owner-scoped records secured by Supabase row-level security. Watchlist items do not imply a recommendation. Simulations use user-entered prices and never create broker orders or fills.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Count label="Lists" value={workspace.watchlists.length} />
          <Count label="Simulations" value={workspace.simulations.length} />
          <Count label="Journal" value={workspace.journal.length} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-violet-300/25 bg-violet-400/[.09] text-violet-100' : 'border-white/10 text-zinc-500 hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] px-3 py-2 text-xs text-rose-200">{error}</div>}
      {loading ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">Loading your private trading workspace…</div> : null}

      {!loading && tab === 'watchlists' && <WatchlistsPanel
        busy={busy}
        workspace={workspace}
        watchlistForm={watchlistForm}
        setWatchlistForm={setWatchlistForm}
        createWatchlist={createWatchlist}
        removeWatchlist={removeWatchlist}
        selectedWatchlistId={selectedWatchlistId}
        setSelectedWatchlistId={setSelectedWatchlistId}
        selectedWatchlist={selectedWatchlist}
        selectedItems={selectedItems}
        itemForm={itemForm}
        setItemForm={setItemForm}
        addWatchlistItem={addWatchlistItem}
        removeWatchlistItem={removeWatchlistItem}
      />}

      {!loading && tab === 'simulations' && <SimulationsPanel
        busy={busy}
        form={simulationForm}
        setForm={setSimulationForm}
        save={saveSimulation}
        remove={removeSimulation}
        rows={workspace.simulations}
      />}

      {!loading && tab === 'journal' && <JournalPanel
        busy={busy}
        form={journalForm}
        setForm={setJournalForm}
        save={saveJournal}
        remove={removeJournal}
        rows={workspace.journal}
        simulations={workspace.simulations}
      />}
    </section>
  );
}

function WatchlistsPanel(props) {
  const { busy, workspace, watchlistForm, setWatchlistForm, createWatchlist, removeWatchlist, selectedWatchlistId, setSelectedWatchlistId, selectedWatchlist, selectedItems, itemForm, setItemForm, addWatchlistItem, removeWatchlistItem } = props;
  return <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
      <h3 className="text-sm font-medium text-white">Watchlists</h3>
      <form onSubmit={createWatchlist} className="mt-3 space-y-2">
        <input required maxLength={80} value={watchlistForm.name} onChange={(e) => setWatchlistForm({ ...watchlistForm, name: e.target.value })} placeholder="List name" className={`${inputClass} w-full`} />
        <textarea maxLength={1000} rows={2} value={watchlistForm.description} onChange={(e) => setWatchlistForm({ ...watchlistForm, description: e.target.value })} placeholder="Purpose / thesis" className={`${inputClass} w-full resize-none`} />
        <button disabled={busy} className={`${buttonClass} w-full`}><Plus className="h-3.5 w-3.5" />Create watchlist</button>
      </form>
      <div className="mt-4 space-y-2">
        {workspace.watchlists.length === 0 ? <Empty>No watchlists yet.</Empty> : workspace.watchlists.map((list) => <div key={list.id} className={`flex items-start gap-2 rounded-xl border p-3 ${selectedWatchlistId === list.id ? 'border-violet-300/20 bg-violet-400/[.05]' : 'border-white/[.06]'}`}><button onClick={() => setSelectedWatchlistId(list.id)} className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-medium text-white">{list.name}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-600">{list.description || 'No description'}</p></button><button disabled={busy} onClick={() => removeWatchlist(list.id)} aria-label={`Delete ${list.name}`} className="rounded-lg p-1.5 text-zinc-700 hover:bg-rose-400/[.06] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
      </div>
    </div>
    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
      <h3 className="text-sm font-medium text-white">{selectedWatchlist?.name ?? 'Select a watchlist'}</h3>
      <p className="mt-1 text-[10px] text-zinc-600">Symbols are identifiers you enter manually. No live quote or signal is inferred from inclusion.</p>
      {selectedWatchlist && <>
        <form onSubmit={addWatchlistItem} className="mt-3 grid gap-2 md:grid-cols-5">
          <input required maxLength={32} value={itemForm.symbol} onChange={(e) => setItemForm({ ...itemForm, symbol: e.target.value })} placeholder="Symbol" className={inputClass} />
          <input maxLength={120} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Name" className={inputClass} />
          <input maxLength={80} value={itemForm.market} onChange={(e) => setItemForm({ ...itemForm, market: e.target.value })} placeholder="Market / venue" className={inputClass} />
          <select value={itemForm.asset_type} onChange={(e) => setItemForm({ ...itemForm, asset_type: e.target.value })} className={inputClass}>{ASSET_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
          <button disabled={busy} className={buttonClass}><Plus className="h-3.5 w-3.5" />Add</button>
        </form>
        <textarea maxLength={2000} rows={2} value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} placeholder="Optional research note for the next symbol you add" className={`${inputClass} mt-2 w-full resize-none`} />
        <div className="mt-4 space-y-2">{selectedItems.length === 0 ? <Empty>No instruments in this watchlist yet.</Empty> : selectedItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[.06] px-3 py-2"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-white">{item.symbol}</span><span className="text-[9px] uppercase tracking-[.1em] text-zinc-600">{item.asset_type || 'other'}</span>{item.market && <span className="text-[9px] text-zinc-600">{item.market}</span>}</div><p className="mt-1 text-[10px] text-zinc-500">{item.name || 'Unnamed instrument'}</p>{item.notes && <p className="mt-1 text-[10px] leading-4 text-zinc-600">{item.notes}</p>}</div><button disabled={busy} onClick={() => removeWatchlistItem(item.id)} aria-label={`Remove ${item.symbol}`} className="rounded-lg p-1.5 text-zinc-700 hover:bg-rose-400/[.06] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
      </>}
    </div>
  </div>;
}

function SimulationsPanel({ busy, form, setForm, save, remove, rows }) {
  return <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
      <h3 className="text-sm font-medium text-white">New paper simulation</h3>
      <div className="mt-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[.035] p-3 text-[10px] leading-4 text-cyan-100/70">Simulation only · user-entered prices · no broker order, exchange order, fill or live-price claim is created.</div>
      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input required maxLength={32} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="Symbol" className={inputClass} />
        <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} className={inputClass}><option value="long">long</option><option value="short">short</option></select>
        <input required type="number" min="0.00000001" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" className={inputClass} />
        <input required type="number" min="0.00000001" step="any" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: e.target.value })} placeholder="User-entered entry" className={inputClass} />
        <input type="number" min="0.00000001" step="any" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} placeholder="User-entered exit" className={inputClass} />
        <input required maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="GBP" className={inputClass} />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
        <button disabled={busy} className={buttonClass}><Plus className="h-3.5 w-3.5" />Save simulation</button>
        <textarea maxLength={8000} rows={3} value={form.thesis} onChange={(e) => setForm({ ...form, thesis: e.target.value })} placeholder="Hypothesis / thesis" className={`${inputClass} resize-none sm:col-span-2`} />
        <textarea maxLength={8000} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Process notes" className={`${inputClass} resize-none sm:col-span-2`} />
      </form>
    </div>
    <div className="space-y-2">
      {rows.length === 0 ? <Empty>No paper simulations recorded yet.</Empty> : rows.map((row) => {
        const pnl = calculateSimulationPnl(row.side, Number(row.quantity), Number(row.entry_price), row.exit_price == null ? null : Number(row.exit_price));
        return <article key={row.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-white">{row.symbol}</span><span className="rounded-full border border-white/[.07] px-2 py-0.5 text-[9px] uppercase text-zinc-500">{row.side}</span><span className="rounded-full border border-cyan-300/10 bg-cyan-300/[.035] px-2 py-0.5 text-[9px] uppercase text-cyan-100/70">{row.status}</span></div><p className="mt-2 text-[10px] text-zinc-500">Qty {Number(row.quantity).toLocaleString()} · entry {formatMoney(row.entry_price, row.currency)} · exit {row.exit_price == null ? 'not entered' : formatMoney(row.exit_price, row.currency)}</p></div><button disabled={busy} onClick={() => remove(row.id)} aria-label={`Delete ${row.symbol} simulation`} className="rounded-lg p-1.5 text-zinc-700 hover:bg-rose-400/[.06] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><MiniMetric label="Hypothetical P&L" value={pnl == null ? 'Open / unavailable' : formatMoney(pnl, row.currency)} /><MiniMetric label="Price provenance" value="User entered" /></div>{row.thesis && <p className="mt-3 text-[11px] leading-5 text-zinc-500">{row.thesis}</p>}</article>;
      })}
    </div>
  </div>;
}

function JournalPanel({ busy, form, setForm, save, remove, rows }) {
  return <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
      <h3 className="text-sm font-medium text-white">Structured trade journal</h3>
      <p className="mt-1 text-[10px] leading-4 text-zinc-600">Record process, invalidation and lessons—not only outcome. A journal entry does not represent an executed trade.</p>
      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input maxLength={32} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="Symbol (optional)" className={inputClass} />
        <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} className={inputClass}><option value="neutral">neutral</option><option value="long">long</option><option value="short">short</option></select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags, comma separated" className={inputClass} />
        <textarea maxLength={8000} rows={3} value={form.thesis} onChange={(e) => setForm({ ...form, thesis: e.target.value })} placeholder="Thesis / observation" className={`${inputClass} resize-none sm:col-span-2`} />
        <textarea maxLength={8000} rows={3} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Plan, invalidation and risk" className={`${inputClass} resize-none sm:col-span-2`} />
        <textarea maxLength={8000} rows={2} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="Outcome" className={`${inputClass} resize-none sm:col-span-2`} />
        <textarea maxLength={8000} rows={2} value={form.lessons} onChange={(e) => setForm({ ...form, lessons: e.target.value })} placeholder="Lessons / process review" className={`${inputClass} resize-none sm:col-span-2`} />
        <button disabled={busy} className={`${buttonClass} sm:col-span-2`}><Plus className="h-3.5 w-3.5" />Save journal entry</button>
      </form>
    </div>
    <div className="space-y-2">
      {rows.length === 0 ? <Empty>No journal entries yet.</Empty> : rows.map((row) => <article key={row.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-white">{row.symbol || 'General market note'}</span><span className="text-[9px] uppercase text-zinc-600">{row.side}</span><span className="text-[9px] uppercase text-zinc-600">{row.status}</span></div><button disabled={busy} onClick={() => remove(row.id)} aria-label="Delete journal entry" className="rounded-lg p-1.5 text-zinc-700 hover:bg-rose-400/[.06] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>{row.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{row.tags.map((tag) => <span key={tag} className="rounded-lg border border-white/[.06] px-2 py-0.5 text-[9px] text-zinc-600">{tag}</span>)}</div>}<JournalText label="Thesis" value={row.thesis} /><JournalText label="Plan" value={row.plan} /><JournalText label="Outcome" value={row.outcome} /><JournalText label="Lessons" value={row.lessons} /></article>)}
    </div>
  </div>;
}

function JournalText({ label, value }) {
  if (!value) return null;
  return <div className="mt-3"><p className="text-[9px] uppercase tracking-[.12em] text-zinc-700">{label}</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-zinc-500">{value}</p></div>;
}

function MiniMetric({ label, value }) {
  return <div className="rounded-xl border border-white/[.06] p-2.5"><p className="text-[9px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></div>;
}

function Count({ label, value }) {
  return <div className="min-w-[82px] rounded-xl border border-white/[.07] bg-black/20 px-3 py-2"><p className="text-lg font-semibold text-white">{value}</p><p className="text-[9px] uppercase tracking-[.1em] text-zinc-600">{label}</p></div>;
}

function Empty({ children }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">{children}</div>;
}
