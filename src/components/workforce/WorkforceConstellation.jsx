import { motion, useReducedMotion } from 'framer-motion';
import { Building2, Network, Workflow } from 'lucide-react';
import AgentIdentityAvatar from '@/components/agents/AgentIdentityAvatar';

const LIVE_TASKS=new Set(['running','queued','waiting_for_approval','awaiting_approval']);

export default function WorkforceConstellation({ agents=[], tasks=[], teams=[] }) {
  const reduced=useReducedMotion();
  const activeIds=new Set(tasks.filter((task)=>task.agent_id&&LIVE_TASKS.has(task.status)).map((task)=>task.agent_id));
  const nodes=agents.slice(0,14);
  const active=nodes.filter((agent)=>activeIds.has(agent.id)).length;

  return <section className="relative mb-6 overflow-hidden rounded-[28px] border border-violet-300/15 bg-[#03050a]/90 shadow-[0_30px_100px_rgba(0,0,0,.34)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,.18),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,.08),transparent_24%)]" />
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/70">Living workforce constellation</p><h2 className="mt-1 text-lg font-semibold text-white">Agents, departments and live execution</h2></div>
      <div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{agents.length} agents</span><span>·</span><span>{teams.length} departments</span><span>·</span><span>{active} executing</span></div>
    </div>
    <div className="relative min-h-[390px] p-4">
      <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(167,139,250,.24)_1px,transparent_1px)] [background-size:28px_28px]" />
      <motion.div className="absolute left-1/2 top-1/2 hidden h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/[.06] shadow-[0_0_70px_rgba(124,58,237,.18)] md:flex" animate={reduced||active===0?undefined:{scale:[1,1.04,1]}} transition={reduced||active===0?undefined:{duration:3.2,repeat:Infinity}}>
        <div className="text-center"><Network className="mx-auto h-7 w-7 text-violet-200"/><p className="mt-2 text-[8px] uppercase tracking-[.16em] text-zinc-500">Workforce mesh</p><p className="mt-1 font-mono text-2xl text-white">{active}</p></div>
      </motion.div>
      <div className="hidden md:block">
        {nodes.map((agent,index)=>{const angle=(index/Math.max(nodes.length,1))*Math.PI*2;const left=50+Math.cos(angle)*37;const top=50+Math.sin(angle)*37;const executing=activeIds.has(agent.id);return <motion.div key={agent.id} className={'absolute w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 backdrop-blur-xl '+(executing?'border-cyan-300/25 bg-cyan-300/[.06]':'border-white/10 bg-black/70')} style={{left:left+'%',top:top+'%'}} animate={reduced||!executing?undefined:{y:[0,-5,0],boxShadow:['0 0 0 rgba(34,211,238,0)','0 0 24px rgba(34,211,238,.14)','0 0 0 rgba(34,211,238,0)']}} transition={reduced||!executing?undefined:{duration:3.4+(index%3),repeat:Infinity,delay:index*.1}}>
          <div className="flex items-center gap-2"><AgentIdentityAvatar name={agent.name} identity={agent.identity} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-medium text-white">{agent.name}</p><p className="truncate text-[7px] font-semibold uppercase tracking-[.12em] text-zinc-700">AI agent</p></div><span className={'h-1.5 w-1.5 rounded-full '+(executing?'bg-cyan-300':'bg-zinc-700')}/></div><p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{executing?'executing':'ready'} · {agent.status}</p>
        </motion.div>;})}
      </div>
      <div className="grid gap-2 md:hidden">
        {nodes.map((agent)=>{const executing=activeIds.has(agent.id);return <div key={agent.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><AgentIdentityAvatar name={agent.name} identity={agent.identity} size="sm" /><span className="min-w-0 flex-1 truncate text-xs text-white">{agent.name}<span className="ml-1.5 text-[8px] font-semibold uppercase tracking-[.12em] text-zinc-700">AI</span></span><span className="text-[9px] uppercase text-zinc-500">{executing?'executing':agent.status}</span></div></div>;})}
        {!nodes.length&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">Deploy an agent to bring the workforce constellation online.</div>}
      </div>
    </div>
    <div className="relative flex flex-wrap gap-3 border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500"><span className="flex items-center gap-1.5"><Building2 className="h-3 w-3"/>departments {teams.length}</span><span className="flex items-center gap-1.5"><Workflow className="h-3 w-3"/>live task paths {tasks.filter((task)=>LIVE_TASKS.has(task.status)).length}</span></div>
  </section>;
}
