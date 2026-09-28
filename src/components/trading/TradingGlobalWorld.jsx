import { motion, useReducedMotion } from 'framer-motion';
import { Globe2, Landmark, LineChart, Radar } from 'lucide-react';

export default function TradingGlobalWorld({ venues=[], authorities=[], sessions=[], assetClasses=[] }) {
  const reduced=useReducedMotion();
  const nodes=[...venues.slice(0,6),...authorities.slice(0,4)];
  return <section className="relative overflow-hidden rounded-[30px] border border-emerald-300/12 bg-[#020807]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,.12),transparent_31%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,.09),transparent_24%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-emerald-300/70">Global market reference network</p><h2 className="mt-1 text-lg font-semibold text-white">Trading intelligence command field</h2></div>
      <div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{venues.length} venues</span><span>·</span><span>{authorities.length} authorities</span><span>·</span><span>{sessions.length} sessions</span></div>
    </div>
    <div className="relative min-h-[330px] p-5">
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/15 md:block" animate={reduced?undefined:{rotate:[0,360]}} transition={reduced?undefined:{duration:42,repeat:Infinity,ease:'linear'}}/>
      <div className="relative hidden min-h-[290px] md:block">
        <div className="absolute left-1/2 top-1/2 z-10 w-48 -translate-x-1/2 -translate-y-1/2 text-center"><Globe2 className="mx-auto h-8 w-8 text-emerald-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Global market graph</p><p className="mt-1 font-mono text-xl text-white">{assetClasses.length}</p><p className="text-[9px] text-zinc-600">asset classes</p></div>
        {nodes.map((node,index)=>{const angle=(index/Math.max(nodes.length,1))*Math.PI*2;const left=50+Math.cos(angle)*39;const top=50+Math.sin(angle)*39;const Authority=index>=Math.min(venues.length,6);return <motion.div key={(node.name||'node')+index} className="absolute w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/72 p-3 backdrop-blur-xl" style={{left:left+'%',top:top+'%'}} animate={reduced?undefined:{y:[0,-4,0]}} transition={reduced?undefined:{duration:4+(index%3),repeat:Infinity,delay:index*.1}}><div className="flex items-center gap-2">{Authority?<Landmark className="h-3.5 w-3.5 text-cyan-200"/>:<LineChart className="h-3.5 w-3.5 text-emerald-200"/>}<span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">{node.name}</span></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{node.region} · {node.kind}</p></motion.div>})}
      </div>
      <div className="grid gap-2 md:hidden">{nodes.map((node,index)=><div key={(node.name||'node')+index} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Radar className="h-4 w-4 text-emerald-200"/><span className="min-w-0 flex-1 truncate text-xs text-white">{node.name}</span><span className="text-[9px] uppercase text-zinc-500">{node.region}</span></div></div>)}</div>
    </div>
    <div className="relative border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500">Reference topology only · not a live price feed · provider-gated market data remains explicitly separate</div>
  </section>;
}
