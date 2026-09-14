import { useEffect, useMemo, useState } from 'react';
import { Copy, PhoneCall, PhoneOff, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import {
  beginRetailInboundVoicePairing,
  connectRetailInboundVoice,
  disconnectRetailInboundVoice,
  getRetailInboundVoiceConfig,
} from '@/lib/retail/retail-inbound-voice.functions';

function shortError(error, fallback) {
  return error instanceof Error ? error.message.replace(/^twilio_api_error:/, '') : fallback;
}

export default function RetailInboundVoicePanel({ workspaceId, profiles = [] }) {
  const [state, setState] = useState(null);
  const [profileId, setProfileId] = useState('');
  const [phoneSid, setPhoneSid] = useState('');
  const [pairing, setPairing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.active), [profiles]);

  async function refresh() {
    if (!workspaceId) return;
    setLoading(true); setError('');
    try {
      const result = await getRetailInboundVoiceConfig({ data: { workspace_id: workspaceId } });
      setState(result);
      setProfileId((current) => current && activeProfiles.some((profile) => profile.id === current) ? current : (activeProfiles[0]?.id || ''));
    } catch (err) {
      setError(shortError(err, 'Could not load inbound phone receptionist configuration.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [workspaceId]);

  async function beginPairing() {
    if (!profileId || !phoneSid) return;
    setBusy(true); setError(''); setNotice(''); setPairing(null);
    try {
      const result = await beginRetailInboundVoicePairing({ data: { workspace_id: workspaceId, profile_id: profileId, provider_phone_sid: phoneSid.trim() } });
      setPairing(result);
      setNotice('Pairing code created. Set this exact value as the Twilio number Friendly Name, then verify and connect before it expires.');
      await refresh();
    } catch (err) {
      setError(shortError(err, 'Could not start the Twilio ownership pairing.'));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (!pairing?.pairing_id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const endpoint = await connectRetailInboundVoice({ data: { pairing_id: pairing.pairing_id } });
      setNotice(`${endpoint.phone_number} is now connected to the governed Blackstar AI receptionist.`);
      setPairing(null); setPhoneSid('');
      await refresh();
    } catch (err) {
      setError(shortError(err, 'Could not verify and connect the Twilio phone number.'));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(endpointId) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await disconnectRetailInboundVoice({ data: { endpoint_id: endpointId } });
      setNotice(result.providerDetached ? 'The Blackstar phone webhook was detached and the endpoint was disabled.' : 'The Blackstar endpoint was disabled. The provider webhook was not changed because it no longer matched Blackstar.');
      if (result.providerError) setError(result.providerError);
      await refresh();
    } catch (err) {
      setError(shortError(err, 'Could not disconnect the inbound phone receptionist.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyPairing() {
    if (!pairing?.expected_friendly_name) return;
    try { await navigator.clipboard.writeText(pairing.expected_friendly_name); setNotice('Pairing Friendly Name copied.'); }
    catch { setError('Could not copy the pairing value.'); }
  }

  const runtime = state?.runtime;
  const connected = (state?.endpoints || []).filter((endpoint) => endpoint.active && endpoint.webhook_configured);
  const sessions = state?.sessions || [];

  return (
    <section className="mb-4 rounded-[28px] border border-violet-400/15 bg-gradient-to-br from-violet-500/[.06] via-black/30 to-cyan-400/[.04] p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><PhoneCall className="h-4 w-4 text-violet-300" />Inbound AI phone receptionist</div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Connect a Twilio number to Blackstar’s grounded Retail receptionist. Calls use signed provider webhooks, bounded conversation turns and the same staff-review action queue as the on-screen receptionist.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || busy} className="inline-flex items-center gap-1.5 rounded-xl border border-white/[.08] bg-black/30 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh phone state</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-3"><div className="text-[10px] uppercase tracking-[.18em] text-zinc-600">Carrier runtime</div><div className={`mt-1 text-sm font-medium ${runtime?.configured ? 'text-emerald-300' : 'text-amber-300'}`}>{runtime?.configured ? 'Ready' : 'Configuration required'}</div><div className="mt-1 text-[11px] text-zinc-600">Twilio {runtime?.twilio_configured ? '✓' : '—'} · HTTPS origin {runtime?.app_origin_configured ? '✓' : '—'}</div></div>
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-3"><div className="text-[10px] uppercase tracking-[.18em] text-zinc-600">Active numbers</div><div className="mt-1 text-sm font-medium text-zinc-200">{connected.length}</div><div className="mt-1 text-[11px] text-zinc-600">Owner-paired routing only</div></div>
        <div className="rounded-2xl border border-white/[.06] bg-black/25 p-3"><div className="text-[10px] uppercase tracking-[.18em] text-zinc-600">Recent call sessions</div><div className="mt-1 text-sm font-medium text-zinc-200">{sessions.length}</div><div className="mt-1 text-[11px] text-zinc-600">Maximum 20 AI turns per call</div></div>
      </div>

      {!loading && runtime && !runtime.configured && <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-xs leading-5 text-amber-100/80">Inbound calling stays disabled until valid <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> and an HTTPS <code>APP_ORIGIN</code> are configured. Blackstar will not simulate live phone support.</div>}
      {error && <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{error}</div>}
      {notice && <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-3 text-xs text-emerald-200">{notice}</div>}

      {runtime?.configured && <div className="mt-4 rounded-2xl border border-white/[.06] bg-black/25 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-300"><ShieldCheck className="h-4 w-4 text-emerald-300" />Securely pair a Twilio number</div>
        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2.5 text-xs text-zinc-300 outline-none"><option value="">Choose receptionist profile</option>{activeProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
          <input value={phoneSid} onChange={(event) => setPhoneSid(event.target.value)} placeholder="Twilio Phone SID — PN…" className="rounded-xl border border-white/[.08] bg-black/50 px-3 py-2.5 text-xs text-zinc-300 outline-none placeholder:text-zinc-700" />
          <button type="button" onClick={beginPairing} disabled={busy || !profileId || !/^PN[0-9a-fA-F]{32}$/.test(phoneSid.trim())} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 py-2.5 text-xs font-medium text-violet-100 hover:bg-violet-400/15 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />Create pairing code</button>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-zinc-600">Blackstar never lists the carrier account’s other phone numbers. The Phone SID plus a one-time Friendly Name proof prevents another Blackstar tenant from claiming shared Twilio inventory.</p>

        {pairing && <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.04] p-3">
          <div className="text-[11px] font-medium text-cyan-100">1. In Twilio, set this number’s Friendly Name to exactly:</div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><code className="break-all rounded-lg border border-white/[.08] bg-black/40 px-2.5 py-2 text-[11px] text-cyan-200">{pairing.expected_friendly_name}</code><button type="button" onClick={copyPairing} className="inline-flex items-center gap-1 rounded-lg border border-white/[.08] px-2.5 py-2 text-[11px] text-zinc-400 hover:text-zinc-200"><Copy className="h-3 w-3" />Copy</button></div>
          <div className="mt-2 text-[11px] text-zinc-600">2. Save the number in Twilio, then verify before {new Date(pairing.expires_at).toLocaleTimeString()}.</div>
          <button type="button" onClick={connect} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-400/[.08] px-4 py-2.5 text-xs font-medium text-emerald-100 hover:bg-emerald-400/[.12] disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" />Verify ownership & connect</button>
        </div>}
      </div>}

      {connected.length > 0 && <div className="mt-4 space-y-2">{connected.map((endpoint) => {
        const profile = profiles.find((item) => item.id === endpoint.profile_id);
        return <div key={endpoint.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-black/25 p-3"><div><div className="text-sm font-medium text-zinc-200">{endpoint.phone_number}</div><div className="mt-0.5 text-[11px] text-zinc-600">{profile?.name || 'Receptionist profile'} · signed webhook {endpoint.webhook_configured ? 'active' : 'inactive'}</div></div><button type="button" onClick={() => disconnect(endpoint.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/15 bg-rose-400/[.04] px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/[.08] disabled:opacity-40"><PhoneOff className="h-3.5 w-3.5" />Disconnect</button></div>;
      })}</div>}

      {sessions.length > 0 && <div className="mt-4"><div className="mb-2 text-[10px] uppercase tracking-[.18em] text-zinc-600">Recent inbound sessions</div><div className="overflow-x-auto"><table className="min-w-full text-left text-[11px]"><thead className="text-zinc-600"><tr><th className="px-2 py-2 font-medium">Caller</th><th className="px-2 py-2 font-medium">Number</th><th className="px-2 py-2 font-medium">Status</th><th className="px-2 py-2 font-medium">AI turns</th><th className="px-2 py-2 font-medium">Updated</th></tr></thead><tbody>{sessions.slice(0, 20).map((session) => <tr key={session.id} className="border-t border-white/[.05] text-zinc-400"><td className="px-2 py-2">{session.caller_phone || 'Withheld/unknown'}</td><td className="px-2 py-2">{session.called_phone}</td><td className="px-2 py-2">{session.status}</td><td className="px-2 py-2">{session.turn_count}</td><td className="px-2 py-2">{new Date(session.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div></div>}
    </section>
  );
}
