import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, BadgePoundSterling, CheckCircle2, CircleDollarSign,
  Link2, RefreshCw, RotateCw, ShoppingBag, Store, TriangleAlert, WalletCards,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailCommerceControl, syncRetailShopifyOrders, recordRetailPaymentEvent,
  reconcileRetailCashSession,
} from '@/lib/retail/retail-commerce.functions';

const blankPayment = {
  order_id: '', cash_session_id: '', register_id: '', provider: 'manual', external_payment_id: '',
  event_type: 'sale', direction: 'inflow', method: 'cash', amount: '', status: 'captured', reference: '', notes: '',
};
const blankClose = { cash_session_id: '', counted_cash: '', tolerance: 0.01, closed_by_staff_id: '', note: '' };

function money(value, currency = 'GBP') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}
function when(value) { return value ? new Date(value).toLocaleString() : '—'; }

export default function RetailCommerceControl() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [payment, setPayment] = useState(blankPayment);
  const [closing, setClosing] = useState(blankClose);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const workspace = useMemo(() => workspaces.find((w) => w.id === selected), [workspaces, selected]);
  const currency = workspace?.currency || 'GBP';

  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((x) => x.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) return setData(null);
    setData(await getRetailCommerceControl({ data: { workspace_id: id } }));
  };
  const run = async (fn) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Retail commerce operation failed.'); }
    finally { setBusy(false); }
  };
  const refresh = () => run(async () => { await loadWorkspaces(); if (selected) await load(selected); });

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail commerce control.')); }, [selected]);

  if (!workspaces.length) return null;

  const syncShopify = () => run(async () => {
    const result = await syncRetailShopifyOrders({ data: { workspace_id: selected, limit: 50 } });
    setNotice(`Shopify sync checked ${result.checked} order${result.checked === 1 ? '' : 's'} · ${result.created} created · ${result.updated} updated.`);
    await load(selected);
  });

  const savePayment = () => run(async () => {
    await recordRetailPaymentEvent({ data: {
      ...payment, workspace_id: selected, amount: Number(payment.amount), currency,
      order_id: payment.order_id || null, cash_session_id: payment.cash_session_id || null,
      register_id: payment.register_id || null, external_payment_id: payment.external_payment_id || null,
    }});
    setPayment(blankPayment); setNotice('Payment/tender event recorded in the immutable Retail ledger.'); await load(selected);
  });

  const closeSession = () => run(async () => {
    const result = await reconcileRetailCashSession({ data: {
      cash_session_id: closing.cash_session_id, counted_cash: Number(closing.counted_cash),
      tolerance: Number(closing.tolerance || 0), closed_by_staff_id: closing.closed_by_staff_id || null, note: closing.note || undefined,
    }});
    setNotice(`Till reconciliation ${result.status}: expected ${money(result.expected_cash, currency)}, counted ${money(result.counted_cash, currency)}, variance ${money(result.cash_variance, currency)}.`);
    setClosing(blankClose); await load(selected);
  });

  const openSessions = data?.sessions?.filter((s) => ['open','investigate'].includes(s.status)) || [];
  const selectedSession = openSessions.find((s) => s.id === payment.cash_session_id);
  const reconciliationSession = openSessions.find((s) => s.id === closing.cash_session_id);

  return <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-emerald-300"><CircleDollarSign className="h-4 w-4" /> Commerce & reconciliation</div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Connected orders, tender ledger and till close</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Synchronize bounded order data from an existing Blackstar Shopify connection, record auditable payment/tender events, and close cash sessions against captured ledger activity. Blackstar does not infer missing provider payment detail.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.business_name}</option>)}</select>
        <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}
    {notice && <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[.045] px-4 py-3 text-xs text-emerald-200">{notice}</div>}

    {data && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Shopify" value={data.shopify.connected ? 'Connected' : 'Not connected'} icon={ShoppingBag} good={data.shopify.connected} />
        <Metric label="Linked orders" value={data.dashboard.linkedOrders} icon={Link2} />
        <Metric label="Captured events" value={data.dashboard.capturedEvents} icon={WalletCards} />
        <Metric label="Net captured" value={money(data.dashboard.netCaptured, currency)} icon={BadgePoundSterling} />
        <Metric label="Open tills" value={data.dashboard.openCashSessions} icon={Store} />
        <Metric label="Till reviews" value={data.dashboard.reconciliationReviews} icon={TriangleAlert} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Panel title="Connected Shopify order sync" icon={ShoppingBag}>
          <div className={`rounded-xl border p-4 ${data.shopify.connected ? 'border-emerald-300/15 bg-emerald-300/[.035]' : 'border-white/[.07] bg-white/[.02]'}`}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-medium text-white">{data.shopify.connected ? (data.shopify.account_label || 'Connected Shopify store') : 'Shopify is not connected'}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Uses Blackstar’s existing native Shopify OAuth and read_orders scope. The bounded sync imports order identity, financial/fulfilment state, totals and line items—not customer contact fields.</p></div>
              {data.shopify.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <TriangleAlert className="h-5 w-5 text-zinc-600" />}
            </div>
            <button onClick={syncShopify} disabled={busy || !data.shopify.connected} className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 text-xs text-emerald-200 disabled:opacity-40"><RotateCw className="h-3.5 w-3.5" />Sync up to 50 recent orders</button>
          </div>
          <div className="mt-3 space-y-2 max-h-72 overflow-auto">
            {!data.links.length && <Empty text="No external order links yet." />}
            {data.links.slice(0, 30).map((link) => { const order = data.orders.find((o) => o.id === link.retail_order_id); return <Row key={link.id} title={`${link.provider} · ${link.external_order_number || link.external_order_id}`} detail={`${order?.order_number || 'Retail order'} · ${order ? money(order.total, order.currency) : '—'} · ${order?.payment_status || 'unknown'} · ${when(link.updated_at)}`} />; })}
          </div>
        </Panel>

        <Panel title="Record tender / payment event" icon={WalletCards}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Order (optional)" value={payment.order_id} onChange={(v) => setPayment({ ...payment, order_id: v })} options={data.orders.slice(0, 100).map((o) => [o.id, `${o.order_number} · ${money(o.total, o.currency)}`])} allowEmpty />
            <Select label="Cash session (optional)" value={payment.cash_session_id} onChange={(v) => { const session = openSessions.find((s) => s.id === v); setPayment({ ...payment, cash_session_id: v, register_id: session?.register_id || payment.register_id }); }} options={openSessions.map((s) => [s.id, `${data.registers.find((r) => r.id === s.register_id)?.name || 'Register'} · ${when(s.opened_at)}`])} allowEmpty />
            <Select label="Method" value={payment.method} onChange={(v) => setPayment({ ...payment, method: v })} options={['cash','card','gift_card','store_credit','bank_transfer','wallet','online','other']} />
            <Select label="Event" value={payment.event_type} onChange={(v) => setPayment({ ...payment, event_type: v, direction: v === 'sale' ? 'inflow' : ['refund','chargeback'].includes(v) ? 'outflow' : payment.direction })} options={['sale','refund','chargeback','adjustment']} />
            <Select label="Direction" value={payment.direction} onChange={(v) => setPayment({ ...payment, direction: v })} options={['inflow','outflow']} disabled={payment.event_type !== 'adjustment'} />
            <Field label="Amount" type="number" value={payment.amount} onChange={(v) => setPayment({ ...payment, amount: v })} />
            <Select label="Status" value={payment.status} onChange={(v) => setPayment({ ...payment, status: v })} options={['captured','authorised','pending','failed','voided']} />
            <Field label="Provider" value={payment.provider} onChange={(v) => setPayment({ ...payment, provider: v })} />
            <Field label="External payment ID" value={payment.external_payment_id} onChange={(v) => setPayment({ ...payment, external_payment_id: v })} />
            <Field label="Reference" value={payment.reference} onChange={(v) => setPayment({ ...payment, reference: v })} />
          </div>
          {selectedSession && <p className="mt-2 text-[11px] text-zinc-500">Linked to {data.registers.find((r) => r.id === selectedSession.register_id)?.name || 'register'} cash session.</p>}
          <button onClick={savePayment} disabled={busy || !payment.amount || (payment.event_type === 'sale' && payment.direction !== 'inflow') || (['refund','chargeback'].includes(payment.event_type) && payment.direction !== 'outflow')} className="mt-4 rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2 text-xs text-white disabled:opacity-40">Record immutable event</button>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Close & reconcile till" icon={BadgePoundSterling}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Open cash session" value={closing.cash_session_id} onChange={(v) => setClosing({ ...closing, cash_session_id: v })} options={openSessions.map((s) => [s.id, `${data.registers.find((r) => r.id === s.register_id)?.name || 'Register'} · ${when(s.opened_at)}`])} />
            <Field label="Counted cash" type="number" value={closing.counted_cash} onChange={(v) => setClosing({ ...closing, counted_cash: v })} />
            <Field label="Tolerance" type="number" value={closing.tolerance} onChange={(v) => setClosing({ ...closing, tolerance: v })} />
            <Select label="Closing staff" value={closing.closed_by_staff_id} onChange={(v) => setClosing({ ...closing, closed_by_staff_id: v })} options={data.staff.map((s) => [s.id, s.name])} allowEmpty />
            <Field label="Note" value={closing.note} onChange={(v) => setClosing({ ...closing, note: v })} />
          </div>
          {reconciliationSession && <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs text-zinc-400">Opening float: <span className="text-white">{money(reconciliationSession.opening_float, currency)}</span>. Expected cash is calculated only from captured cash tender events linked to this session.</div>}
          <button onClick={closeSession} disabled={busy || !closing.cash_session_id || closing.counted_cash === ''} className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-xs text-amber-100 disabled:opacity-40">Close session & reconcile</button>
          <div className="mt-3 space-y-2 max-h-72 overflow-auto">{!data.reconciliations.length && <Empty text="No till reconciliations yet." />}{data.reconciliations.slice(0, 30).map((r) => <Row key={r.id} title={`${data.registers.find((x) => x.id === r.register_id)?.name || 'Register'} · ${r.status}`} detail={`Expected ${money(r.expected_cash, currency)} · counted ${money(r.counted_cash, currency)} · variance ${money(r.cash_variance, currency)} · ${when(r.reconciled_at)}`} />)}</div>
        </Panel>

        <Panel title="Recent payment ledger" icon={CircleDollarSign}>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {!data.payments.length && <Empty text="No Retail tender events recorded yet." />}
            {data.payments.slice(0, 60).map((p) => <div key={p.id} className="flex items-start gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">{p.direction === 'inflow' ? <ArrowDownLeft className="mt-0.5 h-4 w-4 text-emerald-300" /> : <ArrowUpRight className="mt-0.5 h-4 w-4 text-amber-300" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-white">{p.event_type} · {p.method}</p><span className={`text-sm font-medium ${p.direction === 'inflow' ? 'text-emerald-200' : 'text-amber-200'}`}>{p.direction === 'inflow' ? '+' : '−'}{money(p.amount, p.currency)}</span></div><p className="mt-1 text-[11px] text-zinc-500">{p.status} · {p.provider} · {when(p.occurred_at)}{p.reference ? ` · ${p.reference}` : ''}</p></div></div>)}
          </div>
        </Panel>
      </div>
    </>}
  </section>;
}

function Panel({ title, icon: Icon, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">{Icon && <Icon className="h-4 w-4 text-emerald-300" />}{title}</div>{children}</div>; }
function Metric({ label, value, icon: Icon, good }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><Icon className={`h-3.5 w-3.5 ${good ? 'text-emerald-300' : 'text-zinc-600'}`} /></div><p className="mt-2 truncate text-base font-semibold text-white">{value}</p></div>; }
function Row({ title, detail }) { return <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><p className="text-sm text-white">{title}</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{detail}</p></div>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/[.08] p-4 text-xs text-zinc-600">{text}</div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-sm text-white outline-none" /></label>; }
function Select({ label, value, onChange, options, allowEmpty = false, disabled = false }) { return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</span><select value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-sm text-white outline-none disabled:opacity-50">{allowEmpty && <option value="">None</option>}{!allowEmpty && !value && <option value="">Select…</option>}{options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{String(option).replaceAll('_',' ')}</option>)}</select></label>; }
