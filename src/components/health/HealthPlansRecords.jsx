import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Brain, CheckCircle2, FileHeart, Loader2, Plus, Sparkles } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { generateHealthPlan, getHealthPlansRecords, saveHealthRecord, setHealthPlanStatus } from '@/lib/health/health-plans.functions';

export default function HealthPlansRecords({ mode='plans' }) {
  const getFn=useServerFn(getHealthPlansRecords);
  const generateFn=useServerFn(generateHealthPlan);
  const statusFn=useServerFn(setHealthPlanStatus);
  const recordFn=useServerFn(saveHealthRecord);
  const [data,setData]=useState({plans:[],records:[]});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [plan,setPlan]=useState({plan_type:'training',request:''});
  const [record,setRecord]=useState({record_type:'note',title:'',recorded_on:new Date().toISOString().slice(0,10),provider:'',summary:'',values:''});

  async function load(){try{setData(await getFn({data:undefined}));}catch(e){setError(friendlyMessage(e));}}
  useEffect(()=>{load();},[]);
  async function run(key,fn){setBusy(key);setError('');try{await fn();await load();}catch(e){setError(friendlyMessage(e));}finally{setBusy('');}}

  async function generate(){
    if(!plan.request.trim())return;
    await run('generate',async()=>{await generateFn({data:plan});setPlan({...plan,request:''});});
  }
  async function status(id,next){await run(`status-${id}`,()=>statusFn({data:{id,status:next}}));}
  async function addRecord(){
    if(!record.title.trim())return;
    const values={};
    for(const pair of record.values.split(',').map(x=>x.trim()).filter(Boolean)){
      const index=pair.indexOf(':'); if(index>0) values[pair.slice(0,index).trim()]=pair.slice(index+1).trim();
    }
    await run('record',async()=>{await recordFn({data:{...record,values}});setRecord({record_type:'note',title:'',recorded_on:new Date().toISOString().slice(0,10),provider:'',summary:'',values:''});});
  }

  if(mode==='record')return <section className="mt-4 rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
    <div className="flex items-center gap-2"><FileHeart className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Longitudinal health timeline</h2></div>
    <p className="mt-1 text-[10px] leading-5 text-zinc-600">Store facts from your own records. A “diagnosis record” means a diagnosis already documented by a clinician; Blackstar does not create diagnoses.</p>
    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Field label="Record type"><select className="hpr-field" value={record.record_type} onChange={e=>setRecord({...record,record_type:e.target.value})}>{['lab','appointment','vaccination','procedure','diagnosis_record','note','document'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></Field>
      <Field label="Title"><input className="hpr-field" value={record.title} onChange={e=>setRecord({...record,title:e.target.value})}/></Field>
      <Field label="Date"><input className="hpr-field" type="date" value={record.recorded_on} onChange={e=>setRecord({...record,recorded_on:e.target.value})}/></Field>
      <Field label="Provider / clinic"><input className="hpr-field" value={record.provider} onChange={e=>setRecord({...record,provider:e.target.value})}/></Field>
      <Field label="Values (key:value, comma-separated)"><input className="hpr-field" value={record.values} onChange={e=>setRecord({...record,values:e.target.value})} placeholder="HbA1c: 38 mmol/mol, LDL: 2.1 mmol/L"/></Field>
      <Field label="Summary"><textarea className="hpr-field min-h-20 resize-none" value={record.summary} onChange={e=>setRecord({...record,summary:e.target.value})}/></Field>
    </div>
    <button onClick={addRecord} disabled={busy==='record'||!record.title.trim()} className="hpr-primary mt-3">{busy==='record'?<Loader2 className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>}Add record</button>
    <div className="mt-5 space-y-2">{data.records.length?data.records.map(item=><div key={item.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-medium text-zinc-200">{item.title}</p><span className="text-[9px] uppercase text-violet-300">{item.record_type.replaceAll('_',' ')}</span></div><p className="mt-1 text-[10px] text-zinc-600">{[item.recorded_on,item.provider].filter(Boolean).join(' · ')}</p>{item.summary&&<p className="mt-2 text-[11px] leading-5 text-zinc-400">{item.summary}</p>}{item.values&&Object.keys(item.values).length>0&&<div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(item.values).map(([k,v])=><span key={k} className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] text-zinc-500">{k}: {String(v)}</span>)}</div>}</div>):<Empty text="No health records yet."/>}</div>
    <Styles/>
  </section>;

  return <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
    <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">AI plan studio</h2></div>
    <p className="mt-1 text-[10px] leading-5 text-zinc-600">Blackstar creates conservative drafts from your profile and recent logs. Drafts do nothing automatically; you explicitly activate a plan.</p>
    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><select className="hpr-field" value={plan.plan_type} onChange={e=>setPlan({...plan,plan_type:e.target.value})}>{['training','nutrition','sleep','recovery','habit'].map(x=><option key={x}>{x}</option>)}</select><textarea className="hpr-field min-h-20 resize-none" value={plan.request} onChange={e=>setPlan({...plan,request:e.target.value})} placeholder="Example: Build me a 3-day strength plan that fits 45-minute sessions and prioritises recovery."/><button onClick={generate} disabled={busy==='generate'||!plan.request.trim()} className="hpr-primary self-stretch justify-center">{busy==='generate'?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Generate draft</button></div>
    <div className="mt-5 space-y-3">{data.plans.length?data.plans.map(item=>{const p=item.plan&&typeof item.plan==='object'?item.plan:{};return <div key={item.id} className="rounded-2xl border border-white/[.06] bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-sm font-medium text-zinc-100">{item.title}</p><span className="rounded-full border border-violet-300/10 px-2 py-1 text-[8px] uppercase text-violet-300">{item.plan_type}</span></div><p className="mt-2 max-w-3xl text-[11px] leading-5 text-zinc-400">{p.summary||'Plan draft'}</p></div><span className={`text-[9px] uppercase ${item.status==='active'?'text-emerald-300':'text-zinc-600'}`}>{item.status}</span></div>{Array.isArray(p.schedule)&&p.schedule.length>0&&<div className="mt-3 grid gap-2 md:grid-cols-2">{p.schedule.slice(0,12).map((step,index)=><div key={index} className="rounded-xl border border-white/[.05] bg-white/[.02] p-3"><p className="text-[10px] font-medium text-zinc-300">{step.label}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{step.details}</p></div>)}</div>}{Array.isArray(p.cautions)&&p.cautions.length>0&&<div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-5 text-amber-100/70">{p.cautions.join(' ')}</div>}<div className="mt-3 flex flex-wrap gap-2">{item.status==='draft'&&<button onClick={()=>status(item.id,'active')} disabled={busy===`status-${item.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/15 px-2.5 py-1.5 text-[10px] text-emerald-300"><CheckCircle2 className="h-3 w-3"/>Activate</button>}{item.status==='active'&&<button onClick={()=>status(item.id,'completed')} disabled={busy===`status-${item.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-300">Mark complete</button>}<button onClick={()=>status(item.id,'archived')} disabled={busy===`status-${item.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-500">Archive</button></div></div>}):<Empty text="No plans yet. Generate a training, nutrition, sleep, recovery or habit draft."/>}</div>
    <Styles/>
  </section>;
}
function Field({label,children}){return <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>}
function Empty({text}){return <div className="rounded-xl border border-dashed border-white/[.07] p-6 text-center text-xs text-zinc-600">{text}</div>}
function Styles(){return <style>{`.hpr-field{width:100%;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.28);border-radius:.75rem;padding:.62rem .72rem;font-size:.75rem;color:white;outline:none}.hpr-field:focus{border-color:rgba(167,139,250,.42)}.hpr-field option{background:#11131a}.hpr-primary{display:inline-flex;align-items:center;gap:.5rem;border-radius:.75rem;background:rgb(196 181 253);padding:.65rem .9rem;font-size:.75rem;font-weight:600;color:#050505}.hpr-primary:disabled{opacity:.4}`}</style>}
