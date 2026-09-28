import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Boxes, Store, Wrench } from 'lucide-react';

const channels=[
  {label:'Community agents',Icon:Bot},
  {label:'Tool marketplace',Icon:Wrench},
  {label:'AI marketplace',Icon:Store},
  {label:'Creator catalogue',Icon:Boxes},
];

export default function MarketplaceWorld() {
  const reduced=useReducedMotion();
  return <section className="relative mb-5 overflow-hidden rounded-[30px] border border-violet-300/14 bg-[#060309]/92 shadow-[0_36px_110px_rgba(0,0,0,.42)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(139,92,246,.14),transparent_31%),radial-gradient(circle_at_82%_72%,rgba(34,211,238,.08),transparent_25%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-violet-300/70">Blackstar commerce universe</p><h2 className="mt-1 text-lg font-semibold text-white">Creator and capability marketplace</h2></div><p className="ml-auto max-w-md text-right text-[9px] uppercase tracking-[.12em] text-zinc-500">Ambient navigation world · listing availability comes from the live browser below</p></div>
    <div className="relative min-h-[280px] p-5">
      <motion.div aria-hidden className="absolute left-1/2 top-1/2 hidden h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/18 md:block" animate={reduced?undefined:{rotate:[0,360]}} transition={reduced?undefined:{duration:44,repeat:Infinity,ease:'linear'}}/>
      <div className="relative hidden min-h-[240px] md:block"><div className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 text-center"><Store className="mx-auto h-8 w-8 text-violet-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Marketplace core</p><p className="mt-1 text-sm font-semibold text-white">Discover · publish · install</p></div>{channels.map(({label,Icon},index)=>{const angle=(index/channels.length)*Math.PI*2;const left=50+Math.cos(angle)*38;const top=50+Math.sin(angle)*38;return <motion.div key={label} className="absolute w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/72 p-3 backdrop-blur-xl" style={{left:left+'%',top:top+'%'}} animate={reduced?undefined:{y:[0,-4,0]}} transition={reduced?undefined:{duration:4+index*.45,repeat:Infinity,delay:index*.1}}><div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-violet-200"/><span className="text-[9px] text-white">{label}</span></div></motion.div>})}</div>
      <div className="grid grid-cols-2 gap-2 md:hidden">{channels.map(({label,Icon})=><div key={label} className="rounded-xl border border-white/10 bg-black/45 p-3"><Icon className="h-4 w-4 text-violet-200"/><p className="mt-2 text-xs text-white">{label}</p></div>)}</div>
    </div>
  </section>;
}
