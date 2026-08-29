import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Box, CheckCircle2, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { createThreeDJob, getThreeDStudioOverview, refreshThreeDJob } from '@/lib/three-d/three-d-studio.functions';

export default function ThreeDStudio() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getThreeDStudioOverview);
  const createFn = useServerFn(createThreeDJob);
  const refreshFn = useServerFn(refreshThreeDJob);
  const [inputName, setInputName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [outputFormat, setOutputFormat] = useState('glb');

  const overview = useQuery({ queryKey: ['three-d-studio'], queryFn: () => overviewFn(), enabled: session === 'yes', retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['three-d-studio'] });
  const create = useMutation({ mutationFn: () => createFn({ data: { inputName, sourceUrl, outputFormat } }), onSuccess: async () => { setInputName(''); setSourceUrl(''); await refresh(); toast({ title: '3D generation submitted' }); }, onError: async (error) => { await refresh(); toast({ variant: 'destructive', title: '3D generation could not start', description: friendlyMessage(error) }); } });
  const refreshJob = useMutation({ mutationFn: (id) => refreshFn({ data: { id } }), onSuccess: async () => { await refresh(); toast({ title: '3D job refreshed' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh 3D job', description: friendlyMessage(error) }) });
  const configured = overview.data?.capabilities?.configured === true;
  const jobs = overview.data?.jobs ?? [];

  return <>
    <PageHeader eyebrow="AI Workforce" title="3D Studio" description="Generate production 3D meshes from images through a real Modly-compatible worker, then hand VOX assets into PalladiumAI Voxel Studio when voxel editing is needed." />
    {session === 'no' && <Failed message="Sign in to use 3D Studio." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Box className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">Image to 3D mesh</h2><p className="text-xs text-zinc-500">Local-first generation without bundling model weights into PalladiumAI.</p></div></div>
        <div className={`mt-4 rounded-xl border p-3 text-xs ${configured ? 'border-emerald-400/20 bg-emerald-400/[.05] text-emerald-200' : 'border-amber-400/20 bg-amber-400/[.05] text-amber-200'}`}><div className="flex items-center gap-2">{configured ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}<span>{configured ? 'Modly-compatible worker configured' : '3D worker not configured'}</span></div>{!configured && <p className="mt-1 text-[11px] text-amber-200/70">Set MODLY_API_URL on the server. MODLY_API_TOKEN is optional for protected workers.</p>}</div>
        <div className="mt-4 space-y-3"><Field label="Asset name"><input value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Product concept" className={control} /></Field><Field label="Public image URL"><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…/reference.png" className={control} /></Field><Field label="Output format"><select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className={control}><option value="glb">GLB</option><option value="gltf">glTF</option><option value="obj">OBJ</option><option value="ply">PLY</option><option value="stl">STL</option><option value="vox">VOX</option></select></Field><button disabled={!configured || !inputName.trim() || !sourceUrl.trim() || create.isPending} onClick={() => create.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Generate 3D model</button></div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">3D job history</h2><p className="mt-1 text-xs text-zinc-500">Persisted worker runs and real output links.</p></div>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div><div className="mt-4 space-y-3">{jobs.length === 0 ? <Empty icon={Box} title="No 3D jobs yet" desc="Configure a worker and submit an image-to-mesh generation." /> : jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{job.input_name}</p><p className="mt-1 text-[11px] text-zinc-500">{job.workflow} · {job.requested_format}</p></div><Status value={job.status} /></div><p className="mt-2 truncate text-[11px] text-zinc-600">{job.source_url}</p>{job.error_message && <p className="mt-2 text-xs text-rose-300">{job.error_message}</p>}<div className="mt-3 flex gap-2">{job.worker_job_id && !['completed','failed','cancelled'].includes(job.status) && <button onClick={() => refreshJob.mutate(job.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-300">Open model</a>}{job.preview_url && <a href={job.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Preview</a>}</div></div>)}</div></section>
    </div>
  </>;
}

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300 border-emerald-400/20' : value === 'failed' ? 'text-rose-300 border-rose-400/20' : value === 'cancelled' ? 'text-zinc-300 border-white/10' : 'text-amber-300 border-amber-400/20'; return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
