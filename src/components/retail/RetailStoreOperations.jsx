import { useEffect, useState } from 'react';
import {
  AlarmClock, BadgePoundSterling, ClipboardList, CreditCard, Gift, RefreshCw, Save,
  Store, Timer, UserRoundCheck, WalletCards,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailStoreOperations, saveRetailRegister, saveRetailCashSession, saveRetailStocktake,
  saveRetailStocktakeLine, saveRetailGiftCard, saveRetailStaffShift, saveRetailTimeEntry,
  saveRetailBookingReminder,
} from '@/lib/retail/retail-store.functions';

const tabs = [
  ['registers', 'POS & cash', CreditCard],
  ['stocktakes', 'Stocktakes', ClipboardList],
  ['staff', 'Shifts & timeclock', UserRoundCheck],
  ['reminders', 'Booking reminders', AlarmClock],
  ['credit', 'Gift & store credit', Gift],
];

const blankRegister = { name: '', location_id: '', status: 'active', external_provider: '', external_register_id: '' };
const blankCash = { register_id: '', opened_by_staff_id: '', opening_float: 0, status: 'open', notes: '' };
const blankStocktake = { name: '', location_id: '', status: 'draft', notes: '' };
const blankLine = { stocktake_id: '', item_id: '', expected_quantity: '', counted_quantity: '', notes: '' };
const blankShift = { staff_id: '', location_id: '', starts_at: '', ends_at: '', role: '', status: 'scheduled', break_minutes: 0, notes: '' };
const blankTime = { staff_id: '', shift_id: '', location_id: '', clock_in_at: '', clock_out_at: '', break_minutes: 0, status: 'open', notes: '' };
const blankReminder = { appointment_id: '', channel: 'sms', scheduled_for: '', status: 'scheduled', template_key: 'appointment_reminder' };
const blankGift = { code: '', customer_name: '', customer_email: '', original_value: 0, balance: 0, status: 'active', expires_at: '', notes: '' };

function toIso(value) { return value ? new Date(value).toISOString() : null; }
function cash(value, currency = 'GBP') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}
function localDate(value) { return value ? new Date(value).toLocaleString() : '—'; }

export default function RetailStoreOperations() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('registers');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const workspace = workspaces.find((x) => x.id === selected);

  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((x) => x.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) { setData(null); return; }
    setData(await getRetailStoreOperations({ data: { workspace_id: id } }));
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { await loadWorkspaces(); if (selected) await load(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load store operations.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load store operations.')); }, [selected]);

  if (workspaces.length === 0) return null;

  return <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-amber-300"><Store className="h-4 w-4" /> Store-floor operations</div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Open, count, staff and close the business</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Run the practical daily layer around POS/registers, cash control, physical stocktakes, staff shifts, timeclock records, booking reminders and customer credit.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.business_name}</option>)}</select>
        <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}

    {data && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Metric label="Open tills" value={data.dashboard.openCashSessions} icon={WalletCards} />
        <Metric label="Cash review" value={data.dashboard.cashInvestigations} icon={BadgePoundSterling} />
        <Metric label="Active stocktakes" value={data.dashboard.activeStocktakes} icon={ClipboardList} />
        <Metric label="Clocked in" value={data.dashboard.openTimeEntries} icon={Timer} />
        <Metric label="Shifts · 7d" value={data.dashboard.upcomingShifts} icon={UserRoundCheck} />
        <Metric label="Reminders · 7d" value={data.dashboard.reminderQueue} icon={AlarmClock} />
        <Metric label="Gift credit" value={cash(data.dashboard.giftCreditOutstanding, workspace?.currency || 'GBP')} icon={Gift} />
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-amber-400/25 bg-amber-400/[.08] text-amber-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
      <div className="mt-5">
        {tab === 'registers' && <Registers workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
        {tab === 'stocktakes' && <Stocktakes workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
        {tab === 'staff' && <StaffOps workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
        {tab === 'reminders' && <Reminders workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
        {tab === 'credit' && <GiftCredit workspace={workspace} data={data} reload={() => load(selected)} setError={setError} setBusy={setBusy} busy={busy} />}
      </div>
    </>}
  </section>;
}

function Registers({ workspace, data, reload, setError, setBusy, busy }) {
  const [reg, setReg] = useState(blankRegister);
  const [session, setSession] = useState(blankCash);
  const saveReg = () => act(async () => { await saveRetailRegister({ data: { ...reg, workspace_id: workspace.id, location_id: reg.location_id || null } }); setReg(blankRegister); await reload(); }, setError, setBusy);
  const saveSession = () => act(async () => { await saveRetailCashSession({ data: { ...session, workspace_id: workspace.id, opened_by_staff_id: session.opened_by_staff_id || null } }); setSession(blankCash); await reload(); }, setError, setBusy);
  return <div className="grid gap-4 xl:grid-cols-2">
    <Panel title="Register / POS setup"><div className="grid gap-3 sm:grid-cols-2"><Field label="Name" value={reg.name} onChange={(v) => setReg({ ...reg, name: v })}/><Select label="Location" value={reg.location_id} onChange={(v) => setReg({ ...reg, location_id: v })} options={data.locations.map((x) => [x.id, x.name])}/><Field label="Provider" value={reg.external_provider} onChange={(v) => setReg({ ...reg, external_provider: v })}/><Field label="External register ID" value={reg.external_register_id} onChange={(v) => setReg({ ...reg, external_register_id: v })}/></div><Action onClick={saveReg} disabled={busy || !reg.name.trim()}>Save register</Action><List rows={data.registers.map((x) => ({ title: x.name, detail: `${x.status}${x.external_provider ? ` · ${x.external_provider}` : ''}` }))}/></Panel>
    <Panel title="Cash session"><div className="grid gap-3 sm:grid-cols-2"><Select label="Register" value={session.register_id} onChange={(v) => setSession({ ...session, register_id: v })} options={data.registers.map((x) => [x.id, x.name])}/><Select label="Opening staff" value={session.opened_by_staff_id} onChange={(v) => setSession({ ...session, opened_by_staff_id: v })} options={data.staff.map((x) => [x.id, x.name])}/><Field label="Opening float" type="number" value={session.opening_float} onChange={(v) => setSession({ ...session, opening_float: v })}/><Select label="Status" value={session.status} onChange={(v) => setSession({ ...session, status: v })} options={['open','closed','investigate']}/></div><Action onClick={saveSession} disabled={busy || !session.register_id}>Save cash session</Action><List rows={data.cashSessions.slice(0, 20).map((x) => ({ title: `${data.registers.find((r) => r.id === x.register_id)?.name || 'Register'} · ${x.status}`, detail: `${localDate(x.opened_at)} · float ${cash(x.opening_float, workspace.currency)}` }))}/></Panel>
  </div>;
}

function Stocktakes({ workspace, data, reload, setError, setBusy, busy }) {
  const [take, setTake] = useState(blankStocktake);
  const [line, setLine] = useState(blankLine);
  const saveTake = () => act(async () => { await saveRetailStocktake({ data: { ...take, workspace_id: workspace.id, location_id: take.location_id || null } }); setTake(blankStocktake); await reload(); }, setError, setBusy);
  const saveLine = () => act(async () => { const counted = line.counted_quantity === '' ? null : Number(line.counted_quantity); const expected = line.expected_quantity === '' ? null : Number(line.expected_quantity); await saveRetailStocktakeLine({ data: { ...line, workspace_id: workspace.id, counted_quantity: counted, expected_quantity: expected, variance: counted == null || expected == null ? null : counted - expected, counted_at: counted == null ? null : new Date().toISOString() } }); setLine(blankLine); await reload(); }, setError, setBusy);
  return <div className="grid gap-4 xl:grid-cols-2"><Panel title="Stocktake"><div className="grid gap-3 sm:grid-cols-2"><Field label="Name" value={take.name} onChange={(v) => setTake({ ...take, name: v })}/><Select label="Location" value={take.location_id} onChange={(v) => setTake({ ...take, location_id: v })} options={data.locations.map((x) => [x.id, x.name])}/><Select label="Status" value={take.status} onChange={(v) => setTake({ ...take, status: v })} options={['draft','counting','review','completed','cancelled']}/></div><Action onClick={saveTake} disabled={busy || !take.name.trim()}>Save stocktake</Action><List rows={data.stocktakes.map((x) => ({ title: x.name, detail: `${x.status} · ${localDate(x.created_at)}` }))}/></Panel><Panel title="Count line"><div className="grid gap-3 sm:grid-cols-2"><Select label="Stocktake" value={line.stocktake_id} onChange={(v) => setLine({ ...line, stocktake_id: v })} options={data.stocktakes.filter((x) => !['completed','cancelled'].includes(x.status)).map((x) => [x.id, x.name])}/><Select label="Item" value={line.item_id} onChange={(v) => setLine({ ...line, item_id: v })} options={data.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').map((x) => [x.id, x.name])}/><Field label="Expected" type="number" value={line.expected_quantity} onChange={(v) => setLine({ ...line, expected_quantity: v })}/><Field label="Counted" type="number" value={line.counted_quantity} onChange={(v) => setLine({ ...line, counted_quantity: v })}/></div><Action onClick={saveLine} disabled={busy || !line.stocktake_id || !line.item_id}>Save count</Action><List rows={data.stocktakeLines.slice(0, 30).map((x) => ({ title: data.catalog.find((i) => i.id === x.item_id)?.name || 'Item', detail: `Expected ${x.expected_quantity ?? '—'} · counted ${x.counted_quantity ?? '—'} · variance ${x.variance ?? '—'}` }))}/></Panel></div>;
}

function StaffOps({ workspace, data, reload, setError, setBusy, busy }) {
  const [shift, setShift] = useState(blankShift);
  const [time, setTime] = useState(blankTime);
  const saveShift = () => act(async () => { await saveRetailStaffShift({ data: { ...shift, workspace_id: workspace.id, location_id: shift.location_id || null, starts_at: toIso(shift.starts_at), ends_at: toIso(shift.ends_at) } }); setShift(blankShift); await reload(); }, setError, setBusy);
  const saveTime = () => act(async () => { await saveRetailTimeEntry({ data: { ...time, workspace_id: workspace.id, shift_id: time.shift_id || null, location_id: time.location_id || null, clock_in_at: toIso(time.clock_in_at), clock_out_at: toIso(time.clock_out_at) } }); setTime(blankTime); await reload(); }, setError, setBusy);
  return <div className="grid gap-4 xl:grid-cols-2"><Panel title="Schedule shift"><div className="grid gap-3 sm:grid-cols-2"><Select label="Staff" value={shift.staff_id} onChange={(v) => setShift({ ...shift, staff_id: v })} options={data.staff.map((x) => [x.id, x.name])}/><Select label="Location" value={shift.location_id} onChange={(v) => setShift({ ...shift, location_id: v })} options={data.locations.map((x) => [x.id, x.name])}/><Field label="Start" type="datetime-local" value={shift.starts_at} onChange={(v) => setShift({ ...shift, starts_at: v })}/><Field label="End" type="datetime-local" value={shift.ends_at} onChange={(v) => setShift({ ...shift, ends_at: v })}/><Field label="Role" value={shift.role} onChange={(v) => setShift({ ...shift, role: v })}/><Field label="Break minutes" type="number" value={shift.break_minutes} onChange={(v) => setShift({ ...shift, break_minutes: v })}/></div><Action onClick={saveShift} disabled={busy || !shift.staff_id || !shift.starts_at || !shift.ends_at}>Save shift</Action><List rows={data.shifts.slice(0, 30).map((x) => ({ title: data.staff.find((s) => s.id === x.staff_id)?.name || 'Staff', detail: `${localDate(x.starts_at)} → ${localDate(x.ends_at)} · ${x.status}` }))}/></Panel><Panel title="Timeclock entry"><div className="grid gap-3 sm:grid-cols-2"><Select label="Staff" value={time.staff_id} onChange={(v) => setTime({ ...time, staff_id: v })} options={data.staff.map((x) => [x.id, x.name])}/><Select label="Shift" value={time.shift_id} onChange={(v) => setTime({ ...time, shift_id: v })} options={data.shifts.map((x) => [x.id, `${data.staff.find((s) => s.id === x.staff_id)?.name || 'Staff'} · ${localDate(x.starts_at)}`])}/><Field label="Clock in" type="datetime-local" value={time.clock_in_at} onChange={(v) => setTime({ ...time, clock_in_at: v })}/><Field label="Clock out" type="datetime-local" value={time.clock_out_at} onChange={(v) => setTime({ ...time, clock_out_at: v })}/><Field label="Break minutes" type="number" value={time.break_minutes} onChange={(v) => setTime({ ...time, break_minutes: v })}/><Select label="Status" value={time.status} onChange={(v) => setTime({ ...time, status: v })} options={['open','closed','adjusted','void']}/></div><Action onClick={saveTime} disabled={busy || !time.staff_id || !time.clock_in_at}>Save time entry</Action><List rows={data.timeEntries.slice(0, 30).map((x) => ({ title: data.staff.find((s) => s.id === x.staff_id)?.name || 'Staff', detail: `${localDate(x.clock_in_at)} → ${localDate(x.clock_out_at)} · ${x.status}` }))}/></Panel></div>;
}

function Reminders({ workspace, data, reload, setError, setBusy, busy }) {
  const [form, setForm] = useState(blankReminder);
  const save = () => act(async () => { await saveRetailBookingReminder({ data: { ...form, workspace_id: workspace.id, scheduled_for: toIso(form.scheduled_for) } }); setForm(blankReminder); await reload(); }, setError, setBusy);
  return <Panel title="Appointment reminder queue"><div className="grid gap-3 md:grid-cols-4"><Select label="Appointment" value={form.appointment_id} onChange={(v) => setForm({ ...form, appointment_id: v })} options={data.appointments.filter((x) => !['cancelled','completed','no_show'].includes(x.status)).map((x) => [x.id, `${x.customer_name} · ${localDate(x.starts_at)}`])}/><Select label="Channel" value={form.channel} onChange={(v) => setForm({ ...form, channel: v })} options={['sms','email','voice','whatsapp','in_app']}/><Field label="Send at" type="datetime-local" value={form.scheduled_for} onChange={(v) => setForm({ ...form, scheduled_for: v })}/><Field label="Template" value={form.template_key} onChange={(v) => setForm({ ...form, template_key: v })}/></div><Action onClick={save} disabled={busy || !form.appointment_id || !form.scheduled_for}>Schedule reminder</Action><List rows={data.reminders.slice(0, 40).map((x) => ({ title: `${x.channel} · ${x.status}`, detail: `${localDate(x.scheduled_for)} · ${data.appointments.find((a) => a.id === x.appointment_id)?.customer_name || 'Appointment'}` }))}/></Panel>;
}

function GiftCredit({ workspace, data, reload, setError, setBusy, busy }) {
  const [form, setForm] = useState(blankGift);
  const save = () => act(async () => { await saveRetailGiftCard({ data: { ...form, workspace_id: workspace.id, currency: workspace.currency || 'GBP', expires_at: toIso(form.expires_at) } }); setForm(blankGift); await reload(); }, setError, setBusy);
  return <Panel title="Gift cards & store credit"><div className="grid gap-3 md:grid-cols-3"><Field label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })}/><Field label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })}/><Field label="Email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })}/><Field label="Original value" type="number" value={form.original_value} onChange={(v) => setForm({ ...form, original_value: v, balance: v })}/><Field label="Balance" type="number" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })}/><Field label="Expires" type="datetime-local" value={form.expires_at} onChange={(v) => setForm({ ...form, expires_at: v })}/></div><Action onClick={save} disabled={busy || !form.code.trim()}>Save gift credit</Action><List rows={data.giftCards.slice(0, 40).map((x) => ({ title: `${x.code} · ${cash(x.balance, x.currency)}`, detail: `${x.customer_name || 'Unassigned'} · ${x.status}${x.expires_at ? ` · expires ${localDate(x.expires_at)}` : ''}` }))}/></Panel>;
}

async function act(fn, setError, setBusy) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Retail operation failed.'); } finally { setBusy(false); } }
function Metric({ label, value, icon: Icon }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-3"><Icon className="h-4 w-4 text-amber-300"/><p className="mt-3 text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-600">{label}</p></div>; }
function Panel({ title, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><h3 className="text-sm font-medium text-white">{title}</h3><div className="mt-4">{children}</div></div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="block text-xs text-zinc-500"><span>{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"/></label>; }
function Select({ label, value, onChange, options }) { return <label className="block text-xs text-zinc-500"><span>{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none"><option value="">Select…</option>{options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}</select></label>; }
function Action({ children, onClick, disabled }) { return <button onClick={onClick} disabled={disabled} className="mt-4 flex items-center gap-2 rounded-xl bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-100 disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{children}</button>; }
function List({ rows }) { return <div className="mt-4 space-y-2">{rows.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">No records yet.</p> : rows.map((x, i) => <div key={`${x.title}-${i}`} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-sm text-white">{x.title}</p><p className="mt-1 text-[11px] text-zinc-500">{x.detail}</p></div>)}</div>; }
