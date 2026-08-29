import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { FolderSync, Loader2, Plug, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { getIntegratedCapabilityOverview, saveSyncConnection } from '@/lib/platform/integrated-capabilities.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

export default function SyncCenter() {
  const session = useSessionReady();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getIntegratedCapabilityOverview);
  const saveFn = useServerFn(saveSyncConnection);
  const [form, setForm] = useState({ provider: 'syncthing', name: '', connectionRef: '', localRoot: '', remoteRoot: '', direction: 'bidirectional' });
  const overview = useQuery({ queryKey: ['integrated-capabilities'], queryFn: () => overviewFn({ data: undefined }), enabled: session === 'yes', retry: false });
  const save = useMutation({ mutationFn: () => saveFn({ data: form }), onSuccess: async () => { setForm((value) => ({ ...value, name: '', localRoot: '', remoteRoot: '' })); await qc.invalidateQueries({ queryKey: ['integrated-capabilities'] }); toast({ title: 'Sync mapping saved' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not save sync mapping', description: friendlyMessage(error) }) });
  const rows = overview.data?.sync ?? [];
  return <>
    <PageHeader eyebrow="Files · Integrations" title="Sync Center" description="Continuous folder-sync mappings inspired by Syncthing, without creating a second file platform. PalladiumAI keeps identity, connection references, audit and workspace ownership authoritative." />
    {session === 'no' && <Failed message="Sign in to configure sync mappings." />}{overview.error && <Failed message={friendlyMessage(overview.error)} />}
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><FolderSync className="h-5 w-5 text-violet-300" /><div><h2 className="text-sm font-semibold text-white">Add sync mapping</h2><p className="text-xs text-zinc-500">References an existing connector; credentials stay in Integrations.</p></div></div>
        <div className="mt-4 space-y-3">
          <Field label="Provider"><select className={control} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="syncthing">Syncthing-compatible</option><option value="integration">Connected integration</option><option value="mcp">MCP storage tool</option></select></Field>
          <Field label="Name"><input className={control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production assets" /></Field>
          <Field label="Connection reference"><input className={control} value={form.connectionRef} onChange={(e) => setForm({ ...form, connectionRef: e.target.value })} placeholder="Existing integration ID/name (no secret)" /></Field>
          <Field label="PalladiumAI path"><input className={control} value={form.localRoot} onChange={(e) => setForm({ ...form, localRoot: e.target.value })} placeholder="/projects/site/assets" /></Field>
          <Field label="Remote path"><input className={control} value={form.remoteRoot} onChange={(e) => setForm({ ...form, remoteRoot: e.target.value })} placeholder="remote:/assets" /></Field>
          <Field label="Direction"><select className={control} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="bidirectional">Bidirectional</option><option value="push">Push</option><option value="pull">Pull</option></select></Field>
          <button disabled={!form.name.trim() || !form.localRoot.trim() || !form.remoteRoot.trim() || save.isPending} onClick={() => save.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save mapping</button>
        </div>
        <button onClick={() => navigate('/integrations')} className="mt-3 flex items-center gap-2 text-xs text-violet-300"><Plug className="h-3.5 w-3.5" />Manage connection credentials in Integrations</button>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Configured mappings</h2>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div><div className="mt-4 space-y-3">{rows.length === 0 ? <Empty icon={FolderSync} title="No sync mappings" desc="Connect storage once and reference it here instead of storing another credential." /> : rows.map((row) => <div key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2"><p className="text-sm font-medium text-white">{row.name}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{row.provider}</span><span className="ml-auto text-[10px] text-zinc-500">{row.status}</span></div><p className="mt-2 text-xs text-zinc-500">{row.local_root} ↔ {row.remote_root}</p><p className="mt-1 text-[10px] text-zinc-600">{row.direction} · {row.connection_ref || 'connection not bound yet'}</p></div>)}</div></section>
    </div>
    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4 text-[11px] leading-5 text-emerald-100/75"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />Sync Center stores paths and connection references only. Provider tokens and passwords stay in PalladiumAI's existing encrypted integration layer.</div>
  </>;
}
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
