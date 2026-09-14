import { useEffect, useMemo, useState } from 'react';
import {
  Bot, CalendarClock, CalendarPlus, CheckCircle2, CircleX, Clock3, PhoneCall,
  RefreshCw, ShieldCheck, Sparkles, TriangleAlert, UserRoundCheck, XCircle,
} from 'lucide-react';
import { listRetailWorkspaces } from '@/lib/retail/retail-operations.functions';
import {
  getRetailReceptionistControl, proposeRetailCallAction, approveRetailCallAction,
  dismissRetailCallAction, executeRetailCallAction,
} from '@/lib/retail/retail-receptionist.functions';

const blank = {
  action_type: 'create_appointment', target_appointment_id: '', starts_at: '', ends_at: '',
  location_id: '', service_item_id: '', staff_id: '', customer_name: '', customer_phone: '', customer_email: '', note: '',
};
const actionLabels = {
  create_appointment: 'Book appointment', reschedule_appointment: 'Reschedule appointment',
  cancel_appointment: 'Cancel appointment', mark_follow_up: 'Mark follow-up', close_call: 'Close call record',
};

function when(value) { return value ? new Date(value).toLocaleString() : '—'; }
function toIso(value) { return value ? new Date(value).toISOString() : ''; }
function localInput(value) {
  if (!value) return '';
  const d = new Date(value); const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}
function statusClass(status) {
  if (status === 'executed') return 'border-emerald-300/15 bg-emerald-300/[.05] text-emerald-200';
  if (status === 'approved') return 'border-cyan-300/15 bg-cyan-300/[.05] text-cyan-200';
  if (status === 'failed') return 'border-rose-300/15 bg-rose-300/[.05] text-rose-200';
  if (status === 'dismissed') return 'border-white/[.06] bg-white/[.02] text-zinc-500';
  return 'border-amber-300/15 bg-amber-300/[.05] text-amber-200';
}

export default function RetailReceptionistControl() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [callId, setCallId] = useState('');
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const call = useMemo(() => data?.calls?.find((x) => x.id === callId), [data, callId]);
  const workspace = workspaces.find((w) => w.id === selected);

  const loadWorkspaces = async () => {
    const rows = await listRetailWorkspaces({ data: {} });
    setWorkspaces(rows);
    setSelected((current) => current && rows.some((x) => x.id === current) ? current : (rows[0]?.id || ''));
  };
  const load = async (id = selected) => {
    if (!id) return setData(null);
    const out = await getRetailReceptionistControl({ data: { workspace_id: id } });
    setData(out);
    setCallId((current) => current && out.calls.some((c) => c.id === current) ? current : (out.calls.find((c) => c.status !== 'closed')?.id || out.calls[0]?.id || ''));
  };
  const run = async (fn) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Receptionist action failed.'); }
    finally { setBusy(false); }
  };
  const refresh = () => run(async () => { await loadWorkspaces(); if (selected) await load(selected); });

  useEffect(() => { loadWorkspaces().catch((e) => setError(e instanceof Error ? e.message : 'Could not load Retail workspaces.')); }, []);
  useEffect(() => { if (selected) load(selected).catch((e) => setError(e instanceof Error ? e.message : 'Could not load receptionist control.')); }, [selected]);
  useEffect(() => {
    if (!call) return;
    setForm((current) => ({ ...current, customer_name: call.customer_name || '', customer_phone: call.phone || '', target_appointment_id: call.appointment_id || current.target_appointment_id }));
  }, [callId]);

  if (!workspaces.length) return null;

  const setAction = (action_type) => {
    const target = call?.appointment_id || '';
    const appointment = data?.appointments?.find((a) => a.id === target);
    setForm({
      ...blank, action_type, target_appointment_id: target,
      customer_name: call?.customer_name || '', customer_phone: call?.phone || '',
      starts_at: appointment ? localInput(appointment.starts_at) : '', ends_at: appointment ? localInput(appointment.ends_at) : '',
      location_id: appointment?.location_id || '', service_item_id: appointment?.service_item_id || '', staff_id: appointment?.staff_id || '',
    });
  };
  const setTarget = (id) => {
    const appointment = data.appointments.find((a) => a.id === id);
    setForm({ ...form, target_appointment_id: id, starts_at: appointment ? localInput(appointment.starts_at) : '', ends_at: appointment ? localInput(appointment.ends_at) : '', location_id: appointment?.location_id || '', service_item_id: appointment?.service_item_id || '', staff_id: appointment?.staff_id || '' });
  };

  const propose = () => run(async () => {
    if (!call) throw new Error('Select a saved call record first.');
    let payload = { note: form.note || undefined };
    let target_appointment_id = null;
    if (form.action_type === 'create_appointment') {
      payload = {
        customer_name: form.customer_name || undefined, customer_phone: form.customer_phone || undefined,
        customer_email: form.customer_email || undefined, starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at),
        location_id: form.location_id || null, service_item_id: form.service_item_id || null, staff_id: form.staff_id || null, note: form.note || undefined,
      };
    } else if (form.action_type === 'reschedule_appointment') {
      target_appointment_id = form.target_appointment_id;
      payload = { starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at), location_id: form.location_id || null, service_item_id: form.service_item_id || null, staff_id: form.staff_id || null, note: form.note || undefined };
    } else if (form.action_type === 'cancel_appointment') {
      target_appointment_id = form.target_appointment_id;
    }
    const saved = await proposeRetailCallAction({ data: {
      workspace_id: selected, call_id: call.id, action_type: form.action_type,
      target_appointment_id, payload, idempotency_key: crypto.randomUUID(),
    }});
    setNotice(`Action proposed: ${actionLabels[saved.action_type]}. It has not executed. Review and approve it below.`);
    await load(selected);
  });

  const approve = (id) => run(async () => { await approveRetailCallAction({ data: { action_id: id } }); setNotice('Action approved. It is still not executed until you choose Execute approved action.'); await load(selected); });
  const dismiss = (id) => run(async () => { await dismissRetailCallAction({ data: { action_id: id } }); setNotice('Action dismissed without changing the call or appointment.'); await load(selected); });
  const execute = (id) => run(async () => {
    const result = await executeRetailCallAction({ data: { action_id: id } });
    if (result.status === 'failed') setError(`Approved action did not execute: ${result.error || 'unknown error'}`);
    else setNotice('Approved receptionist action executed against the saved Retail records.');
    await load(selected);
  });

  const requiresTarget = ['reschedule_appointment','cancel_appointment'].includes(form.action_type);
  const requiresTimes = ['create_appointment','reschedule_appointment'].includes(form.action_type);
  const invalidProposal = !call || (requiresTarget && !form.target_appointment_id) || (requiresTimes && (!form.starts_at || !form.ends_at));

  return <section className="rounded-[28px] border border-white/[.08] bg-black/30 p-4 lg:p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-violet-300"><Bot className="h-4 w-4" /> Governed receptionist actions</div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Turn saved call records into approved booking actions</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">This control acts on call records already saved in Retail Hub. It does not answer, place or claim a phone call by itself. Booking, rescheduling and cancellation remain human-approved before Blackstar changes operational records.</p>
      </div>
      <div className="flex flex-wrap gap-2"><select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2 text-sm text-white outline-none">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.business_name}</option>)}</select><button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button></div>
    </div>

    {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.045] px-4 py-3 text-xs text-rose-200">{error}</div>}
    {notice && <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[.045] px-4 py-3 text-xs text-emerald-200">{notice}</div>}

    {data && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Open calls" value={data.dashboard.unresolvedCalls} icon={PhoneCall} />
        <Metric label="Follow-ups" value={data.dashboard.followUps} icon={Clock3} />
        <Metric label="Proposed" value={data.dashboard.proposedActions} icon={Sparkles} />
        <Metric label="Approved" value={data.dashboard.approvedActions} icon={ShieldCheck} />
        <Metric label="Executed" value={data.dashboard.executedActions} icon={CheckCircle2} />
        <Metric label="Failed" value={data.dashboard.failedActions} icon={TriangleAlert} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Panel title="Saved call queue" icon={PhoneCall}>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {!data.calls.length && <Empty text="No saved Retail call records yet." />}
            {data.calls.map((c) => <button key={c.id} onClick={() => setCallId(c.id)} className={`w-full rounded-xl border p-3 text-left transition ${callId === c.id ? 'border-violet-300/25 bg-violet-300/[.07]' : 'border-white/[.06] bg-white/[.02] hover:border-white/[.12]'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm text-white">{c.customer_name || c.phone || 'Unidentified caller'}</p><Status value={c.status} /></div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-zinc-500">{c.reason || c.summary || 'No call summary recorded.'}</p><p className="mt-2 text-[10px] uppercase tracking-[.11em] text-zinc-700">{c.source} · {c.direction} · {when(c.received_at)}</p></button>)}
          </div>
        </Panel>

        <Panel title="Propose an action" icon={UserRoundCheck}>
          {!call ? <Empty text="Select a saved call record." /> : <>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium text-white">{call.customer_name || 'Customer'} {call.phone ? <span className="font-normal text-zinc-500">· {call.phone}</span> : null}</p><p className="mt-1 text-xs text-zinc-500">{call.reason || 'No reason recorded'}</p></div><span className="rounded-lg border border-white/[.06] px-2 py-1 text-[10px] uppercase text-zinc-500">{call.source}</span></div>{call.summary && <p className="mt-3 text-xs leading-5 text-zinc-400">{call.summary}</p>}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(actionLabels).map(([id,label]) => <button key={id} onClick={() => setAction(id)} className={`rounded-lg border px-2.5 py-2 text-xs ${form.action_type === id ? 'border-violet-300/25 bg-violet-300/[.08] text-violet-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500'}`}>{label}</button>)}</div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {requiresTarget && <Select label="Target appointment" value={form.target_appointment_id} onChange={setTarget} options={data.appointments.filter((a) => a.status !== 'completed').map((a) => [a.id, `${a.customer_name} · ${when(a.starts_at)} · ${a.status}`])} />}
              {form.action_type === 'create_appointment' && <><Field label="Customer name" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} /><Field label="Phone" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} /><Field label="Email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} /></>}
              {requiresTimes && <><Field label="Starts" type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} /><Field label="Ends" type="datetime-local" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })} /><Select label="Location" value={form.location_id} onChange={(v) => setForm({ ...form, location_id: v })} options={data.locations.map((x) => [x.id,x.name])} allowEmpty /><Select label="Service" value={form.service_item_id} onChange={(v) => setForm({ ...form, service_item_id: v })} options={data.services.map((x) => [x.id,x.name])} allowEmpty /><Select label="Staff" value={form.staff_id} onChange={(v) => setForm({ ...form, staff_id: v })} options={data.staff.map((x) => [x.id,`${x.name}${x.role ? ` · ${x.role}` : ''}`])} allowEmpty /></>}
              <div className="sm:col-span-2"><Field label="Operator note" value={form.note} onChange={(v) => setForm({ ...form, note: v })} /></div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-xs leading-5 text-amber-100/80"><ShieldCheck className="mr-2 inline h-4 w-4" />Proposal only. Creating this item does not change the appointment or call. A separate approval and execution step is required.</div>
            <button onClick={propose} disabled={busy || invalidProposal} className="mt-4 rounded-lg border border-violet-300/20 bg-violet-300/[.07] px-3 py-2 text-xs text-violet-100 disabled:opacity-40">Propose {actionLabels[form.action_type].toLowerCase()}</button>
          </>}
        </Panel>
      </div>

      <div className="mt-4"><Panel title="Approval & execution queue" icon={ShieldCheck}>
        <div className="grid gap-3 xl:grid-cols-2">
          {!data.actions.length && <Empty text="No receptionist actions have been proposed." />}
          {data.actions.map((action) => { const sourceCall = data.calls.find((c) => c.id === action.call_id); return <div key={action.id} className={`rounded-xl border p-3 ${statusClass(action.status)}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{actionLabels[action.action_type] || action.action_type}</p><p className="mt-1 text-[11px] text-zinc-500">{sourceCall?.customer_name || sourceCall?.phone || 'Call record'} · proposed {when(action.proposed_at)}</p></div><Status value={action.status} /></div>{action.last_error && <p className="mt-2 rounded-lg bg-rose-300/[.05] p-2 text-[11px] text-rose-200">{action.last_error}</p>}<ActionSummary action={action} data={data} /><div className="mt-3 flex flex-wrap gap-2">{action.status === 'proposed' && <><button onClick={() => approve(action.id)} disabled={busy} className="rounded-lg bg-emerald-300/10 px-2.5 py-1.5 text-[11px] text-emerald-200">Approve</button><button onClick={() => dismiss(action.id)} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Dismiss</button></>}{action.status === 'approved' && <><button onClick={() => execute(action.id)} disabled={busy} className="rounded-lg border border-cyan-300/20 bg-cyan-300/[.08] px-2.5 py-1.5 text-[11px] font-medium text-cyan-100">Execute approved action</button><button onClick={() => dismiss(action.id)} disabled={busy} className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[11px] text-zinc-400">Dismiss</button></>}</div></div>; })}
        </div>
      </Panel></div>
    </>}
  </section>;
}

function ActionSummary({ action, data }) {
  const target = data.appointments.find((a) => a.id === action.target_appointment_id);
  const p = action.payload || {};
  return <div className="mt-2 text-[11px] leading-5 text-zinc-500">{target && <p>Target: {target.customer_name} · {when(target.starts_at)}</p>}{p.starts_at && <p>Requested time: {when(p.starts_at)} → {when(p.ends_at)}</p>}{p.note && <p>Note: {p.note}</p>}{action.status === 'executed' && action.result && <p className="text-emerald-300/80">Execution saved successfully.</p>}</div>;
}
function Panel({ title, icon: Icon, children }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">{Icon && <Icon className="h-4 w-4 text-violet-300" />}{title}</div>{children}</div>; }
function Metric({ label, value, icon: Icon }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.13em] text-zinc-600">{label}</span><Icon className="h-3.5 w-3.5 text-zinc-600" /></div><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>; }
function Status({ value }) { return <span className="rounded-md border border-white/[.06] bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[.1em] text-zinc-400">{String(value || '').replaceAll('_',' ')}</span>; }
function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/[.08] p-4 text-xs text-zinc-600">{text}</div>; }
function Field({ label, value, onChange, type='text' }) { return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-sm text-white outline-none" /></label>; }
function Select({ label, value, onChange, options, allowEmpty=false }) { return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-[.12em] text-zinc-600">{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-black/40 px-3 py-2 text-sm text-white outline-none">{allowEmpty && <option value="">None</option>}{!allowEmpty && !value && <option value="">Select…</option>}{options.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
