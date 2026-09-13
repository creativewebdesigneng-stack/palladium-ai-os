import { Stethoscope, Factory, Landmark, Plane, HardHat, Wheat, Zap, ShoppingBag, FlaskConical, RadioTower, Ship, Hotel } from 'lucide-react';
const packs=[
 ['Healthcare',Stethoscope,['Clinical/service operations','Capacity & flow','Quality & safety','Workforce','Health data','Procurement']],
 ['Manufacturing',Factory,['OEE & reliability','Quality systems','Lean flow','Industrial automation','Supplier resilience','Energy productivity']],
 ['Financial services',Landmark,['Risk & controls','Fraud','Service operations','Payments','Credit','Regulatory operations']],
 ['Aviation',Plane,['Fleet & network','Safety systems','Ground operations','Maintenance','Revenue management','Airport dependencies']],
 ['Construction',HardHat,['Project controls','Cost & schedule','Procurement','Safety','BIM/data','Asset lifecycle']],
 ['Agriculture & food',Wheat,['Yield','Food safety','Traceability','Processing','Cold chain','Waste']],
 ['Energy & utilities',Zap,['Asset reliability','Grid/network','Generation','Trading context','Field service','Transition']],
 ['Retail',ShoppingBag,['Merchandising','Inventory','Pricing','Store/channel','Fulfilment','Loyalty']],
 ['Life sciences',FlaskConical,['R&D portfolio','Quality','Clinical development','Regulatory pathway','Manufacturing','Commercialisation']],
 ['Telecoms',RadioTower,['Network economics','Coverage','Reliability','Spectrum','Customer operations','Infrastructure']],
 ['Maritime',Ship,['Fleet','Ports','Safety','Fuel/energy','Cargo','Trade lanes']],
 ['Hospitality',Hotel,['Occupancy','Revenue management','Guest experience','Labour','Food & beverage','Property operations']],
];
export default function SpecialistSectorPacks(){return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Specialist sector packs</p><h2 className="mt-2 text-xl font-semibold text-white">Deeper operating lenses for specialist industries</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{packs.map(([name,Icon,topics])=><article key={name} className="rounded-2xl border border-white/[.07] p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-300"/><h3 className="text-sm font-medium text-white">{name}</h3></div><div className="mt-3 flex flex-wrap gap-1.5">{topics.map(x=><span key={x} className="rounded-lg border border-white/[.06] bg-white/[.02] px-2 py-1 text-[10px] text-zinc-600">{x}</span>)}</div></article>)}</div></section>}
