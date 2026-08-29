import { useEffect, useState } from 'react';
import { BellRing, Loader2, Send } from 'lucide-react';
import { getNtfyOverview, saveNtfyEndpoint, sendNtfyTest } from '@/lib/notifications/ntfy.functions';
import { friendlyMessage } from '@/lib/errors';

export default function NtfyPushPanel() {
  const [data, setData] = useState(null);
  const [label, setLabel] = useState('My device');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const load = async () => { try { setData(await getNtfyOverview({ data: undefined })); } catch (e) { setError(e); } };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!topic.trim()) return;
    setBusy(true); setError(null);
    try { await saveNtfyEndpoint({ data: { label, topic: topic.trim(), enabled: true } }); setTopic(''); await load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  const test = async (id) => {
    setBusy(true); setError(null);
    try { await sendNtfyTest({ data: { id } }); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  return <section className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Push delivery · ntfy</h2></div><p className="mt-1 text-[11px] text-zinc-500">Reuse the Notifications Centre while adding ntfy-style HTTP push delivery. Provider credentials stay server-side.</p></div><span className={`rounded-full border px-2 py-1 text-[10px] ${data?.configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{data?.configured ? 'Custom server configured' : 'Public ntfy.sh default'}</span></div>
    <div className="mt-4 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]"><input value={label} onChange={(e)=>setLabel(e.target.value)} className="field" placeholder="Device label"/><input value={topic} onChange={(e)=>setTopic(e.target.value)} className="field" placeholder="Private topic name"/><button onClick={save} disabled={busy || !topic.trim()} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : 'Add endpoint'}</button></div>
    {error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(error)}</p>}
    <div className="mt-3 flex flex-wrap gap-2">{(data?.endpoints ?? []).map((endpoint)=><div key={endpoint.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><div><p className="text-[11px] font-medium text-zinc-200">{endpoint.label}</p><p className="text-[10px] text-zinc-600">{endpoint.topic}</p></div><button onClick={()=>test(endpoint.id)} disabled={busy} className="ml-2 inline-flex items-center gap-1 text-[10px] text-violet-300"><Send className="h-3 w-3"/>Test</button></div>)}</div>
    <style>{`.field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.6rem .7rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(167,139,250,.45)}`}</style>
  </section>;
}
