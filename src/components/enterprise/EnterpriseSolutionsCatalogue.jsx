import { useMemo, useState } from 'react';
import EnterpriseValueCase from './EnterpriseValueCase';
import { ArrowRight, Building2, CheckCircle2, ClipboardCopy, Search, ShieldCheck, Target, TriangleAlert } from 'lucide-react';
import {
  BLACKSTAR_ENTERPRISE_OFFERS,
  ENTERPRISE_OFFER_TERMS,
  buildEnterpriseStatementOfWorkOutline,
  formatEnterpriseGbp,
} from '@/lib/enterprise/high-value-offers';

const FILTERS = ['All', '£100,000 programmes', '£1,000,000 programmes'];
const numberOfDeals = (value) => Math.min(5000, Math.max(0, Math.trunc(Number(value) || 0)));

export default function EnterpriseSolutionsCatalogue() {
  const [tier, setTier] = useState('All');
  const [category, setCategory] = useState('All sectors');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [copyState, setCopyState] = useState('');
  const [hundredKDeals, setHundredKDeals] = useState('5');
  const [millionDeals, setMillionDeals] = useState('1');

  const categories = useMemo(() => ['All sectors', ...new Set(BLACKSTAR_ENTERPRISE_OFFERS.map(o => o.category))], []);
  const offers = useMemo(() => BLACKSTAR_ENTERPRISE_OFFERS.filter(offer => {
    if (tier === '£100,000 programmes' && offer.priceGbp !== 100000) return false;
    if (tier === '£1,000,000 programmes' && offer.priceGbp !== 1000000) return false;
    if (category !== 'All sectors' && offer.category !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || [offer.name, offer.buyer, offer.summary, offer.category].join(' ').toLowerCase().includes(q);
  }), [tier, category, search]);

  async function copyProposal(offer) {
    setCopyState('');
    try {
      await navigator.clipboard.writeText(buildEnterpriseStatementOfWorkOutline(offer));
      setCopyState(`Copied indicative scope outline for ${offer.name}. Review and customise before sending to a buyer.`);
    } catch {
      setCopyState('Clipboard permission unavailable. Open the offer and copy its scope manually.');
      setOpenId(offer.id);
    }
  }

  const annualScenario = numberOfDeals(hundredKDeals) * 100000 + numberOfDeals(millionDeals) * 1000000;

  return (
    <section aria-labelledby="enterprise-solutions-heading" className="space-y-5">
      <header className="relative overflow-hidden rounded-[28px] border border-amber-300/20 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,.16),transparent_58%),linear-gradient(130deg,#131117,#090b13)] p-6 sm:p-8">
        <div className="relative z-10 max-w-4xl">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.20em] text-amber-300"><Building2 className="h-4 w-4"/>Blackstar enterprise solutions</p>
          <h2 id="enterprise-solutions-heading" className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">AI programmes for major organisations</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
            Ten proposed £100,000 solutions and four £1 million transformation programmes. Each has a customer, defined
            scope, delivery artefacts, prerequisites and verifiable acceptance criteria. Built on Blackstar's existing
            Workforce, Mission Control, AI Hub, approval, audit, Marketplace and studio infrastructure.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200">10 × £100,000 offers</span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200">4 × £1,000,000 offers</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-300">Contract-first, not instant checkout</span>
          </div>
        </div>
      </header>
      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4 text-xs leading-6 text-zinc-300">
        <div className="flex items-center gap-2 font-semibold text-amber-200"><TriangleAlert className="h-4 w-4"/>Important commercial disclosure</div>
        <p className="mt-1">{ENTERPRISE_OFFER_TERMS.offerStatus}. Prices are indicative and exclude VAT and third-party costs.
          These are scoped solution blueprints, not proof of built, live or certified customer deployments. Procurement,
          signed SOW, engineering feasibility, security/data review and staged acceptance are required before sale.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter enterprise offers by price">
          {FILTERS.map(item => <button type="button" key={item} aria-pressed={tier===item} onClick={() => setTier(item)}
            className={`rounded-xl border px-3 py-2 text-xs transition ${tier===item?'border-amber-300/50 bg-amber-300/10 text-amber-100':'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
            {item}
          </button>)}
        </div>
        <div className="relative min-w-[190px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"/>
          <input aria-label="Search enterprise solutions" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 focus:border-amber-300/50 focus:outline-none" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search solutions or buyer..."/>
        </div>
        <select aria-label="Filter by solution category" className="rounded-xl border border-white/10 bg-[#14151b] p-2 text-xs text-zinc-200" value={category} onChange={e=>setCategory(e.target.value)}>
          {categories.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map(offer=>{
          const expanded = openId === offer.id;
          return <article key={offer.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">{offer.category}</span>
              <span className="text-base font-semibold text-amber-200">{formatEnterpriseGbp(offer.priceGbp)}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">{offer.name}</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{offer.summary}</p>
            <dl className="mt-4 space-y-2 text-[11px]">
              <div><dt className="text-zinc-500">Typical buyer</dt><dd className="mt-0.5 text-zinc-200">{offer.buyer}</dd></div>
              <div><dt className="text-zinc-500">Proposed programme</dt><dd className="mt-0.5 text-zinc-200">{offer.proposedDeliveryWeeks} weeks</dd></div>
            </dl>
            <h4 className="mt-4 text-xs font-medium text-white">Proposed deliverables</h4>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-300">
              {offer.proposedDeliverables.map(item=><li className="flex items-start gap-2" key={item}><CheckCircle2 className="mt-1 h-3 w-3 flex-none text-amber-300"/><span>{item}</span></li>)}
            </ul>
            {expanded&&<div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-5 text-zinc-300">
              <p><strong className="text-zinc-100">Acceptance:</strong> {offer.acceptanceEvidence}</p>
              <p><strong className="text-zinc-100">Customer prerequisites:</strong> {offer.prerequisites}</p>
              <p><strong className="text-zinc-100">Exclusions:</strong> {offer.boundaries}</p>
              <p><strong className="text-zinc-100">Commercial basis:</strong> {ENTERPRISE_OFFER_TERMS.payment}</p>
            </div>}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <button type="button" onClick={()=>setOpenId(expanded?null:offer.id)} aria-expanded={expanded}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-medium text-zinc-200 hover:border-amber-300/30">
                {expanded?'Hide scope':'Review scope'} <ArrowRight className="h-3 w-3"/>
              </button>
              <button type="button" onClick={()=>copyProposal(offer)}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-3 py-2 text-[11px] font-semibold text-black hover:bg-amber-200">
                <ClipboardCopy className="h-3 w-3"/>Copy draft SOW
              </button>
            </div>
          </article>;
        })}
      </div>
      {!offers.length&&<p className="rounded-xl border border-dashed border-white/10 p-7 text-sm text-zinc-400">No programmes match your search. Clear filters to see all fourteen offers.</p>}
      {copyState&&<p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-xs text-amber-200">{copyState}</p>}
      <EnterpriseValueCase />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Target className="h-4 w-4 text-amber-300"/>Commercial scenario modeller</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Illustrative contracted revenue only. Not a forecast, profit, cash collected, ARR or company valuation.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-zinc-400">£100k contracts sold
              <input type="number" min="0" max="5000" step="1" value={hundredKDeals} onChange={e=>setHundredKDeals(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white"/>
            </label>
            <label className="text-[11px] text-zinc-400">£1m contracts sold
              <input type="number" min="0" max="5000" step="1" value={millionDeals} onChange={e=>setMillionDeals(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white"/>
            </label>
          </div>
          <p className="mt-4 text-2xl font-semibold text-amber-200">{formatEnterpriseGbp(annualScenario)}</p>
          <p className="text-[11px] text-zinc-500">Gross contracted programme fees in this hypothetical mix, before VAT, delivery cost, discounts, churn and collection risk.</p>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-amber-300"/>Before any high-value sale</h3>
          <ol className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
            <li>1. Qualify the customer's workflow, budget owner, success metric and real commercial need.</li>
            <li>2. Demonstrate the exact Blackstar modules required and document missing capabilities.</li>
            <li>3. Complete architecture, privacy, security, legal and supplier due diligence.</li>
            <li>4. Agree project staff, milestones, payment schedule, support, change control and IP.</li>
            <li>5. Sign a negotiated scope of work and use an approved invoice/payment process; never auto-fulfil.</li>
          </ol>
          <p className="mt-4 text-[11px] text-zinc-500">{ENTERPRISE_OFFER_TERMS.procurement}.</p>
        </section>
      </div>
    </section>
  );
}
