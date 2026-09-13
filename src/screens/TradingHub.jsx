import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  Calculator,
  CalendarDays,
  CandlestickChart,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Filter,
  Gauge,
  Globe2,
  GraduationCap,
  Landmark,
  LineChart,
  ListPlus,
  NotebookPen,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TestTube2,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  ASSET_CLASSES,
  TRADING_EXCHANGES,
  calculateDrawdown,
  calculatePositionSize,
  calculateRiskReward,
} from "@/lib/trading/trading-intelligence";

const tabs = [
  ["overview", "Overview", Activity],
  ["markets", "Markets", Globe2],
  ["exchanges", "Exchanges", Landmark],
  ["screener", "Screener", Filter],
  ["calendar", "Calendar", CalendarDays],
  ["research", "Research", BrainCircuit],
  ["strategies", "Strategies", TestTube2],
  ["risk", "Risk", ShieldCheck],
  ["paper", "Paper Trading", WalletCards],
  ["journal", "Journal", NotebookPen],
  ["learn", "Learn", GraduationCap],
];

const workspaceCards = [
  ["Global Markets", "Multi-asset market workspace for equities, ETFs, derivatives, FX, digital assets, commodities, fixed income, indices and volatility.", Globe2, "markets"],
  ["Exchange Intelligence", "Major global venue directory with official sources, instrument coverage, time zones and reference sessions.", Landmark, "exchanges"],
  ["Advanced Screener", "Build reusable screening criteria without presenting unsupported quotes as live data.", SlidersHorizontal, "screener"],
  ["Economic & Event Calendar", "Workspace for macro releases, central banks, earnings, IPOs, corporate actions and contract events.", CalendarDays, "calendar"],
  ["Research Desk", "Catalysts, theses, evidence, sentiment, news provenance and cross-asset research packs.", BrainCircuit, "research"],
  ["Strategy Lab", "Design strategies, define rules, specify datasets and prepare backtest experiments with explicit assumptions.", TestTube2, "strategies"],
  ["Risk Cockpit", "Position sizing, risk/reward, drawdown, exposure and pre-trade controls.", ShieldCheck, "risk"],
  ["Paper Trading", "Simulated order planning and rehearsal only. No brokerage execution or custody is implied.", WalletCards, "paper"],
  ["Trading Journal", "Capture thesis, setup, invalidation, execution notes and post-trade lessons.", NotebookPen, "journal"],
];

const calendarLanes = [
  ["Macro", "Inflation, employment, GDP, PMIs and other economic releases"],
  ["Central banks", "Rate decisions, minutes, speeches and policy communications"],
  ["Earnings", "Company results, guidance and investor events"],
  ["Corporate actions", "Dividends, splits, rights issues, M&A and shareholder votes"],
  ["Listings", "IPO, direct listing and new-instrument research workflow"],
  ["Derivatives", "Expiry, roll, settlement and contract-specific milestones"],
];

const education = [
  ["Market structure", "Exchanges, venues, liquidity, spreads, auctions and price discovery."],
  ["Order types", "Market, limit, stop, stop-limit, time-in-force and execution trade-offs."],
  ["Risk & sizing", "Risk capital, stop distance, concentration, correlation and drawdown."],
  ["Options", "Calls, puts, Greeks, implied volatility, assignment and defined-risk structures."],
  ["Futures", "Contract specifications, margin, expiry, rolls, basis and leverage."],
  ["FX", "Pairs, pips, rollover, macro drivers, leverage and intervention risk."],
  ["Technical analysis", "Trend, momentum, volatility and market-structure tools as context—not certainty."],
  ["Fundamental analysis", "Financial statements, valuation, catalysts and scenario analysis."],
  ["Trading psychology", "Process discipline, loss limits, journaling and decision hygiene."],
  ["Digital assets", "Venue, custody, token, liquidity, smart-contract and regulatory risk."],
];

const fmt = (value, digits = 2) =>
  Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value) : "—";

function Panel({ children, className = "" }) {
  return <section className={`rounded-[24px] border border-white/[.08] bg-white/[.025] p-5 ${className}`}>{children}</section>;
}

function MiniBadge({ children, tone = "zinc" }) {
  const styles = {
    zinc: "border-white/10 bg-white/[.03] text-zinc-400",
    emerald: "border-emerald-300/15 bg-emerald-400/[.05] text-emerald-200",
    cyan: "border-cyan-300/15 bg-cyan-400/[.05] text-cyan-200",
    violet: "border-violet-300/15 bg-violet-400/[.05] text-violet-200",
    amber: "border-amber-300/15 bg-amber-400/[.05] text-amber-200",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.12em] ${styles[tone]}`}>{children}</span>;
}

export default function TradingHub() {
  const [tab, setTab] = useState("overview");
  const [exchangeQuery, setExchangeQuery] = useState("");
  const [exchangeRegion, setExchangeRegion] = useState("All");
  const [watchInput, setWatchInput] = useState("");
  const [watchlist, setWatchlist] = useState(["FTSE 100", "S&P 500", "GBP/USD", "Gold"]);
  const [accountSize, setAccountSize] = useState("100000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [target, setTarget] = useState("115");
  const [peak, setPeak] = useState("100000");
  const [current, setCurrent] = useState("90000");
  const [paperSymbol, setPaperSymbol] = useState("");
  const [paperSide, setPaperSide] = useState("Long");
  const [paperOrders, setPaperOrders] = useState([]);
  const [journalText, setJournalText] = useState("");
  const [journal, setJournal] = useState([]);

  const exchangeRegions = useMemo(() => ["All", ...new Set(TRADING_EXCHANGES.map((x) => x.region))], []);
  const exchanges = useMemo(() => {
    const q = exchangeQuery.trim().toLowerCase();
    return TRADING_EXCHANGES.filter((x) =>
      (exchangeRegion === "All" || x.region === exchangeRegion) &&
      (!q || [x.code, x.name, x.city, x.region, ...x.instruments].join(" ").toLowerCase().includes(q)),
    );
  }, [exchangeQuery, exchangeRegion]);

  const position = calculatePositionSize(Number(accountSize), Number(riskPercent), Number(entry), Number(stop));
  const rr = calculateRiskReward(Number(entry), Number(stop), Number(target));
  const drawdown = calculateDrawdown(Number(peak), Number(current));

  const addWatch = () => {
    const value = watchInput.trim();
    if (!value || watchlist.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setWatchlist((items) => [...items, value].slice(-12));
    setWatchInput("");
  };

  const addPaperOrder = () => {
    const symbol = paperSymbol.trim().toUpperCase();
    if (!symbol) return;
    setPaperOrders((items) => [{ symbol, side: paperSide, createdAt: new Date().toLocaleTimeString() }, ...items].slice(0, 8));
    setPaperSymbol("");
  };

  const addJournal = () => {
    const text = journalText.trim();
    if (!text) return;
    setJournal((items) => [{ text, createdAt: new Date().toLocaleString() }, ...items].slice(0, 10));
    setJournalText("");
  };

  return (
    <div className="blackstar-core-page blackstar-trading-hub space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[.09] bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.13),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,.10),transparent_30%),rgba(255,255,255,.02)] p-6 md:p-8">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-300"><CandlestickChart className="h-5 w-5"/><span className="text-xs font-semibold uppercase tracking-[.18em]">Blackstar Trading Intelligence</span></div>
            <div className="flex gap-2"><MiniBadge tone="emerald">Research</MiniBadge><MiniBadge tone="cyan">Risk tools</MiniBadge><MiniBadge tone="violet">Simulation</MiniBadge></div>
          </div>
          <h1 className="mt-5 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Trading Intelligence Hub</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">Global market structure, exchanges, multi-asset research, screening workflows, strategy design, risk control, paper-trading rehearsal, journaling and trader education in one governed Blackstar workspace.</p>
          <div className="mt-5 flex gap-2 rounded-2xl border border-amber-300/15 bg-amber-400/[.04] p-3 text-xs leading-5 text-amber-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Trading involves risk of loss. This hub is for information, research, education and simulation—not personalised investment advice or a promise of returns. Market data must be connected and licensed before any surface is labelled live.</span></div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? "border-emerald-300/25 bg-emerald-400/[.08] text-emerald-100" : "border-white/[.07] bg-black/20 text-zinc-500 hover:text-zinc-200"}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}
      </div>

      {tab === "overview" && <>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Data integrity", "No fabricated quotes", ShieldCheck, "emerald"],
            ["Venue coverage", `${TRADING_EXCHANGES.length} reference venues`, Landmark, "cyan"],
            ["Asset classes", `${ASSET_CLASSES.length} research domains`, BarChart3, "violet"],
            ["Execution mode", "Simulation only", TestTube2, "amber"],
          ].map(([title, value, Icon, tone]) => <div key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-zinc-500"/><MiniBadge tone={tone}>{title}</MiniBadge></div><p className="mt-4 text-lg font-medium text-white">{value}</p></div>)}
        </section>

        <Panel>
          <div className="flex items-center gap-2"><Radar className="h-4 w-4 text-emerald-300"/><h2 className="font-medium text-white">Trading workspace map</h2></div>
          <p className="mt-1 text-xs text-zinc-500">Open any capability without leaving the shared Blackstar shell.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{workspaceCards.map(([title, description, Icon, destination]) => <button key={title} onClick={() => setTab(destination)} className="group rounded-2xl border border-white/[.07] bg-black/20 p-4 text-left transition hover:border-emerald-300/20 hover:bg-emerald-400/[.025]"><Icon className="h-4 w-4 text-emerald-300/80"/><h3 className="mt-3 text-sm font-medium text-zinc-100 group-hover:text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p></button>)}</div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><ListPlus className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Research watchlist</h2></div><p className="mt-1 text-xs text-zinc-500">Symbols and markets only; no prices are invented.</p></div><MiniBadge>local workspace</MiniBadge></div>
            <div className="mt-4 flex gap-2"><input value={watchInput} onChange={(e)=>setWatchInput(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && addWatch()} placeholder="Add symbol or market" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/25"/><button onClick={addWatch} className="rounded-xl border border-cyan-300/20 bg-cyan-400/[.06] px-3 text-xs text-cyan-100">Add</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{watchlist.map((item)=><button key={item} onClick={()=>setWatchlist((items)=>items.filter((x)=>x!==item))} title="Remove" className="rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2 text-xs text-zinc-300 hover:border-rose-300/20">{item}</button>)}</div>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Market-data connection standard</h2></div>
            <div className="mt-4 space-y-3 text-xs leading-5 text-zinc-500"><p><span className="text-zinc-300">Live:</span> only when a licensed feed supplies timestamped current values.</p><p><span className="text-zinc-300">Delayed:</span> must show the delay or source timestamp.</p><p><span className="text-zinc-300">Reference:</span> static venue and instrument information is labelled as reference material.</p><p><span className="text-zinc-300">Simulation:</span> paper orders and strategy experiments never imply broker execution.</p></div>
          </Panel>
        </div>
      </>}

      {tab === "markets" && <>
        <Panel>
          <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Global asset-class intelligence</h2></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ASSET_CLASSES.map((asset)=><article key={asset.name} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-white">{asset.name}</h3><LineChart className="h-4 w-4 text-zinc-700"/></div><p className="mt-2 text-xs leading-5 text-zinc-500">{asset.description}</p><p className="mt-3 text-[11px] text-zinc-600">Examples · {asset.examples}</p><p className="mt-2 rounded-xl border border-amber-300/10 bg-amber-400/[.03] p-2 text-[11px] leading-4 text-amber-100/60">{asset.riskNote}</p></article>)}</div>
        </Panel>
        <Panel><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-emerald-300"/><h2 className="font-medium text-white">Market regime workspace</h2></div><p className="mt-2 text-xs leading-5 text-zinc-500">Designed for connected data feeds to compare trend, realised/implied volatility, breadth, liquidity, rates, credit and cross-asset correlation. Until a licensed feed is connected, Blackstar intentionally shows no synthetic “live” regime score.</p></Panel>
      </>}

      {tab === "exchanges" && <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Global exchange directory</h2></div><p className="mt-1 text-xs text-zinc-500">Reference sessions can change for holidays, auctions and venue rules—confirm with the official venue.</p></div><div className="flex flex-wrap gap-2"><div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"><Search className="h-3.5 w-3.5 text-zinc-600"/><input value={exchangeQuery} onChange={(e)=>setExchangeQuery(e.target.value)} placeholder="Search exchanges" className="w-36 bg-transparent text-xs text-white outline-none"/></div><select value={exchangeRegion} onChange={(e)=>setExchangeRegion(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-zinc-300">{exchangeRegions.map((r)=><option key={r}>{r}</option>)}</select></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{exchanges.map((exchange)=><article key={exchange.code} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[.14em] text-emerald-300">{exchange.code}</p><h3 className="mt-1 text-sm font-medium text-white">{exchange.name}</h3><p className="mt-1 text-xs text-zinc-600">{exchange.city} · {exchange.region}</p></div><a href={exchange.officialUrl} target="_blank" rel="noreferrer" aria-label={`Open ${exchange.name}`}><ExternalLink className="h-4 w-4 text-zinc-600 hover:text-white"/></a></div><div className="mt-3 flex flex-wrap gap-1">{exchange.instruments.map((instrument)=><span key={instrument} className="rounded-md bg-white/[.04] px-2 py-1 text-[10px] text-zinc-500">{instrument}</span>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div><p className="text-zinc-700">Timezone</p><p className="mt-1 text-zinc-400">{exchange.timezone}</p></div><div><p className="text-zinc-700">Reference session</p><p className="mt-1 text-zinc-400">{exchange.referenceSession}</p></div></div></article>)}</div>
      </Panel>}

      {tab === "screener" && <Panel>
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Screening studio</h2></div><p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Build screening definitions now and connect them to licensed fundamentals/quote providers later. The workspace separates screening logic from data provenance so unsupported values are never fabricated.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[["Universe","Exchange, country, sector, asset class"],["Price & liquidity","Price, volume, spread, market cap"],["Fundamentals","Growth, margins, leverage, valuation"],["Technical context","Trend, momentum, volatility, relative strength"],["Derivatives","IV, open interest, Greeks, term structure"],["Macro sensitivity","Rates, FX, commodities and factor exposures"],["Events","Earnings, dividends, corporate actions"],["Risk filters","Liquidity, drawdown, leverage and concentration"]].map(([title,text])=><div key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><SlidersHorizontal className="h-4 w-4 text-zinc-600"/><h3 className="mt-3 text-sm text-zinc-200">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-600">{text}</p></div>)}</div>
      </Panel>}

      {tab === "calendar" && <Panel>
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Trading calendar intelligence</h2></div><p className="mt-2 text-xs leading-5 text-zinc-500">A structured event layer ready for verified provider feeds and Blackstar alerts. No dates are invented when a source is not connected.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{calendarLanes.map(([title,text])=><div key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><p className="text-sm text-zinc-200">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{text}</p></div>)}</div>
      </Panel>}

      {tab === "research" && <>
        <Panel><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Blackstar trading research desk</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[["Thesis builder","Define the claim, horizon, evidence, invalidation and alternative explanations."],["Catalyst map","Track macro, company, policy, supply/demand and positioning catalysts."],["Cross-asset links","Connect equities, rates, FX, credit, commodities and volatility hypotheses."],["Source ledger","Separate primary filings and official releases from media, research and social commentary."],["Scenario tree","Base, upside, downside and tail scenarios with explicit assumptions."],["Sentiment context","Treat sentiment as context with provenance—not a deterministic trading signal."]].map(([title,text])=><div key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><Sparkles className="h-4 w-4 text-violet-300/70"/><h3 className="mt-3 text-sm text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>)}</div></Panel>
        <Panel><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Alerts & monitoring</h2></div><p className="mt-2 text-xs leading-5 text-zinc-500">Prepared for price, volatility, volume, news, filing, calendar, risk-limit and thesis-change alerts once verified data providers are connected. Alerts should state their source and timestamp and never be presented as guaranteed trade instructions.</p></Panel>
      </>}

      {tab === "strategies" && <Panel>
        <div className="flex items-center gap-2"><TestTube2 className="h-4 w-4 text-emerald-300"/><h2 className="font-medium text-white">Strategy & backtesting lab</h2></div><p className="mt-2 text-xs leading-5 text-zinc-500">Define strategies before connecting datasets or execution. Backtests must preserve data source, sample period, fees, slippage, corporate actions, survivorship assumptions and out-of-sample validation.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[["Rules","Entry, exit, sizing and invalidation"],["Dataset","Instrument universe and provenance"],["Costs","Fees, spread, slippage and financing"],["Validation","Walk-forward / out-of-sample"],["Risk","Exposure and drawdown constraints"],["Benchmark","Relevant passive comparator"],["Stress","Regime and tail scenarios"],["Evidence","Reproducible experiment record"]].map(([title,text])=><div key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><p className="text-xs font-medium text-zinc-300">{title}</p><p className="mt-1 text-[11px] leading-4 text-zinc-600">{text}</p></div>)}</div>
      </Panel>}

      {tab === "risk" && <div className="space-y-4">
        <Panel><div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-300"/><h2 className="font-medium text-white">Pre-trade risk calculator</h2></div><div className="mt-4 grid gap-3 md:grid-cols-5">{[["Account size",accountSize,setAccountSize],["Risk %",riskPercent,setRiskPercent],["Entry",entry,setEntry],["Stop",stop,setStop],["Target",target,setTarget]].map(([label,value,setter])=><label key={label} className="text-[11px] text-zinc-600">{label}<input type="number" value={value} onChange={(e)=>setter(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/25"/></label>)}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[["Risk capital",position ? fmt(position.riskCapital) : "—"],["Risk / unit",position ? fmt(position.riskPerUnit) : "—"],["Units",position ? fmt(position.units,4) : "—"],["Reward : risk",rr ? `1 : ${fmt(rr.ratio,2)}` : "—"]].map(([title,value])=><div key={title} className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[.025] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">{title}</p><p className="mt-2 text-xl font-medium text-white">{value}</p></div>)}</div><p className="mt-3 text-[11px] leading-4 text-zinc-600">Sizing is arithmetic only. It does not account for gaps, slippage, liquidity, contract multipliers, FX conversion, leverage, fees, taxes or suitability.</p></Panel>
        <Panel><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-rose-300"/><h2 className="font-medium text-white">Drawdown monitor</h2></div><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-[11px] text-zinc-600">Peak equity<input type="number" value={peak} onChange={(e)=>setPeak(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/></label><label className="text-[11px] text-zinc-600">Current equity<input type="number" value={current} onChange={(e)=>setCurrent(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/></label><div className="rounded-2xl border border-rose-300/10 bg-rose-400/[.025] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Current drawdown</p><p className="mt-2 text-xl text-white">{drawdown === null ? "—" : `${fmt(drawdown)}%`}</p></div></div></Panel>
      </div>}

      {tab === "paper" && <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Paper-trading rehearsal</h2></div><p className="mt-1 text-xs text-zinc-500">Local simulated intentions only—no broker, exchange, wallet or custody connection.</p></div><MiniBadge tone="amber">simulation only</MiniBadge></div><div className="mt-4 flex flex-wrap gap-2"><input value={paperSymbol} onChange={(e)=>setPaperSymbol(e.target.value)} placeholder="Symbol / instrument" className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/><select value={paperSide} onChange={(e)=>setPaperSide(e.target.value)} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-sm text-zinc-300"><option>Long</option><option>Short</option><option>Watch</option></select><button onClick={addPaperOrder} className="rounded-xl border border-cyan-300/20 bg-cyan-400/[.06] px-4 text-xs text-cyan-100">Add rehearsal</button></div><div className="mt-4 space-y-2">{paperOrders.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">No simulated rehearsals yet.</p> : paperOrders.map((order,index)=><div key={`${order.symbol}-${order.createdAt}-${index}`} className="flex items-center justify-between rounded-xl border border-white/[.07] bg-black/20 p-3"><div><p className="text-sm text-white">{order.symbol}</p><p className="text-[11px] text-zinc-600">{order.side} · {order.createdAt}</p></div><button onClick={()=>setPaperOrders((items)=>items.filter((_,i)=>i!==index))} className="text-[11px] text-zinc-600 hover:text-rose-300">Remove</button></div>)}</div>
      </Panel>}

      {tab === "journal" && <Panel>
        <div className="flex items-center gap-2"><NotebookPen className="h-4 w-4 text-violet-300"/><h2 className="font-medium text-white">Trading journal</h2></div><p className="mt-1 text-xs text-zinc-500">Capture thesis, setup, invalidation, emotions, execution quality and lessons. Entries in this foundation are local to the current page session.</p><textarea value={journalText} onChange={(e)=>setJournalText(e.target.value)} placeholder="What was the thesis? What would invalidate it? What did you learn?" className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white outline-none focus:border-violet-300/25"/><button onClick={addJournal} className="mt-2 rounded-xl border border-violet-300/20 bg-violet-400/[.06] px-4 py-2 text-xs text-violet-100">Save local note</button><div className="mt-4 space-y-2">{journal.map((entry,index)=><article key={`${entry.createdAt}-${index}`} className="rounded-xl border border-white/[.07] bg-black/20 p-3"><p className="text-[11px] text-zinc-700">{entry.createdAt}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-400">{entry.text}</p></article>)}</div>
      </Panel>}

      {tab === "learn" && <Panel>
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-300"/><h2 className="font-medium text-white">Trader education map</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{education.map(([title,text])=><article key={title} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><GraduationCap className="h-4 w-4 text-cyan-300/70"/><h3 className="mt-3 text-sm text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></article>)}</div>
      </Panel>}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[.07] p-4"><ShieldCheck className="h-4 w-4 text-emerald-300"/><h3 className="mt-3 text-sm text-white">Risk before return</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Every strategy surface is designed to expose sizing, invalidation, concentration and loss assumptions before performance claims.</p></div>
        <div className="rounded-2xl border border-white/[.07] p-4"><CircleDollarSign className="h-4 w-4 text-cyan-300"/><h3 className="mt-3 text-sm text-white">Provider-ready, not provider-faked</h3><p className="mt-1 text-xs leading-5 text-zinc-500">The hub is ready for market feeds, broker APIs and research providers, but labels data honestly until those integrations are verified.</p></div>
        <div className="rounded-2xl border border-white/[.07] p-4"><FileText className="h-4 w-4 text-violet-300"/><h3 className="mt-3 text-sm text-white">Evidence & audit trail</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Research, strategy experiments, alerts and future execution integrations should preserve source, timestamp, assumptions and approval boundaries.</p></div>
      </section>
    </div>
  );
}
