import { useEffect, useMemo, useState } from 'react';
import {
  Bot, CheckCircle2, ClipboardCheck, Headphones, MessageSquareText, PhoneCall,
  RefreshCw, Save, Send, ShieldCheck, Sparkles, UserRoundCheck, XCircle,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailReceptionistGovernance, saveRetailReceptionistProfile, createRetailReceptionistAction,
  reviewRetailReceptionistAction, executeRetailReceptionistAction, prepareRetailCustomerCommunication,
  cancelRetailCustomerCommunication, markRetailCustomerCommunicationHandled,
} from '@/lib/retail/retail-receptionist.functions';

const tabs = [
  ['profile', 'Reception profile', Headphones],
  ['actions', 'Governed actions', ShieldCheck],
  ['communications', 'Customer communications', MessageSquareText],
];
const defaultProfile = {
  active: true, greeting: '', escalation_name: '', escalation_phone: '', default_channel: 'manual',
  allow_ai_proposals: false, knowledge_text: '', policies_text: '', notes: '',
};
const defaultAction = {
  action_type: 'create_booking', summary: '', appointment_id: '', call_id: '', order_id: '',
  customer_name: '', customer_phone: '', customer_email: '', starts_at: '', ends_at: '',
  location_id: '', service_item_id: '', staff_id: '', notes: '', channel: 'manual', purpose: 'general',
  recipient: '', subject: '', body: '', scheduled_for: '',
};
const defaultCommunication = { channel: 'manual', purpose: 'general', recipient: '', subject: '', body: '', scheduled_for: '', appointment_id: '', call_id: '', order_id: '' };

function toIso(value) { return value ? new Date(value).toISOString() : undefined; }
function dt(value) { return value ? new Date(value).toLocaleString() : '—'; }
function label(value) { return String(value || '').replaceAll('_', ' '); }
function compact(object) { return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== '' && value !== undefined && value !== null)); }

export default function RetailReceptionistGovernance() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('profile');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const workspace = workspaces.find((item) => item.id === selected);
  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((row) => row.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) { setData(null); return; }
    setData(await getRetailReceptionistGovernance({ data: { workspace_id: id } }));
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { await loadWorkspaces(); if (selected) await load(selected); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load receptionist governance.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load receptionist governance.')); }, [selected]);

  if (!workspaces.length) return null;

  return (
    <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-violet-300"><Bot className="h-4 w-4" /> AI receptionist governance</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Prepare, review, then execute</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Receptionist proposals can create or change bookings, flag callbacks, and prepare customer messages only after human approval. External SMS, email, WhatsApp and voice delivery remains provider-required until a real transport is connected.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">
            {workspaces.map((item) => <option key={item.id} value={item.id}>{item.business_name}</option>)}
          </select>
          <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}
      {data && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={ClipboardCheck} label="Proposed" value={data.dashboard.proposedActions} />
          <Metric icon={ShieldCheck} label="Approved" value={data.dashboard.approvedActions} />
          <Metric icon={XCircle} label="Failed" value={data.dashboard.failedActions} />
          <Metric icon={Send} label="Provider required" value={data.dashboard.providerRequired} />
          <Metric icon={UserRoundCheck} label="Manual handling" value={data.dashboard.manualRequired} />
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([id, text, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-violet-400/25 bg-violet-400/[.08] text-violet-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{text}</button>)}
        </div>
        <div className="mt-5">
          {tab === 'profile' && <ProfilePanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
          {tab === 'actions' && <ActionsPanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
          {tab === 'communications' && <CommunicationsPanel workspace={workspace} data={data} reload={() => load(selected)} busy={busy} setBusy={setBusy} setError={setError} />}
        </div>
      </>}
    </section>
  );
}

function ProfilePanel({ workspace, data, reload, busy, setBusy, setError }) {
  const initial = useMemo(() => data.profile ? {
    active: data.profile.active,
    greeting: data.profile.greeting || '',
    escalation_name: data.profile.escalation_name || '',
    escalation_phone: data.profile.escalation_phone || '',
    default_channel: data.profile.default_channel || 'manual',
    allow_ai_proposals: data.profile.allow_ai_proposals,
    knowledge_text: data.profile.knowledge?.notes || '',
    policies_text: data.profile.policies?.notes || '',
    notes: data.profile.notes || '',
  } : defaultProfile, [data.profile]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const save = async () => {
    setBusy(true); setError('');
    try {
      await saveRetailReceptionistProfile({ data: {
        workspace_id: workspace.id, active: form.active, greeting: form.greeting,
        escalation_name: form.escalation_name, escalation_phone: form.escalation_phone,
        default_channel: form.default_channel, allow_ai_proposals: form.allow_ai_proposals,
        knowledge: { notes: form.knowledge_text }, policies: { notes: form.policies_text }, notes: form.notes,
      } });
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save receptionist profile.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
    <Panel title="Reception operating profile" icon={Headphones}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Greeting" value={form.greeting} onChange={(value) => setForm({ ...form, greeting: value })} />
        <Select label="Preferred customer channel" value={form.default_channel} onChange={(value) => setForm({ ...form, default_channel: value })} options={['manual','sms','email','voice','whatsapp']} />
        <Field label="Escalation contact" value={form.escalation_name} onChange={(value) => setForm({ ...form, escalation_name: value })} />
        <Field label="Escalation phone" value={form.escalation_phone} onChange={(value) => setForm({ ...form, escalation_phone: value })} />
      </div>
      <Textarea label="Business knowledge / FAQs" value={form.knowledge_text} onChange={(value) => setForm({ ...form, knowledge_text: value })} />
      <Textarea label="Booking, returns and customer policies" value={form.policies_text} onChange={(value) => setForm({ ...form, policies_text: value })} />
      <Textarea label="Operator notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Toggle label="Reception automation active" checked={form.active} onChange={(value) => setForm({ ...form, active: value })} />
        <Toggle label="Allow trusted AI/provider proposals" checked={form.allow_ai_proposals} onChange={(value) => setForm({ ...form, allow_ai_proposals: value })} />
      </div>
      <button onClick={save} disabled={busy} className="mt-4 flex items-center gap-2 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save profile</button>
    </Panel>
    <Panel title="Governance contract" icon={ShieldCheck}>
      <div className="space-y-3 text-xs leading-5 text-zinc-400">
        <Rule title="Human approval is mandatory">Every business-side action enters the proposal queue. The database permanently enforces approval before execution.</Rule>
        <Rule title="Internal changes are atomic">Booking creation, rescheduling, cancellation and callback flags execute transactionally and are safe to retry.</Rule>
        <Rule title="External delivery is explicit">Prepared SMS, email, WhatsApp and voice messages remain provider-required until a real provider confirms delivery.</Rule>
        <Rule title="Voice Studio stays complementary">Speech/transcription intelligence can feed proposals later; it is not treated as a telephone carrier.</Rule>
      </div>
    </Panel>
  </div>;
}

function ActionsPanel({ workspace, data, reload, busy, setBusy, setError }) {
  const [form, setForm] = useState(defaultAction);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const create = async () => {
    setBusy(true); setError('');
    try {
      let payload = {};
      if (form.action_type === 'create_booking') payload = compact({ customer_name: form.customer_name, customer_phone: form.customer_phone, customer_email: form.customer_email, starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at), location_id: form.location_id, service_item_id: form.service_item_id, staff_id: form.staff_id, notes: form.notes });
      if (form.action_type === 'reschedule_booking') payload = compact({ starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at) });
      if (form.action_type === 'prepare_customer_message') payload = compact({ channel: form.channel, purpose: form.purpose, recipient: form.recipient, subject: form.subject, body: form.body, scheduled_for: toIso(form.scheduled_for) });
      await createRetailReceptionistAction({ data: {
        workspace_id: workspace.id,
        appointment_id: form.appointment_id || null,
        call_id: form.call_id || null,
        order_id: form.order_id || null,
        action_type: form.action_type,
        summary: form.summary,
        payload,
      } });
      setForm(defaultAction); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create receptionist proposal.'); }
    finally { setBusy(false); }
  };
  const review = async (id, decision) => {
    setBusy(true); setError('');
    try { await reviewRetailReceptionistAction({ data: { id, decision } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not review receptionist proposal.'); }
    finally { setBusy(false); }
  };
  const execute = async (id) => {
    setBusy(true); setError('');
    try { await executeRetailReceptionistAction({ data: { id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not execute receptionist action.'); await reload(); }
    finally { setBusy(false); }
  };
  const action = form.action_type;
  return <div className="grid gap-4 2xl:grid-cols-[.9fr_1.1fr]">
    <Panel title="Create governed proposal" icon={Sparkles}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Action" value={action} onChange={(value) => set('action_type', value)} options={['create_booking','reschedule_booking','cancel_booking','callback','prepare_customer_message']} />
        <Field label="Summary / reason" value={form.summary} onChange={(value) => set('summary', value)} />
      </div>
      {['reschedule_booking','cancel_booking','prepare_customer_message'].includes(action) && <Select label="Linked appointment" value={form.appointment_id} onChange={(value) => set('appointment_id', value)} options={data.appointments.map((item) => [item.id, `${item.customer_name} · ${dt(item.starts_at)}`])} allowBlank />}
      {['callback','prepare_customer_message'].includes(action) && <Select label="Linked call" value={form.call_id} onChange={(value) => set('call_id', value)} options={data.calls.map((item) => [item.id, `${item.customer_name || item.phone || 'Call'} · ${item.reason || item.status}`])} allowBlank />}
      {action === 'prepare_customer_message' && <Select label="Linked order" value={form.order_id} onChange={(value) => set('order_id', value)} options={data.orders.map((item) => [item.id, `${item.order_number} · ${item.customer_name || item.status}`])} allowBlank />}
      {action === 'create_booking' && <>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Customer name" value={form.customer_name} onChange={(value) => set('customer_name', value)} /><Field label="Phone" value={form.customer_phone} onChange={(value) => set('customer_phone', value)} /><Field label="Email" value={form.customer_email} onChange={(value) => set('customer_email', value)} /><Field label="Starts" type="datetime-local" value={form.starts_at} onChange={(value) => set('starts_at', value)} /><Field label="Ends" type="datetime-local" value={form.ends_at} onChange={(value) => set('ends_at', value)} /><Select label="Location" value={form.location_id} onChange={(value) => set('location_id', value)} options={data.locations.map((item) => [item.id, item.name])} allowBlank /><Select label="Service" value={form.service_item_id} onChange={(value) => set('service_item_id', value)} options={data.catalog.filter((item) => item.item_type === 'service').map((item) => [item.id, item.name])} allowBlank /><Select label="Staff" value={form.staff_id} onChange={(value) => set('staff_id', value)} options={data.staff.map((item) => [item.id, item.name])} allowBlank /></div>
        <Textarea label="Booking notes" value={form.notes} onChange={(value) => set('notes', value)} />
      </>}
      {action === 'reschedule_booking' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="New start" type="datetime-local" value={form.starts_at} onChange={(value) => set('starts_at', value)} /><Field label="New end" type="datetime-local" value={form.ends_at} onChange={(value) => set('ends_at', value)} /></div>}
      {action === 'prepare_customer_message' && <>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="Channel" value={form.channel} onChange={(value) => set('channel', value)} options={['manual','sms','email','voice','whatsapp']} /><Select label="Purpose" value={form.purpose} onChange={(value) => set('purpose', value)} options={['general','booking_confirmation','callback','order_update']} /><Field label="Recipient" value={form.recipient} onChange={(value) => set('recipient', value)} /><Field label="Subject" value={form.subject} onChange={(value) => set('subject', value)} /><Field label="Schedule for" type="datetime-local" value={form.scheduled_for} onChange={(value) => set('scheduled_for', value)} /></div>
        <Textarea label="Message" value={form.body} onChange={(value) => set('body', value)} />
      </>}
      <button onClick={create} disabled={busy || !form.summary.trim()} className="mt-4 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-50">Create proposal</button>
    </Panel>
    <Panel title="Human review queue" icon={ShieldCheck}>
      <div className="space-y-2">
        {!data.actions.length && <Empty text="No receptionist proposals yet." />}
        {data.actions.map((item) => <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{label(item.action_type)}</p><p className="mt-1 text-[11px] text-zinc-500">Requested by {label(item.requested_by)} · {dt(item.created_at)}</p></div><Status value={item.status} /></div>
          <p className="mt-2 text-xs leading-5 text-zinc-300">{item.summary}</p>
          {item.last_error && <p className="mt-2 rounded-lg bg-rose-400/[.05] px-2 py-1.5 text-[11px] text-rose-200">{item.last_error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {['proposed','failed'].includes(item.status) && <button onClick={() => review(item.id, 'approved')} disabled={busy} className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200">Approve</button>}
            {['proposed','approved','failed'].includes(item.status) && <button onClick={() => review(item.id, 'rejected')} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Reject</button>}
            {item.status === 'approved' && <button onClick={() => execute(item.id)} disabled={busy} className="rounded-lg bg-violet-400/10 px-2.5 py-1.5 text-[11px] text-violet-200">Execute approved action</button>}
          </div>
        </div>)}
      </div>
    </Panel>
  </div>;
}

function CommunicationsPanel({ workspace, data, reload, busy, setBusy, setError }) {
  const [form, setForm] = useState(defaultCommunication);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const prepare = async () => {
    setBusy(true); setError('');
    try {
      await prepareRetailCustomerCommunication({ data: {
        workspace_id: workspace.id, appointment_id: form.appointment_id || null, call_id: form.call_id || null, order_id: form.order_id || null,
        channel: form.channel, purpose: form.purpose, recipient: form.recipient, subject: form.subject, body: form.body, scheduled_for: toIso(form.scheduled_for),
      } });
      setForm(defaultCommunication); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare communication.'); }
    finally { setBusy(false); }
  };
  const act = async (fn, id, message) => {
    setBusy(true); setError('');
    try { await fn({ data: { id } }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : message); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 2xl:grid-cols-[.8fr_1.2fr]">
    <Panel title="Prepare customer communication" icon={MessageSquareText}>
      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-5 text-amber-100/80">Preparing a message does not send it. SMS, email, WhatsApp and voice remain provider-required. “Mark handled manually” records your own handling as an audit event.</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="Channel" value={form.channel} onChange={(value) => set('channel', value)} options={['manual','sms','email','voice','whatsapp']} /><Select label="Purpose" value={form.purpose} onChange={(value) => set('purpose', value)} options={['general','booking_confirmation','callback','order_update']} /><Field label="Recipient" value={form.recipient} onChange={(value) => set('recipient', value)} /><Field label="Subject" value={form.subject} onChange={(value) => set('subject', value)} /><Field label="Schedule for" type="datetime-local" value={form.scheduled_for} onChange={(value) => set('scheduled_for', value)} /></div>
      <Textarea label="Message" value={form.body} onChange={(value) => set('body', value)} />
      <button onClick={prepare} disabled={busy || !form.recipient.trim() || !form.body.trim()} className="mt-4 rounded-lg bg-violet-400/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-50">Prepare communication</button>
    </Panel>
    <Panel title="Communication audit queue" icon={PhoneCall}>
      <div className="space-y-2">
        {!data.communications.length && <Empty text="No prepared customer communications yet." />}
        {data.communications.map((item) => <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm text-white">{label(item.purpose)} · {label(item.channel)}</p><p className="mt-1 text-[11px] text-zinc-500">{item.recipient} · {dt(item.scheduled_for)}</p></div><Status value={item.status} /></div>
          {item.subject && <p className="mt-2 text-xs font-medium text-zinc-300">{item.subject}</p>}
          <p className="mt-1 text-xs leading-5 text-zinc-400">{item.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['draft','manual_required','provider_required'].includes(item.status) && <button onClick={() => act(markRetailCustomerCommunicationHandled, item.id, 'Could not record manual handling.')} disabled={busy} className="flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200"><CheckCircle2 className="h-3 w-3" />Mark handled manually</button>}
            {['draft','manual_required','provider_required'].includes(item.status) && <button onClick={() => act(cancelRetailCustomerCommunication, item.id, 'Could not cancel communication.')} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Cancel</button>}
          </div>
        </div>)}
      </div>
    </Panel>
  </div>;
}

function Panel({ title, icon: Icon, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">{title}</h3></div>{children}</div>; }
function Metric({ icon: Icon, label: text, value }) { return <div className="rounded-xl border border-white/[.06] bg-white/[.018] p-3"><div className="flex items-center gap-2 text-zinc-500"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wider">{text}</span></div><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>; }
function Field({ label: text, value, onChange, type = 'text' }) { return <label className="block text-[11px] text-zinc-500"><span>{text}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/[.08] bg-black/40 px-3 py-2 text-xs text-white outline-none" /></label>; }
function Textarea({ label: text, value, onChange }) { return <label className="mt-3 block text-[11px] text-zinc-500"><span>{text}</span><textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-white/[.08] bg-black/40 px-3 py-2 text-xs text-white outline-none" /></label>; }
function Select({ label: text, value, onChange, options, allowBlank = false }) { return <label className="block text-[11px] text-zinc-500"><span>{text}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/[.08] bg-black/50 px-3 py-2 text-xs text-white outline-none">{allowBlank && <option value="">None</option>}{options.map((option) => { const pair = Array.isArray(option) ? option : [option, labelize(option)]; return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>; })}</select></label>; }
function Toggle({ label: text, checked, onChange }) { return <label className="flex items-center justify-between gap-3 rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2 text-xs text-zinc-300"><span>{text}</span><input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} /></label>; }
function Status({ value }) { const style = value === 'processed' || value === 'manually_handled' || value === 'sent' ? 'text-emerald-200 bg-emerald-400/10' : value === 'failed' || value === 'rejected' ? 'text-rose-200 bg-rose-400/10' : value === 'approved' ? 'text-cyan-200 bg-cyan-400/10' : 'text-amber-200 bg-amber-400/10'; return <span className={`rounded-lg px-2 py-1 text-[10px] ${style}`}>{labelize(value)}</span>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/[.08] p-5 text-center text-xs text-zinc-600">{text}</div>; }
function Rule({ title, children }) { return <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><p className="font-medium text-zinc-200">{title}</p><p className="mt-1 text-zinc-500">{children}</p></div>; }
function labelize(value) { return String(value || '').replaceAll('_', ' '); }
