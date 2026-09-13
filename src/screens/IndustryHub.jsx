import IndustryOperatingSystem from '@/components/industry/IndustryOperatingSystem';
import IndustrySourceGateway from '@/components/industry/IndustrySourceGateway';
import IndustryGrowthLab from '@/components/industry/IndustryGrowthLab';
import { Building2, Factory, BriefcaseBusiness, HeartPulse, Landmark, Cpu, Truck, Wheat, Zap, FlaskConical, Film, ShoppingCart, GraduationCap, Hammer, Plane, ShieldCheck, Search, Rocket, Workflow, BarChart3, Globe2, Scale, Banknote, Users } from 'lucide-react';

const industries = [
  ['Manufacturing & Industry', Factory, 'Production, lean operations, quality, maintenance, supply chains, industrial automation and capacity planning.'],
  ['Technology & AI', Cpu, 'Software, cloud, cybersecurity, data, AI adoption, product engineering, platforms and digital transformation.'],
  ['Financial Services', Banknote, 'Banking, insurance, fintech, payments, investment operations, controls, risk and customer growth.'],
  ['Healthcare & Life Sciences', HeartPulse, 'Healthcare operations, medtech, biotech, pharma, research, patient-service workflows and regulated innovation.'],
  ['Energy & Utilities', Zap, 'Power, renewables, oil & gas, utilities, grids, efficiency, asset operations and energy transition.'],
  ['Construction & Real Estate', Hammer, 'Construction, property, facilities, development, estimating, procurement, projects and asset lifecycle.'],
  ['Retail & Commerce', ShoppingCart, 'Retail, ecommerce, merchandising, pricing, inventory, customer experience, stores and marketplaces.'],
  ['Transport & Logistics', Truck, 'Freight, fleet, warehousing, aviation, maritime, rail, last-mile delivery and supply-chain resilience.'],
  ['Agriculture & Food', Wheat, 'Agriculture, food production, agritech, traceability, yield, procurement, processing and distribution.'],
  ['Professional Services', BriefcaseBusiness, 'Consulting, accounting, agencies, engineering services, legal operations and knowledge businesses.'],
  ['Government & Public Sector', Landmark, 'Public services, policy operations, procurement, programme delivery, digital government and civic infrastructure.'],
  ['Education & Research', GraduationCap, 'Schools, universities, training, research organisations, learning operations and workforce development.'],
  ['Media & Entertainment', Film, 'Film, television, music, publishing, games, creator businesses, rights, production and distribution.'],
  ['Travel & Hospitality', Plane, 'Hotels, travel, tourism, venues, guest operations, revenue management and service optimisation.'],
  ['Science & Advanced R&D', FlaskConical, 'Research strategy, laboratories, deep tech, experimentation, technical intelligence and commercialisation.'],
];

const capabilities = [
  ['Industry intelligence', Search, 'Research markets, value chains, competitors, technologies, operating models, terminology, standards and industry structure.'],
  ['Strategy & growth', Rocket, 'Build growth plans, market-entry strategies, product opportunities, partnerships, positioning and expansion scenarios.'],
  ['Operations', Workflow, 'Map processes, identify bottlenecks, design SOPs, automate workflows and improve quality, throughput and service.'],
  ['Commercial intelligence', BarChart3, 'Support market sizing, customer segmentation, pricing analysis, sales planning, procurement and supplier analysis.'],
  ['Global expansion', Globe2, 'Compare jurisdictions, supply chains, markets and localisation requirements while routing current legal questions to Legal Hub.'],
  ['Risk & governance', ShieldCheck, 'Create risk registers, control maps, resilience plans and governance workflows without pretending regulated advice is guaranteed.'],
  ['Workforce & skills', Users, 'Design roles, capability maps, training plans, workforce scenarios and AI-assisted operating models.'],
  ['Finance & investment', Banknote, 'Connect industry planning with Blackstar Finance for budgets, scenarios, unit economics and investment analysis.'],
  ['Regulation handoff', Scale, 'Connect sector questions to Blackstar Legal Hub for source-backed laws, rules, standards and jurisdiction-specific research.'],
];

export default function IndustryHub() {
  return (
    <div className="space-y-6 pb-12">
      <section className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-8">
        <div aria-hidden className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-violet-300"><Building2 className="h-4 w-4" /> Blackstar Industry Intelligence</div>
          <h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight text-white lg:text-5xl">One industry command centre for understanding, operating, supporting and growing organisations.</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">Industry Hub brings Blackstar's research, AI workforce, workflows, analytics, finance, legal, CRM, marketing, web intelligence and knowledge systems together around the language and operating reality of each sector.</p>
          <div className="mt-6 flex flex-wrap gap-2">{['Research', 'Strategy', 'Operations', 'Growth', 'Risk', 'Workforce', 'Supply chain', 'Innovation', 'Transformation'].map(x => <span key={x} className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-xs text-zinc-300">{x}</span>)}</div>
        </div>
      </section>

      <section>
        <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">Industry coverage</p><h2 className="mt-1 text-xl font-semibold text-white">Cross-sector intelligence library</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{industries.map(([name, Icon, description]) => <article key={name} className="blackstar-panel rounded-2xl border border-white/[.07] bg-black/25 p-5"><div className="flex items-center gap-3"><div className="rounded-xl border border-violet-400/15 bg-violet-400/[.06] p-2.5"><Icon className="h-5 w-5 text-violet-300" /></div><h3 className="font-medium text-white">{name}</h3></div><p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p></article>)}</div>
      </section>

      <IndustryOperatingSystem />
      <IndustrySourceGateway />
      <IndustryGrowthLab />

      <section>
        <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">What Blackstar can do</p><h2 className="mt-1 text-xl font-semibold text-white">Industry operating capabilities</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{capabilities.map(([name, Icon, description]) => <article key={name} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><Icon className="h-5 w-5 text-cyan-300" /><h3 className="mt-3 font-medium text-white">{name}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p></article>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-5"><h3 className="font-medium text-emerald-100">Connected, not duplicated</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Industry Hub acts as the sector layer over Blackstar's existing systems. Finance questions flow to Finance Hub, current laws and regulations to Legal Hub, execution work to agents/workflows, customer growth to CRM and Marketing, and evidence gathering to Web Intelligence and Knowledge.</p></div>
        <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.035] p-5"><h3 className="font-medium text-amber-100">Evidence and safety boundary</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Blackstar can explain and support industry work, but it should distinguish general knowledge from current source-backed facts. Regulated, safety-critical, legal, medical, engineering or financial decisions remain subject to the relevant professional, jurisdictional and approval controls.</p></div>
      </section>
    </div>
  );
}
