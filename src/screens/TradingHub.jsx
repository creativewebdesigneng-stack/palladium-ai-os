import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, BellRing, BookOpen, BrainCircuit, BriefcaseBusiness,
  ExternalLink, Globe2, Landmark, LineChart, Radar, Search, ShieldCheck, TimerReset,
  TrendingUp, TriangleAlert,
} from 'lucide-react';
import FinanceEconomicData from '@/components/finance/FinanceEconomicData';
import FinancePortfolio from '@/components/finance/FinancePortfolio';
import TradingRiskLab from '@/components/trading/TradingRiskLab';
import TradingWorkspace from '@/components/trading/TradingWorkspace';
import {
  GLOBAL_TRADING_VENUES,
  TRADER_WORKFLOWS,
  TRADING_ASSET_CLASSES,
  TRADING_AUTHORITIES,
  TRADING_SESSIONS,
} from '@/lib/trading/trading-catalog';

const STACK = [
  { title: 'Portfolio context', description: 'Reuse Blackstar Finance holdings, cost basis and manually supplied valuations without creating a second portfolio system.', href: '/finance', icon: BriefcaseBusiness, status: 'Ready' },
  { title: 'Quant Studio', description: 'Define systematic strategies and run deterministic backtests against real historical observations supplied to Blackstar.', href: '/quant-studio', icon: LineChart, status: 'Ready' },
  { title: 'Web Intelligence', description: 'Use Blackstar web research for current public market, issuer, regulatory and macro research when freshness matters.', href: '/web-intelligence', icon: Globe2, status: 'Ready' },
  { title: 'Research workspace', description: 'Build deeper research packs and source-backed theses using Blackstar research capabilities.', href: '/research', icon: BookOpen, status: 'Ready' },
  { title: 'Notifications', description: 'Use Blackstar notifications as the delivery surface for governed alerts and workflow events.', href: '/notifications', icon: BellRing, status: 'Ready' },
  { title: 'Mission Control', description: 'Route consequential broker or integration actions through permissions, approvals and auditable execution controls.', href: '/mission-control', icon: Radar, status: 'Governed' },
];

const CAPABILITY_MAP = [
  ['Markets & exchanges', 'Live', 'Official venue directory, market taxonomy and session context are available in this hub.'],
  ['Portfolio & holdings', 'Live', 'Blackstar Finance holdings are embedded below and remain owner-scoped.'],
  ['Macro context', 'Live', 'Verified Bank of England economic data is embedded below; additional verified providers can be added without fabricating values.'],
  ['Risk & position sizing', 'Live', 'Tested deterministic risk-budget, stop-distance, notional and reward/risk calculations.'],
  ['Watchlists & journal', 'Live', 'Persistent owner-scoped watchlists and structured trade journals are protected by row-level security.'],
  ['Paper simulations', 'Live', 'Persistent user-entered hypothetical trade simulations with deterministic P&L and no broker side effects.'],
  ['Strategy backtesting', 'Live', 'Quant Studio already runs deterministic tests using real historical return observations.'],
  ['Primary-source research', 'Live', 'Official exchanges, regulators and central-bank gateways plus Blackstar Web Intelligence.'],
  ['Market screeners', 'Foundation', 'Live price/ranking claims remain disabled until a verified market-data provider is connected.'],
  ['Economic calendar', 'Foundation', 'Calendar workflows can be added from authoritative event feeds; this page does not invent release times.'],
  ['Broker execution', 'Controlled', 'Only through explicitly connected integrations, scoped permissions, user approvals and provider-side controls.'],
];

export default function TradingHub() {
  const [sourceType, setSourceType] = useState('venues');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');

  const sourceRows = sourceType === 'venues' ? GLOBAL_TRADING_VENUES : TRADING_AUTHORITIES;
  const regions = useMemo(() => ['All', ...new Set(sourceRows.map((row) => row.region))], [sourceRows]);
  const filteredSources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sourceRows.filter((row) => {
      const regionMatches = region === 'All' || row.region === region;
      const textMatches = !needle || `${row.name} ${row.region} ${row.kind}`.toLowerCase().includes(needle);
      return regionMatches && textMatches;
    });
  }, [query, region, sourceRows]);

  const selectSourceType = (next) => {
    setSourceType(next);
    setRegion('All');
  };

  return (
    <div className="blackstar-core-page blackstar-trading-hub space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[.08] bg-white/[.025] p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-cyan-400/[.06] blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-violet-300"><TrendingUp className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[.18em]">Blackstar Trading Intelligence</span></div>
          <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Global Trading Hub</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">A trader-facing command centre for global markets, exchanges, asset classes, macro research, portfolio context, risk planning, private watchlists, paper simulation, journaling and systematic strategy testing—connected to Blackstar's existing Finance, Quant, research and governed execution systems.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <HeroMetric label="Asset classes" value={String(TRADING_ASSET_CLASSES.length)} />
              <HeroMetric label="Official venues" value={String(GLOBAL_TRADING_VENUES.length)} />
              <HeroMetric label="Authority gateways" value={String(TRADING_AUTHORITIES.length)} />
              <HeroMetric label="Workflow stages" value={String(TRADER_WORKFLOWS.length)} />
            </div>
          </div>
          <div className="mt-5 flex gap-2 rounded-2xl border border-amber-300/15 bg-amber-400/[.04] p-3 text-xs leading-5 text-amber-100/80"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Trading and investing can result in substantial losses. Blackstar separates research, planning and simulation from live execution. Market information must be verified against current primary/provider data, and this hub does not present its research output as personalised investment advice.</span></div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">Trading command centre</h2></div>
        <p className="mt-1 text-xs text-zinc-500">Existing Blackstar capabilities connected into one trading workflow rather than duplicated.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {STACK.map((item) => <Link key={item.title} to={item.href} className="group rounded-2xl border border-white/[.07] bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-300/20 hover:bg-white/[.025]"><div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] bg-white/[.035]"><item.icon className="h-4 w-4 text-violet-300" /></span><span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-2 py-1 text-[9px] uppercase tracking-[.12em] text-emerald-200">{item.status}</span></div><h3 className="mt-3 text-sm font-medium text-white">{item.title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] text-zinc-600 transition group-hover:text-violet-300">Open workspace <ArrowRight className="h-3 w-3" /></span></Link>)}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-300" /><h2 className="font-medium text-white">Market universe</h2></div>
        <p className="mt-1 text-xs text-zinc-500">The Trading Hub is multi-asset by design. Instrument-specific contract, venue, liquidity and regulatory rules still apply.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {TRADING_ASSET_CLASSES.map((asset) => <article key={asset.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><h3 className="text-sm font-medium text-white">{asset.name}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{asset.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{asset.focus.map((tag) => <span key={tag} className="rounded-lg border border-white/[.06] bg-white/[.025] px-2 py-1 text-[9px] text-zinc-500">{tag}</span>)}</div></article>)}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TRADING_SESSIONS.map((session) => <article key={session.name} className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4"><TimerReset className="h-4 w-4 text-cyan-300" /><h3 className="mt-3 text-sm font-medium text-white">{session.name}</h3><p className="mt-1 text-xs text-zinc-400">{session.reference}</p><p className="mt-2 text-[10px] leading-4 text-zinc-600">{session.note}</p></article>)}
      </section>

      <FinanceEconomicData />
      <TradingRiskLab />
      <TradingWorkspace />
      <FinancePortfolio />

      <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">Official market gateways</h2></div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Exchange, regulator and central-bank entry points for primary-source research. Blackstar does not treat a marketing page, social post or generated commentary as a substitute for current venue rules or official disclosures.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => selectSourceType('venues')} className={`rounded-xl border px-3 py-2 text-xs transition ${sourceType === 'venues' ? 'border-violet-300/25 bg-violet-400/[.09] text-violet-100' : 'border-white/10 text-zinc-500 hover:text-white'}`}>Exchanges & venues</button>
            <button onClick={() => selectSourceType('authorities')} className={`rounded-xl border px-3 py-2 text-xs transition ${sourceType === 'authorities' ? 'border-violet-300/25 bg-violet-400/[.09] text-violet-100' : 'border-white/10 text-zinc-500 hover:text-white'}`}>Authorities & central banks</button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><Search className="h-3.5 w-3.5 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search official sources" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700" /></label>
          <select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-zinc-300">{regions.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-white/[.06] bg-black/20 p-3 transition hover:border-cyan-300/20"><div className="flex justify-between gap-3"><div><p className="text-[10px] text-zinc-600">{source.region} · {source.kind}</p><p className="mt-1 text-sm text-zinc-200 group-hover:text-white">{source.name}</p></div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-700 group-hover:text-cyan-300" /></div></a>)}
          {filteredSources.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">No official source matches this filter.</div>}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-violet-300" /><h2 className="font-medium text-white">Trader workflow</h2></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{TRADER_WORKFLOWS.map((step, index) => <article key={step.title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-400/70">{String(index + 1).padStart(2, '0')}</p><h3 className="mt-2 text-sm font-medium text-white">{step.title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{step.description}</p></article>)}</div>
      </section>

      <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5 md:p-6">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><h2 className="font-medium text-white">Trading stack status</h2></div>
        <p className="mt-1 text-xs text-zinc-500">This distinguishes operational capabilities from provider-dependent foundations so the interface never fabricates live-market functionality.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[.07]">
          {CAPABILITY_MAP.map(([name, status, description], index) => <div key={name} className={`grid gap-2 p-3 md:grid-cols-[180px_90px_minmax(0,1fr)] md:items-center ${index ? 'border-t border-white/[.06]' : ''}`}><p className="text-xs font-medium text-white">{name}</p><span className={`w-fit rounded-full border px-2 py-1 text-[9px] uppercase tracking-[.1em] ${status === 'Live' ? 'border-emerald-400/15 bg-emerald-400/[.06] text-emerald-200' : status === 'Controlled' ? 'border-amber-300/15 bg-amber-300/[.05] text-amber-100' : 'border-cyan-300/15 bg-cyan-300/[.05] text-cyan-100'}`}>{status}</span><p className="text-[11px] leading-5 text-zinc-500">{description}</p></div>)}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoCard icon={Search} title="Evidence before opinion">Separate current observed data, primary disclosures, analyst interpretation, model output and user assumptions. Preserve timestamps and source provenance when decisions may be consequential.</InfoCard>
        <InfoCard icon={ShieldCheck} title="Risk before execution">Size exposure, define invalidation and understand liquidity, leverage, margin and gap risk before an order reaches any broker or venue.</InfoCard>
        <InfoCard icon={Landmark} title="Governed execution">Broker connections belong behind Blackstar's integration permissions, approvals and audit trail. This research page never silently places or represents an order as executed.</InfoCard>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }) {
  return <div className="rounded-2xl border border-white/[.07] bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[.14em] text-zinc-600">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>;
}

function InfoCard({ icon: Icon, title, children }) {
  return <div className="rounded-2xl border border-white/[.07] p-4"><Icon className="h-4 w-4 text-cyan-300" /><h3 className="mt-3 text-sm text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{children}</p></div>;
}
