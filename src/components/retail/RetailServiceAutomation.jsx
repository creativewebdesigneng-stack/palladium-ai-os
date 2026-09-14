import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bot, CheckCircle2, ExternalLink, Loader2, MessageSquareText, PhoneCall, Play, RotateCcw, Save, ShieldCheck, XCircle } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import {
  executeRetailReceptionAction,
  getRetailServiceAutomation,
  queueRetailReceptionAction,
  reviewRetailReceptionAction,
  retryRetailReceptionAction,
  saveRetailCustomerCommunication,
  saveRetailReceptionProfile,
} from '@/lib/retail/retail-service-automation.functions';

const ACTION_LABELS = {
  create_booking: 'Create booking',
  reschedule_booking: 'Reschedule booking',
  cancel_booking: 'Cancel booking',
  create_followup: 'Create follow-up',
  send_communication: 'Send communication',
  escalate_to_staff: 'Escalate to staff',
};
const CHANNELS = ['in_app', 'sms', 'email', 'whatsapp', 'voice'];
const PURPOSES = ['appointment_confirmation', 'missed_call', 'followup', 'order_update', 'shipping_update', 'custom'];

const emptyProfile = (workspaceId) => ({
  workspace_id: workspaceId,
  location_id: '',
  name: 'Retail receptionist',
  active: true,
  greeting: 'Hello, thanks for contacting us. How can I help today?',
  after_hours_message: 'We are currently closed. I can still take your details and arrange a follow-up.',
  business_hours: {}, knowledge: {}, policies: {},
  escalation_name: '', escalation_phone: '',
  voice_studio_voice: 'alloy', voice_studio_instructions: 'Warm, clear, concise and professional.',
  answer_hours: true, answer_location: true, answer_services: true, answer_pricing: true,
  answer_stock: true, answer_orders: true, answer_shipping: true, answer_policies: true,
  can_create_bookings: false, can_reschedule_bookings: false, can_cancel_bookings: false,
  can_create_followups: true, can_send_communications: false,
});
const emptyCommunication = (workspaceId) => ({
  workspace_id: workspaceId, channel: 'in_app', purpose: 'followup', recipient: '', subject: '', body: '', status: 'draft',
});

export default function RetailServiceAutomation({ workspaceId, initialData }) {
  const getOverview = useServerFn(getRetailServiceAutomation);
  const saveProfileFn = useServerFn(saveRetailReceptionProfile);
  const queueActionFn = useServerFn(queueRetailReceptionAction);
  const reviewActionFn = useServerFn(reviewRetailReceptionAction);
  const executeActionFn = useServerFn(executeRetailReceptionAction);
  const retryActionFn = useServerFn(retryRetailReceptionAction);
  const saveCommunicationFn = useServerFn(saveRetailCustomerCommunication);

  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState('reception');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(initialData?.profiles?.[0]?.id ?? 'new');
  const selectedProfile = data?.profiles?.find((item) => item.id === selectedProfileId);
  const [profileDraft, setProfileDraft] = useState(selectedProfile ?? emptyProfile(workspaceId));
  const [communication, setCommunication] = useState(emptyCommunication(workspaceId));
  const [action, setAction] = useState({ action_type: 'create_followup', summary: '', call_id: '', appointment_id: '', customer_name: '', phone: '', starts_at: '' });

  const voiceCapability = data?.voice?.openai;
  const pending = useMemo(() => (data?.actions ?? []).filter((item) => item.status === 'pending_review'), [data]);
  const externalReady = useMemo(() => (data?.communications ?? []).filter((item) => item.channel !== 'in_app' && item.status === 'ready'), [data]);

  async function refresh() {
    const next = await getOverview({ data: { workspace_id: workspaceId } });
    setData(next);
    return next;
  }
  async function run(key, fn) {
    setBusy(key); setError(null);
    try { return await fn(); }
    catch (err) { setError(err); throw err; }
    finally { setBusy(''); }
  }
  function chooseProfile(id) {
    setSelectedProfileId(id);
    const found = data?.profiles?.find((item) => item.id === id);
    setProfileDraft(found ?? emptyProfile(workspaceId));
  }
  async function saveProfile() {
    await run('profile', async () => {
      const saved = await saveProfileFn({ data: { ...profileDraft, workspace_id: workspaceId } });
      const next = await refresh();
      setSelectedProfileId(saved.id);
      setProfileDraft(next.profiles.find((item) => item.id === saved.id) ?? saved);
    });
  }
  async function queueAction() {
    const payload = {};
    if (action.customer_name) payload.customer_name = action.customer_name;
    if (action.phone) payload.phone = action.phone;
    if (action.starts_at) payload.starts_at = new Date(action.starts_at).toISOString();
    await run('queue-action', async () => {
      await queueActionFn({ data: {
        workspace_id: workspaceId,
        profile_id: selectedProfileId === 'new' ? null : selectedProfileId,
        call_id: action.call_id || null,
        appointment_id: action.appointment_id || null,
        source: 'staff',
        action_type: action.action_type,
        summary: action.summary || `${ACTION_LABELS[action.action_type]} requested from Retail service automation.`,
        payload,
      } });
      setAction((current) => ({ ...current, summary: '', customer_name: '', phone: '', starts_at: '' }));
      await refresh();
    });
  }
  async function review(id, decision) {
    await run(`review-${id}`, async () => { await reviewActionFn({ data: { id, decision } }); await refresh(); });
  }
  async function execute(id) {
    await run(`execute-${id}`, async () => { await executeActionFn({ data: { id } }); await refresh(); });
  }
  async function retry(id) {
    await run(`retry-${id}`, async () => { await retryActionFn({ data: { id } }); await refresh(); });
  }
  async function saveCommunication(status = 'draft') {
    await run('communication', async () => {
      await saveCommunicationFn({ data: { ...communication, workspace_id: workspaceId, status } });
      setCommunication(emptyCommunication(workspaceId));
      await refresh();
    });
  }
  async function queueCommunicationSend() {
    await run('communication-send', async () => {
      await queueActionFn({ data: {
        workspace_id: workspaceId,
        profile_id: selectedProfileId === 'new' ? null : selectedProfileId,
        source: 'staff', action_type: 'send_communication',
        summary: `Send ${communication.channel} ${communication.purpose.replaceAll('_', ' ')} to ${communication.recipient}`,
        payload: { channel: communication.channel, purpose: communication.purpose, recipient: communication.recipient, subject: communication.subject, body: communication.body },
      } });
      await refresh();
      setTab('actions');
    });
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-300/10 bg-[linear-gradient(145deg,rgba(14,11,20,.9),rgba(6,6,10,.96))] p-5 shadow-[0_28px_90px_rgba(0,0,0,.28)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.23em] text-violet-300/65">Retail customer intelligence</p><h2 className="mt-1 text-lg font-semibold text-white">AI receptionist & service automation</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Configure what Blackstar may answer, route customer requests through an approval queue, reuse Voice Studio for speech, and keep provider delivery truthful.</p></div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]"><Metric value={pending.length} label="Review" /><Metric value={externalReady.length} label="Provider wait" /><Metric value={data?.profiles?.length ?? 0} label="Profiles" /></div>
      </div>
      {error && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
      <div className="mt-5 flex flex-wrap gap-2">{[['reception','Receptionist',PhoneCall],['actions','Governed actions',ShieldCheck],['communications','Communications',MessageSquareText]].map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${tab===id?'border-violet-300/25 bg-violet-400/[.10] text-violet-100':'border-white/[.06] bg-black/20 text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

      {tab === 'reception' && <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">Reception profile</h3><p className="mt-1 text-[11px] text-zinc-600">One global or location-specific policy profile. Booking reminders continue through the existing reminder worker.</p></div><select value={selectedProfileId} onChange={(e) => chooseProfile(e.target.value)} className="retail-input h-9 max-w-60"><option value="new">New profile</option>{(data?.profiles ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Profile name"><input className="retail-input" value={profileDraft.name} onChange={(e)=>setProfileDraft({...profileDraft,name:e.target.value})} /></Field><Field label="Location"><select className="retail-input" value={profileDraft.location_id ?? ''} onChange={(e)=>setProfileDraft({...profileDraft,location_id:e.target.value})}><option value="">All locations</option>{(data?.locations ?? []).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Escalation contact"><input className="retail-input" value={profileDraft.escalation_name ?? ''} onChange={(e)=>setProfileDraft({...profileDraft,escalation_name:e.target.value})} placeholder="Manager / front desk" /></Field><Field label="Escalation phone"><input className="retail-input" value={profileDraft.escalation_phone ?? ''} onChange={(e)=>setProfileDraft({...profileDraft,escalation_phone:e.target.value})} /></Field></div>
          <Field label="Greeting" className="mt-3"><textarea className="retail-input min-h-20 py-2" value={profileDraft.greeting} onChange={(e)=>setProfileDraft({...profileDraft,greeting:e.target.value})} /></Field><Field label="After-hours message" className="mt-3"><textarea className="retail-input min-h-20 py-2" value={profileDraft.after_hours_message} onChange={(e)=>setProfileDraft({...profileDraft,after_hours_message:e.target.value})} /></Field>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[['answer_hours','Opening hours'],['answer_location','Locations'],['answer_services','Services'],['answer_pricing','Pricing'],['answer_stock','Stock'],['answer_orders','Orders'],['answer_shipping','Shipping'],['answer_policies','Policies']].map(([key,label])=><Toggle key={key} label={label} checked={profileDraft[key]} onChange={(checked)=>setProfileDraft({...profileDraft,[key]:checked})} />)}</div>
          <div className="mt-4 border-t border-white/[.06] pt-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-500">Side-effect permissions</p><p className="mt-1 text-[11px] text-zinc-600">Permission enables proposal execution only after an action is explicitly approved.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[['can_create_bookings','Create bookings'],['can_reschedule_bookings','Reschedule bookings'],['can_cancel_bookings','Cancel bookings'],['can_create_followups','Create follow-ups'],['can_send_communications','Send communications']].map(([key,label])=><Toggle key={key} label={label} checked={profileDraft[key]} onChange={(checked)=>setProfileDraft({...profileDraft,[key]:checked})} />)}</div></div>
          <button onClick={saveProfile} disabled={busy==='profile'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">{busy==='profile'?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save receptionist profile</button>
        </div>
        <div className="space-y-4"><div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-semibold text-white">Voice Studio bridge</h3></div><p className="mt-2 text-[11px] leading-5 text-zinc-500">Retail reuses Blackstar Voice Studio for speech synthesis/transcription. It does not pretend TTS is a telephone carrier.</p><div className={`mt-3 rounded-xl border p-3 text-xs ${voiceCapability?.configured?'border-emerald-400/15 bg-emerald-400/[.04] text-emerald-200':'border-amber-400/15 bg-amber-400/[.04] text-amber-200'}`}>{voiceCapability?.configured?'Voice Studio provider configured':'Voice Studio provider requires configuration'}</div><Field label="Voice" className="mt-3"><select className="retail-input" value={profileDraft.voice_studio_voice} onChange={(e)=>setProfileDraft({...profileDraft,voice_studio_voice:e.target.value})}>{(voiceCapability?.voices ?? ['alloy','coral','nova','sage']).map((voice)=><option key={voice} value={voice}>{voice}</option>)}</select></Field><Field label="Voice instructions" className="mt-3"><textarea className="retail-input min-h-20 py-2" value={profileDraft.voice_studio_instructions ?? ''} onChange={(e)=>setProfileDraft({...profileDraft,voice_studio_instructions:e.target.value})}/></Field><a href="/voice-studio" className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200">Open Voice Studio <ExternalLink className="h-3.5 w-3.5"/></a></div><ProviderTruth data={data?.externalDelivery}/></div>
      </div>}

      {tab === 'actions' && <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><h3 className="text-sm font-semibold text-white">Create governed request</h3><p className="mt-1 text-[11px] text-zinc-600">Useful for staff, web, Voice Studio or future provider adapters. Every side effect starts pending review.</p><Field label="Action" className="mt-4"><select className="retail-input" value={action.action_type} onChange={(e)=>setAction({...action,action_type:e.target.value})}>{Object.entries(ACTION_LABELS).filter(([key])=>key!=='send_communication').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>{['reschedule_booking','cancel_booking'].includes(action.action_type)&&<Field label="Appointment" className="mt-3"><select className="retail-input" value={action.appointment_id} onChange={(e)=>setAction({...action,appointment_id:e.target.value})}><option value="">Choose appointment</option>{(data?.appointments ?? []).map((item)=><option key={item.id} value={item.id}>{item.customer_name} · {new Date(item.starts_at).toLocaleString('en-GB')}</option>)}</select></Field>}{['create_followup','escalate_to_staff'].includes(action.action_type)&&<Field label="Existing call (optional)" className="mt-3"><select className="retail-input" value={action.call_id} onChange={(e)=>setAction({...action,call_id:e.target.value})}><option value="">Create new follow-up record</option>{(data?.calls ?? []).map((item)=><option key={item.id} value={item.id}>{item.customer_name || item.phone || 'Call'} · {item.reason || item.status}</option>)}</select></Field>}{action.action_type==='create_booking'&&<><Field label="Customer name" className="mt-3"><input className="retail-input" value={action.customer_name} onChange={(e)=>setAction({...action,customer_name:e.target.value})}/></Field><Field label="Phone" className="mt-3"><input className="retail-input" value={action.phone} onChange={(e)=>setAction({...action,phone:e.target.value})}/></Field></>}{['create_booking','reschedule_booking'].includes(action.action_type)&&<Field label="New date/time" className="mt-3"><input type="datetime-local" className="retail-input" value={action.starts_at} onChange={(e)=>setAction({...action,starts_at:e.target.value})}/></Field>}<Field label="Reason / summary" className="mt-3"><textarea className="retail-input min-h-24 py-2" value={action.summary} onChange={(e)=>setAction({...action,summary:e.target.value})}/></Field><button onClick={queueAction} disabled={busy==='queue-action'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">{busy==='queue-action'?<Loader2 className="h-4 w-4 animate-spin"/>:<ShieldCheck className="h-4 w-4"/>}Queue for review</button></div>
        <ActionQueue actions={data?.actions ?? []} busy={busy} onReview={review} onExecute={execute} onRetry={retry}/>
      </div>}

      {tab === 'communications' && <div className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><h3 className="text-sm font-semibold text-white">Customer communication</h3><p className="mt-1 text-[11px] text-zinc-600">Draft messages here. A send request goes through the governed action queue. External channels are never marked sent without a provider.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Channel"><select className="retail-input" value={communication.channel} onChange={(e)=>setCommunication({...communication,channel:e.target.value})}>{CHANNELS.map((item)=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></Field><Field label="Purpose"><select className="retail-input" value={communication.purpose} onChange={(e)=>setCommunication({...communication,purpose:e.target.value})}>{PURPOSES.map((item)=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></Field></div><Field label="Recipient" className="mt-3"><input className="retail-input" value={communication.recipient} onChange={(e)=>setCommunication({...communication,recipient:e.target.value})} placeholder={communication.channel==='email'?'customer@example.com':'Customer destination'} /></Field><Field label="Subject" className="mt-3"><input className="retail-input" value={communication.subject} onChange={(e)=>setCommunication({...communication,subject:e.target.value})}/></Field><Field label="Message" className="mt-3"><textarea className="retail-input min-h-28 py-2" value={communication.body} onChange={(e)=>setCommunication({...communication,body:e.target.value})}/></Field><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>saveCommunication('draft')} disabled={!communication.recipient||!communication.body||busy==='communication'} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40"><Save className="h-3.5 w-3.5"/>Save draft</button><button onClick={queueCommunicationSend} disabled={!communication.recipient||!communication.body||busy==='communication-send'} className="inline-flex items-center gap-2 rounded-xl bg-violet-300 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5"/>Queue governed send</button></div></div>
        <CommunicationLedger communications={data?.communications ?? []}/>
      </div>}
      <style>{`.retail-input{width:100%;border-radius:.75rem;border:1px solid rgba(196,181,253,.1);background:rgba(0,0,0,.3);padding:.58rem .72rem;font-size:.75rem;color:white;outline:none}.retail-input:focus{border-color:rgba(196,181,253,.35);box-shadow:0 0 0 3px rgba(139,92,246,.04)}.retail-input::placeholder{color:rgb(82 82 91)}`}</style>
    </section>
  );
}

function Field({ label, className='', children }) { return <label className={className}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }) { return <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 px-3 py-2 text-[11px] text-zinc-400"><span>{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={(e)=>onChange(e.target.checked)} className="accent-violet-400"/></label>; }
function Metric({ value, label }) { return <div className="rounded-xl border border-white/[.06] bg-black/25 px-3 py-2"><div className="text-sm font-semibold text-white">{value}</div><div className="text-[8px] uppercase tracking-[.12em] text-zinc-600">{label}</div></div>; }
function ProviderTruth({ data }) { return <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[.025] p-4"><h3 className="text-sm font-semibold text-white">External delivery</h3><p className="mt-1 text-[11px] leading-5 text-zinc-600">Provider adapters are intentionally truthful. Until configured and verified, requests stay unsent.</p><div className="mt-3 grid grid-cols-2 gap-2">{['sms','email','whatsapp','voice'].map((key)=><div key={key} className="rounded-lg border border-white/[.05] bg-black/20 px-2.5 py-2 text-[10px] text-zinc-500"><span className="capitalize">{key}</span><span className="float-right text-amber-300">{data?.[key]?'configured':'not configured'}</span></div>)}</div></div>; }
function ActionQueue({ actions, busy, onReview, onExecute, onRetry }) { return <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Governed action queue</h3><p className="mt-1 text-[11px] text-zinc-600">Approval and execution are distinct states. Failed actions can only be cloned for retry when no provider acceptance evidence exists.</p></div><ShieldCheck className="h-4 w-4 text-violet-300"/></div><div className="mt-4 max-h-[620px] space-y-2 overflow-auto pr-1">{actions.length?actions.map((item)=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/25 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-medium text-zinc-200">{ACTION_LABELS[item.action_type] ?? item.action_type}</p><p className="mt-1 text-[10px] text-zinc-600">{item.summary}</p></div><Status value={item.status}/></div>{item.last_error&&<p className="mt-2 rounded-lg bg-rose-400/[.05] px-2 py-1.5 text-[10px] text-rose-300">{item.last_error}</p>}<div className="mt-3 flex flex-wrap gap-2">{item.status==='pending_review'&&<><button onClick={()=>onReview(item.id,'approved')} disabled={busy===`review-${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/15 px-2.5 py-1.5 text-[10px] text-emerald-300"><CheckCircle2 className="h-3 w-3"/>Approve</button><button onClick={()=>onReview(item.id,'dismissed')} disabled={busy===`review-${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/15 px-2.5 py-1.5 text-[10px] text-rose-300"><XCircle className="h-3 w-3"/>Dismiss</button></>}{item.status==='approved'&&<button onClick={()=>onExecute(item.id)} disabled={busy===`execute-${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-violet-300 px-2.5 py-1.5 text-[10px] font-semibold text-black">{busy===`execute-${item.id}`?<Loader2 className="h-3 w-3 animate-spin"/>:<Play className="h-3 w-3"/>}Execute approved action</button>}{item.status==='failed'&&<button onClick={()=>onRetry(item.id)} disabled={busy===`retry-${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/15 px-2.5 py-1.5 text-[10px] text-amber-200">{busy===`retry-${item.id}`?<Loader2 className="h-3 w-3 animate-spin"/>:<RotateCcw className="h-3 w-3"/>}Queue safe retry</button>}</div></div>):<p className="rounded-xl border border-dashed border-white/[.07] p-8 text-center text-xs text-zinc-600">No receptionist actions yet.</p>}</div></div>; }
function CommunicationLedger({ communications }) { return <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><h3 className="text-sm font-semibold text-white">Communication ledger</h3><p className="mt-1 text-[11px] text-zinc-600">Provider acceptance, callback status and final delivery evidence are shown separately so “sent” is never confused with confirmed delivery.</p><div className="mt-4 max-h-[620px] space-y-2 overflow-auto pr-1">{communications.length?communications.map((item)=>{ const meta=item.metadata&&typeof item.metadata==='object'?item.metadata:{}; return <div key={item.id} className="rounded-xl border border-white/[.06] bg-black/25 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-zinc-300">{item.channel.replaceAll('_',' ')} · {item.purpose.replaceAll('_',' ')}</p><Status value={item.status}/></div><p className="mt-1 text-[10px] text-zinc-600">{item.recipient}</p><p className="mt-2 line-clamp-2 text-[11px] leading-5 text-zinc-400">{item.body}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-zinc-600">{item.provider&&<span>Provider: {item.provider}</span>}{item.provider_message_id&&<span>Provider ID: {item.provider_message_id}</span>}{meta.provider_status&&<span>Status: {String(meta.provider_status).replaceAll('_',' ')}</span>}{item.sent_at&&<span>Accepted: {new Date(item.sent_at).toLocaleString('en-GB')}</span>}{item.delivered_at&&<span className="text-emerald-300">Delivered: {new Date(item.delivered_at).toLocaleString('en-GB')}</span>}{meta.delivery_confirmed===false&&item.status==='sent'&&<span className="text-amber-300">Delivery pending confirmation</span>}</div>{item.last_error&&<p className="mt-2 text-[10px] text-amber-300">{item.last_error}</p>}</div>}):<p className="rounded-xl border border-dashed border-white/[.07] p-8 text-center text-xs text-zinc-600">No customer communications yet.</p>}</div></div>; }
function Status({ value }) { const good=['executed','sent','approved'].includes(value); const bad=['failed','dismissed','cancelled'].includes(value); return <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-[.1em] ${good?'border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300':bad?'border-rose-400/15 bg-rose-400/[.05] text-rose-300':'border-amber-400/15 bg-amber-400/[.05] text-amber-300'}`}>{String(value).replaceAll('_',' ')}</span>; }
