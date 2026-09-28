import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Cpu, Database, Network, ServerCog, Workflow } from 'lucide-react';

const ICONS = { model: Cpu, agent: Bot, workflow: Workflow, dataset: Database, compute: ServerCog, mcp: Network };
const LIVE = new Set(['available','active','enabled','production','published']);

export default function AiHubNetworkScene({ resources = [], providers = [], loading = false }) {
  const reduced = useReducedMotion();
  const nodes = resources
    .filter((resource) => ['model','agent','workflow','dataset','compute','mcp'].includes(resource.kind))
    .slice(0, 10);
  const active = nodes.filter((node) => LIVE.has(node.status)).length;
  const providerCount = new Set(nodes.map((node) => node.providerId)).size;

  return <section className="relative overflow-hidden rounded-[28px] border border-violet-300/15 bg-[#03050b]/90 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,.18),transparent_34%),radial-gradient(circle_at_20%_20%,rgba(34,211,238,.08),transparent_26%)]" />
    <motion.div aria-hidden className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(139,92,246,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,.045)_1px,transparent_1px)] [background-size:36px_36px]" animate={reduced ? undefined : { backgroundPosition: ['0px 0px','36px 36px'] }} transition={reduced ? undefined : { duration: 12, repeat: Infinity, ease: 'linear' }} />
    <div className="relative border-b border-white/7 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/70">Neural intelligence network</p><h2 className="mt-1 text-lg font-semibold text-white">Live capability topology</h2></div>
        <div className="ml-auto flex flex-wrap gap-2 font-mono text-[9px] text-zinc-400"><span>{providers.length} systems</span><span>·</span><span>{providerCount} providers</span><span>·</span><span>{active} active nodes</span></div>
      </div>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Spatial view of Blackstar's existing Hub inventory. Motion represents live or available state only and never implies execution.</p>
    </div>
    <div className="relative min-h-[360px] p-4 sm:p-6">
      <motion.div className="absolute left-1/2 top-1/2 hidden h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/[.06] shadow-[0_0_70px_rgba(124,58,237,.2)] md:flex" animate={reduced ? undefined : { scale:[1,1.035,1], opacity:[.8,1,.8] }} transition={reduced ? undefined : { duration:3.6, repeat:Infinity }}>
        <div className="text-center"><Network className="mx-auto h-7 w-7 text-violet-200" /><p className="mt-2 text-[8px] uppercase tracking-[.18em] text-zinc-500">Blackstar Hub</p><p className="mt-1 font-mono text-2xl text-white">{nodes.length}</p></div>
      </motion.div>
      <div className="hidden md:block">
        {nodes.map((node,index) => {
          const angle=(index/Math.max(nodes.length,1))*Math.PI*2;
          const left=50+Math.cos(angle)*35;
          const top=50+Math.sin(angle)*36;
          const Icon=ICONS[node.kind] ?? Network;
          const live=LIVE.has(node.status);
          return <motion.div key={node.kind+node.providerId+node.id} className="absolute w-[155px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl" style={{left:left+'%',top:top+'%'}} animate={reduced || !live ? undefined : { y:[0,-5,0] }} transition={reduced || !live ? undefined : { duration:3.4+(index%3), repeat:Infinity, delay:index*.12 }}>
            <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-violet-200" /><p className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">{node.name}</p><span className={'h-1.5 w-1.5 rounded-full '+(live?'bg-emerald-300':'bg-zinc-700')} /></div>
            <p className="mt-1 truncate text-[8px] uppercase tracking-[.1em] text-zinc-600">{node.kind} · {node.providerId}</p>
          </motion.div>;
        })}
      </div>
      <div className="grid gap-2 md:hidden">
        {nodes.map((node) => { const Icon=ICONS[node.kind] ?? Network; return <div key={node.kind+node.providerId+node.id} className="rounded-xl border border-white/10 bg-black/45 p-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-200" /><span className="min-w-0 flex-1 truncate text-xs text-white">{node.name}</span><span className="text-[9px] uppercase text-zinc-500">{node.status}</span></div></div>; })}
        {!nodes.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">{loading ? 'Synchronising live Hub resources…' : 'No live topology nodes are available yet.'}</div>}
      </div>
    </div>
  </section>;
}
