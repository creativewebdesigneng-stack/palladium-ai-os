import { motion, useReducedMotion } from 'framer-motion';
import { Code2, Monitor, PanelsTopLeft, Rocket } from 'lucide-react';

export default function WebsiteStudioWorld({ projects=[], draft, revisions=[], busy=false }) {
  const reduced=useReducedMotion();
  const pages=Array.isArray(draft?.pages)?draft.pages.length:0;
  const hasProject=Boolean(draft?.id||draft?.name);
  const published=projects.filter((project)=>project.production_url||project.status==='published').length;
  const nodes=projects.slice(0,8);
  return <section className="relative mb-5 overflow-hidden rounded-[30px] border border-violet-300/14 bg-[#05030a]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(139,92,246,.15),transparent_31%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,.08),transparent_26%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/70">Spatial web creation workspace</p><h2 className="mt-1 text-lg font-semibold text-white">Website Studio design universe</h2></div><div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{projects.length} projects</span><span>·</span><span>{pages} active pages</span><span>·</span><span>{published} published</span></div></div>
    <div className="relative min-h-[320px] p-5">
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-44 w-60 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-violet-300/18 bg-violet-300/[.035] shadow-[0_0_80px_rgba(139,92,246,.12)] md:block" animate={reduced||!busy?undefined:{scale:[1,1.035,1]}} transition={reduced||!busy?undefined:{duration:2.8,repeat:Infinity}}/>
      <div className="relative hidden min-h-[280px] md:block"><div className="absolute left-1/2 top-1/2 z-10 w-48 -translate-x-1/2 -translate-y-1/2 text-center"><Monitor className="mx-auto h-8 w-8 text-violet-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Active canvas</p><p className="mt-1 truncate text-sm font-semibold text-white">{hasProject?(draft.name||'Untitled website'):'No project selected'}</p><p className="mt-1 text-[9px] text-zinc-600">{revisions.length} revisions</p></div>{nodes.map((project,index)=>{const positions=[['15%','24%'],['85%','24%'],['14%','76%'],['86%','76%'],['31%','13%'],['69%','13%'],['31%','87%'],['69%','87%']];const [left,top]=positions[index]||['50%','50%'];return <motion.div key={project.id} className="absolute w-[155px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/72 p-3 backdrop-blur-xl" style={{left,top}} animate={reduced?undefined:{y:[0,-4,0]}} transition={reduced?undefined:{duration:4+(index%3),repeat:Infinity,delay:index*.08}}><div className="flex items-center gap-2"><Code2 className="h-3.5 w-3.5 text-violet-200"/><span className="min-w-0 flex-1 truncate text-[9px] text-white">{project.name}</span></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{project.status||'draft'} · {project.framework||'html'}</p></motion.div>})}</div>
      <div className="grid gap-2 md:hidden">{nodes.map((project)=><div key={project.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><PanelsTopLeft className="h-4 w-4 text-violet-200"/><span className="min-w-0 flex-1 truncate text-xs text-white">{project.name}</span><span className="text-[9px] uppercase text-zinc-500">{project.status||'draft'}</span></div></div>)}</div>
    </div>
    <div className="relative flex gap-2 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500"><Rocket className="h-3 w-3"/>visual state reflects saved projects and current editor state · deployment status is not fabricated</div>
  </section>;
}
