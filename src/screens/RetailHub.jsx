import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Package, Boxes, Truck, CalendarDays, PhoneCall, Users, MapPin, ShoppingBag, Sparkles,
  Plus, RefreshCw, AlertTriangle, Banknote, Scissors, Bot, Workflow, Contact, Scale, Megaphone,
  Globe, Save, ChevronRight, PackageCheck, Clock3, CircleDollarSign,
} from 'lucide-react';
import {
  listRetailWorkspaces, getRetailOperations, saveRetailWorkspace, saveRetailLocation, saveRetailSupplier,
  saveRetailCatalogItem, adjustRetailInventory, saveRetailPurchaseOrder, saveRetailStaff,
  saveRetailAppointment, saveRetailOrder, saveRetailCall,
} from '@/lib/retail/retail-operations.functions';

const tabs = [
  ['overview', 'Command centre', Sparkles], ['catalog', 'Items & services', Package], ['inventory', 'Inventory', Boxes],
  ['suppliers', 'Suppliers & purchasing', Truck], ['bookings', 'Bookings', CalendarDays], ['orders', 'Orders & shipping', ShoppingBag],
  ['calls', 'Calls & reception', PhoneCall], ['staff', 'Staff', Users], ['locations', 'Locations', MapPin],
];

const emptyWorkspace = { business_name: '', business_type: 'retail_store', currency: 'GBP', timezone: 'Europe/London', phone: '', email: '', notes: '' };
const blankCatalog = { name: '', item_type: 'product', sku: '', barcode: '', category: '', cost_price: 0, sale_price: 0, tax_rate: 0, track_inventory: true, reorder_point: 0, reorder_quantity: 0, service_duration_minutes: 30, supplier_id: '' };
const blankSupplier = { name: '', contact_name: '', email: '', phone: '', website: '', lead_time_days: 0, minimum_order_amount: 0, status: 'active', notes: '' };
const blankAppointment = { customer_name: '', customer_phone: '', customer_email: '', service_item_id: '', staff_id: '', location_id: '', starts_at: '', ends_at: '', status: 'booked', source: 'manual', notes: '' };
const blankOrder = { order_number: '', customer_name: '', customer_phone: '', customer_email: '', channel: 'store', status: 'open', payment_status: 'unpaid', fulfilment_status: 'unfulfilled', subtotal: 0, tax: 0, shipping: 0, total: 0, carrier: '', tracking_number: '', notes: '' };
const blankCall = { direction: 'inbound', customer_name: '', phone: '', reason: '', summary: '', outcome: '', status: 'new', needs_follow_up: false, source: 'manual' };
const blankStaff = { name: '', role: '', phone: '', email: '', services: '', active: true, notes: '' };
const blankLocation = { name: '', kind: 'store', phone: '', active: true, address_text: '' };
const blankPO = { po_number: '', supplier_id: '', status: 'draft', subtotal: 0, tax: 0, shipping: 0, total: 0, expected_at: '', notes: '' };

function cash(value, currency = 'GBP') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}
function toIso(value) { return value ? new Date(value).toISOString() : null; }
function localDate(value) { return value ? new Date(value).toLocaleString() : '—'; }

export default function RetailHub() {
  return (
    <div className="space-y-6 pb-12">
      <section className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
        <div aria-hidden className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 left-12 h-64 w-64 rounded-full bg-cyan-400/[.055] blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-violet-300"><Store className="h-4 w-4" /> Blackstar Retail & Local Business</div>
          <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight text-white lg:text-5xl">AI operations for shops, barbers, salons and independent retailers.</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">Run stock, products, supplies, suppliers, bookings, customer orders, shipping, staff and call follow-up from one owner-controlled workspace, while handing specialist work to Blackstar’s existing CRM, Voice, Finance, Commerce, Marketing and Compliance systems.</p>
          <div className="mt-6 flex flex-wrap gap-2">{['Inventory', 'Reordering', 'Bookings', 'AI receptionist', 'Suppliers', 'Orders', 'Shipping', 'Staff', 'Margins', 'Customer follow-up'].map((x) => <span key={x} className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-xs text-zinc-300">{x}</span>)}</div>
        </div>
      </section>

      <RetailOperationsConsole />

      <section>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">Blackstar handoffs</p>
        <h2 className="mt-1 text-xl font-semibold text-white">One retail hub, connected to specialist systems</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['AI receptionist & calls', '/voice-studio', PhoneCall, 'Route phone automation, transcription and voice-agent work to Voice Studio.'],
            ['Customer relationships', '/crm', Contact, 'Move deeper customer history, outreach and pipeline activity into CRM.'],
            ['Cash, costs & margins', '/finance', Banknote, 'Use Finance Hub for budgets, cash flow, profit, scenario analysis and financial controls.'],
            ['Online selling', '/commerce-studio', Store, 'Connect catalogue and selling workflows to Commerce Studio.'],
            ['Automations', '/workflows', Workflow, 'Build approval-aware reorder, reminder, follow-up and fulfilment workflows.'],
            ['Marketing & loyalty', '/marketing', Megaphone, 'Create campaigns, promotions, retention and local growth programmes.'],
            ['Website & booking pages', '/website-studio', Globe, 'Build storefronts, service pages and customer-facing booking experiences.'],
            ['Rules & compliance', '/compliance-sentinel', Scale, 'Route consumer, employment, privacy and sector obligations into governed compliance review.'],
          ].map(([title, href, Icon, text]) => <Link key={href} to={href} className="group rounded-2xl border border-white/[.07] bg-white/[.025] p-4 transition hover:border-violet-400/20 hover:bg-violet-400/[.035]"><Icon className="h-5 w-5 text-violet-300" /><h3 className="mt-3 text-sm font-medium text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p><span className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[.14em] text-zinc-600 group-hover:text-violet-300">Open system <ChevronRight className="h-3 w-3" /></span></Link>)}
        </div>
      </section>
    </div>
  );
}

function RetailOperationsConsole() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [ops, setOps] = useState(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workspaceForm, setWorkspaceForm] = useState(emptyWorkspace);

  const workspace = workspaces.find((w) => w.id === selected);
  const currency = workspace?.currency || 'GBP';

  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((r) => r.id === current) ? current : (rows[0]?.id || ''));
  };
  const loadOps = async (id = selected) => { if (!id) { setOps(null); return; } setOps(await getRetailOperations({ data: { workspace_id: id } })); };
  const refresh = async () => { setBusy(true); setError(''); try { await loadWorkspaces(); if (selected) await loadOps(selected); } catch (e) { setError(e instanceof Error ? e.message : 'Could not refresh retail operations.'); } finally { setBusy(false); } };

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load retail workspaces.')); }, []);
  useEffect(() => { if (selected) loadOps(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load retail operations.')); }, [selected]);

  const saveWorkspace = async () => {
    setBusy(true); setError('');
    try { const saved = await saveRetailWorkspace({ data: workspaceForm }); setWorkspaceForm(emptyWorkspace); await loadWorkspaces(); setSelected(saved.id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save retail workspace.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Retail operations console</p><h2 className="mt-1 text-2xl font-semibold text-white">Daily operating system</h2><p className="mt-2 text-sm text-zinc-500">Every count below comes from your saved retail records.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {workspaces.length > 0 && <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.business_name}</option>)}</select>}
        <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}

    {workspaces.length === 0 ? <WorkspaceCreator form={workspaceForm} setForm={setWorkspaceForm} save={saveWorkspace} busy={busy} /> : <>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-violet-400/25 bg-violet-400/[.09] text-violet-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
      <div className="mt-5">{!ops ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Loading retail operations…</div> : <RetailTab tab={tab} workspace={workspace} currency={currency} ops={ops} reload={() => loadOps(selected)} setError={setError} />}</div>
    </>}
  </section>;
}

function WorkspaceCreator({ form, setForm, save, busy }) {
  return <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
    <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[.035] p-5"><h3 className="text-lg font-medium text-white">Create your first retail workspace</h3><p className="mt-2 text-sm leading-6 text-zinc-500">A workspace can represent one shop, a barber business, salon, boutique, online store or mixed operation. Add branches/locations afterwards.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })}/><Select label="Business type" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} options={['retail_store','barber','salon','beauty','convenience','boutique','service_shop','ecommerce','mixed','other']}/><Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })}/><Field label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })}/><Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}/><Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })}/></div><Textarea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })}/><Action disabled={!form.business_name.trim() || busy} onClick={save} icon={Save}>Create retail workspace</Action></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{[['Shop / store', Store], ['Barber / salon', Scissors], ['Online seller', ShoppingBag], ['Mixed retail + service', Sparkles]].map(([x, Icon]) => <div key={x} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><Icon className="h-5 w-5 text-cyan-300"/><p className="mt-2 text-sm text-white">{x}</p></div>)}</div>
  </div>;
}

function RetailTab({ tab, workspace, currency, ops, reload, setError }) {
  if (tab === 'overview') return <Overview workspace={workspace} currency={currency} ops={ops} />;
  if (tab === 'catalog') return <Catalog workspace={workspace} currency={currency} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'inventory') return <Inventory workspace={workspace} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'suppliers') return <Suppliers workspace={workspace} currency={currency} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'bookings') return <Bookings workspace={workspace} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'orders') return <Orders workspace={workspace} currency={currency} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'calls') return <Calls workspace={workspace} ops={ops} reload={reload} setError={setError} />;
  if (tab === 'staff') return <Staff workspace={workspace} ops={ops} reload={reload} setError={setError} />;
  return <Locations workspace={workspace} ops={ops} reload={reload} setError={setError} />;
}

function Overview({ workspace, currency, ops }) {
  const d = ops.dashboard;
  const priorities = useMemo(() => [
    ...d.lowStock.map((x) => ({ label: `Reorder ${x.name}`, detail: `Available stock is at or below reorder point ${x.reorder_point}.`, level: 'warning' })),
    ...d.followUps.slice(0, 8).map((x) => ({ label: `Call follow-up${x.customer_name ? ` · ${x.customer_name}` : ''}`, detail: x.reason || x.summary || 'Customer contact needs follow-up.', level: 'info' })),
    ...d.fulfilmentQueue.slice(0, 8).map((x) => ({ label: `Fulfil ${x.order_number}`, detail: `${x.fulfilment_status} · ${x.customer_name || 'customer'}`, level: 'info' })),
  ].slice(0, 16), [d]);
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
      ['Today revenue', cash(d.todayRevenue, currency), CircleDollarSign], ['Low stock', d.lowStock.length, AlertTriangle], ['Today bookings', d.todaysAppointments.length, CalendarDays], ['Open orders', d.openOrders.length, ShoppingBag], ['Inventory value', cash(d.inventoryValue, currency), PackageCheck],
    ].map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><Icon className="h-4 w-4 text-violet-300"/><p className="mt-3 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-zinc-600">{label}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><Panel title="AI priority queue" subtitle="Real operational exceptions Blackstar can help work through.">{priorities.length ? <div className="space-y-2">{priorities.map((p, i) => <div key={`${p.label}-${i}`} className="rounded-xl border border-white/[.06] bg-black/25 p-3"><p className="text-sm font-medium text-white">{p.label}</p><p className="mt-1 text-xs text-zinc-500">{p.detail}</p></div>)}</div> : <Empty text="No current stock, fulfilment or call-follow-up exceptions." />}</Panel><Panel title="Upcoming appointments" subtitle={`${workspace.business_name} schedule`}>{d.upcomingAppointments.length ? <div className="space-y-2">{d.upcomingAppointments.map((a) => <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] p-3"><div><p className="text-sm text-white">{a.customer_name}</p><p className="mt-1 text-xs text-zinc-600">{localDate(a.starts_at)} · {a.status}</p></div><Clock3 className="h-4 w-4 text-cyan-300"/></div>)}</div> : <Empty text="No upcoming appointments." />}</Panel></div>
  </div>;
}

function Catalog({ workspace, currency, ops, reload, setError }) {
  const [form, setForm] = useState({ ...blankCatalog, currency }); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailCatalogItem({ data: { ...form, workspace_id: workspace.id, supplier_id: form.supplier_id || null, currency, service_duration_minutes: form.item_type === 'service' ? Number(form.service_duration_minutes || 30) : null, track_inventory: form.item_type !== 'service' && form.track_inventory } }); setForm({ ...blankCatalog, currency }); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save item.'); } finally { setBusy(false); } };
  return <Two><Panel title="Add product, supply or service" subtitle="Products and consumables can be stock-tracked; services can be booked."><div className="grid gap-3 md:grid-cols-2"><Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })}/><Select label="Type" value={form.item_type} onChange={(v) => setForm({ ...form, item_type: v })} options={['product','service','supply']}/><Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })}/><Field label="Barcode" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })}/><Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })}/><Select label="Supplier" value={form.supplier_id} onChange={(v) => setForm({ ...form, supplier_id: v })} options={['', ...ops.suppliers.map((s) => s.id)]} labels={Object.fromEntries(ops.suppliers.map((s) => [s.id, s.name]))}/><NumberField label="Cost price" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })}/><NumberField label="Sale price" value={form.sale_price} onChange={(v) => setForm({ ...form, sale_price: v })}/>{form.item_type !== 'service' && <><NumberField label="Reorder point" value={form.reorder_point} onChange={(v) => setForm({ ...form, reorder_point: v })}/><NumberField label="Reorder quantity" value={form.reorder_quantity} onChange={(v) => setForm({ ...form, reorder_quantity: v })}/></>}{form.item_type === 'service' && <NumberField label="Service minutes" value={form.service_duration_minutes} onChange={(v) => setForm({ ...form, service_duration_minutes: v })}/>}</div><Action onClick={save} disabled={!form.name.trim() || busy} icon={Plus}>Save item</Action></Panel><Panel title="Catalogue" subtitle={`${ops.catalog.length} active/saved items`}>{ops.catalog.length ? <div className="space-y-2">{ops.catalog.map((x) => <div key={x.id} className="rounded-xl border border-white/[.06] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{x.name}</p><p className="mt-1 text-xs text-zinc-600">{x.item_type} {x.sku ? `· ${x.sku}` : ''} {x.category ? `· ${x.category}` : ''}</p></div><p className="text-sm text-emerald-200">{cash(x.sale_price, currency)}</p></div></div>)}</div> : <Empty text="No products or services yet." />}</Panel></Two>;
}

function Inventory({ workspace, ops, reload, setError }) {
  const [itemId, setItemId] = useState(''); const [locationId, setLocationId] = useState(''); const [qty, setQty] = useState(1); const [type, setType] = useState('stock_in'); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const stock = useMemo(() => { const m = new Map(); for (const l of ops.inventory) m.set(l.item_id, (m.get(l.item_id) || 0) + Number(l.on_hand || 0) - Number(l.reserved || 0)); return m; }, [ops.inventory]);
  const adjust = async () => { setBusy(true); setError(''); try { await adjustRetailInventory({ data: { workspace_id: workspace.id, item_id: itemId, location_id: locationId || null, quantity: Number(qty), movement_type: type, note } }); setNote(''); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not adjust inventory.'); } finally { setBusy(false); } };
  return <Two><Panel title="Stock adjustment" subtitle="Every adjustment is written to the append-only stock movement ledger."><Select label="Item" value={itemId} onChange={setItemId} options={['', ...ops.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').map((x) => x.id)]} labels={Object.fromEntries(ops.catalog.map((x) => [x.id, x.name]))}/><Select label="Location" value={locationId} onChange={setLocationId} options={['', ...ops.locations.map((x) => x.id)]} labels={Object.fromEntries(ops.locations.map((x) => [x.id, x.name]))}/><div className="grid gap-3 md:grid-cols-2"><Select label="Movement" value={type} onChange={setType} options={['stock_in','sale','return','adjustment','waste','transfer_in','transfer_out','reservation','release']}/><NumberField label="Signed quantity" value={qty} onChange={setQty}/></div><Textarea label="Reason / note" value={note} onChange={setNote}/><Action onClick={adjust} disabled={!itemId || !Number(qty) || busy} icon={Boxes}>Apply movement</Action></Panel><Panel title="Current stock" subtitle={`${ops.dashboard.lowStock.length} items need attention`}>{ops.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').length ? <div className="space-y-2">{ops.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').map((x) => { const available = stock.get(x.id) || 0; const low = available <= Number(x.reorder_point || 0); return <div key={x.id} className={`rounded-xl border p-3 ${low ? 'border-amber-300/15 bg-amber-300/[.035]' : 'border-white/[.06]'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-white">{x.name}</p><p className="mt-1 text-xs text-zinc-600">Reorder at {x.reorder_point} · suggested {x.reorder_quantity}</p></div><div className="text-right"><p className={`text-lg font-semibold ${low ? 'text-amber-200' : 'text-emerald-200'}`}>{available}</p><p className="text-[10px] text-zinc-700">available</p></div></div></div>})}</div> : <Empty text="Add stock-tracked catalogue items first." />}</Panel></Two>;
}

function Suppliers({ workspace, currency, ops, reload, setError }) {
  const [supplier, setSupplier] = useState({ ...blankSupplier, currency }); const [po, setPo] = useState({ ...blankPO, currency }); const [busy, setBusy] = useState(false);
  const run = async (fn, data, reset) => { setBusy(true); setError(''); try { await fn({ data }); reset(); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save purchasing record.'); } finally { setBusy(false); } };
  return <div className="grid gap-4 xl:grid-cols-3"><Panel title="Add supplier" subtitle="Store lead times and purchasing contacts."><Field label="Supplier name" value={supplier.name} onChange={(v) => setSupplier({ ...supplier, name: v })}/><Field label="Contact" value={supplier.contact_name} onChange={(v) => setSupplier({ ...supplier, contact_name: v })}/><Field label="Email" value={supplier.email} onChange={(v) => setSupplier({ ...supplier, email: v })}/><Field label="Phone" value={supplier.phone} onChange={(v) => setSupplier({ ...supplier, phone: v })}/><NumberField label="Lead time days" value={supplier.lead_time_days} onChange={(v) => setSupplier({ ...supplier, lead_time_days: v })}/><Action onClick={() => run(saveRetailSupplier, { ...supplier, workspace_id: workspace.id, currency }, () => setSupplier({ ...blankSupplier, currency }))} disabled={!supplier.name.trim() || busy} icon={Plus}>Save supplier</Action></Panel><Panel title="Create purchase order" subtitle="Track supplier orders and expected delivery."><Field label="PO number" value={po.po_number} onChange={(v) => setPo({ ...po, po_number: v })}/><Select label="Supplier" value={po.supplier_id} onChange={(v) => setPo({ ...po, supplier_id: v })} options={['', ...ops.suppliers.map((s) => s.id)]} labels={Object.fromEntries(ops.suppliers.map((s) => [s.id, s.name]))}/><Select label="Status" value={po.status} onChange={(v) => setPo({ ...po, status: v })} options={['draft','ordered','part_received','received','cancelled']}/><NumberField label="Total" value={po.total} onChange={(v) => setPo({ ...po, total: v })}/><Field label="Expected at" type="datetime-local" value={po.expected_at} onChange={(v) => setPo({ ...po, expected_at: v })}/><Action onClick={() => run(saveRetailPurchaseOrder, { ...po, workspace_id: workspace.id, supplier_id: po.supplier_id || null, expected_at: toIso(po.expected_at), currency }, () => setPo({ ...blankPO, currency }))} disabled={!po.po_number.trim() || busy} icon={Truck}>Save PO</Action></Panel><Panel title="Purchasing queue" subtitle={`${ops.dashboard.openPurchaseOrders.length} open purchase orders`}>{ops.purchaseOrders.length ? <div className="space-y-2">{ops.purchaseOrders.map((x) => <div key={x.id} className="rounded-xl border border-white/[.06] p-3"><p className="text-sm text-white">{x.po_number}</p><p className="mt-1 text-xs text-zinc-600">{x.status} · {cash(x.total, currency)} · expected {localDate(x.expected_at)}</p></div>)}</div> : <Empty text="No purchase orders yet." />}</Panel></div>;
}

function Bookings({ workspace, ops, reload, setError }) {
  const [form, setForm] = useState(blankAppointment); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailAppointment({ data: { ...form, workspace_id: workspace.id, service_item_id: form.service_item_id || null, staff_id: form.staff_id || null, location_id: form.location_id || null, starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at) } }); setForm(blankAppointment); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save appointment.'); } finally { setBusy(false); } };
  return <Two><Panel title="Book appointment" subtitle="For barbers, salons and any appointment-led local business."><div className="grid gap-3 md:grid-cols-2"><Field label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })}/><Field label="Phone" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })}/><Select label="Service" value={form.service_item_id} onChange={(v) => setForm({ ...form, service_item_id: v })} options={['', ...ops.catalog.filter((x) => x.item_type === 'service').map((x) => x.id)]} labels={Object.fromEntries(ops.catalog.map((x) => [x.id, x.name]))}/><Select label="Staff" value={form.staff_id} onChange={(v) => setForm({ ...form, staff_id: v })} options={['', ...ops.staff.map((x) => x.id)]} labels={Object.fromEntries(ops.staff.map((x) => [x.id, x.name]))}/><Field label="Starts" type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })}/><Field label="Ends" type="datetime-local" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })}/><Select label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={['manual','phone','web','walk_in','ai','integration']}/><Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['requested','booked','confirmed','checked_in','completed','cancelled','no_show']}/></div><Action onClick={save} disabled={!form.customer_name.trim() || !form.starts_at || busy} icon={CalendarDays}>Save booking</Action></Panel><Panel title="Booking diary" subtitle={`${ops.appointments.length} saved appointments`}>{ops.appointments.length ? <div className="space-y-2">{ops.appointments.map((a) => <div key={a.id} className="rounded-xl border border-white/[.06] p-3"><div className="flex justify-between gap-3"><div><p className="text-sm text-white">{a.customer_name}</p><p className="mt-1 text-xs text-zinc-600">{localDate(a.starts_at)} · {a.status} · {a.source}</p></div><Badge>{a.status}</Badge></div></div>)}</div> : <Empty text="No appointments yet." />}</Panel></Two>;
}

function Orders({ workspace, currency, ops, reload, setError }) {
  const [form, setForm] = useState({ ...blankOrder, currency }); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailOrder({ data: { ...form, workspace_id: workspace.id, currency, placed_at: new Date().toISOString() } }); setForm({ ...blankOrder, currency }); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save order.'); } finally { setBusy(false); } };
  return <Two><Panel title="Record order" subtitle="Track store, online, phone, marketplace and social orders."><div className="grid gap-3 md:grid-cols-2"><Field label="Order number" value={form.order_number} onChange={(v) => setForm({ ...form, order_number: v })}/><Field label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })}/><Select label="Channel" value={form.channel} onChange={(v) => setForm({ ...form, channel: v })} options={['store','online','phone','marketplace','social','other']}/><Select label="Payment" value={form.payment_status} onChange={(v) => setForm({ ...form, payment_status: v })} options={['unpaid','authorised','paid','part_refunded','refunded','failed']}/><Select label="Fulfilment" value={form.fulfilment_status} onChange={(v) => setForm({ ...form, fulfilment_status: v })} options={['unfulfilled','picking','packed','shipped','ready_for_collection','collected','delivered','returned']}/><NumberField label="Total" value={form.total} onChange={(v) => setForm({ ...form, total: v })}/><Field label="Carrier" value={form.carrier} onChange={(v) => setForm({ ...form, carrier: v })}/><Field label="Tracking number" value={form.tracking_number} onChange={(v) => setForm({ ...form, tracking_number: v })}/></div><Action onClick={save} disabled={!form.order_number.trim() || busy} icon={ShoppingBag}>Save order</Action></Panel><Panel title="Order & fulfilment queue" subtitle={`${ops.dashboard.fulfilmentQueue.length} orders still need fulfilment work`}>{ops.orders.length ? <div className="space-y-2">{ops.orders.map((o) => <div key={o.id} className="rounded-xl border border-white/[.06] p-3"><div className="flex justify-between gap-3"><div><p className="text-sm text-white">{o.order_number} {o.customer_name ? `· ${o.customer_name}` : ''}</p><p className="mt-1 text-xs text-zinc-600">{o.channel} · {o.payment_status} · {o.fulfilment_status}</p>{o.tracking_number && <p className="mt-1 text-[11px] text-cyan-300">{o.carrier || 'Carrier'} · {o.tracking_number}</p>}</div><p className="text-sm text-emerald-200">{cash(o.total, currency)}</p></div></div>)}</div> : <Empty text="No customer orders yet." />}</Panel></Two>;
}

function Calls({ workspace, ops, reload, setError }) {
  const [form, setForm] = useState(blankCall); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailCall({ data: { ...form, workspace_id: workspace.id, received_at: new Date().toISOString() } }); setForm(blankCall); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save call record.'); } finally { setBusy(false); } };
  return <Two><Panel title="Reception & call inbox" subtitle="Manual today; Voice Studio and phone providers can write into the same governed inbox later."><div className="grid gap-3 md:grid-cols-2"><Select label="Direction" value={form.direction} onChange={(v) => setForm({ ...form, direction: v })} options={['inbound','outbound']}/><Field label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })}/><Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}/><Field label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })}/><Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['new','handled','follow_up','closed']}/><Select label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={['manual','voice_studio','phone_provider','ai','integration']}/></div><Textarea label="Summary" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })}/><label className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={form.needs_follow_up} onChange={(e) => setForm({ ...form, needs_follow_up: e.target.checked })}/>Needs follow-up</label><Action onClick={save} disabled={busy} icon={PhoneCall}>Save call</Action></Panel><Panel title="Follow-up queue" subtitle={`${ops.dashboard.followUps.length} calls need attention`}>{ops.calls.length ? <div className="space-y-2">{ops.calls.map((c) => <div key={c.id} className="rounded-xl border border-white/[.06] p-3"><div className="flex justify-between gap-3"><div><p className="text-sm text-white">{c.customer_name || c.phone || 'Call'}</p><p className="mt-1 text-xs text-zinc-600">{localDate(c.received_at)} · {c.direction} · {c.status}</p>{c.reason && <p className="mt-1 text-xs text-zinc-500">{c.reason}</p>}</div>{c.needs_follow_up && <Badge>follow up</Badge>}</div></div>)}</div> : <Empty text="No call records yet." />}</Panel></Two>;
}

function Staff({ workspace, ops, reload, setError }) {
  const [form, setForm] = useState(blankStaff); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailStaff({ data: { ...form, workspace_id: workspace.id, services: form.services.split(',').map((x) => x.trim()).filter(Boolean) } }); setForm(blankStaff); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save staff member.'); } finally { setBusy(false); } };
  return <Two><Panel title="Staff & service team" subtitle="Useful for rota-aware booking and service operations."><Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })}/><Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })}/><Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}/><Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })}/><Field label="Services (comma separated)" value={form.services} onChange={(v) => setForm({ ...form, services: v })}/><Action onClick={save} disabled={!form.name.trim() || busy} icon={Users}>Save staff member</Action></Panel><Panel title="Team" subtitle={`${ops.staff.length} saved people`}>{ops.staff.length ? <div className="space-y-2">{ops.staff.map((s) => <div key={s.id} className="rounded-xl border border-white/[.06] p-3"><p className="text-sm text-white">{s.name}</p><p className="mt-1 text-xs text-zinc-600">{s.role || 'Team member'}{s.services?.length ? ` · ${s.services.join(', ')}` : ''}</p></div>)}</div> : <Empty text="No staff records yet." />}</Panel></Two>;
}

function Locations({ workspace, ops, reload, setError }) {
  const [form, setForm] = useState(blankLocation); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setError(''); try { await saveRetailLocation({ data: { workspace_id: workspace.id, name: form.name, kind: form.kind, phone: form.phone, active: form.active, address: form.address_text ? { formatted: form.address_text } : {} } }); setForm(blankLocation); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save location.'); } finally { setBusy(false); } };
  return <Two><Panel title="Add location" subtitle="Stores, barber chairs/shops, warehouses and online operations can share one workspace."><Field label="Location name" value={form.name} onChange={(v) => setForm({ ...form, name: v })}/><Select label="Type" value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={['store','salon','barber','warehouse','office','online','other']}/><Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}/><Textarea label="Address" value={form.address_text} onChange={(v) => setForm({ ...form, address_text: v })}/><Action onClick={save} disabled={!form.name.trim() || busy} icon={MapPin}>Save location</Action></Panel><Panel title="Locations" subtitle={`${ops.locations.length} saved locations`}>{ops.locations.length ? <div className="space-y-2">{ops.locations.map((l) => <div key={l.id} className="rounded-xl border border-white/[.06] p-3"><p className="text-sm text-white">{l.name}</p><p className="mt-1 text-xs text-zinc-600">{l.kind} · {l.active ? 'active' : 'inactive'}</p>{l.address?.formatted && <p className="mt-1 text-xs text-zinc-500">{l.address.formatted}</p>}</div>)}</div> : <Empty text="No locations yet." />}</Panel></Two>;
}

function Panel({ title, subtitle, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4 lg:p-5"><h3 className="font-medium text-white">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-5 text-zinc-600">{subtitle}</p>}<div className="mt-4 space-y-3">{children}</div></div>; }
function Two({ children }) { return <div className="grid gap-4 xl:grid-cols-2">{children}</div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="block"><span className="text-[10px] font-medium uppercase tracking-[.12em] text-zinc-600">{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/30"/></label>; }
function NumberField({ label, value, onChange }) { return <Field label={label} type="number" value={value} onChange={(v) => onChange(Number(v))}/>; }
function Textarea({ label, value, onChange }) { return <label className="block"><span className="text-[10px] font-medium uppercase tracking-[.12em] text-zinc-600">{label}</span><textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-white/[.07] bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/30"/></label>; }
function Select({ label, value, onChange, options, labels = {} }) { return <label className="block"><span className="text-[10px] font-medium uppercase tracking-[.12em] text-zinc-600">{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-[#09090d] px-3 py-2.5 text-sm text-white outline-none">{options.map((o) => <option key={o || 'blank'} value={o}>{o ? (labels[o] || String(o).replaceAll('_', ' ')) : '—'}</option>)}</select></label>; }
function Action({ children, onClick, disabled, icon: Icon = Plus }) { return <button disabled={disabled} onClick={onClick} className="mt-4 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.07] px-4 py-2.5 text-xs font-medium text-violet-100 transition hover:bg-violet-400/[.12] disabled:cursor-not-allowed disabled:opacity-40"><Icon className="h-3.5 w-3.5"/>{children}</button>; }
function Badge({ children }) { return <span className="h-fit rounded-full border border-amber-300/15 bg-amber-300/[.04] px-2 py-1 text-[9px] uppercase tracking-[.12em] text-amber-200">{children}</span>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">{text}</div>; }
