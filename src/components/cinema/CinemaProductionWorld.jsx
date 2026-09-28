import { motion, useReducedMotion } from 'framer-motion';
import { Clapperboard, Film, Layers3, Sparkles } from 'lucide-react';

const ACTIVE=new Set(['planned','queued','running','rendering','assembling']);

export default function CinemaProductionWorld({ capabilities, projects=[] }) {
  const reduced=useReducedMotion();
  const active=projects.filter((project)=>ACTIVE.has(project.status)).length;
  const scenes=projects.reduce((sum,project)=>sum+(project.production_manifest?.scenes?.length||0),0);
  const compiled=projects.filter((project)=>project.production_manifest?.scenes?.length>0).length;
  const masterOnline=capabilities?.masterConfigured===true;
  const renderOnline=capabilities?.renderConfigured===true;

  return <section className="relative mb-5 overflow-hidden rounded-[30px] border border-fuchsia-300/15 bg-[#050309]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(217,70,239,.15),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(124,58,237,.12),transparent_28%)]"/>
    <div aria-hidden className="absolute inset-x-0 top-[45%] h-px bg-gradient-to-r from-transparent via-fuchsia-200/25 to-transparent"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-fuchsia-300/70">Virtual production stage</p><h2 className="mt-1 text-lg font-semibold text-white">Cinema continuity universe</h2></div>
      <div className="ml-auto flex flex-wrap gap-2 font-mono text-[9px] text-zinc-400"><span>{projects.length} projects</span><span>·</span><span>{scenes} scenes</span><span>·</span><span>{active} active</span></div>
    </div>
    <div className="relative min-h-[340px] px-5 py-8 sm:px-8">
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/20 md:block" animate={reduced||active===0?undefined:{rotate:[0,360]}} transition={reduced||active===0?undefined:{duration:30,repeat:Infinity,ease:'linear'}}/>
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/25 bg-violet-400/[.06] shadow-[0_0_80px_rgba(168,85,247,.18)] md:block" animate={reduced||active===0?undefined:{scale:[1,1.055,1]}} transition={reduced||active===0?undefined:{duration:3.8,repeat:Infinity}}/>
      <div className="relative hidden min-h-[270px] md:block">
        <div className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 text-center"><Clapperboard className="mx-auto h-8 w-8 text-fuchsia-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Production core</p><p className="mt-1 text-2xl font-semibold text-white">{compiled}</p><p className="text-[9px] text-zinc-600">compiled films</p></div>
        {projects.slice(0,8).map((project,index)=>{const angle=(index/Math.max(Math.min(projects.length,8),1))*Math.PI*2;const left=50+Math.cos(angle)*39;const top=50+Math.sin(angle)*39;const live=ACTIVE.has(project.status);return <motion.div key={project.id} className={'absolute w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 backdrop-blur-xl '+(live?'border-fuchsia-300/22 bg-fuchsia-300/[.055]':'border-white/10 bg-black/72')} style={{left:left+'%',top:top+'%'}} animate={reduced||!live?undefined:{y:[0,-5,0]}} transition={reduced||!live?undefined:{duration:3.4+(index%3),repeat:Infinity,delay:index*.12}}><div className="flex items-center gap-2"><Film className="h-3.5 w-3.5 text-fuchsia-200"/><span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">{project.title}</span></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{project.status} · {project.target_duration_minutes} min</p></motion.div>})}
      </div>
      <div className="grid gap-2 md:hidden">{projects.slice(0,8).map((project)=><div key={project.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Film className="h-4 w-4 text-fuchsia-200"/><span className="min-w-0 flex-1 truncate text-xs text-white">{project.title}</span><span className="text-[9px] uppercase text-zinc-500">{project.status}</span></div></div>)}{!projects.length&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">Develop a film to initialise the production universe.</div>}</div>
    </div>
    <div className="relative grid gap-2 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500 sm:grid-cols-3"><span className="flex items-center gap-1.5"><Layers3 className="h-3 w-3"/>shot architecture {compiled?'online':'ready'}</span><span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3"/>master {masterOnline?'online':'offline'}</span><span>direct renderer {renderOnline?'configured':'optional'}</span></div>
  </section>;
}
