import { useEffect,useState } from 'react';
import { BellRing,Plus,Trash2 } from 'lucide-react';
import { listFinanceAlerts,saveFinanceAlert,deleteFinanceAlert } from '@/lib/business/finance-alerts.functions';
const METRICS=[['portfolio_value','Portfolio value'],['cash_reserve','Cash reserve'],['monthly_expense','Monthly expense'],['monthly_revenue','Monthly revenue']];
export default function FinanceAlerts(){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [form,setForm]=useState({name:'',metric:'portfolio_value',operator:'below',threshold:'10000',enabled:true});
 async function load(){try{setError('');setRows(await listFinanceAlerts({data:{}}));}catch(e){setError(e instanceof Error?e.message:'Could not load finance alerts.');}}
 useEffect(()=>{load()},[]);
 async function save(e){e.preventDefault();setBusy(true);try{await saveFinanceAlert({data:{...form,threshold:Number(form.threshold)}});setForm({...form,name:''});await load();}catch(e){setError(e instanceof Error?e.message:'Could not save alert.');}finally{setBusy(false);}}
 async function remove(id){setBusy(true);try{await deleteFinanceAlert({data:{id}});await load();}finally{setBusy(false);}}
 return <section className="rounded-[22px] border border-white/[.08] bg-white/[.02] p-5">
  <div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-amber-300"/><h2 className="text-sm font-medium text-white">Finance alerts</h2></div>
  <p className="mt-1 text-xs text-zinc-500">Save threshold rules now. Rules are configuration only until a governed evaluator has verified data to evaluate; Blackstar will not pretend an alert is actively monitored before that executor exists.</p>
  <form onSubmit={save} className="mt-4 grid gap-2 md:grid-cols-5"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Alert name" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/><select value={form.metric} onChange={e=>setForm({...form,metric:e.target.value})} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white">{METRICS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"><option value="below">falls below</option><option value="above">rises above</option></select><input type="number" min="0" value={form.threshold} onChange={e=>setForm({...form,threshold:e.target.value})} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300/15 bg-amber-300/[.05] px-3 py-2 text-xs text-amber-100"><Plus className="h-3.5 w-3.5"/>Save rule</button></form>
  {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
  <div className="mt-4 space-y-2">{rows.length===0?<p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">No finance alert rules saved.</p>:rows.map(r=><div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 px-3 py-2"><div><p className="text-xs text-white">{r.name}</p><p className="text-[10px] text-zinc-500">{METRICS.find(x=>x[0]===r.metric)?.[1]||r.metric} {r.operator} £{Number(r.threshold).toLocaleString()} · configured, not actively monitored</p></div><button disabled={busy} onClick={()=>remove(r.id)} aria-label="Delete alert" className="rounded-lg p-2 text-zinc-600 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
 </section>
}
