import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, BadgePercent, BrainCircuit, Gift, PackageSearch, RefreshCw, RotateCcw,
  Save, Sparkles, TrendingDown, Trophy, Users, WalletCards, AlertTriangle, CheckCircle2,
  Plus, Trash2, Truck,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailAdvancedOperations, saveRetailReturn, saveRetailPromotion, saveRetailLoyaltyMember,
  adjustRetailLoyalty, saveRetailStockTransfer, completeRetailStockTransfer,
  generateRetailReorderProposals, updateRetailReorderProposal,
} from '@/lib/retail/retail-advanced.functions';

const tabs = [
  ['forecast', 'Forecast & reorders', BrainCircuit],
  ['transfers', 'Stock transfers', ArrowRightLeft],
  ['returns', 'Returns & refunds', RotateCcw],
  ['growth', 'Promotions & loyalty', Trophy],
];

const blankReturn = { return_number: '', order_id: '', customer_name: '', status: 'requested', reason: '', refund_amount: 0, refund_method: 'original_payment', restock: false, notes: '' };
const blankPromotion = { name: '', code: '', promotion_type: 'percentage', value: 0, minimum_spend: 0, channel: 'all', starts_at: '', ends_at: '', usage_limit: '', active: true, notes: '' };
const blankMember = { customer_name: '', email: '', phone: '', tier: 'member', notes: '' };
const blankLoyaltyAction = { member_id: '', points: 0, event_type: 'earn', order_id: '', amount: 0, note: '' };
const blankTransfer = { transfer_number: '', from_location_id: '', to_location_id: '', status: 'draft', notes: '', items: [{ item_id: '', quantity: 1, notes: '' }] };

function cash(value, currency = 'GBP') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}
function localDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function toIso(value) { return value ? new Date(value).toISOString() : null; }
function riskClass(risk) {
  if (risk === 'critical') return 'border-rose-400/20 bg-rose-400/[.05] text-rose-200';
  if (risk === 'high') return 'border-amber-400/20 bg-amber-400/[.05] text-amber-200';
  if (risk === 'medium') return 'border-cyan-400/20 bg-cyan-400/[.04] text-cyan-200';
  return 'border-white/[.07] bg-white/[.02] text-zinc-400';
}

export default function RetailAdvancedOperations() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('forecast');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const workspace = workspaces.find((w) => w.id === selected);
  const currency = workspace?.currency || 'GBP';

  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((r) => r.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) { setData(null); return; }
    setData(await getRetailAdvancedOperations({ data: { workspace_id: id } }));
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { await loadWorkspaces(); if (selected) await load(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load advanced retail operations.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load advanced retail operations.')); }, [selected]);

  if (workspaces.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-cyan-300"><Sparkles className="h-4 w-4" /> Retail intelligence & growth</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Predict, recover, retain and rebalance</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Operational intelligence built from saved Retail records. Forecast signals are estimates from your own stock movements and supplier lead times, not invented market data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.business_name}</option>)}
          </select>
          <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}

      {data && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Metric label="Critical stock" value={data.dashboard.criticalStockRisks} icon={AlertTriangle} />
          <Metric label="High stock risk" value={data.dashboard.highStockRisks} icon={TrendingDown} />
          <Metric label="Reorder proposals" value={data.dashboard.openReorders} icon={PackageSearch} />
          <Metric label="Open transfers" value={data.dashboard.openTransfers} icon={ArrowRightLeft} />
          <Metric label="Open returns" value={data.dashboard.openReturns} icon={RotateCcw} />
          <Metric label="Active promotions" value={data.dashboard.activePromotions} icon={BadgePercent} />
          <Metric label="Loyalty members" value={data.dashboard.loyaltyMembers} icon={Users} />
          <Metric label="Points outstanding" value={data.dashboard.loyaltyPointsOutstanding} icon={Gift} />
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-cyan-400/25 bg-cyan-400/[.08] text-cyan-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>

        <div className="mt-5">
          {tab === 'forecast' && <ForecastPanel workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
          {tab === 'transfers' && <TransfersPanel workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
          {tab === 'returns' && <ReturnsPanel workspace={workspace} currency={currency} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
          {tab === 'growth' && <GrowthPanel workspace={workspace} currency={currency} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
        </div>
      </>}
    </section>
  );
}

function ForecastPanel({ workspace, data, reload, setError, setBusy, busy }) {
  const generate = async () => {
    setBusy(true); setError('');
    try { await generateRetailReorderProposals({ data: { workspace_id: workspace.id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not generate reorder proposals.'); }
    finally { setBusy(false); }
  };
  const changeStatus = async (id, status) => {
    setBusy(true); setError('');
    try { await updateRetailReorderProposal({ data: { id, status, purchase_order_id: null } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update reorder proposal.'); }
    finally { setBusy(false); }
  };
  const itemName = (id) => data.catalog.find((x) => x.id === id)?.name || 'Inventory item';
  return <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
    <Panel title="Demand & stock-cover signals" action={<button onClick={generate} disabled={busy} className="rounded-lg border border-cyan-300/15 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">Generate reorder proposals</button>}>
      <div className="space-y-2">
        {data.demandSignals.length === 0 && <Empty text="Add inventory and record sales movements to build demand signals." />}
        {data.demandSignals.slice(0, 30).map((s) => <div key={s.item_id} className={`rounded-xl border p-3 ${riskClass(s.risk)}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{s.name}</p><p className="mt-1 text-[11px] text-zinc-500">{s.sku || 'No SKU'} · {s.supplier_name || 'No supplier'} · {s.risk} risk</p></div><span className="rounded-lg bg-black/25 px-2 py-1 text-xs">{s.days_of_cover == null ? 'No demand history' : `${s.days_of_cover.toFixed(1)} days cover`}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Tiny label="Available" value={Number(s.available_quantity).toFixed(1)} /><Tiny label="Sold / 90d" value={Number(s.units_sold_90d).toFixed(1)} /><Tiny label="30d estimate" value={Number(s.forecast_30d).toFixed(1)} /><Tiny label="Suggested order" value={Number(s.recommended_quantity).toFixed(1)} /></div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">{s.reason}</p>
        </div>)}
      </div>
    </Panel>
    <Panel title="Governed reorder queue">
      <div className="space-y-2">
        {data.reorderProposals.length === 0 && <Empty text="No saved reorder proposals yet." />}
        {data.reorderProposals.map((p) => <div key={p.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm text-white">{itemName(p.item_id)}</p><p className="mt-1 text-[11px] text-zinc-500">Suggested {Number(p.recommended_quantity).toFixed(1)} · available {Number(p.available_quantity).toFixed(1)}</p></div><Status value={p.status} /></div><p className="mt-2 text-[11px] leading-5 text-zinc-500">{p.reason || 'Reorder signal generated from Retail operations.'}</p>{['suggested','approved'].includes(p.status) && <div className="mt-3 flex gap-2">{p.status === 'suggested' && <button onClick={() => changeStatus(p.id, 'approved')} disabled={busy} className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200">Approve</button>}<button onClick={() => changeStatus(p.id, 'dismissed')} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Dismiss</button></div>}</div>)}
      </div>
    </Panel>
  </div>;
}

function TransfersPanel({ workspace, data, reload, setError, setBusy, busy }) {
  const [form, setForm] = useState(blankTransfer);
  const addItem = () => setForm({ ...form, items: [...form.items, { item_id: '', quantity: 1, notes: '' }] });
  const changeItem = (index, patch) => setForm({ ...form, items: form.items.map((x, i) => i === index ? { ...x, ...patch } : x) });
  const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  const save = async () => {
    setBusy(true); setError('');
    try {
      await saveRetailStockTransfer({ data: { ...form, workspace_id: workspace.id, items: form.items.filter((x) => x.item_id && Number(x.quantity) > 0) } });
      setForm(blankTransfer); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save stock transfer.'); }
    finally { setBusy(false); }
  };
  const complete = async (id) => {
    setBusy(true); setError('');
    try { await completeRetailStockTransfer({ data: { transfer_id: id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not complete stock transfer.'); }
    finally { setBusy(false); }
  };
  const locationName = (id) => data.locations.find((x) => x.id === id)?.name || 'Location';
  const transferItems = (id) => data.transferItems.filter((x) => x.transfer_id === id);
  return <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
    <Panel title="Create stock transfer">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Transfer number" value={form.transfer_number} onChange={(v) => setForm({ ...form, transfer_number: v })} /><Select label="From" value={form.from_location_id} onChange={(v) => setForm({ ...form, from_location_id: v })} options={data.locations.map((x) => [x.id, x.name])} /><Select label="To" value={form.to_location_id} onChange={(v) => setForm({ ...form, to_location_id: v })} options={data.locations.map((x) => [x.id, x.name])} /><Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['draft','approved','in_transit']} /></div>
      <div className="mt-4 space-y-2">{form.items.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border border-white/[.06] bg-white/[.02] p-3 sm:grid-cols-[1fr_110px_auto]"><Select label="Item" value={item.item_id} onChange={(v) => changeItem(index, { item_id: v })} options={data.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').map((x) => [x.id, x.name])} /><Field label="Quantity" type="number" value={item.quantity} onChange={(v) => changeItem(index, { quantity: v })} />{form.items.length > 1 && <button onClick={() => removeItem(index)} className="mt-6 rounded-lg border border-white/[.06] px-2 text-zinc-500"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
      <div className="mt-3 flex gap-2"><button onClick={addItem} className="flex items-center gap-1 rounded-lg border border-white/[.08] px-3 py-2 text-xs text-zinc-400"><Plus className="h-3.5 w-3.5" />Add item</button><button onClick={save} disabled={busy || !form.transfer_number || !form.from_location_id || !form.to_location_id || !form.items.some((x) => x.item_id)} className="flex items-center gap-1 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save transfer</button></div>
      <p className="mt-3 text-[11px] leading-5 text-zinc-600">Completing a transfer is atomic: Blackstar verifies source availability, adjusts both locations and writes transfer-out/transfer-in inventory ledger entries in one database transaction.</p>
    </Panel>
    <Panel title="Transfer queue">
      <div className="space-y-2">{data.transfers.length === 0 && <Empty text="No stock transfers yet." />}{data.transfers.map((t) => <div key={t.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{t.transfer_number}</p><p className="mt-1 text-[11px] text-zinc-500">{locationName(t.from_location_id)} → {locationName(t.to_location_id)} · {transferItems(t.id).length} item(s)</p></div><Status value={t.status} /></div><p className="mt-2 text-[11px] text-zinc-600">Started {localDate(t.initiated_at)}{t.completed_at ? ` · completed ${localDate(t.completed_at)}` : ''}</p>{!['completed','cancelled'].includes(t.status) && <button onClick={() => complete(t.id)} disabled={busy} className="mt-3 flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Complete & move stock</button>}</div>)}</div>
    </Panel>
  </div>;
}

function ReturnsPanel({ workspace, currency, data, reload, setError, setBusy, busy }) {
  const [form, setForm] = useState(blankReturn);
  const save = async () => {
    setBusy(true); setError('');
    try { await saveRetailReturn({ data: { ...form, workspace_id: workspace.id, order_id: form.order_id || null } }); setForm(blankReturn); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save return.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
    <Panel title="Record return / refund case">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Return number" value={form.return_number} onChange={(v) => setForm({ ...form, return_number: v })} /><Select label="Order" value={form.order_id} onChange={(v) => setForm({ ...form, order_id: v })} options={data.orders.map((x) => [x.id, `${x.order_number} · ${x.customer_name || 'Customer'}`])} allowBlank /><Field label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} /><Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['requested','approved','received','refunded','rejected','cancelled']} /><Field label="Refund amount" type="number" value={form.refund_amount} onChange={(v) => setForm({ ...form, refund_amount: v })} /><Select label="Refund method" value={form.refund_method} onChange={(v) => setForm({ ...form, refund_method: v })} options={['original_payment','store_credit','cash','other']} /></div><Textarea label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} /><label className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={form.restock} onChange={(e) => setForm({ ...form, restock: e.target.checked })} />Restock returned goods after physical verification</label><button onClick={save} disabled={busy || !form.return_number} className="mt-4 flex items-center gap-1 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save return case</button><p className="mt-3 text-[11px] leading-5 text-zinc-600">A “refunded” record documents the retail outcome; it does not claim a payment processor refund occurred unless a connected payments workflow executes it.</p>
    </Panel>
    <Panel title="Return & refund register"><div className="space-y-2">{data.returns.length === 0 && <Empty text="No returns recorded." />}{data.returns.map((r) => <div key={r.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm text-white">{r.return_number} · {r.customer_name || 'Customer'}</p><p className="mt-1 text-[11px] text-zinc-500">{r.reason || 'No reason recorded'} · {cash(r.refund_amount, currency)}</p></div><Status value={r.status} /></div><p className="mt-2 text-[11px] text-zinc-600">{localDate(r.requested_at)}{r.restock ? ' · restock requested' : ''}</p></div>)}</div></Panel>
  </div>;
}

function GrowthPanel({ workspace, currency, data, reload, setError, setBusy, busy }) {
  const [promotion, setPromotion] = useState(blankPromotion);
  const [member, setMember] = useState(blankMember);
  const [points, setPoints] = useState(blankLoyaltyAction);
  const savePromotion = async () => {
    setBusy(true); setError(''); try { await saveRetailPromotion({ data: { ...promotion, workspace_id: workspace.id, starts_at: toIso(promotion.starts_at), ends_at: toIso(promotion.ends_at), usage_limit: promotion.usage_limit === '' ? null : promotion.usage_limit } }); setPromotion(blankPromotion); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save promotion.'); } finally { setBusy(false); }
  };
  const saveMember = async () => {
    setBusy(true); setError(''); try { await saveRetailLoyaltyMember({ data: { ...member, workspace_id: workspace.id } }); setMember(blankMember); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save loyalty member.'); } finally { setBusy(false); }
  };
  const adjust = async () => {
    setBusy(true); setError(''); try { await adjustRetailLoyalty({ data: { ...points, member_id: points.member_id, order_id: points.order_id || null } }); setPoints(blankLoyaltyAction); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not adjust loyalty points.'); } finally { setBusy(false); }
  };
  return <div className="grid gap-4 xl:grid-cols-2">
    <Panel title="Promotions">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Name" value={promotion.name} onChange={(v) => setPromotion({ ...promotion, name: v })} /><Field label="Code" value={promotion.code} onChange={(v) => setPromotion({ ...promotion, code: v })} /><Select label="Type" value={promotion.promotion_type} onChange={(v) => setPromotion({ ...promotion, promotion_type: v })} options={['percentage','fixed_amount','buy_x_get_y','free_shipping','custom']} /><Field label="Value" type="number" value={promotion.value} onChange={(v) => setPromotion({ ...promotion, value: v })} /><Field label="Minimum spend" type="number" value={promotion.minimum_spend} onChange={(v) => setPromotion({ ...promotion, minimum_spend: v })} /><Select label="Channel" value={promotion.channel} onChange={(v) => setPromotion({ ...promotion, channel: v })} options={['all','store','online','service','marketplace','social']} /><Field label="Starts" type="datetime-local" value={promotion.starts_at} onChange={(v) => setPromotion({ ...promotion, starts_at: v })} /><Field label="Ends" type="datetime-local" value={promotion.ends_at} onChange={(v) => setPromotion({ ...promotion, ends_at: v })} /></div><button onClick={savePromotion} disabled={busy || !promotion.name} className="mt-4 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-40">Save promotion</button><div className="mt-4 space-y-2">{data.promotions.slice(0, 20).map((p) => <div key={p.id} className="rounded-xl border border-white/[.06] p-3"><div className="flex justify-between gap-2"><div><p className="text-sm text-white">{p.name}</p><p className="mt-1 text-[11px] text-zinc-500">{p.code || 'No code'} · {p.promotion_type} · {p.channel}</p></div><Status value={p.active ? 'active' : 'paused'} /></div></div>)}</div>
    </Panel>
    <Panel title="Loyalty">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Customer name" value={member.customer_name} onChange={(v) => setMember({ ...member, customer_name: v })} /><Field label="Tier" value={member.tier} onChange={(v) => setMember({ ...member, tier: v })} /><Field label="Email" value={member.email} onChange={(v) => setMember({ ...member, email: v })} /><Field label="Phone" value={member.phone} onChange={(v) => setMember({ ...member, phone: v })} /></div><button onClick={saveMember} disabled={busy || !member.customer_name} className="mt-4 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">Add loyalty member</button>
      <div className="mt-5 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><p className="text-xs font-medium text-white">Points ledger action</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="Member" value={points.member_id} onChange={(v) => setPoints({ ...points, member_id: v })} options={data.loyaltyMembers.map((x) => [x.id, `${x.customer_name} · ${x.points_balance} pts`])} /><Select label="Event" value={points.event_type} onChange={(v) => setPoints({ ...points, event_type: v })} options={['earn','redeem','adjust','expire','refund']} /><Field label="Points (+/-)" type="number" value={points.points} onChange={(v) => setPoints({ ...points, points: v })} /><Field label="Spend amount" type="number" value={points.amount} onChange={(v) => setPoints({ ...points, amount: v })} /><Select label="Order" value={points.order_id} onChange={(v) => setPoints({ ...points, order_id: v })} options={data.orders.map((x) => [x.id, x.order_number])} allowBlank /><Field label="Note" value={points.note} onChange={(v) => setPoints({ ...points, note: v })} /></div><button onClick={adjust} disabled={busy || !points.member_id || Number(points.points) === 0} className="mt-3 flex items-center gap-1 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"><WalletCards className="h-3.5 w-3.5" />Post points event</button></div>
      <div className="mt-4 space-y-2">{data.loyaltyMembers.slice(0, 30).map((m) => <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/[.06] p-3"><div><p className="text-sm text-white">{m.customer_name}</p><p className="mt-1 text-[11px] text-zinc-500">{m.tier} · lifetime spend {cash(m.lifetime_spend, currency)}</p></div><span className="text-sm font-medium text-emerald-200">{m.points_balance} pts</span></div>)}</div>
    </Panel>
  </div>;
}

function Metric({ label, value, icon: Icon }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><Icon className="h-4 w-4 text-cyan-300" /><p className="mt-3 text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</p></div>; }
function Panel({ title, action, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-white">{title}</h3>{action}</div>{children}</div>; }
function Tiny({ label, value }) { return <div><p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></div>; }
function Status({ value }) { return <span className="rounded-full border border-white/[.07] bg-white/[.03] px-2 py-1 text-[10px] uppercase tracking-[.11em] text-zinc-400">{String(value).replaceAll('_', ' ')}</span>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/[.08] p-5 text-center text-xs text-zinc-600">{text}</div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/25" /></label>; }
function Textarea({ label, value, onChange }) { return <label className="mt-3 block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/25" /></label>; }
function Select({ label, value, onChange, options, allowBlank = false }) { const normalized = options.map((x) => Array.isArray(x) ? x : [x, String(x).replaceAll('_', ' ')]); return <label className="block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{allowBlank && <option value="">—</option>}{!allowBlank && value === '' && <option value="">Select…</option>}{normalized.map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>; }
