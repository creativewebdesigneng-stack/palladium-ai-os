import { useEffect, useState } from 'react';
import { Loader2, Play, RefreshCw, Rocket, Server, Square } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { getDeploymentOverview, saveDeploymentTarget, triggerCoolifyDeployment } from '@/lib/deployments/coolify.functions';
import { friendlyMessage } from '@/lib/errors';

export default function Deployments() {
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [resourceKind, setResourceKind] = useState('application');
  const [resourceUuid, setResourceUuid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => { try { setData(await getDeploymentOverview({ data: undefined })); } catch (e) { setError(e); } };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!name.trim() || !resourceUuid.trim()) return;
    setBusy(true); setError(null);
    try { await saveDeploymentTarget({ data: { name: name.trim(), resourceKind, resourceUuid: resourceUuid.trim() } }); setName(''); setResourceUuid(''); await load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };
  const action = async (id, nextAction) => {
    setBusy(true); setError(null);
    try { await triggerCoolifyDeployment({ data: { id, action: nextAction } }); }
    catch (e) { setError(e); } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Workspace" title="Deployments" description="Coolify-style self-hosted deployment controls integrated into PalladiumAI rather than introducing a second dashboard or authentication system." />
    <section className={`mb-4 rounded-2xl border p-4 ${data?.configured ? 'border-emerald-400/20 bg-emerald-500/[.05]' : 'border-amber-400/20 bg-amber-500/[.05]'}`}>
      <div className="flex items-center gap-3"><Server className={`h-5 w-5 ${data?.configured ? 'text-emerald-300' : 'text-amber-300'}`}/><div><p className="text-sm font-semibold text-white">Coolify provider {data?.configured ? 'connected' : 'not configured'}</p><p className="mt-1 text-[11px] text-zinc-500">Set COOLIFY_API_URL and COOLIFY_API_TOKEN server-side. Tokens are never persisted in deployment rows.</p></div></div>
    </section>
    {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-sm font-semibold text-white">Deployment targets</h2>
        <div className="mt-4 space-y-2">{(data?.targets ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-xs text-zinc-500">No deployment targets saved yet.</div> : data.targets.map((target)=><div key={target.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><Rocket className="h-4 w-4 text-violet-300"/><p className="text-xs font-medium text-white">{target.name}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">{target.resource_kind}</span><span className="ml-auto text-[10px] text-zinc-600">{target.resource_uuid}</span></div><div className="mt-3 flex flex-wrap gap-2"><Action icon={Play} label="Deploy/start" disabled={busy || !data?.configured} onClick={()=>action(target.id,'deploy')}/><Action icon={RefreshCw} label="Restart" disabled={busy || !data?.configured} onClick={()=>action(target.id,'restart')}/><Action icon={Square} label="Stop" disabled={busy || !data?.configured} onClick={()=>action(target.id,'stop')}/></div></div>)}</div>
      </section>
      <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-sm font-semibold text-white">Add Coolify target</h2><div className="mt-4 space-y-3"><Field label="Name"><input className="field" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Production app"/></Field><Field label="Resource type"><select className="field" value={resourceKind} onChange={(e)=>setResourceKind(e.target.value)}><option value="application">Application</option><option value="service">Service</option><option value="database">Database</option></select></Field><Field label="Coolify UUID"><input className="field" value={resourceUuid} onChange={(e)=>setResourceUuid(e.target.value)} placeholder="resource uuid"/></Field><button onClick={save} disabled={busy || !name.trim() || !resourceUuid.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}Save target</button></div></aside>
    </div>
    <style>{`.field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.65rem .75rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(167,139,250,.45)}.field option{background:#11131a}`}</style>
  </>;
}
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>{children}</label>; }
function Action({ icon: Icon, label, ...props }) { return <button {...props} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"><Icon className="h-3 w-3"/>{label}</button>; }
