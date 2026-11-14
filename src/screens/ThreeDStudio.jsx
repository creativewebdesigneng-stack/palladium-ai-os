import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Box, CheckCircle2, Loader2, Plus, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Empty, Failed } from '@/components/business/live';
import { createModelReference, isPreviewableModelUrl } from '@/lib/three-d/three-d-scene';
import { certifyThreeDStudio, createThreeDJob, getThreeDStudioOverview, listThreeDScenes, refreshThreeDJob, renameThreeDJob, saveThreeDScene } from '@/lib/three-d/three-d-studio.functions';
import HuggingFaceModelDiscoveryPanel from '@/components/huggingface/HuggingFaceModelDiscoveryPanel';
import GameFoundryModelViewer from '@/components/game-foundry/GameFoundryModelViewer';
import ThreeDSceneEditor from '@/components/three-d/ThreeDSceneEditor';

export default function ThreeDStudio() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getThreeDStudioOverview);
  const createFn = useServerFn(createThreeDJob);
  const certifyFn = useServerFn(certifyThreeDStudio);
  const refreshFn = useServerFn(refreshThreeDJob);
  const listScenesFn = useServerFn(listThreeDScenes);
  const saveSceneFn = useServerFn(saveThreeDScene);
  const renameFn = useServerFn(renameThreeDJob);
  const [inputName, setInputName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [outputFormat, setOutputFormat] = useState('glb');
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [sceneDirty, setSceneDirty] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const probed = useRef(false);

  const overview = useQuery({ queryKey: ['three-d-studio'], queryFn: () => overviewFn(), enabled: session === 'yes', retry: false });
  const scenes = useQuery({ queryKey: ['three-d-scenes'], queryFn: () => listScenesFn(), enabled: session === 'yes', retry: false, refetchOnWindowFocus: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ['three-d-studio'] });
  const refreshScenes = () => qc.invalidateQueries({ queryKey: ['three-d-scenes'] });
  const create = useMutation({ mutationFn: () => createFn({ data: { inputName, sourceUrl, outputFormat } }), onSuccess: async () => { setInputName(''); setSourceUrl(''); await refresh(); toast({ title: '3D generation submitted' }); }, onError: async (error) => { await refresh(); toast({ variant: 'destructive', title: '3D generation could not start', description: friendlyMessage(error) }); } });
  const certify = useMutation({ mutationFn: () => certifyFn(), onError: (error) => toast({ variant: 'destructive', title: '3D certification failed', description: friendlyMessage(error) }) });
  const refreshJob = useMutation({ mutationFn: (id) => refreshFn({ data: { id } }), onSuccess: async () => { await refresh(); toast({ title: '3D job refreshed' }); }, onError: (error) => toast({ variant: 'destructive', title: 'Could not refresh 3D job', description: friendlyMessage(error) }) });
  const createScene = useMutation({
    mutationFn: (data) => saveSceneFn({ data }),
    onSuccess: async (result) => {
      setActiveSceneId(result.scene.id);
      await refreshScenes();
      toast({ title: 'Scene created' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Scene could not be created', description: friendlyMessage(error) }),
  });
  const renameJob = useMutation({
    mutationFn: () => renameFn({ data: { id: renameId, inputName: renameValue } }),
    onSuccess: async () => { setRenameId(null); setRenameValue(''); await refresh(); toast({ title: '3D asset renamed' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not rename 3D asset', description: friendlyMessage(error) }),
  });
  const configured = overview.data?.capabilities?.configured === true;
  const workerHealthy = certify.data?.worker?.healthy === true;
  const jobs = overview.data?.jobs ?? [];
  const sceneRows = scenes.data?.scenes ?? [];
  const activeScene = sceneRows.find((scene) => scene.id === activeSceneId) ?? null;
  const onDirtyChange = useCallback((value) => setSceneDirty(value), []);
  const onPlacementApplied = useCallback(() => setPlacement(null), []);

  useEffect(() => {
    if (session !== 'yes' || !configured || probed.current) return;
    probed.current = true;
    certify.mutate();
  }, [session, configured, certify]);

  function chooseScene(id) {
    if (sceneDirty && id !== activeSceneId && !window.confirm('This scene has unsaved changes. Leave it without saving?')) return;
    setActiveSceneId(id);
  }

  async function placeJob(job) {
    let object;
    try { object = createModelReference(job, activeScene?.document?.objects?.length ?? 0); }
    catch (error) { toast({ variant: 'destructive', title: 'This output cannot be placed in a scene', description: friendlyMessage(error) }); return; }
    if (!activeScene?.readable) {
      createScene.mutate({ name: object.name, description: '', document: { objects: [object] } });
      return;
    }
    setPlacement(object);
  }

  return <>
    <PageHeader eyebrow="AI Workforce" title="3D Studio" description="Create, edit and save your own 3D scenes. Image-to-mesh generation still submits to the configured worker. VOX files are created with the voxel agent tool. There is no separate page for that tool, and a job never shows an output the worker did not return." />
    {session === 'no' && <Failed message="Sign in to use 3D Studio." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}
    {scenes.error && <Failed message={friendlyMessage(scenes.error)} />}
    <div className="mb-4"><HuggingFaceModelDiscoveryPanel tasks={['image-to-3d','text-to-3d']} title="Hugging Face 3D model intelligence" description="Discover Hub 3D candidates separately from the real Modly-compatible execution worker. 3D Hub discovery never implies a standardized executable endpoint."/></div>

    <section className="mb-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/10 text-sky-200"><Box className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">Scene studio</h2><p className="text-xs text-zinc-500">Scenes are saved to your account. Nothing here is a generated mesh unless you place a completed job.</p></div></div>
        <button disabled={session !== 'yes' || createScene.isPending} onClick={() => { if (sceneDirty && !window.confirm('This scene has unsaved changes. Leave it without saving?')) return; createScene.mutate({ name: 'Untitled scene', description: '', document: { objects: [] } }); }} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />New scene</button>
      </div>
      {session !== 'yes' ? <p className="mt-4 text-xs text-zinc-500">Sign in to create, edit and save scenes.</p> : scenes.isLoading ? <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading saved scenes…</div> : sceneRows.length === 0 ? <div className="mt-4"><Empty icon={Box} title="No saved scenes" desc="Create a scene and add boxes, spheres and other primitives. They stay on your account after you save." /></div> : <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2">{sceneRows.map((scene) => <button key={scene.id} onClick={() => chooseScene(scene.id)} className={`w-full rounded-xl border px-3 py-2 text-left ${scene.id === activeSceneId ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/20'}`}>{scene.thumbnail ? <img src={scene.thumbnail} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" /> : null}<span className="block truncate text-sm text-white">{scene.name}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-zinc-500">{scene.readable ? `${scene.document?.objects?.length ?? 0} objects` : 'Unreadable'}</span></button>)}</div>
        <div>{activeScene ? <ThreeDSceneEditor key={activeScene.id} scene={activeScene} placement={placement} onPlacementApplied={onPlacementApplied} onDirtyChange={onDirtyChange} onSaved={async () => { await refreshScenes(); }} onDeleted={async () => { setActiveSceneId(null); await refreshScenes(); }} /> : <Empty icon={Box} title="Choose a scene" desc="Open one of your saved scenes to view and edit it." />}</div>
      </div>}
    </section>

    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Box className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">Image to 3D mesh</h2><p className="text-xs text-zinc-500">Optional worker generation. Blackstar does not invent a mesh when the worker is offline.</p></div></div>
        <div className={`mt-4 rounded-xl border p-3 text-xs ${configured ? 'border-emerald-400/20 bg-emerald-400/[.05] text-emerald-200' : 'border-amber-400/20 bg-amber-400/[.05] text-amber-200'}`}><div className="flex items-center gap-2">{configured ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}<span>{configured ? '3D execution route configured' : '3D worker not configured'}</span></div>{!configured && <p className="mt-1 text-[11px] text-amber-200/70">Set MODLY_API_URL on the server. MODLY_API_TOKEN is optional for protected workers.</p>}{configured && !workerHealthy && <p className="mt-1 text-[11px] text-amber-200/70">{certify.isPending ? 'Checking the live worker…' : (certify.data?.worker?.error || 'A configured route is not the same as a healthy worker. You can still submit a job; it is stored as failed if the worker does not return a mesh.')}</p>}{overview.data?.capabilities?.huggingface && <p className="mt-1 text-[11px] text-amber-100/80">{overview.data.capabilities.huggingface.configured ? 'Hugging Face fallback is configured and runs only when the mesh worker does not return a mesh.' : overview.data.capabilities.huggingface.note}</p>}{configured && <button disabled={certify.isPending} onClick={() => certify.mutate()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-300/20 bg-sky-300/[.05] px-2.5 py-1.5 text-[11px] text-sky-200 disabled:opacity-40">{certify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}Certify live worker</button>}</div>{certify.data && <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px]"><div className="flex flex-wrap gap-2"><span className={certify.data.worker?.healthy ? 'text-emerald-300' : 'text-rose-300'}>{certify.data.worker?.healthy ? 'Worker healthy' : 'Worker not healthy'}</span>{certify.data.worker?.httpStatus && <><span className="text-white/20">·</span><span className="text-zinc-500">HTTP {certify.data.worker.httpStatus}</span></>}<span className="text-white/20">·</span><span className={certify.data.executionCertified ? 'text-emerald-300' : certify.data.operationallyReady ? 'text-sky-300' : 'text-amber-300'}>{certify.data.executionCertified ? 'Execution certified' : certify.data.operationallyReady ? 'Worker ready · output evidence needed' : 'Operationally blocked'}</span></div>{certify.data.blockers?.length > 0 && <div className="mt-2 space-y-1">{certify.data.blockers.slice(0,3).map((item) => <p key={item} className="text-amber-200/70">• {item}</p>)}</div>}<p className="mt-2 text-white/35">{certify.data.note}</p></div>}
        <div className="mt-4 space-y-3"><Field label="Asset name"><input value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Product concept" className={control} /></Field><Field label="Public image URL"><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…/reference.png" className={control} /></Field><Field label="Output format"><select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className={control}><option value="glb">GLB</option><option value="gltf">glTF</option><option value="obj">OBJ</option><option value="ply">PLY</option><option value="stl">STL</option><option value="vox">VOX</option></select></Field><button disabled={!configured || !inputName.trim() || !sourceUrl.trim() || create.isPending} onClick={() => create.mutate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Generate 3D model</button></div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">3D job history</h2><p className="mt-1 text-xs text-zinc-500">Persisted worker runs and real output links. Failed jobs stay failed.</p></div>{overview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div><div className="mt-4 space-y-3">{jobs.length === 0 ? <Empty icon={Box} title="No 3D jobs yet" desc="A mesh appears here only after the live worker returns an output URL." /> : jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0">{renameId === job.id ? <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); renameJob.mutate(); }}><input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className={control} /><button disabled={!renameValue.trim() || renameJob.isPending} className="rounded-lg border border-white/10 px-2 text-xs text-zinc-200">Save</button></form> : <p className="text-sm font-medium text-white">{job.input_name}</p>}<p className="mt-1 text-[11px] text-zinc-500">{job.workflow} · {job.requested_format}</p></div><Status value={job.status} /></div><p className="mt-2 truncate text-[11px] text-zinc-600">{job.source_url}</p>{job.error_message && <p className="mt-2 text-xs text-rose-300">{job.error_message}</p>}{isPreviewableModelUrl(job.output_url) && <div className="mt-3"><GameFoundryModelViewer url={job.output_url} label={job.input_name || '3D asset'} /></div>}{job.status === 'completed' && job.output_url && !isPreviewableModelUrl(job.output_url) && <p className="mt-2 text-[11px] text-zinc-500">This file is saved, but the scene viewport can place only https GLB and glTF outputs.</p>}<div className="mt-3 flex flex-wrap gap-2">{job.worker_job_id && !['completed','failed','cancelled'].includes(job.status) && <button onClick={() => refreshJob.mutate(job.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>}<button onClick={() => { setRenameId(job.id); setRenameValue(job.input_name || ''); }} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Rename</button>{job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-300">Open model</a>}{isPreviewableModelUrl(job.output_url) && job.status === 'completed' && <button onClick={() => placeJob(job)} className="rounded-lg border border-sky-300/20 px-2.5 py-1.5 text-xs text-sky-200">Place in scene</button>}{job.preview_url && <a href={job.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Preview</a>}</div></div>)}</div></section>
    </div>
  </>;
}

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>{children}</label>; }
function Status({ value }) { const tone = value === 'completed' ? 'text-emerald-300 border-emerald-400/20' : value === 'failed' ? 'text-rose-300 border-rose-400/20' : value === 'cancelled' ? 'text-zinc-300 border-white/10' : 'text-amber-300 border-amber-400/20'; return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
