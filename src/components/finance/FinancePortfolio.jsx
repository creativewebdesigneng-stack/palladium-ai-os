import { useEffect,useMemo,useState } from 'react';
import { Briefcase,Plus,Trash2,ShieldCheck } from 'lucide-react';
import { listFinanceHoldings,saveFinanceHolding,deleteFinanceHolding } from '@/lib/business/finance-holdings.functions';
const TYPES=['stock','etf','fund','bond','cash','crypto','property','pension','other'];
const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(n)||0);
export default function FinancePortfolio(){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [form,setForm]=useState({symbol:'',name:'',asset_type:'stock',quantity:'1',cost_basis:'',manual_value:'',currency:'GBP'});
 async function load(){try{setError('');setRows(await listFinanceHoldings({data:{}}));}catch(e){setError(e instanceof Error?e.message:'Could not load holdings.');}}
 useEffect(()=>{load()},[]);
 const total=useMemo(()=>rows.reduce((s,r)=>s+Number(r.manual_value||0),0),[rows]);
 async function save(e){e.preventDefault();setBusy(true);try{await saveFinanceHolding({data:{...form,quantity:Number(form.quantity),cost_basis:form.cost_basis===''?undefined:Number(form.cost_basis),manual_value:form.manual_value===''?undefined:Number(form.manual_value)}});setForm({symbol:'',name:'',asset_type:'stock',quantity:'1',cost_basis:'',manual_value:'',currency:'GBP'});await load();}catch(e){setError(e instanceof Error?e.message:'Could not save holding.');}finally{setBusy(false);}}
 async function remove(id){setBusy(true);try{await deleteFinanceHolding({data:{id}});await load();}catch(e){setError(e instanceof Error?e.message:'Could not delete holding.');}finally{setBusy(false);}}
 return <section className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-medium text-white">Portfolio & holdings</h2></div><p className="mt-1 text-xs text-zinc-500">Persistent user-owned holdings. Values are manual until a verified market-data provider is connected.</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Manual portfolio value</p><p className="text-lg font-semibold text-white">{gbp(total)}</p></div></div>
  <form onSubmit={save} className="mt-4 grid gap-2 md:grid-cols-7">
   <input required value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value})} placeholder="Symbol / ID" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
   <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
   <select value={form.asset_type} onChange={e=>setForm({...form,asset_type:e.target.value})} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white">{TYPES.map(x=><option key={x}>{x}</option>)}</select>
   <input type="number" min="0" step="any" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="Quantity" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
   <input type="number" min="0" step="any" value={form.cost_basis} onChange={e=>setForm({...form,cost_basis:e.target.value})} placeholder="Cost basis" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
   <input type="number" min="0" step="any" value={form.manual_value} onChange={e=>setForm({...form,manual_value:e.target.value})} placeholder="Current value" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
   <button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-300/15 bg-violet-400/[.07] px-3 py-2 text-xs text-violet-100"><Plus className="h-3.5 w-3.5"/>Add</button>
  </form>
  {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
  <div className="mt-4 space-y-2">{rows.length===0?<div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">No holdings recorded yet.</div>:rows.map(r=><div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/[.06] bg-black/20 px-3 py-2"><div><div className="flex items-center gap-2"><span className="text-xs font-medium text-white">{r.symbol}</span><span className="text-[10px] uppercase text-zinc-600">{r.asset_type}</span></div><p className="text-[10px] text-zinc-500">{r.name||'Unnamed'} · qty {Number(r.quantity).toLocaleString()} · manual value {r.manual_value==null?'not set':gbp(r.manual_value)}</p></div><button disabled={busy} onClick={()=>remove(r.id)} className="rounded-lg p-2 text-zinc-600 hover:bg-rose-400/[.06] hover:text-rose-300" aria-label="Delete holding"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
  <div className="mt-3 flex gap-2 text-[10px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5 shrink-0"/>Holdings are private to the signed-in owner through row-level security. Manual values are not represented as live market prices.</div>
 </section>
}
