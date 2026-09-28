import { motion, useReducedMotion } from 'framer-motion';
import { Bot, GitBranch, Radio, Workflow } from 'lucide-react';

export default function AgentCommandMesh({ agents=[], executingIds, liveWorkflows=0 }) {
  const reduced=useReducedMotion();
  const activeSet=executingIds instanceof Set?executingIds:new Set(executingIds||[]);
  const nodes=agents.slice(0,16);
  const executing=nodes.filter((agent)=>activeSet.has(agent.id)).length;

  return <section className="relative mb-6 overflow-hidden rounded-[28px] border border-cyan-300/12 bg-[#02060c]/90 shadow-[0_30px_100px_rgba(0,0,0,.34)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,.12),transparent_32%),radial-gradient(circle_at_25%_20%,rgba(139,92,246,.14),transparent_24%)]" />
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-cyan-300/70">Agent execution mesh</p><h2 className="mt-1 text-lg font-semibold text-white">Live intelligence handoffs</h2></div>
      <div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{agents.length} nodes</span><span>·</span><span>{executing} executing</span><span>·</span><span>{liveWorkflows} workflows</span></div>
    </div>
    <div className="relative min-h-[360px] p-4">
      <motion.div className="absolute left-1/2 top-1/2 hidden h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/[.05] shadow-[0_0_70px_rgba(34,211,238,.16)] md:flex" animate={reduced||executing===0?undefined:{rotate:[0,360]}} transition={reduced||executing===0?undefined:{duration:28,repeat:Infinity,ease:'linear'}}>
        <div className="text-center"><Radio className="mx-auto h-6 w-6 text-cyan-200"/><p className="mt-2 text-[8px] uppercase tracking-[.16em] text-zinc-500">Runtime mesh</p><p className="mt-1 font-mono text-xl text-white">{executing}</p></div>
      </motion.div>
      <div className="hidden md:block">
        {nodes.map((agent,index)=>{const angle=(index/Math.max(nodes.length,1))*Math.PI*2;const left=50+Math.cos(angle)*38;const top=50+Math.sin(angle)*36;const live=activeSet.has(agent.id);return <motion.div key={agent.id} className={'absolute w-[145px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 backdrop-blur-xl '+(live?'border-cyan-300/25 bg-cyan-300/[.055]':'border-violet-300/10 bg-black/72')} style={{left:left+'%',top:top+'%'}} animate={reduced||!live?undefined:{scale:[1,1.035,1],boxShadow:['0 0 0 rgba(34,211,238,0)','0 0 28px rgba(34,211,238,.13)','0 0 0 rgba(34,211,238,0)']}} transition={reduced||!live?undefined:{duration:2.8+(index%4)*.4,repeat:Infinity,delay:index*.08}}>
          <div className="flex items-center gap-2"><Bot className={live?'h-3.5 w-3.5 text-cyan-200':'h-3.5 w-3.5 text-violet-200'}/><span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">{agent.name}</span><span className={'h-1.5 w-1.5 rounded-full '+(live?'bg-cyan-300':'bg-zinc-700')}/></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{live?'executing':agent.status}</p>
        </motion.div>;})}
      </div>
      <div className="grid gap-2 md:hidden">{nodes.map((agent)=>{const live=activeSet.has(agent.id);return <div key={agent.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Bot className={live?'h-4 w-4 text-cyan-200':'h-4 w-4 text-violet-200'}/><span className="min-w-0 flex-1 truncate text-xs text-white">{agent.name}</span><span className="text-[9px] uppercase text-zinc-500">{live?'executing':agent.status}</span></div></div>;})}{!nodes.length&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No agent nodes are deployed yet.</div>}</div>
    </div>
    <div className="relative flex flex-wrap gap-4 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500"><span className="flex items-center gap-1.5"><GitBranch className="h-3 w-3"/>handoffs follow real runtime assignments</span><span className="flex items-center gap-1.5"><Workflow className="h-3 w-3"/>no simulated executions</span></div>
  </section>;
}
