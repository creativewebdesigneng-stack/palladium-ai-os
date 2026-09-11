import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Box, FileUp, Gamepad2, Image as ImageIcon, Loader2, Play, Sparkles, UploadCloud } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { Failed, Empty } from '@/components/business/live';
import { useToast } from '@/components/ui/use-toast';
import { uploadGameFoundrySource } from '@/lib/game-foundry/uploadGameFoundrySource';
import GameFoundryModelViewer from '@/components/game-foundry/GameFoundryModelViewer';
import {
  createGameFoundryAsset,
  createGameFoundryProject,
  generateGameFoundryProject,
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
  const createAssetFn = useServerFn(createGameFoundryAsset);

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

  const overview = useQuery({ queryKey:['game-foundry'], queryFn:()=>overviewFn(), enabled:session==='yes', retry:false });
  const refresh = () => qc.invalidateQueries({queryKey:['game-foundry']});

  const createProject = useMutation({
    mutationFn:()=>createProjectFn({data:{name,prompt,targetEngine:engine,projectType,qualityProfile:quality}}),
    onSuccess:async()=>{ setName(''); setPrompt(''); await refresh(); toast({title:'Game Foundry project created'}); },
    onError:(error)=>toast({variant:'destructive',title:'Could not create project',description:friendlyMessage(error)}),
  });
  const generateProject = useMutation({
    mutationFn:(id)=>generateProjectFn({data:{id}}),
    onSuccess:async()=>{ await refresh(); toast({title:'Game generation submitted'}); },
    onError:async(error)=>{ await refresh(); toast({variant:'destructive',title:'Game generation could not start',description:friendlyMessage(error)}); },
  });
  const createAsset = useMutation({
    mutationFn:async()=>{
      let storagePath = null;
      if (sourceKind !== 'prompt' && sourceFile) {
        const uploaded = await uploadGameFoundrySource(sourceFile);
        storagePath = uploaded.storagePath;
      }
      return createAssetFn({data:{
        projectId:null,inputName:assetName,sourceKind,prompt:sourceKind==='prompt'?assetPrompt:null,
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
        </div>
        {sourceKind === 'prompt' ? <Field label="3D prompt"><textarea rows={5} value={assetPrompt} onChange={(e)=>setAssetPrompt(e.target.value)} className={control+' mt-3'} placeholder="A weathered sci-fi rifle, hard-surface PBR, clean topology, game-ready proportions…" /></Field> : <div className="mt-3 grid gap-3"><Field label={sourceKind==='image'?'Upload reference image':'Upload existing 3D model'}><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-cyan-300/20 bg-cyan-400/[.03] px-3 py-3 text-xs text-zinc-300"><FileUp className="h-4 w-4 text-cyan-300"/><span className="min-w-0 flex-1 truncate">{sourceFile?.name || (sourceKind==='image'?'Choose PNG/JPG/WEBP/AVIF up to 100 MB':'Choose GLB/glTF/FBX/OBJ/USD/PLY/STL/VOX up to 100 MB')}</span><input type="file" className="hidden" accept={sourceKind==='image'?'.png,.jpg,.jpeg,.webp,.avif':'.glb,.gltf,.fbx,.obj,.usd,.usdz,.ply,.stl,.vox'} onChange={(e)=>setSourceFile(e.target.files?.[0] ?? null)} /></label></Field><div className="text-center text-[10px] uppercase tracking-[.2em] text-zinc-700">or</div><Field label={sourceKind==='image'?'Public reference image URL':'Public model URL'}><input value={sourceUrl} onChange={(e)=>setSourceUrl(e.target.value)} className={control} placeholder="https://…" /></Field></div>}
        <button disabled={!canCreateAsset || !assetName.trim() || createAsset.isPending || !hasAssetSource} onClick={()=>createAsset.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{createAsset.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:sourceKind==='image'?<ImageIcon className="h-4 w-4"/>:<UploadCloud className="h-4 w-4"/>}Generate asset</button>
        {!canCreateAsset && <p className="mt-2 text-xs text-amber-300">{sourceKind==='prompt'?'Prompt-to-3D requires GAME_FOUNDRY_3D_API_URL.':sourceKind==='model'?'Model enhancement requires GAME_FOUNDRY_3D_API_URL.':'No real image-to-3D worker is configured.'}</p>}
      </section>
    </div>

    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <h2 className="text-sm font-semibold text-white">Engine & DCC targets</h2>
      <p className="mt-1 text-xs text-zinc-500">Blackstar distinguishes compatible export formats from genuine plugin/bridge integrations.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{engineCards.map((item)=><div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-sm font-medium text-white">{labelize(item.id)}</p><p className="mt-1 text-[11px] text-zinc-500">{item.integration}</p><p className="mt-2 text-[11px] text-zinc-400">{item.exports.join(' · ')}</p></div>)}</div>
    </section>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <History title="Game projects" icon={Gamepad2} empty="No Game Foundry projects yet.">
        {projects.map((project)=><div key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{project.name}</p><p className="mt-1 text-xs text-zinc-500">{labelize(project.project_type)} · {labelize(project.target_engine)} · {labelize(project.quality_profile)}</p></div><Status value={project.status}/></div><p className="mt-2 line-clamp-2 text-xs text-zinc-400">{project.prompt}</p>{project.error_message&&<p className="mt-2 text-xs text-rose-300">{project.error_message}</p>}<div className="mt-3 flex flex-wrap gap-2">{project.status==='draft'&&<button disabled={!caps?.gameGeneration?.configured || generateProject.isPending} onClick={()=>generateProject.mutate(project.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/20 px-2.5 py-1.5 text-xs text-violet-200 disabled:opacity-40"><Play className="h-3.5 w-3.5"/>Generate game</button>}{project.preview_url&&<a href={project.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-xs text-emerald-300">Play preview</a>}{project.output_url&&<a href={project.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Open project output</a>}</div></div>)}
      </History>
      <History title="3D assets" icon={Box} empty="No Game Foundry 3D assets yet.">
        {assets.map((asset)=><div key={asset.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{asset.input_name}</p><p className="mt-1 text-xs text-zinc-500">{labelize(asset.source_kind)} · {asset.requested_format?.toUpperCase()} · {labelize(asset.target_engine)}</p></div><Status value={asset.status}/></div>{asset.error_message&&<p className="mt-2 text-xs text-rose-300">{asset.error_message}</p>}{asset.output_url&&['glb','gltf'].includes(String(asset.requested_format).toLowerCase())&&<div className="mt-3"><GameFoundryModelViewer url={asset.output_url} label={asset.input_name}/></div>}<div className="mt-3 flex gap-2">{asset.preview_url&&<a href={asset.preview_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-300/20 px-2.5 py-1.5 text-xs text-emerald-300">Preview</a>}{asset.output_url&&<a href={asset.output_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">Open asset</a>}</div></div>)}
      </History>
    </div>
  </>;
}

function Field({label,children}) { return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-500">{label}</span>{children}</label>; }
function labelize(value='') { return String(value).replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase()); }
function Status({value}) { const tone=value==='completed'?'border-emerald-400/20 text-emerald-300':value==='failed'?'border-rose-400/20 text-rose-300':value==='draft'?'border-white/10 text-zinc-300':'border-amber-400/20 text-amber-300'; return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${tone}`}>{value}</span>; }
function History({title,icon:Icon,empty,children}) { const list=Array.isArray(children)?children:[children]; const has=list.filter(Boolean).length>0; return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">{title}</h2></div><div className="mt-3 space-y-3">{has?children:<Empty icon={Icon} title={empty} desc="Create one above to start the foundry pipeline."/>}</div></section>; }
