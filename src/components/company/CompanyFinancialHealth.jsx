import { useMemo, useState } from 'react';
import { Banknote, TrendingUp, WalletCards, Gauge } from 'lucide-react';
import { calculateCompanyFinancialMetrics } from '@/lib/company/company-metrics';

const num=v=>Number.isFinite(Number(v))?Number(v):0;
export default function CompanyFinancialHealth(){
 const [revenue,setRevenue]=useState('1000000'),[cogs,setCogs]=useState('550000'),[opex,setOpex]=useState('300000'),[cash,setCash]=useState('500000'),[monthlyBurn,setMonthlyBurn]=useState('75000'),[receivables,setReceivables]=useState('180000');
 const m=useMemo(()=>calculateCompanyFinancialMetrics({
  revenue:num(revenue),
  cogs:num(cogs),
  operatingExpense:num(opex),
  cash:num(cash),
  monthlyBurn:num(monthlyBurn),
  receivables:num(receivables),
 }),[revenue,cogs,opex,cash,monthlyBurn,receivables]);
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6"><div className="flex items-center gap-2 text-emerald-300"><Banknote className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Financial & revenue health</span></div><h2 className="mt-2 text-xl font-semibold text-white">Company economics at a glance</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Run deterministic health calculations from user-entered assumptions. Use Blackstar Finance and connected accounting/investment sources for authoritative financial records and deeper modelling.</p>
 <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Field label="Revenue" value={revenue} set={setRevenue}/><Field label="COGS" value={cogs} set={setCogs}/><Field label="Operating expense" value={opex} set={setOpex}/><Field label="Cash" value={cash} set={setCash}/><Field label="Monthly burn" value={monthlyBurn} set={setMonthlyBurn}/><Field label="Receivables" value={receivables} set={setReceivables}/></div>
 <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Metric icon={TrendingUp} label="Gross margin" value={m.grossMarginPercent.toFixed(1)+'%'}/><Metric icon={Gauge} label="Operating margin" value={m.operatingMarginPercent.toFixed(1)+'%'}/><Metric icon={WalletCards} label="Simple cash runway" value={m.simpleRunwayMonths.toFixed(1)+' months'}/><Metric icon={Banknote} label="Receivable days proxy" value={m.receivableDaysProxy.toFixed(1)+' days'}/></div><p className="mt-4 text-[10px] leading-4 text-zinc-600">These simplified outputs exclude tax, financing, working-capital detail, revenue recognition, seasonality and accounting-policy effects and must not be treated as audited accounts or forecasts.</p></section>
}
function Field({label,value,set}){return <label className="rounded-xl border border-white/[.07] bg-black/25 p-3"><span className="text-[9px] uppercase tracking-[.08em] text-zinc-700">{label}</span><input value={value} onChange={e=>set(e.target.value)} inputMode="decimal" className="mt-2 w-full bg-transparent text-xs text-white outline-none"/></label>}
function Metric({icon:Icon,label,value}){return <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3"><Icon className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-zinc-700">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>}
