import { BookOpenCheck, Globe2, Scale, ShieldCheck, ExternalLink } from 'lucide-react';

const sources=[
 ['International standards','ISO','Standards, management systems and sector frameworks','https://www.iso.org/standards.html'],
 ['Labour','ILO','International labour standards, sector resources and decent-work research','https://www.ilo.org/'],
 ['Trade & industry','WTO','Trade rules, statistics, agreements and market-access context','https://www.wto.org/'],
 ['Economic sectors','OECD','Industry, productivity, digital, competition and policy research','https://www.oecd.org/'],
 ['Industrial development','UNIDO','Industrial development, manufacturing, sustainability and value-chain resources','https://www.unido.org/'],
 ['Energy','IEA','Energy systems, technologies, markets and transition analysis','https://www.iea.org/'],
 ['Food & agriculture','FAO','Agriculture, food systems, commodities, food security and sector data','https://www.fao.org/'],
 ['Health','WHO','Health systems, public-health standards, evidence and technical guidance','https://www.who.int/'],
 ['Aviation','ICAO','International civil aviation standards, safety and sector frameworks','https://www.icao.int/'],
 ['Maritime','IMO','Shipping safety, security, environmental and international maritime rules','https://www.imo.org/'],
];

export default function IndustrySourceGateway(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-start gap-3"><div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-2.5"><BookOpenCheck className="h-5 w-5 text-emerald-300"/></div><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-200/80">Authoritative source gateway</p><h2 className="mt-1 text-xl font-semibold text-white">Start current industry research from primary institutions</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">These gateways are research starting points, not a claim that Blackstar has cached every current standard or rule. Current requirements should be checked against the relevant official source and jurisdiction.</p></div></div>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sources.map(([area,name,description,url])=><a key={name} href={url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-emerald-300/20"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{area}</span><ExternalLink className="h-3.5 w-3.5 text-zinc-700 group-hover:text-emerald-300"/></div><h3 className="mt-2 text-sm font-medium text-white">{name}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p></a>)}</div>
  <div className="mt-4 grid gap-3 md:grid-cols-3"><Note icon={Globe2} title="Jurisdiction matters" text="Industry requirements can differ by country, region, regulator and activity."/><Note icon={Scale} title="Legal Hub handoff" text="Use Legal Hub for source-backed legal and regulatory research rather than treating an industry summary as legal advice."/><Note icon={ShieldCheck} title="Standards verification" text="Confirm current editions, applicability, certification scope and licensing with the issuing body."/></div>
 </section>
}
function Note({icon:Icon,title,text}){return <div className="flex gap-3 rounded-xl border border-white/[.06] p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"/><div><p className="text-xs font-medium text-zinc-300">{title}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></div></div>}
