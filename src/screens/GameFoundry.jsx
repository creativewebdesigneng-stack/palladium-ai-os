import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Box, Download, FileUp, Gamepad2, Image as ImageIcon, Loader2, Network, PackageCheck, Play, RefreshCw, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { Failed, Empty } from '@/components/business/live';
import { useToast } from '@/components/ui/use-toast';
import { uploadGameFoundrySource } from '@/lib/game-foundry/uploadGameFoundrySource';
import GameFoundryModelViewer from '@/components/game-foundry/GameFoundryModelViewer';
import GameFoundryWebPreview from '@/components/game-foundry/GameFoundryWebPreview';
import {
  createGameFoundryAsset,
  createGameFoundryProject,
  generateGameFoundryProject,
  generateGameFoundryContentManifest,
  generateGameFoundrySource,
  planGameFoundryProject,
  processGameFoundryAsset,
  refreshGameFoundryAsset,
  refreshGameFoundryProjectBuild,
  refreshGameFoundryEngineHandoff,
  prepareGameFoundryEngineHandoff,
  prepareGameFoundryProjectPackage,
  sendGameFoundryEngineHandoff,
  getGameFoundryOverview,
} from '@/lib/game-foundry/game-foundry.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#10121a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40';
const engines = ['generic','unity','unreal','godot','web','blender'];
const projectTypes = ['game','environment','character','prop','vehicle','asset_pack'];

export default function GameFoundry() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const overviewFn = useServerFn(getGameFoundryOverview);
  const createProjectFn = useServerFn(createGameFoundryProject);
  const generateProjectFn = useServerFn(generateGameFoundryProject);
  const generateContentFn = useServerFn(generateGameFoundryContentManifest);
  const generateSourceFn = useServerFn(generateGameFoundrySource);
  const planProjectFn = useServerFn(planGameFoundryProject);
  const createAssetFn = useServerFn(createGameFoundryAsset);
  const processAssetFn = useServerFn(processGameFoundryAsset);
  const refreshAssetFn = useServerFn(refreshGameFoundryAsset);
  const refreshProjectFn = useServerFn(refreshGameFoundryProjectBuild);
  const refreshHandoffFn = useServerFn(refreshGameFoundryEngineHandoff);
  const prepareHandoffFn = useServerFn(prepareGameFoundryEngineHandoff);
  const preparePackageFn = useServerFn(prepareGameFoundryProjectPackage);
  const sendHandoffFn = useServerFn(sendGameFoundryEngineHandoff);

  const [name,setName] = useState('');
  const [prompt,setPrompt] = useState('');
  const [engine,setEngine] = useState('unreal');
  const [projectType,setProjectType] = useState('game');
  const [quality,setQuality] = useState('game_ready');

  const [assetName,setAssetName] = useState('');
  const [sourceKind,setSourceKind] = useState('prompt');
  const [assetPrompt,setAssetPrompt] = useState('');
  const [sourceUrl,setSourceUrl] = useState('');
  const [sourceFile,setSourceFile] = useState(null);
  const [format,setFormat] = useState('glb');
  const [assetQuality,setAssetQuality] = useState('game_ready');
  const [assetEngine,setAssetEngine] = useState('unreal');
  const [assetProjectId,setAssetProjectId] = useState('');

  const overview = useQuery({ queryKey:['game-foundry'], queryFn:()=>overviewFn(), enabled:session==='yes', retry:false });
  const refresh = () => qc.invalidateQueries({queryKey:['game-foundry']});

  const createProject = useMutation({
    mutationFn:()=>createProjectFn({data:{name,prompt,targetEngine:engine,projectType,qualityProfile:quality}}),
    onSuccess:async()=>{ setName(''); setPrompt(''); await refresh(); toast({title:'Game Foundry project created'}); },
    onError:(error)=>toast({variant:'destructive',title:'Could not create project',description:friendlyMessage(error)}),
  });
  const generateContent = useMutation({
    mutationFn:(id)=>generateContentFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Gameplay and world content generated'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Content generation failed',description:friendlyMessage(error)}); },
  });
  const generateSource = useMutation({
    mutationFn:(id)=>generateSourceFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Engine source manifest generated'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Source generation failed',description:friendlyMessage(error)}); },
  });
  const planProject = useMutation({
    mutationFn:(id)=>planProjectFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Game design plan generated'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Game planning failed',description:friendlyMessage(error)}); },
  });
  const generateProject = useMutation({
    mutationFn:(id)=>generateProjectFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Game generation submitted'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Game generation could not start',description:friendlyMessage(error)}); },
  });
  const preparePackage = useMutation({
    mutationFn:(id)=>preparePackageFn({data:{id}}),
    onSuccess:async(res)=>{ await refresh(); downloadJson(res.filename,res.package_manifest); toast({title:'Game project package prepared'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Could not prepare project package',description:friendlyMessage(error)}); },
  });

  const prepareHandoff = useMutation({
    mutationFn:(id)=>prepareHandoffFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Engine handoff manifest prepared'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Could not prepare handoff',description:friendlyMessage(error)}); },
  });
  const sendHandoff = useMutation({
    mutationFn:(id)=>sendHandoffFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Engine handoff submitted'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Engine handoff failed',description:friendlyMessage(error)}); },
  });

  const refreshAsset = useMutation({
    mutationFn:(id)=>refreshAssetFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'3D worker status refreshed'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Could not refresh 3D job',description:friendlyMessage(error)}); },
  });
  const refreshProject = useMutation({
    mutationFn:(id)=>refreshProjectFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Game build status refreshed'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Could not refresh game build',description:friendlyMessage(error)}); },
  });
  const refreshHandoff = useMutation({
    mutationFn:(id)=>refreshHandoffFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Engine handoff status refreshed'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Could not refresh engine handoff',description:friendlyMessage(error)}); },
  });

  const processAsset = useMutation({
    mutationFn:(id)=>processAssetFn({data:{id,profile:{
      generatePbrMaterials:true,unwrapUvs:true,generateLods:true,generateCollision:true,optimizeTopology:true,
      rigging:'none',animation:'none',textureResolution:2048,targetPolycount:null,
    }}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Game-ready processing submitted'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Game-ready processing failed',description:friendlyMessage(error)}); },
  });

  const createAsset = useMutation({
    mutationFn:async()=>{
      let storagePath = null;
      if (sourceKind !== 'prompt' && sourceFile) {
        const uploaded = await uploadGameFoundrySource(sourceFile);
        storagePath = uploaded.storagePath;
      }
      return createAssetFn({data:{
        projectId:assetProjectId||null,inputName:assetName,sourceKind,prompt:sourceKind==='prompt'?assetPrompt:null,
        sourceUrl:sourceKind==='prompt'||storagePath?null:sourceUrl,
        storagePath,
        outputFormat:format,qualityProfile:assetQuality,targetEngine:assetEngine,
      }});
    },
    onSuccess:async()=>{ setAssetName(''); setAssetPrompt(''); setSourceUrl(''); setSourceFile(null); await refresh(); toast({title:'3D asset generation submitted'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'3D asset generation could not start',description:friendlyMessage(error)}); },
  });

  const caps = overview.data?.capabilities;
  const projects = overview.data?.projects ?? [];
  const assets = overview.data?.assets ?? [];
  const canCreateAsset = sourceKind === 'image' ? caps?.assetGeneration?.imageTo3d : sourceKind === 'prompt' ? caps?.assetGeneration?.promptTo3d : caps?.assetGeneration?.modelEnhancement;
  const hasAssetSource = sourceKind === 'prompt' ? Boolean(assetPrompt.trim()) : Boolean(sourceFile || sourceUrl.trim());
  const engineCards = useMemo(()=>caps?.engines ?? [],[caps]);
  const integrations = useMemo(()=>caps?.integrations ?? [],[caps]);
  const formats = caps?.assetGeneration?.formats ?? ['glb','gltf','obj','ply','stl','vox'];

  return <>
    <PageHeader
      eyebrow="Blackstar Creative Systems"
      title="Blackstar Game Foundry"
      description="Create game-ready 3D assets and full game projects from prompts, images and existing models. Real workers remain authoritative; unavailable integrations fail closed rather than simulating output."
    />
    {session === 'no' && <Failed message="Sign in to use Blackstar Game Foundry." />}
    {overview.error && <Failed message={friendlyMessage(overview.error)} />}

    <div className="grid gap-4 2xl:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-2xl border border-violet-300/15 bg-black/30 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Gamepad2 className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-violet-300/60">Game generation</p><h2 className="text-lg font-semibold text-white">Create a game project</h2><p className="mt-1 text-xs text-zinc-500">Describe the game, world, gameplay and art direction. Choose an engine target and quality profile.</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Project name"><input value={name} onChange={(e)=>setName(e.target.value)} className={control} placeholder="Blackstar Arena" /></Field>
          <Field label="Project type"><select value={projectType} onChange={(e)=>setProjectType(e.target.value)} className={control}>{projectTypes.map((x)=><option key={x} value={x}>{labelize(x)}</option>)}</select></Field>
          <Field label="Target engine"><select value={engine} onChange={(e)=>setEngine(e.target.value)} className={control}>{engines.map((x)=><option key={x} value={x}>{labelize(x)}</option>)}</select></Field>
          <Field label="Quality"><select value={quality} onChange={(e)=>setQuality(e.target.value)} className={control}><option value="prototype">Prototype</option><option value="game_ready">Game ready</option><option value="cinematic">Cinematic</option></select></Field>
        </div>
        <Field label="Game prompt"><textarea rows={7} value={prompt} onChange={(e)=>setPrompt(e.target.value)} className={control+' mt-3'} placeholder="Create a third-person sci-fi survival game with an explorable alien city, modular weapons, enemy AI, quests, inventory, UI and a playable vertical slice…" /></Field>
        <button disabled={!name.trim() || !prompt.trim() || createProject.isPending} onClick={()=>createProject.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{createProject.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Create project</button>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-3 text-xs text-zinc-400">
          Full executable game generation: <strong className={caps?.gameGeneration?.configured?'text-emerald-300':'text-amber-300'}>{caps?.gameGeneration?.configured?'configured':'worker not configured'}</strong>. Draft projects remain usable as governed design containers even when the external build worker is unavailable.
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-300/15 bg-black/30 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Box className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300/60">3D Foundry</p><h2 className="text-lg font-semibold text-white">Generate game-ready 3D assets</h2><p className="mt-1 text-xs text-zinc-500">Prompt-to-3D, image-to-3D or enhancement of an existing model with explicit engine/export targets.</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Asset name"><input value={assetName} onChange={(e)=>setAssetName(e.target.value)} className={control} placeholder="Alien rifle" /></Field>
          <Field label="Source"><select value={sourceKind} onChange={(e)=>setSourceKind(e.target.value)} className={control}><option value="prompt">Prompt</option><option value="image">Image URL</option><option value="model">Model URL</option></select></Field>
          <Field label="Engine"><select value={assetEngine} onChange={(e)=>setAssetEngine(e.target.value)} className={control}>{engines.map((x)=><option key={x} value={x}>{labelize(x)}</option>)}</select></Field>
          <Field label="Format"><select value={format} onChange={(e)=>setFormat(e.target.value)} className={control}>{formats.map((x)=><option key={x} value={x}>{x.toUpperCase()}</option>)}</select></Field>
          <Field label="Quality"><select value={assetQuality} onChange={(e)=>setAssetQuality(e.target.value)} className={control}><option value="draft">Draft</option><option value="game_ready">Game ready</option><option value="cinematic">Cinematic</option></select></Field>
          <Field label="Game project"><select value={assetProjectId} onChange={(e)=>setAssetProjectId(e.target.value)} className={control}><option value="">Standalone asset</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
        </div>
        {sourceKind === 'prompt' ? <Field label="3D prompt"><textarea rows={5} value={assetPrompt} onChange={(e)=>setAssetPrompt(e.target.value)} className={control+' mt-3'} placeholder="A weathered sci-fi rifle, hard-surface PBR, clean topology, game-ready proportions…" /></Field> : <div className="mt-3 grid gap-3"><Field label={sourceKind==='image'?'Upload reference image':'Upload existing 3D model'}><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-cyan-300/20 bg-cyan-400/[.03] px-3 py-3 text-xs text-zinc-300"><FileUp className="h-4 w-4 text-cyan-300"/><span className="min-w-0 flex-1 truncate">{sourceFile?.name || (sourceKind==='image'?'Choose PNG/JPG/WEBP/AVIF up to 100 MB':'Choose GLB/glTF/FBX/OBJ/USD/PLY/STL/VOX up to 100 MB')}</span><input type="file" className="hidden" accept={sourceKind==='image'?'.png,.jpg,.jpeg,.webp,.avif':'.glb,.gltf,.fbx,.obj,.usd,.usdz,.ply,.stl,.vox'} onChange={(e)=>setSourceFile(e.target.files?.[0] ?? null)} /></label></Field><div className="text-center text-[10px] uppercase tracking-[.2em] text-zinc-700">or</div><Field label={sourceKind==='image'?'Public reference image URL':'Public model URL'}><input value={sourceUrl} onChange={(e)=>setSourceUrl(e.target.value)} className={control} placeholder="https://…" /></Field></div>}
        <button disabled={!canCreateAsset || !assetName.trim() || createAsset.isPending || !hasAssetSource} onClick={()=>createAsset.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{createAsset.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:sourceKind==='image'?<ImageIcon className="h-4 w-4"/>:<UploadCloud className="h-4 w-4"/>}Generate asset</button>
        {!canCreateAsset && <p className="mt-2 text-xs text-amber-300">{sourceKind==='prompt'?'Prompt-to-3D requires GAME_FOUNDRY_3D_API_URL.':sourceKind==='model'?'Model enhancement requires GAME_FOUNDRY_3D_API_URL.':'No real image-to-3D worker is configured.'}</p>}
      </section>
    </div>

    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Network className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold text-white">Engine & DCC integrations</h2><p className="mt-1 text-xs text-zinc-500">Blackstar reports a bridge as connected only when a dedicated endpoint is actually configured; otherwise it offers compatible export formats.</p></div></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{integrations.map((item)=><div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{item.name}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] ${item.bridgeConfigured?'border-emerald-400/20 text-emerald-300':'border-white/10 text-zinc-500'}`}>{item.bridgeConfigured?'Bridge configured':'Export only'}</span></div><p className="mt-1 text-[11px] text-zinc-500">{item.mechanism}</p><p className="mt-2 text-[11px] text-zinc-400">{item.formats.join(' · ')}</p></div>)}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{engineCards.map((item)=><div key={item.id} className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><p className="text-xs font-medium text-zinc-200">{labelize(item.id)}</p><p className="mt-1 text-[10px] text-zinc-500">{item.exports.join(' · ')}</p></div>)}</div>
    </section>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <History title="Game projects" icon={Gamepad2} empty="No Game Foundry projects yet.">
        {projects.map((project)=><div key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{project.name}</p><p className="mt-1 text-xs text-zinc-500">{labelize(project.project_type)} · {labelize(project.target_engine)} · {labelize(project.quality_profile)}</p></div><Status value={project.status}/></div><p className="mt-2 line-clamp-2 text-xs text-zinc-400">{project.prompt}</p>{project.design_spec?.concept&&<div className="mt-3 rounded-lg border border-cyan-300/10 bg-cyan-400/[.025] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-300/60">Compiled game design</p><p className="mt-1 text-xs text-zinc-300">{project.design_spec.concept}</p><div className="mt-2 grid gap-2 md:grid-cols-2">{project.design_spec.coreLoop?.slice(0,3).map((item)=><div key={item} className="rounded-md border border-white/[.06] bg-black/20 px-2 py-1.5 text-[11px] text-zinc-400">{item}</div>)}</div></div>}{project.content_manifest?.scenes?.length>0&&<div className="mt-3 rounded-lg border border-fuchsia-300/10 bg-fuchsia-400/[.025] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-fuchsia-300/60">Gameplay & world content</p><p className="mt-1 text-xs text-zinc-300">{project.content_manifest.overview}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-md border border-white/[.06] px-2 py-1 text-[10px] text-zinc-500">{project.content_manifest.scenes.length} scenes</span><span className="rounded-md border border-white/[.06] px-2 py-1 text-[10px] text-zinc-500">{project.content_manifest.quests?.length||0} quests</span><span className="rounded-md border border-white/[.06] px-2 py-1 text-[10px] text-zinc-500">{project.content_manifest.characters?.length||0} characters</span><span className="rounded-md border border-white/[.06] px-2 py-1 text-[10px] text-zinc-500">{project.content_manifest.assetRequirements?.length||0} asset requirements</span></div></div>}{project.content_error&&<p className="mt-2 text-xs text-amber-300">{project.content_error}</p>}{project.source_manifest?.files?.length>0&&<div className="mt-3 rounded-lg border border-cyan-300/10 bg-cyan-400/[.025] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-300/60">Generated engine source</p><p className="mt-1 text-xs text-zinc-300">{project.source_manifest.summary}</p><div className="mt-2 flex flex-wrap gap-1.5">{project.source_manifest.files.slice(0,8).map((file)=><span key={file.path} className="rounded-md border border-white/[.06] bg-black/20 px-2 py-1 font-mono text-[10px] text-zinc-500">{file.path}</span>)}</div></div>}{project.package_manifest?.assembly&&<div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-300/10 bg-emerald-400/[.025] p-3"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-300/60">Portable game project package</p><p className="mt-1 text-xs text-zinc-400">{project.package_manifest.assembly.sourceFileCount} source files · {project.package_manifest.assembly.linkedAssetCount} linked 3D assets · {labelize(project.target_engine)}</p></div></div>}{project.target_engine==='web'&&project.source_status==='generated'&&<div className="mt-3"><GameFoundryWebPreview sourceManifest={project.source_manifest} title={`${project.name} playable preview`}/></div>}{project.source_error&&<p className="mt-2 text-xs text-amber-300">{project.source_error}</p>}{project.export_manifest?.assets?.length>0&&<div className="mt-3 rounded-lg border border-violet-300/10 bg-violet-400/[.025] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-violet-300/60">Engine handoff manifest</p><p className="mt-1 text-xs text-zinc-400">{project.export_manifest.assets.length} linked asset{project.export_manifest.assets.length===1?'':'s'} · import root {project.export_manifest.importRoot}</p><p className="mt-1 text-[11px] text-zinc-500">Status: {labelize(project.handoff_status||'not_started')}{project.handoff_id?` · ${project.handoff_id}`:''}</p></div>}{project.handoff_error&&<p className="mt-2 text-xs text-amber-300">{project.handoff_error}</p>}{project.error_message&&<p className="mt-2 text-xs text-rose-300">{project.error_message}</p>}<div className="mt-3 flex flex-wrap gap-2">{['draft','failed'].includes(project.status)&&<button disabled={planProject.isPending} onClick={()=>planProject.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 px-2.5 py-1.5 text-xs text-cyan-200 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5"/>Generate design plan</button>}{project.status==='planned'&&['not_started','failed'].includes(project.content_status||'not_started')&&<button disabled={generateContent.isPending} onClick={()=>generateContent.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-300/20 px-2.5 py-1.5 text-xs text-fuchsia-200 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5"/>Generate world/content</button>}{project.status==='planned'&&['not_started','failed'].includes(project.source_status||'not_started')&&<button disabled={generateSource.isPending} onClick={()=>generateSource.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 px-2.5 py-1.5 text-xs text-cyan-200 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5"/>Generate engine source</button>}{project.status==='planned'&&<button disabled={!caps?.gameGeneration?.configured || generateProject.isPending} onClick={()=>generateProject.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/20 px-2.5 py-1.5 text-xs text-violet-200 disabled:opacity-40"><Play className="h-3.5 w-3.5"/>Build game</button>}{['queued','running'].includes(project.status)&&<button disabled={refreshProject.isPending} onClick={()=>refreshProject.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Refresh game build</button>}{project.source_status==='generated'&&<button disabled={preparePackage.isPending} onClick={()=>preparePackage.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-40"><Download className="h-3.5 w-3.5"/>Download project package</button>}<button disabled={prepareHandoff.isPending} onClick={()=>prepareHandoff.mutate(project.id)} className="rounded-lg border border-cyan-300/20 px-2.5 py-1.5 text-xs text-cyan-200 disabled:opacity-40">Prepare engine handoff</button>{project.handoff_status==='prepared'&&<button disabled={sendHandoff.isPending || !integrations.find((item)=>item.id===project.target_engine)?.bridgeConfigured} onClick={()=>sendHandoff.mutate(project.id)} className="rounded-lg border border-violet-300/20 px-2.5 py-1.5 text-xs text-violet-200 disabled:opacity-40">Send to configured bridge</button>}{['queued','running'].includes(project.handoff_status)&&<button disabled={refreshHandoff.isPending} onClick={()=>refreshHandoff.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Refresh handoff</button>}{project.preview_url&&<a href={project.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-xs text-emerald-300">Play preview</a>}{project.output_url&&<a href={project.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Open project output</a>}</div></div>)}
      </History>
      <History title="3D assets" icon={Box} empty="No Game Foundry 3D assets yet.">
        {assets.map((asset)=><div key={asset.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{asset.input_name}</p><p className="mt-1 text-xs text-zinc-500">{labelize(asset.source_kind)} · {asset.requested_format?.toUpperCase()} · {labelize(asset.target_engine)}</p></div><div className="flex gap-1"><Status value={asset.status}/>{asset.processing_status&&asset.processing_status!=='not_started'&&<Status value={asset.processing_status}/>}</div></div>{asset.error_message&&<p className="mt-2 text-xs text-rose-300">{asset.error_message}</p>}{(asset.processed_output_url||asset.output_url)&&['glb','gltf'].includes(String(asset.requested_format).toLowerCase())&&<div className="mt-3"><GameFoundryModelViewer url={asset.processed_output_url||asset.output_url} label={asset.input_name}/></div>}{asset.validation_report&&Object.keys(asset.validation_report).length>0&&<div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[.04] p-2.5 text-[11px] text-emerald-200"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span>Validation report returned by the configured processor.</span></div>}<div className="mt-3 flex flex-wrap gap-2">{(['queued','running'].includes(asset.status)||['queued','running'].includes(asset.processing_status||''))&&<button disabled={refreshAsset.isPending} onClick={()=>refreshAsset.mutate(asset.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Refresh worker</button>}{asset.status==='completed'&&asset.output_url&&['not_started','failed'].includes(asset.processing_status||'not_started')&&<button disabled={!caps?.gameReadyProcessing?.configured||processAsset.isPending} onClick={()=>processAsset.mutate(asset.id)} className="rounded-lg border border-cyan-300/20 px-2.5 py-1.5 text-xs text-cyan-200 disabled:opacity-40">Make game-ready</button>}{asset.preview_url&&<a href={asset.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-xs text-emerald-300">Preview</a>}{asset.processed_output_url&&<a href={asset.processed_output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-300/20 px-2.5 py-1.5 text-xs text-cyan-200">Open processed asset</a>}{asset.output_url&&<a href={asset.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Open source output</a>}</div></div>)}
      </History>
    </div>
  </>;
}

function Field({label,children}) { return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-500">{label}</span>{children}</label>; }
function labelize(value='') { return String(value).replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase()); }
function Status({value}) { const tone=value==='completed'?'border-emerald-400/20 text-emerald-300':value==='failed'?'border-rose-400/20 text-rose-300':value==='draft'?'border-white/10 text-zinc-300':'border-amber-400/20 text-amber-300'; return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
function History({title,icon:Icon,empty,children}) { const list=Array.isArray(children)?children:[children]; const has=list.filter(Boolean).length>0; return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">{title}</h2></div><div className="mt-3 space-y-3">{has?children:<Empty icon={Icon} title={empty} desc="Create one above to start the foundry pipeline."/>}</div></section>; }


function downloadJson(filename, value) {
  if (typeof window === 'undefined' || !value) return;
  const blob = new Blob([JSON.stringify(value,null,2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'blackstar-game-project.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
