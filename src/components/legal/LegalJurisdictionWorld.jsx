import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Globe2, Landmark, Scale } from 'lucide-react';

export default function LegalJurisdictionWorld({ sources=[], topics=[] }) {
  const reduced=useReducedMotion();
  const regions=[...new Set(sources.map((source)=>source.region))];
  const nodes=sources.slice(0,10);
  return <section className="relative overflow-hidden rounded-[30px] border border-sky-300/12 bg-[#03070b]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,.11),transparent_31%),radial-gradient(circle_at_20%_20%,rgba(139,92,246,.10),transparent_24%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-sky-300/70">Jurisdiction intelligence map</p><h2 className="mt-1 text-lg font-semibold text-white">Primary-source legal network</h2></div><div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{regions.length} regions</span><span>·</span><span>{sources.length} source gateways</span><span>·</span><span>{topics.length} domains</span></div></div>
    <div className="relative min-h-[330px] p-5">
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/15 md:block" animate={reduced?undefined:{rotate:[0,360]}} transition={reduced?undefined:{duration:48,repeat:Infinity,ease:'linear'}}/>
      <div className="relative hidden min-h-[290px] md:block"><div className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 text-center"><Scale className="mx-auto h-8 w-8 text-sky-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Legal source core</p><p className="mt-1 font-mono text-xl text-white">{sources.length}</p></div>{nodes.map((source,index)=>{const angle=(index/Math.max(nodes.length,1))*Math.PI*2;const left=50+Math.cos(angle)*39;const top=50+Math.sin(angle)*39;return <motion.div key={source.url||source.name} className="absolute w-[165px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/72 p-3 backdrop-blur-xl" style={{left:left+'%',top:top+'%'}} animate={reduced?undefined:{y:[0,-4,0]}} transition={reduced?undefined:{duration:4+(index%3),repeat:Infinity,delay:index*.1}}><div className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-sky-200"/><span className="min-w-0 flex-1 truncate text-[9px] text-white">{source.name}</span></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{source.region} · {source.kind}</p></motion.div>})}</div>
      <div className="grid gap-2 md:hidden">{nodes.map((source)=><div key={source.url||source.name} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-sky-200"/><span className="min-w-0 flex-1 truncate text-xs text-white">{source.name}</span><span className="text-[9px] uppercase text-zinc-500">{source.region}</span></div></div>)}</div>
    </div>
    <div className="relative flex gap-2 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500"><BookOpen className="h-3 w-3"/>official-source topology · not legal advice · current text must be verified</div>
  </section>;
}
