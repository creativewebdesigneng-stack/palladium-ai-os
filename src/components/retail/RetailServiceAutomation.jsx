import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, CalendarClock, CheckCircle2, Headphones, Loader2, MessageSquareText, PhoneCall,
  RefreshCw, RotateCcw, Save, Send, ShieldCheck, Sparkles, Trash2, UserRoundCheck, Volume2,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailServiceAutomation, saveRetailReceptionProfile, saveRetailReturnItem, deleteRetailReturnItem,
  processRetailReturnRestock, createRetailReceptionAction, reviewRetailReceptionAction,
  executeRetailReceptionAction, saveRetailCustomerCommunication, cancelRetailCustomerCommunication,
} from '@/lib/retail/retail-service-automation.functions';

const TABS = [
  ['reception', 'AI receptionist', Headphones],
  ['communications', 'Customer communications', MessageSquareText],
  ['returns', 'Return restocking', RotateCcw],
];

const defaultProfile = {
  active: true, greeting: '', escalation_name: '', escalation_phone: '', default_channel: 'sms',
  appointment_reminders: true, first_reminder_hours: 24, second_reminder_hours: 2,
  no_show_followup: true, ai_actions_enabled: false, knowledge_text: '', policy_text: '', notes: '',
};
const defaultAction = { call_id: '', appointment_id: '', order_id: '', action_type: 'callback', summary: '', payload_text: '{}' };
const defaultCommunication = { channel: 'sms', purpose: 'custom', recipient: '', subject: '', body: '', scheduled_for: '', status: 'ready' };
const defaultReturnLine = { return_id: '', item_id: '', location_id: '', quantity: 1, condition: 'sellable', disposition: 'restock', notes: '' };

function asLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function toIso(value) { return value ? new Date(value).toISOString() : undefined; }
function dt(value) { return value ? new Date(value).toLocaleString() : '—'; }
function labelize(value) { return String(value || '').replaceAll('_', ' '); }

export default function RetailServiceAutomation() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('reception');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const workspace = workspaces.find((w) => w.id === selected);
  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) { setData(null); return; }
    setData(await getRetailServiceAutomation({ data: { workspace_id: id } }));
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { await loadWorkspaces(); if (selected) await load(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load Retail service automation.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail service automation.')); }, [selected]);

  if (!workspaces.length) return null;

  return (
    <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-violet-300"><Bot className="h-4 w-4" /> Retail service automation</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Reception, reminders and returns</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Prepare customer communications, govern receptionist actions and restock verified returns. Voice Studio supplies speech intelligence; an external phone/SMS/email/WhatsApp provider is still required for actual customer delivery.</p>
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
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={Bot} label="Pending receptionist actions" value={data.dashboard.pendingActions} />
          <Metric icon={ShieldCheck} label="Approved actions" value={data.dashboard.approvedActions} />
          <Metric icon={Send} label="Due communications" value={data.dashboard.dueCommunications} />
          <Metric icon={CalendarClock} label="Scheduled messages" value={data.dashboard.scheduledCommunications} />
          <Metric icon={RotateCcw} label="Restock-ready returns" value={data.dashboard.restockableReturns} />
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-violet-400/25 bg-violet-400/[.08] text-violet-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>
        <div className="mt-5">
          {tab === 'reception' && <ReceptionPanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
          {tab === 'communications' && <CommunicationsPanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
          {tab === 'returns' && <ReturnsPanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
        </div>
      </>}
    </section>
  );
}

function ReceptionPanel({ workspace, data, reload, busy, setBusy, setError }) {
  const initial = useMemo(() => {
    const p = data.profile;
    return p ? {
      active: p.active, greeting: p.greeting || '', escalation_name: p.escalation_name || '', escalation_phone: p.escalation_phone || '',
      default_channel: p.default_channel || 'sms', appointment_reminders: p.appointment_reminders,
      first_reminder_hours: p.first_reminder_hours ?? 24, second_reminder_hours: p.second_reminder_hours ?? '',
      no_show_followup: p.no_show_followup, ai_actions_enabled: p.ai_actions_enabled,
      knowledge_text: p.knowledge?.notes || '', policy_text: p.policies?.notes || '', notes: p.notes || '',
    } : defaultProfile;
  }, [data.profile]);
  const [profile, setProfile] = useState(initial);
  const [action, setAction] = useState(defaultAction);
  useEffect(() => setProfile(initial), [initial]);

  const saveProfile = async () => {
    setBusy(true); setError('');
    try {
      await saveRetailReceptionProfile({ data: {
        workspace_id: workspace.id, active: profile.active, greeting: profile.greeting, escalation_name: profile.escalation_name,
        escalation_phone: profile.escalation_phone, default_channel: profile.default_channel,
        appointment_reminders: profile.appointment_reminders, first_reminder_hours: profile.first_reminder_hours,
        second_reminder_hours: profile.second_reminder_hours === '' ? null : profile.second_reminder_hours,
        no_show_followup: profile.no_show_followup, ai_actions_enabled: profile.ai_actions_enabled,
        knowledge: { notes: profile.knowledge_text }, policies: { notes: profile.policy_text }, notes: profile.notes,
      } });
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save receptionist profile.'); }
    finally { setBusy(false); }
  };
  const createAction = async () => {
    setBusy(true); setError('');
    try {
      let payload = {};
      try { payload = JSON.parse(action.payload_text || '{}'); } catch { throw new Error('Action payload must be valid JSON.'); }
      await createRetailReceptionAction({ data: {
        workspace_id: workspace.id, call_id: action.call_id || null, appointment_id: action.appointment_id || null,
        order_id: action.order_id || null, action_type: action.action_type, summary: action.summary, payload,
      } });
      setAction(defaultAction); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create receptionist action.'); }
    finally { setBusy(false); }
  };
  const review = async (id, status) => {
    setBusy(true); setError('');
    try { await reviewRetailReceptionAction({ data: { id, status } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not review receptionist action.'); }
    finally { setBusy(false); }
  };
  const execute = async (id) => {
    setBusy(true); setError('');
    try { await executeRetailReceptionAction({ data: { id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not execute receptionist action.'); }
    finally { setBusy(false); }
  };

  return <div className="grid gap-4 2xl:grid-cols-[.9fr_1.1fr]">
    <Panel title="AI receptionist operating profile" icon={Headphones}>
      <p className="mb-4 text-[11px] leading-5 text-zinc-500">This is the governed business context a trusted voice/AI integration can use. Enabling AI actions permits proposals only; actions still enter the review queue before Blackstar executes a business-side change.</p>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Greeting" value={profile.greeting} onChange={(v) => setProfile({ ...profile, greeting: v })} /><Select label="Default communication" value={profile.default_channel} onChange={(v) => setProfile({ ...profile, default_channel: v })} options={['sms','email','voice','whatsapp']} /><Field label="Escalation contact" value={profile.escalation_name} onChange={(v) => setProfile({ ...profile, escalation_name: v })} /><Field label="Escalation phone" value={profile.escalation_phone} onChange={(v) => setProfile({ ...profile, escalation_phone: v })} /><Field label="First reminder (hours)" type="number" value={profile.first_reminder_hours} onChange={(v) => setProfile({ ...profile, first_reminder_hours: v })} /><Field label="Second reminder (hours)" type="number" value={profile.second_reminder_hours} onChange={(v) => setProfile({ ...profile, second_reminder_hours: v })} /></div>
      <Textarea label="Business knowledge / FAQs" value={profile.knowledge_text} onChange={(v) => setProfile({ ...profile, knowledge_text: v })} />
      <Textarea label="Booking / returns / customer policies" value={profile.policy_text} onChange={(v) => setProfile({ ...profile, policy_text: v })} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><Toggle label="Prepare appointment reminders" checked={profile.appointment_reminders} onChange={(v) => setProfile({ ...profile, appointment_reminders: v })} /><Toggle label="Prepare no-show follow-ups" checked={profile.no_show_followup} onChange={(v) => setProfile({ ...profile, no_show_followup: v })} /><Toggle label="Allow trusted AI/provider action proposals" checked={profile.ai_actions_enabled} onChange={(v) => setProfile({ ...profile, ai_actions_enabled: v })} /><Toggle label="Reception automation active" checked={profile.active} onChange={(v) => setProfile({ ...profile, active: v })} /></div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={saveProfile} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save profile</button><Link to="/voice-studio" className="flex items-center gap-1.5 rounded-lg border border-white/[.08] px-3 py-2 text-xs text-zinc-300"><Volume2 className="h-3.5 w-3.5" />Open Voice Studio</Link></div>
    </Panel>

    <Panel title="Reception action review" icon={UserRoundCheck}>
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Call record" value={action.call_id} onChange={(v) => setAction({ ...action, call_id: v })} options={data.calls.map((c) => [c.id, `${c.customer_name || c.phone || 'Caller'} · ${c.reason || 'call'}`])} allowBlank /><Select label="Action type" value={action.action_type} onChange={(v) => setAction({ ...action, action_type: v })} options={['callback','create_booking','reschedule_booking','cancel_booking','order_status_reply','product_or_service_query','custom']} /><Select label="Appointment" value={action.appointment_id} onChange={(v) => setAction({ ...action, appointment_id: v })} options={data.appointments.map((a) => [a.id, `${a.customer_name} · ${dt(a.starts_at)}`])} allowBlank /><Select label="Order" value={action.order_id} onChange={(v) => setAction({ ...action, order_id: v })} options={data.orders.map((o) => [o.id, `${o.order_number} · ${o.customer_name || 'Customer'}`])} allowBlank /></div>
      <Field label="Summary" value={action.summary} onChange={(v) => setAction({ ...action, summary: v })} />
      <Textarea label="Structured payload (JSON)" value={action.payload_text} onChange={(v) => setAction({ ...action, payload_text: v })} />
      <p className="mt-2 text-[10px] leading-5 text-zinc-600">Payload is intentionally explicit. For a create-booking action use fields such as customer_name, starts_at, ends_at, service_item_id, staff_id and location_id. AI/provider-generated proposals must come through trusted server integrations, not a browser pretending to be AI.</p>
      <button onClick={createAction} disabled={busy || !action.summary} className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />Create review action</button>

      <div className="mt-5 space-y-2">{!data.actions.length && <Empty text="No receptionist actions yet." />}{data.actions.map((row) => <div key={row.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm text-white">{labelize(row.action_type)}</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{row.summary}</p></div><Status value={row.status} /></div><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-zinc-600">Requested by {labelize(row.requested_by)} · {dt(row.created_at)}</p>{row.last_error && <p className="mt-2 text-[11px] text-rose-300">{row.last_error}</p>}<div className="mt-3 flex flex-wrap gap-2">{row.status === 'pending_review' && <><button onClick={() => review(row.id, 'approved')} disabled={busy} className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200">Approve</button><button onClick={() => review(row.id, 'dismissed')} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Dismiss</button></>}{row.status === 'approved' && <button onClick={() => execute(row.id)} disabled={busy} className="flex items-center gap-1 rounded-lg bg-violet-400/10 px-2.5 py-1.5 text-[11px] text-violet-100"><CheckCircle2 className="h-3.5 w-3.5" />Execute approved action</button>}</div></div>)}</div>
    </Panel>
  </div>;
}

function CommunicationsPanel({ workspace, data, reload, busy, setBusy, setError }) {
  const [form, setForm] = useState(defaultCommunication);
  const save = async () => {
    setBusy(true); setError('');
    try {
      await saveRetailCustomerCommunication({ data: { ...form, workspace_id: workspace.id, scheduled_for: toIso(form.scheduled_for), metadata: { source: 'manual', provider_delivery_required: true } } });
      setForm(defaultCommunication); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save customer communication.'); }
    finally { setBusy(false); }
  };
  const cancel = async (id) => {
    setBusy(true); setError('');
    try { await cancelRetailCustomerCommunication({ data: { id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not cancel communication.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 2xl:grid-cols-[.75fr_1.25fr]">
    <Panel title="Prepare customer communication" icon={Send}>
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Channel" value={form.channel} onChange={(v) => setForm({ ...form, channel: v })} options={['sms','email','voice','whatsapp']} /><Select label="Purpose" value={form.purpose} onChange={(v) => setForm({ ...form, purpose: v })} options={['custom','appointment_confirmation','callback','order_update']} /><Field label="Recipient" value={form.recipient} onChange={(v) => setForm({ ...form, recipient: v })} /><Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} /><Field label="Schedule" type="datetime-local" value={form.scheduled_for} onChange={(v) => setForm({ ...form, scheduled_for: v })} /><Select label="Queue state" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['draft','ready']} /></div>
      <Textarea label="Message / call script" value={form.body} onChange={(v) => setForm({ ...form, body: v })} />
      <button onClick={save} disabled={busy || !form.recipient || !form.body} className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save communication</button>
      <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-3 text-[11px] leading-5 text-amber-100/75">“Ready” means Blackstar has prepared the communication. It does <strong>not</strong> mean SMS, email, WhatsApp or a phone call was sent. A connected delivery provider must record sending/delivery before the status can become sent.</div>
    </Panel>
    <Panel title="Communication queue" icon={MessageSquareText}>
      <div className="space-y-2">{!data.communications.length && <Empty text="No customer communications queued yet." />}{data.communications.map((row) => <div key={row.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm text-white">{labelize(row.purpose)} · {row.channel}</p><p className="mt-1 text-[11px] text-zinc-500">{row.recipient} · scheduled {dt(row.scheduled_for)}</p></div><Status value={row.status} /></div><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-zinc-400">{row.body}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-600"><span>Provider: {row.provider || 'not connected/recorded'}</span>{row.provider_message_id && <span>· Provider ID: {row.provider_message_id}</span>}{row.sent_at && <span>· Sent: {dt(row.sent_at)}</span>}</div>{['draft','ready'].includes(row.status) && <button onClick={() => cancel(row.id)} disabled={busy} className="mt-3 rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Cancel</button>}{row.channel === 'voice' && <Link to="/voice-studio" className="ml-2 mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-400/10 px-2.5 py-1.5 text-[11px] text-violet-200"><Volume2 className="h-3 w-3" />Voice Studio</Link>}</div>)}</div>
    </Panel>
  </div>;
}

function ReturnsPanel({ workspace, data, reload, busy, setBusy, setError }) {
  const eligibleReturns = data.returns.filter((r) => r.restock && ['received','refunded'].includes(r.status));
  const [line, setLine] = useState(defaultReturnLine);
  useEffect(() => {
    if (!line.return_id && eligibleReturns[0]?.id) setLine((current) => ({ ...current, return_id: eligibleReturns[0].id }));
  }, [eligibleReturns.length]);
  const saveLine = async () => {
    setBusy(true); setError('');
    try { await saveRetailReturnItem({ data: { ...line, workspace_id: workspace.id, location_id: line.location_id || null } }); setLine({ ...defaultReturnLine, return_id: line.return_id }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save return item.'); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    setBusy(true); setError('');
    try { await deleteRetailReturnItem({ data: { id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove return item.'); }
    finally { setBusy(false); }
  };
  const process = async (returnId) => {
    setBusy(true); setError('');
    try { await processRetailReturnRestock({ data: { return_id: returnId } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not process return restock.'); }
    finally { setBusy(false); }
  };
  const itemName = (id) => data.catalog.find((x) => x.id === id)?.name || 'Item';
  const locationName = (id) => data.locations.find((x) => x.id === id)?.name || 'No location';
  const linesFor = (id) => data.returnItems.filter((x) => x.return_id === id);
  return <div className="grid gap-4 2xl:grid-cols-[.75fr_1.25fr]">
    <Panel title="Return inspection line" icon={RotateCcw}>
      {!eligibleReturns.length ? <Empty text="Mark a return as restockable and received/refunded before adding stock-return lines." /> : <><div className="grid gap-3 sm:grid-cols-2"><Select label="Return" value={line.return_id} onChange={(v) => setLine({ ...line, return_id: v })} options={eligibleReturns.map((r) => [r.id, `${r.return_number} · ${r.customer_name || 'Customer'}`])} /><Select label="Item" value={line.item_id} onChange={(v) => setLine({ ...line, item_id: v })} options={data.catalog.filter((x) => x.track_inventory && x.item_type !== 'service').map((x) => [x.id, x.name])} /><Select label="Restock location" value={line.location_id} onChange={(v) => setLine({ ...line, location_id: v })} options={data.locations.map((x) => [x.id, x.name])} /><Field label="Quantity" type="number" value={line.quantity} onChange={(v) => setLine({ ...line, quantity: v })} /><Select label="Condition" value={line.condition} onChange={(v) => setLine({ ...line, condition: v })} options={['sellable','opened','damaged','defective','unknown']} /><Select label="Disposition" value={line.disposition} onChange={(v) => setLine({ ...line, disposition: v })} options={['restock','quarantine','discard','return_to_supplier','inspect']} /></div><Textarea label="Inspection notes" value={line.notes} onChange={(v) => setLine({ ...line, notes: v })} /><button onClick={saveLine} disabled={busy || !line.return_id || !line.item_id} className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save inspected line</button></>}
      <p className="mt-3 text-[11px] leading-5 text-zinc-600">Only lines marked <strong>sellable + restock</strong> with a location can increase inventory. The restock RPC writes inventory and the immutable return movement ledger atomically.</p>
    </Panel>
    <Panel title="Restock processing" icon={CheckCircle2}>
      <div className="space-y-3">{!eligibleReturns.length && <Empty text="No received restockable returns are ready." />}{eligibleReturns.map((r) => { const lines = linesFor(r.id); const eligible = lines.filter((x) => x.condition === 'sellable' && x.disposition === 'restock' && Number(x.processed_quantity) < Number(x.quantity)); return <div key={r.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{r.return_number} · {r.customer_name || 'Customer'}</p><p className="mt-1 text-[11px] text-zinc-500">{labelize(r.status)} · {lines.length} inspected line(s) · {eligible.length} eligible to restock</p></div><button onClick={() => process(r.id)} disabled={busy || !eligible.length} className="flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200 disabled:opacity-35"><CheckCircle2 className="h-3.5 w-3.5" />Process restock</button></div><div className="mt-3 space-y-2">{!lines.length && <p className="text-[11px] text-zinc-600">No inspected lines yet.</p>}{lines.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[.05] px-3 py-2 text-[11px]"><div><span className="text-zinc-300">{itemName(row.item_id)}</span><span className="text-zinc-600"> · {locationName(row.location_id)} · {Number(row.quantity).toFixed(1)} · {row.condition}/{row.disposition}</span>{Number(row.processed_quantity) > 0 && <span className="ml-1 text-emerald-300">· processed {Number(row.processed_quantity).toFixed(1)}</span>}</div>{Number(row.processed_quantity) === 0 && <button onClick={() => remove(row.id)} disabled={busy} className="text-zinc-600 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div></div>; })}</div>
    </Panel>
  </div>;
}

function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-3 text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</p></div>; }
function Panel({ title, icon: Icon, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="mb-4 flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-violet-300" />}<h3 className="text-sm font-medium text-white">{title}</h3></div>{children}</div>; }
function Status({ value }) { return <span className="rounded-full border border-white/[.07] bg-white/[.03] px-2 py-1 text-[10px] uppercase tracking-[.11em] text-zinc-400">{labelize(value)}</span>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/[.08] p-5 text-center text-xs text-zinc-600">{text}</div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="mt-3 block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/25" /></label>; }
function Textarea({ label, value, onChange }) { return <label className="mt-3 block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/25" /></label>; }
function Select({ label, value, onChange, options, allowBlank = false }) { const normalized = options.map((x) => Array.isArray(x) ? x : [x, labelize(x)]); return <label className="mt-3 block"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{allowBlank && <option value="">—</option>}{!allowBlank && value === '' && <option value="">Select…</option>}{normalized.map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }) { return <label className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2 text-xs text-zinc-400"><input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }
