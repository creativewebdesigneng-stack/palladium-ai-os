import { useMemo, useState } from 'react';
import {
  Banknote, BookOpen, Building2, Calculator, CreditCard, ExternalLink,
  Landmark, LineChart, PiggyBank, Receipt, ShieldCheck, WalletCards,
} from 'lucide-react';

const TOPICS = [
  { icon: WalletCards, title: 'Everyday money', text: 'Budgeting, banking, bills, emergency funds and spending control.' },
  { icon: PiggyBank, title: 'Saving & pensions', text: 'Savings goals, cash reserves, pensions and long-term planning.' },
  { icon: CreditCard, title: 'Credit & debt', text: 'Borrowing costs, credit basics, repayment planning and debt support.' },
  { icon: LineChart, title: 'Investing & markets', text: 'Risk, diversification, funds, shares, bonds and market education.' },
  { icon: Building2, title: 'Business finance', text: 'Cash flow, margins, tax, working capital, forecasting and company finance.' },
  { icon: Landmark, title: 'Property & mortgages', text: 'Deposits, affordability, mortgage costs, rates and home-buying resources.' },
];

const RESOURCES = [
  {
    group: 'Money guidance',
    items: [
      ['MoneyHelper budget planner', 'https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner'],
      ['MoneyHelper tools & calculators', 'https://www.moneyhelper.org.uk/en/tools-and-calculators'],
      ['MoneyHelper savings guidance', 'https://www.moneyhelper.org.uk/en/savings'],
      ['MoneyHelper debt & money troubles', 'https://www.moneyhelper.org.uk/en/money-troubles'],
    ],
  },
  {
    group: 'Regulation & protection',
    items: [
      ['FCA consumer information', 'https://www.fca.org.uk/consumers'],
      ['FCA Financial Services Register', 'https://register.fca.org.uk/s/'],
      ['FCA scam and investment warnings', 'https://www.fca.org.uk/consumers/scams'],
    ],
  },
  {
    group: 'Tax & business',
    items: [
      ['GOV.UK tax overview', 'https://www.gov.uk/browse/tax'],
      ['Self Assessment', 'https://www.gov.uk/self-assessment-tax-returns'],
      ['Corporation Tax', 'https://www.gov.uk/corporation-tax'],
      ['Companies House', 'https://www.gov.uk/government/organisations/companies-house'],
    ],
  },
  {
    group: 'Economy & markets',
    items: [
      ['Bank of England monetary policy', 'https://www.bankofengland.co.uk/monetary-policy'],
      ['Bank of England interest rates', 'https://www.bankofengland.co.uk/monetary-policy/interest-rates-and-bank-rate'],
      ['ONS economy data', 'https://www.ons.gov.uk/economy'],
      ['MoneyHelper investing guidance', 'https://www.moneyhelper.org.uk/en/savings/investing'],
    ],
  },
  {
    group: 'Pensions & property',
    items: [
      ['MoneyHelper pensions & retirement', 'https://www.moneyhelper.org.uk/en/pensions-and-retirement'],
      ['Check your State Pension', 'https://www.gov.uk/check-state-pension'],
      ['GOV.UK property guidance', 'https://www.gov.uk/browse/housing-local-services/owning-renting-property'],
    ],
  },
];

function money(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
}

function Tile({ icon: Icon, title, text }) {
  return (
    <div className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:-translate-y-0.5 hover:border-violet-300/20 hover:bg-violet-400/[.035]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-400/[.06]">
        <Icon className="h-4 w-4 text-violet-200/80" />
      </div>
      <h3 className="mt-3 text-sm font-medium text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function ResourceGroup({ group, items }) {
  return (
    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-400">{group}</h3>
      <div className="mt-3 space-y-2">
        {items.map(([label, href]) => (
          <a key={href} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 px-3 py-2.5 text-xs text-zinc-300 transition hover:border-violet-300/20 hover:bg-violet-400/[.035] hover:text-white">
            <span>{label}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          </a>
        ))}
      </div>
    </section>
  );
}

export default function FinanceKnowledgeHub() {
  const [monthly, setMonthly] = useState('500');
  const [savingRate, setSavingRate] = useState('5');
  const [savingYears, setSavingYears] = useState('10');
  const [loan, setLoan] = useState('20000');
  const [loanRate, setLoanRate] = useState('7');
  const [loanYears, setLoanYears] = useState('5');

  const savings = useMemo(() => {
    const p = Math.max(0, Number(monthly) || 0);
    const n = Math.max(1, Math.round((Number(savingYears) || 0) * 12));
    const r = Math.max(0, Number(savingRate) || 0) / 100 / 12;
    const total = r === 0 ? p * n : p * ((Math.pow(1 + r, n) - 1) / r);
    return { total, contributed: p * n };
  }, [monthly, savingRate, savingYears]);

  const loanCalc = useMemo(() => {
    const principal = Math.max(0, Number(loan) || 0);
    const n = Math.max(1, Math.round((Number(loanYears) || 0) * 12));
    const r = Math.max(0, Number(loanRate) || 0) / 100 / 12;
    const payment = r === 0 ? principal / n : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = payment * n;
    return { payment, total, interest: Math.max(0, total - principal) };
  }, [loan, loanRate, loanYears]);

  return (
    <div className="mt-5 space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-white/[.08] bg-[linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.01)_52%,rgba(139,92,246,.025))] p-5 shadow-[0_22px_60px_rgba(0,0,0,.22)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-violet-200/70">Finance knowledge centre</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white">Explore personal, business and market finance in one place</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Learn concepts, run estimates, find trusted official guidance and use your Blackstar ledger as the factual base for analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[.04] px-3 py-2 text-[11px] text-amber-100/70">
            <ShieldCheck className="h-4 w-4" /> Information and educational estimates only — not regulated financial advice.
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TOPICS.map((topic) => <Tile key={topic.title} {...topic} />)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
          <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-medium text-white">Savings growth estimator</h2></div>
          <p className="mt-1 text-xs text-zinc-500">Illustrative compound-growth estimate; actual returns vary and can be negative.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-[11px] text-zinc-500">Monthly saving (£)<input value={monthly} onChange={(e)=>setMonthly(e.target.value)} type="number" min="0" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[11px] text-zinc-500">Annual return (%)<input value={savingRate} onChange={(e)=>setSavingRate(e.target.value)} type="number" min="0" step="0.1" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[11px] text-zinc-500">Years<input value={savingYears} onChange={(e)=>setSavingYears(e.target.value)} type="number" min="1" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Estimated value</p><p className="mt-1 text-lg font-semibold text-white">{money(savings.total)}</p></div>
            <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Your contributions</p><p className="mt-1 text-lg font-semibold text-zinc-200">{money(savings.contributed)}</p></div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-medium text-white">Loan repayment estimator</h2></div>
          <p className="mt-1 text-xs text-zinc-500">Simple repayment estimate. Fees, variable rates and lender terms are not included.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-[11px] text-zinc-500">Amount (£)<input value={loan} onChange={(e)=>setLoan(e.target.value)} type="number" min="0" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[11px] text-zinc-500">APR (%)<input value={loanRate} onChange={(e)=>setLoanRate(e.target.value)} type="number" min="0" step="0.1" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[11px] text-zinc-500">Years<input value={loanYears} onChange={(e)=>setLoanYears(e.target.value)} type="number" min="1" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white" /></label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Monthly</p><p className="mt-1 text-base font-semibold text-white">{money(loanCalc.payment)}</p></div>
            <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Total repaid</p><p className="mt-1 text-base font-semibold text-zinc-200">{money(loanCalc.total)}</p></div>
            <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Interest</p><p className="mt-1 text-base font-semibold text-rose-200">{money(loanCalc.interest)}</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-medium text-white">Trusted finance resources</h2></div>
        <p className="mt-1 text-xs text-zinc-500">Direct links to official or publicly funded UK guidance and data sources.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {RESOURCES.map((resource) => <ResourceGroup key={resource.group} {...resource} />)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Tile icon={Banknote} title="Personal finance path" text="Start with cash flow → high-cost debt → emergency reserve → protection → pension/saving → investing education." />
        <Tile icon={Building2} title="Business finance path" text="Track revenue, gross margin, operating costs, cash runway, tax obligations, receivables and working capital." />
        <Tile icon={Receipt} title="Tax & records path" text="Keep accurate records, separate estimates from filed figures, and use HMRC/GOV.UK guidance for current tax obligations." />
      </section>
    </div>
  );
}
