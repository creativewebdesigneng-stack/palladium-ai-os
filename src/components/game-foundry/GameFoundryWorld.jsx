import { motion, useReducedMotion } from 'framer-motion';
import { Box, Gamepad2, Layers3, Network } from 'lucide-react';

const LIVE=new Set(['queued','running','processing','building']);

export default function GameFoundryWorld({ capabilities, projects=[], assets=[], integrations=[] }) {
  const reduced=useReducedMotion();
  const activeProjects=projects.filter((project)=>LIVE.has(project.status)).length;
  const activeAssets=assets.filter((asset)=>LIVE.has(asset.status)||LIVE.has(asset.processing_status)).length;
  const completedAssets=assets.filter((asset)=>asset.status==='completed'||asset.processing_status==='completed').length;
  const bridges=integrations.filter((item)=>item.bridgeConfigured).length;
  const worker=capabilities?.assetGeneration?.configuredProvider||'blackstar-hosted-3d';

  return <section className="relative mb-5 overflow-hidden rounded-[30px] border border-cyan-300/15 bg-[#02070b]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.13),transparent_31%),radial-gradient(circle_at_18%_70%,rgba(139,92,246,.13),transparent_28%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-cyan-300/70">Spatial creation engine</p><h2 className="mt-1 text-lg font-semibold text-white">Game Foundry fabrication field</h2></div>
      <div className="ml-auto flex flex-wrap gap-2 font-mono text-[9px] text-zinc-400"><span>{projects.length} projects</span><span>·</span><span>{completedAssets} assets ready</span><span>·</span><span>{bridges} bridges</span></div>
    </div>
    <div className="relative min-h-[340px] p-5">
      <div aria-hidden className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(34,211,238,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.045)_1px,transparent_1px)] [background-size:32px_32px]"/>
      <motion.div className="absolute left-1/2 top-1/2 hidden h-44 w-44 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[34px] border border-cyan-300/20 bg-cyan-300/[.045] shadow-[0_0_80px_rgba(34,211,238,.14)] md:block" animate={reduced||activeProjects+activeAssets===0?undefined:{rotate:[45,405]}} transition={reduced||activeProjects+activeAssets===0?undefined:{duration:34,repeat:Infinity,ease:'linear'}}/>
      <div className="relative hidden min-h-[300px] md:block">
        <div className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-cyan-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Foundry core</p><p className="mt-1 font-mono text-xl text-white">{activeProjects+activeAssets}</p><p className="text-[9px] text-zinc-600">active jobs</p></div>
        {assets.slice(0,10).map((asset,index)=>{const angle=(index/Math.max(Math.min(assets.length,10),1))*Math.PI*2;const left=50+Math.cos(angle)*39;const top=50+Math.sin(angle)*39;const live=LIVE.has(asset.status)||LIVE.has(asset.processing_status);return <motion.div key={asset.id} className={'absolute w-[155px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 backdrop-blur-xl '+(live?'border-cyan-300/25 bg-cyan-300/[.055]':'border-violet-300/10 bg-black/72')} style={{left:left+'%',top:top+'%'}} animate={reduced||!live?undefined:{scale:[1,1.035,1]}} transition={reduced||!live?undefined:{duration:3.2+(index%3),repeat:Infinity,delay:index*.08}}><div className="flex items-center gap-2"><Box className="h-3.5 w-3.5 text-cyan-200"/><span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">{asset.input_name}</span></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{asset.processing_status&&asset.processing_status!=='not_started'?asset.processing_status:asset.status} · {asset.requested_format}</p></motion.div>})}
      </div>
      <div className="grid gap-2 md:hidden">{assets.slice(0,10).map((asset)=><div key={asset.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Box className="h-4 w-4 text-cyan-200"/><span className="min-w-0 flex-1 truncate text-xs text-white">{asset.input_name}</span><span className="text-[9px] uppercase text-zinc-500">{asset.processing_status&&asset.processing_status!=='not_started'?asset.processing_status:asset.status}</span></div></div>)}{!assets.length&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">Generate a 3D asset to initialise the fabrication field.</div>}</div>
    </div>
    <div className="relative grid gap-2 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500 sm:grid-cols-3"><span className="flex items-center gap-1.5"><Layers3 className="h-3 w-3"/>worker {worker}</span><span className="flex items-center gap-1.5"><Network className="h-3 w-3"/>native compiler {capabilities?.gameGeneration?.nativeCompiler?'online':'unavailable'}</span><span>external game worker {capabilities?.gameGeneration?.externalWorkerConfigured?'configured':'optional'}</span></div>
  </section>;
}
