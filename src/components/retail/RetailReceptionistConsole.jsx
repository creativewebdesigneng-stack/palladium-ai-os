import { useMemo, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bot, CheckCircle2, Loader2, MessageSquareText, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { runRetailReceptionistInquiry } from '@/lib/retail/retail-receptionist-ai.functions';
import { synthesizeVoice } from '@/lib/voice/voice-studio.functions';

export default function RetailReceptionistConsole({ workspaceId, data, onChanged }) {
  const runInquiry = useServerFn(runRetailReceptionistInquiry);
  const speak = useServerFn(synthesizeVoice);
  const [profileId, setProfileId] = useState(data?.profiles?.[0]?.id ?? '');
  const [locationId, setLocationId] = useState('');
  const [callId, setCallId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const selectedProfile = useMemo(() => (data?.profiles ?? []).find((item) => item.id === profileId) ?? null, [data?.profiles, profileId]);
  const voiceReady = Boolean(data?.voice?.openai?.configured);
  const recentHistory = turns.slice(-8).map((turn) => ({ role: turn.role, content: turn.content }));

  async function ask(event) {
    event?.preventDefault?.();
    const message = question.trim();
    if (!message || busy) return;
    setBusy(true); setError('');
    try {
      const result = await runInquiry({ data: {
        workspace_id: workspaceId,
        profile_id: profileId || null,
        location_id: locationId || null,
        call_id: callId || null,
        appointment_id: appointmentId || null,
        order_number: orderNumber.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        question: message,
        history: recentHistory,
      } });
      setTurns((current) => [...current, { role: 'user', content: message }, { role: 'assistant', content: result.answer }].slice(-10));
      setLastResult(result);
      setQuestion('');
      if (result.queuedActions?.length) await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retail receptionist AI could not answer this request.');
    } finally {
      setBusy(false);
    }
  }

  async function speakAnswer() {
    if (!lastResult?.answer || !voiceReady || speaking) return;
    setSpeaking(true); setError('');
    try {
      const result = await speak({ data: {
        provider: 'openai',
        text: lastResult.answer,
        voice: selectedProfile?.voice_studio_voice || 'alloy',
        instructions: selectedProfile?.voice_studio_instructions || 'Warm, clear, concise and professional.',
        format: 'mp3',
        speed: 1,
      } });
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`data:${result.contentType};base64,${result.audioBase64}`);
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice Studio could not synthesize this answer.');
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-[28px] border border-violet-300/10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.10),transparent_34%),linear-gradient(145deg,rgba(12,10,18,.94),rgba(5,5,9,.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,.24)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-violet-300"><Sparkles className="h-4 w-4" /><p className="text-[9px] font-semibold uppercase tracking-[.23em]">Grounded Retail intelligence</p></div>
          <h2 className="mt-2 text-lg font-semibold text-white">Receptionist live test</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Ask exactly what a customer would ask. Blackstar answers only from this Retail workspace, verifies private order/appointment context server-side, and queues side effects for staff review instead of executing them.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <Badge ok={Boolean(selectedProfile)}>{selectedProfile ? 'Profile active' : 'No active profile'}</Badge>
          <Badge ok={voiceReady}>{voiceReady ? 'Voice Studio ready' : 'Voice Studio not configured'}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4">
          <h3 className="text-xs font-semibold text-white">Grounding & verification</h3>
          <p className="mt-1 text-[10px] leading-4 text-zinc-600">Order and appointment details are withheld unless the supplied customer email or phone matches that record.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Field label="Reception profile"><select className="reception-input" value={profileId} onChange={(event) => setProfileId(event.target.value)}><option value="">No profile</option>{(data?.profiles ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Location"><select className="reception-input" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Any / global</option>{(data?.locations ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Current call"><select className="reception-input" value={callId} onChange={(event) => setCallId(event.target.value)}><option value="">No linked call</option>{(data?.calls ?? []).map((item) => <option key={item.id} value={item.id}>{item.customer_name || item.phone || 'Call'} · {item.reason || item.status}</option>)}</select></Field>
            <Field label="Appointment to verify"><select className="reception-input" value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)}><option value="">No appointment selected</option>{(data?.appointments ?? []).map((item) => <option key={item.id} value={item.id}>{item.customer_name} · {new Date(item.starts_at).toLocaleString('en-GB')}</option>)}</select></Field>
            <Field label="Order number"><input className="reception-input" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="e.g. WEB-1042" /></Field>
            <Field label="Customer email"><input className="reception-input" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="For verification" /></Field>
            <Field label="Customer phone"><input className="reception-input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="For verification" /></Field>
          </div>
          <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-4 text-amber-100/70"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />These verification fields are used server-side. Customer email/phone are not placed in the model grounding context.</div>
        </div>

        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-semibold text-white">Customer conversation</h3><p className="mt-1 text-[10px] text-zinc-600">Bounded General Intelligence through Blackstar’s existing model gateway.</p></div><Bot className="h-4 w-4 text-violet-300" /></div>
          <div className="mt-4 max-h-[390px] min-h-[220px] space-y-3 overflow-auto rounded-xl border border-white/[.05] bg-black/20 p-3">
            {turns.length ? turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-5 ${turn.role === 'user' ? 'ml-auto bg-violet-400/10 text-violet-100' : 'border border-white/[.06] bg-white/[.025] text-zinc-300'}`}><div className="mb-1 text-[8px] font-semibold uppercase tracking-[.12em] text-zinc-600">{turn.role === 'user' ? 'Customer' : 'Blackstar'}</div>{turn.content}</div>) : <div className="flex min-h-[190px] items-center justify-center text-center text-xs text-zinc-700">Try “Are you open on Saturday?”, “Do you have this product in stock?”, “What does this service cost?”, or a verified order-status question.</div>}
          </div>
          {error && <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.04] p-3 text-xs text-rose-200">{error}</div>}
          {lastResult && <ResultMeta result={lastResult} voiceReady={voiceReady} speaking={speaking} onSpeak={speakAnswer} />}
          <form onSubmit={ask} className="mt-3 flex gap-2"><textarea className="reception-input min-h-20 flex-1 resize-none py-2" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask as the customer…" /><button type="submit" disabled={busy || !question.trim()} className="inline-flex w-28 items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}{busy ? 'Thinking' : 'Ask'}</button></form>
        </div>
      </div>
      <style>{`.reception-input{width:100%;border-radius:.75rem;border:1px solid rgba(196,181,253,.1);background:rgba(0,0,0,.3);padding:.58rem .72rem;font-size:.75rem;color:white;outline:none}.reception-input:focus{border-color:rgba(196,181,253,.35);box-shadow:0 0 0 3px rgba(139,92,246,.04)}.reception-input::placeholder{color:rgb(82 82 91)}`}</style>
    </section>
  );
}

function Field({ label, children }) { return <label><span className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>; }
function Badge({ ok, children }) { return <span className={`rounded-full border px-2.5 py-1.5 ${ok ? 'border-emerald-400/15 bg-emerald-400/[.04] text-emerald-300' : 'border-amber-400/15 bg-amber-400/[.04] text-amber-300'}`}>{children}</span>; }
function ResultMeta({ result, voiceReady, speaking, onSpeak }) {
  return <div className="mt-3 rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-1.5">{(result.evidence ?? []).map((item) => <span key={item} className="rounded-full border border-white/[.06] px-2 py-1 text-[8px] uppercase tracking-[.08em] text-zinc-600">{item.replaceAll('_',' ')}</span>)}</div><button type="button" onClick={onSpeak} disabled={!voiceReady || speaking} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/10 px-2.5 py-1.5 text-[10px] text-violet-300 disabled:opacity-35">{speaking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}Speak via Voice Studio</button></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600"><span>{result.provider} · {result.model}</span><span>Order: {result.verification?.order?.replaceAll('_',' ')}</span><span>Appointment: {result.verification?.appointment?.replaceAll('_',' ')}</span></div>{result.queuedActions?.length > 0 && <div className="mt-2 rounded-lg border border-emerald-400/10 bg-emerald-400/[.03] p-2 text-[10px] text-emerald-200"><CheckCircle2 className="mr-1 inline h-3 w-3" />{result.queuedActions.length} governed action {result.queuedActions.length === 1 ? 'proposal is' : 'proposals are'} waiting for staff review. Nothing was executed.</div>}{result.blockedProposals?.length > 0 && <div className="mt-2 rounded-lg border border-amber-400/10 bg-amber-400/[.03] p-2 text-[10px] text-amber-200">{result.blockedProposals.map((item, index) => <div key={`${item.action_type}-${index}`}>{item.action_type.replaceAll('_',' ')}: {item.reason}</div>)}</div>}</div>;
}
