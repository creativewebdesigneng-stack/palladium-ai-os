import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BellRing, CheckCircle2, MessageSquareText, PhoneCall, ShieldCheck, Smartphone, Volume2 } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import {
  beginCommunicationPhoneVerification,
  confirmCommunicationPhoneVerification,
  getCommunicationsOverview,
  saveCommunicationPreferences,
  saveCommunicationRecipient,
  sendCommunicationPhonePush,
  sendCommunicationSms,
  startCommunicationAiCall,
} from '@/lib/communications/communications.functions';

const PURPOSES = [
  ['project_update', 'Project update'],
  ['agent_update', 'Agent update'],
  ['business_update', 'Business update'],
  ['approval', 'Approval'],
  ['reminder', 'Reminder'],
  ['custom', 'Custom'],
];

function Toggle({ checked, onChange, label, detail }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] px-3.5 py-3 text-left hover:bg-white/[.045]">
      <span><span className="block text-sm font-medium text-white">{label}</span>{detail && <span className="mt-0.5 block text-[11px] text-zinc-400">{detail}</span>}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-violet-600' : 'bg-zinc-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} /></span>
    </button>
  );
}

function useActionMutation({ mutationFn, successTitle, onRefresh, onFailure }) {
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast({ title: successTitle });
      onRefresh();
      return result;
    },
    onError: onFailure,
  });
}

export default function PhoneCommunications() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getCommunicationsOverview);
  const savePrefsFn = useServerFn(saveCommunicationPreferences);
  const saveRecipientFn = useServerFn(saveCommunicationRecipient);
  const beginVerifyFn = useServerFn(beginCommunicationPhoneVerification);
  const confirmVerifyFn = useServerFn(confirmCommunicationPhoneVerification);
  const pushFn = useServerFn(sendCommunicationPhonePush);
  const smsFn = useServerFn(sendCommunicationSms);
  const callFn = useServerFn(startCommunicationAiCall);

  const { data, isLoading, error } = useQuery({ queryKey: ['phone-communications'], queryFn: () => overviewFn({ data: {} }), retry: false });
  const [prefs, setPrefs] = useState(null);
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('My mobile');
  const [smsConsent, setSmsConsent] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [purpose, setPurpose] = useState('project_update');
  const [smsBody, setSmsBody] = useState('Blackstar update: your requested project status is ready to review.');
  const [callObjective, setCallObjective] = useState('Give me a concise update on my current projects, live agents, workflows and anything that needs my attention.');
  const [pushTitle, setPushTitle] = useState('Blackstar project update');
  const [pushBody, setPushBody] = useState('Your Blackstar workspace has an update ready to review.');

  useEffect(() => { if (data?.preferences) setPrefs(data.preferences); }, [data?.preferences]);
  useEffect(() => { if (!selectedId && data?.recipients?.length) setSelectedId(data.recipients.find((r) => !r.disabled_at)?.id || ''); }, [data?.recipients, selectedId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['phone-communications'] });
  const fail = (e) => { console.error('[phone-communications]', e); toast({ title: 'Phone communication failed', description: friendlyMessage(e), variant: 'destructive' }); };

  const savePrefs = useActionMutation({ mutationFn: () => savePrefsFn({ data: prefs }), successTitle: 'Communication preferences saved', onRefresh: refresh, onFailure: fail });
  const saveRecipient = useActionMutation({ mutationFn: () => saveRecipientFn({ data: { label, phone_e164: phone, sms_consent: smsConsent, voice_consent: voiceConsent } }), successTitle: 'Mobile number saved', onRefresh: refresh, onFailure: fail });
  const beginVerify = useActionMutation({ mutationFn: () => beginVerifyFn({ data: { recipient_id: selectedId } }), successTitle: 'Verification code sent', onRefresh: refresh, onFailure: fail });
  const confirmVerify = useActionMutation({ mutationFn: () => confirmVerifyFn({ data: { recipient_id: selectedId, code: verifyCode } }), successTitle: 'Mobile number verified', onRefresh: refresh, onFailure: fail });
  const sendPush = useActionMutation({ mutationFn: () => pushFn({ data: { title: pushTitle, body: pushBody, purpose } }), successTitle: 'Phone notification sent', onRefresh: refresh, onFailure: fail });
  const sendSms = useActionMutation({ mutationFn: () => smsFn({ data: { recipient_id: selectedId, purpose, body: smsBody } }), successTitle: 'SMS accepted by provider', onRefresh: refresh, onFailure: fail });
  const startCall = useActionMutation({ mutationFn: () => callFn({ data: { recipient_id: selectedId, purpose, objective: callObjective } }), successTitle: 'Blackstar AI call started', onRefresh: refresh, onFailure: fail });

  const selected = useMemo(() => data?.recipients?.find((r) => r.id === selectedId), [data?.recipients, selectedId]);
  const caps = data?.capabilities ?? {};

  if (isLoading || !prefs) return <div className="space-y-4"><div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" /><div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" /></div>;
  if (error) return <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-5 text-sm text-rose-100">{friendlyMessage(error)}</div>;

  return (
    <>
      <PageHeader eyebrow="Mobile intelligence" title="Phone & Voice" description="Let Blackstar notify, text and call your verified mobile about projects, agents, workflows and business activity." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Smartphone, 'Phone push', caps.phone_push, `${data.phone_push_endpoints?.length ?? 0} endpoint${data.phone_push_endpoints?.length === 1 ? '' : 's'}`],
          [MessageSquareText, 'SMS', caps.sms, caps.sms ? 'Twilio connected' : 'Provider not configured'],
          [PhoneCall, 'AI calls', caps.ai_voice_calls, caps.ai_voice_calls ? 'Interactive calling ready' : 'Voice provider or HTTPS origin missing'],
          [ShieldCheck, 'Verification', caps.phone_verification, caps.phone_verification ? 'Twilio Verify ready' : 'Verify service not configured'],
        ].map(([Icon, title, ready, detail]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><span className="text-sm font-semibold text-white">{title}</span><span className={`ml-auto h-2 w-2 rounded-full ${ready ? 'bg-emerald-400' : 'bg-amber-400'}`} /></div><p className="mt-2 text-xs text-zinc-400">{detail}</p></div>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <h2 className="text-base font-semibold text-white">Your verified mobile</h2>
          <p className="mt-1 text-xs text-zinc-400">Only verified numbers with explicit channel consent can receive SMS or AI calls.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My mobile" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+447700900123" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><Toggle checked={smsConsent} onChange={setSmsConsent} label="Allow SMS" detail="Blackstar may text this verified number." /><Toggle checked={voiceConsent} onChange={setVoiceConsent} label="Allow AI calls" detail="Blackstar always identifies itself as AI." /></div>
          <button disabled={saveRecipient.isPending || !phone} onClick={() => saveRecipient.mutate()} className="mt-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Save mobile</button>

          {!!data.recipients?.length && <div className="mt-5 space-y-2">{data.recipients.filter((r) => !r.disabled_at).map((r) => <button key={r.id} onClick={() => setSelectedId(r.id)} className={`flex w-full items-center rounded-xl border px-3 py-3 text-left ${selectedId === r.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/10'}`}><div><p className="text-sm font-medium text-white">{r.label}</p><p className="text-xs text-zinc-400">{r.phone_e164}</p></div><div className="ml-auto text-right text-[11px]"><p className={r.verified_at ? 'text-emerald-300' : 'text-amber-300'}>{r.verified_at ? 'Verified' : 'Needs verification'}</p><p className="text-zinc-500">SMS {r.sms_consent_at ? 'on' : 'off'} · Voice {r.voice_consent_at ? 'on' : 'off'}</p></div></button>)}</div>}

          {selected && !selected.verified_at && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[.05] p-3"><div className="flex flex-wrap gap-2"><button disabled={!caps.phone_verification || beginVerify.isPending} onClick={() => beginVerify.mutate()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white disabled:opacity-40">Send verification code</button><input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Code" className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /><button disabled={!verifyCode || confirmVerify.isPending} onClick={() => confirmVerify.mutate()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Verify</button></div></div>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <h2 className="text-base font-semibold text-white">Delivery controls</h2>
          <div className="mt-4 space-y-2"><Toggle checked={prefs.phone_push_enabled} onChange={(v) => setPrefs({ ...prefs, phone_push_enabled: v })} label="Phone push notifications" /><Toggle checked={prefs.sms_enabled} onChange={(v) => setPrefs({ ...prefs, sms_enabled: v })} label="SMS updates" /><Toggle checked={prefs.ai_calls_enabled} onChange={(v) => setPrefs({ ...prefs, ai_calls_enabled: v })} label="AI phone calls" detail="Blackstar calls only your verified, consented numbers." /><Toggle checked={prefs.retain_call_transcript} onChange={(v) => setPrefs({ ...prefs, retain_call_transcript: v })} label="Retain call transcript" detail="Off by default; temporary conversation history is cleared when calls end." /></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><Toggle checked={prefs.project_updates} onChange={(v) => setPrefs({ ...prefs, project_updates: v })} label="Projects" /><Toggle checked={prefs.agent_updates} onChange={(v) => setPrefs({ ...prefs, agent_updates: v })} label="Agents" /><Toggle checked={prefs.business_updates} onChange={(v) => setPrefs({ ...prefs, business_updates: v })} label="Business" /></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Quiet from<input type="time" value={prefs.quiet_hours_start ?? ''} onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value || null })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><label className="text-xs text-zinc-400">Quiet until<input type="time" value={prefs.quiet_hours_end ?? ''} onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value || null })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><label className="text-xs text-zinc-400">Daily SMS cap<input type="number" min="0" max="100" value={prefs.max_daily_sms} onChange={(e) => setPrefs({ ...prefs, max_daily_sms: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><label className="text-xs text-zinc-400">Daily call cap<input type="number" min="0" max="25" value={prefs.max_daily_calls} onChange={(e) => setPrefs({ ...prefs, max_daily_calls: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label></div>
          <button disabled={savePrefs.isPending} onClick={() => savePrefs.mutate()} className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100">Save controls</button>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex flex-wrap items-center gap-3"><div><h2 className="text-base font-semibold text-white">Send or call now</h2><p className="mt-1 text-xs text-zinc-400">Use this to test the same channels agents and workflows can target for your own account updates.</p></div><select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="ml-auto rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white">{PURPOSES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="flex items-center gap-2 text-sm font-medium text-white"><BellRing className="h-4 w-4 text-violet-300" />Phone push</p><input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /><textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /><button disabled={sendPush.isPending || !data.phone_push_endpoints?.length} onClick={() => sendPush.mutate()} className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Send push</button></div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="flex items-center gap-2 text-sm font-medium text-white"><MessageSquareText className="h-4 w-4 text-violet-300" />SMS</p><textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /><button disabled={sendSms.isPending || !selected?.verified_at || !selected?.sms_consent_at || !caps.sms} onClick={() => sendSms.mutate()} className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Send SMS</button></div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="flex items-center gap-2 text-sm font-medium text-white"><Volume2 className="h-4 w-4 text-violet-300" />Blackstar AI call</p><textarea value={callObjective} onChange={(e) => setCallObjective(e.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /><button disabled={startCall.isPending || !selected?.verified_at || !selected?.voice_consent_at || !caps.ai_voice_calls} onClick={() => startCall.mutate()} className="mt-2 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Call my phone</button></div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5"><h2 className="text-base font-semibold text-white">Recent phone activity</h2><div className="mt-3 space-y-2">{data.recent_events?.length ? data.recent_events.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3"><span className="rounded-lg bg-violet-500/10 p-2 text-violet-200">{event.channel === 'voice' ? <PhoneCall className="h-4 w-4" /> : event.channel === 'sms' ? <MessageSquareText className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-sm text-white">{event.title || event.body || event.call_objective || event.purpose}</p><p className="text-[11px] text-zinc-500">{event.channel} · {event.purpose} · {new Date(event.created_at).toLocaleString()}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[10px] ${['delivered','completed'].includes(event.status) ? 'bg-emerald-500/10 text-emerald-300' : event.status === 'failed' ? 'bg-rose-500/10 text-rose-300' : 'bg-white/5 text-zinc-300'}`}>{event.status}</span></div>) : <p className="text-xs text-zinc-500">No phone communication events yet.</p>}</div></section>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4 text-xs text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>Blackstar never treats provider acceptance as handset delivery. SMS delivery and call progress are updated only from signed provider callbacks. AI calls identify themselves as AI and cannot execute purchases, deployments or other consequential actions from the phone conversation.</p></div>
    </>
  );
}
