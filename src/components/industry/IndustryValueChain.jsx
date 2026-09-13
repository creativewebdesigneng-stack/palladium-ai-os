import { Network, PackageSearch, ShieldAlert, Factory, Truck, Warehouse, UsersRound } from 'lucide-react';

const stages=[
 ['Inputs & suppliers',PackageSearch,['Critical inputs','Supplier concentration','Substitution options','Lead times']],
 ['Production / service',Factory,['Capacity constraints','Quality points','Automation','Energy/resource intensity']],
 ['Warehousing & inventory',Warehouse,['Buffer strategy','Inventory turns','Storage constraints','Traceability']],
 ['Distribution & logistics',Truck,['Routes and modes','Carrier concentration','Border exposure','Last-mile constraints']],
 ['Customer / channel',UsersRound,['Channel power','Service levels','Demand signals','Retention dependencies']],
];

export default function IndustryValueChain(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-orange-300"><Network className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Value-chain intelligence</span></div><h2 className="mt-2 text-xl font-semibold text-white">Map dependencies before optimising the business</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">A reusable framework for supply chains and service value chains. Blackstar can use it to structure supplier research, bottleneck analysis, resilience planning, procurement questions and transformation work.</p>
 <div className="mt-5 grid gap-3 xl:grid-cols-5">{stages.map(([name,Icon,lenses],i)=><div key={name} className="relative rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-orange-300"/><span className="text-[10px] text-zinc-700">0{i+1}</span></div><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><div className="mt-3 space-y-1.5">{lenses.map(x=><p key={x} className="text-[10px] leading-4 text-zinc-600">{x}</p>)}</div></div>)}</div>
 <div className="mt-4 flex gap-3 rounded-xl border border-rose-300/10 bg-rose-300/[.025] p-4"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300"/><div><p className="text-xs font-medium text-zinc-300">Resilience lens</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Assess single points of failure, geographic concentration, supplier financial health, cyber/technology dependencies, logistics chokepoints, regulatory exposure, inventory buffers and recovery alternatives using current evidence where decisions depend on them.</p></div></div></section>
}
