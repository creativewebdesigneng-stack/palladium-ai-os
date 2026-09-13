import { Handshake, Search, Banknote, Building2, Scale, Globe2 } from 'lucide-react';

const areas=[
 ['Partnership strategy',Handshake,'Identify partner types, mutual value, channel models, responsibilities, economics and governance.'],
 ['M&A screening',Search,'Structure acquisition hypotheses, strategic fit, market logic, integration questions and diligence workstreams.'],
 ['Fundraising readiness',Banknote,'Narrative, metrics, data room, scenario analysis, investor research and diligence preparation.'],
 ['Due diligence',Building2,'Coordinate commercial, operational, financial, technical, people and integration evidence requests.'],
 ['Transaction legal handoff',Scale,'Route current transaction law, contracts, competition, securities and jurisdiction questions to Legal Hub.'],
 ['International corporate development',Globe2,'Compare markets, partners, routes-to-market and operating-model implications for expansion.'],
];
export default function CompanyCorporateDevelopment(){
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-300">Corporate development</p>
  <h2 className="mt-2 text-xl font-semibold text-white">Partnerships, funding, expansion and transaction preparation</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">Blackstar can coordinate research and preparation, but valuations, regulated fundraising, tax, legal and transaction decisions still require current evidence and appropriate professional review.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{areas.map(([name,Icon,text])=><article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><Icon className="h-5 w-5 text-teal-300"/><h3 className="mt-3 text-sm font-medium text-white">{name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
 </section>
}
