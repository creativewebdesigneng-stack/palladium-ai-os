import { motion, useReducedMotion } from 'framer-motion';
import { Banknote, CircleDollarSign, Receipt, WalletCards } from 'lucide-react';

export default function FinanceLedgerWorld({ transactions=[], summary, currency='GBP' }) {
  const reduced=useReducedMotion();
  const income=transactions.filter((row)=>row.direction==='income').length;
  const expenses=transactions.filter((row)=>row.direction==='expense').length;
  const pending=transactions.filter((row)=>row.status==='pending').length;
  const active=transactions.length>0;
  const fmt=(value)=>new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0));

  return <section className="relative mb-5 overflow-hidden rounded-[30px] border border-amber-200/12 bg-[#080703]/92 shadow-[0_36px_110px_rgba(0,0,0,.4)]">
    <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,158,11,.10),transparent_30%),radial-gradient(circle_at_15%_20%,rgba(139,92,246,.10),transparent_24%)]"/>
    <div className="relative flex flex-wrap items-center gap-3 border-b border-white/7 px-5 py-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-amber-200/65">Financial operating architecture</p><h2 className="mt-1 text-lg font-semibold text-white">Recorded cash-flow field</h2></div>
      <div className="ml-auto flex gap-2 font-mono text-[9px] text-zinc-400"><span>{transactions.length} records</span><span>·</span><span>{pending} pending</span></div>
    </div>
    <div className="relative min-h-[300px] p-5">
      <div aria-hidden className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(245,158,11,.04)_1px,transparent_1px)] [background-size:100%_30px]"/>
      <motion.div className="absolute left-1/2 top-1/2 hidden h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/18 bg-amber-200/[.035] shadow-[0_0_70px_rgba(245,158,11,.11)] md:block" animate={reduced||!active?undefined:{scale:[1,1.05,1]}} transition={reduced||!active?undefined:{duration:4.2,repeat:Infinity}}/>
      <div className="relative hidden min-h-[260px] md:block">
        <div className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 text-center"><WalletCards className="mx-auto h-7 w-7 text-amber-200"/><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-zinc-500">Ledger core</p><p className="mt-1 text-xl font-semibold text-white">{summary?.count?fmt(summary.profit):'—'}</p><p className="text-[9px] text-zinc-600">recorded net position</p></div>
        {[
          {label:'Income records',value:income,Icon:Banknote,left:'18%',top:'28%'},
          {label:'Expense records',value:expenses,Icon:Receipt,left:'82%',top:'28%'},
          {label:'Pending records',value:pending,Icon:CircleDollarSign,left:'18%',top:'76%'},
          {label:'Total ledger',value:transactions.length,Icon:WalletCards,left:'82%',top:'76%'},
        ].map((node,index)=><motion.div key={node.label} className="absolute w-[165px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl" style={{left:node.left,top:node.top}} animate={reduced||!active?undefined:{y:[0,-4,0]}} transition={reduced||!active?undefined:{duration:4+index*.4,repeat:Infinity,delay:index*.12}}><div className="flex items-center gap-2"><node.Icon className="h-3.5 w-3.5 text-amber-200"/><span className="text-[9px] font-medium text-white">{node.label}</span></div><p className="mt-1 font-mono text-lg text-zinc-200">{node.value}</p></motion.div>)}
      </div>
      <div className="grid grid-cols-2 gap-2 md:hidden"><Metric label="Income" value={income}/><Metric label="Expenses" value={expenses}/><Metric label="Pending" value={pending}/><Metric label="Records" value={transactions.length}/></div>
    </div>
    <div className="relative border-t border-white/7 bg-black/20 px-5 py-3 text-[9px] uppercase tracking-[.12em] text-zinc-500">Values reflect recorded Blackstar ledger data · no inferred bank balance or live valuation</div>
  </section>;
}
function Metric({label,value}){return <div className="rounded-xl border border-white/10 bg-black/45 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-zinc-500">{label}</p><p className="mt-1 font-mono text-lg text-white">{value}</p></div>}
