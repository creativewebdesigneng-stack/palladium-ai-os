import { useEffect, useMemo, useState } from 'react';
import { Crosshair, TrendingUp, ShieldAlert, Users, Workflow, Banknote, Save } from 'lucide-react';
import { listCompanyWorkspaces, saveCompanyWorkspace } from '@/lib/company/company-workspaces.functions';
import { mergeCompanyStrategyAgenda } from '@/lib/company/company-strategy';

const priorities=[
 ['Revenue growth','Pipeline, conversion, retention, pricing and expansion',TrendingUp],
 ['Margin improvement','Cost-to-serve, procurement, pricing, productivity and mix',Banknote],
 ['Operational scale','Capacity, process standardisation, automation and service quality',Workflow],
 ['Workforce capability','Roles, skills, leadership, AI augmentation and succession',Users],
 ['Risk reduction','Controls, resilience, compliance, cyber and concentration',ShieldAlert],
];

export default function CompanyStrategyRoom(){
 const [goal,setGoal]=useState('Grow revenue while protecting margin');
 const [horizon,setHorizon]=useState('12 months');
 const [selected,setSelected]=useState(['Revenue growth','Margin improvement']);
 const [workspaces,setWorkspaces]=useState([]);
 const [workspaceId,setWorkspaceId]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const focus=useMemo(()=>priorities.filter(([n])=>selected.includes(n)),[selected]);
 const toggle=n=>setSelected(v=>v.includes(n)?v.filter(x=>x!==n):[...v,n]);
 useEffect(()=>{listCompanyWorkspaces({data:{}}).then(rows=>{setWorkspaces(rows);setWorkspaceId(current=>current&&rows.some(row=>row.id===current)?current:(rows[0]?.id||''))}).catch(cause=>setError(cause instanceof Error?cause.message:'Could not load company workspaces.'))},[]);
 async function saveAgenda(){
  const workspace=workspaces.find(item=>item.id===workspaceId);
  if(!workspace)return;
  setBusy(true);setError('');setNotice('');
  try{
   await saveCompanyWorkspace({data:mergeCompanyStrategyAgenda(workspace,{goal,horizon,priorities:selected})});
   setNotice('Strategy agenda saved on the company workspace.');
   const rows=await listCompanyWorkspaces({data:{}});
   setWorkspaces(rows);
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not save the strategy agenda.')}
  finally{setBusy(false)}
 }
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-center gap-2 text-cyan-300"><Crosshair className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Company strategy room</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Turn company objectives into an operating agenda</h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Frame an objective, choose the transformation lenses that matter and use the resulting agenda to coordinate Blackstar's specialist systems. This is planning support, not a guarantee of commercial outcomes.</p>
  <div className="mt-5 grid gap-3 md:grid-cols-2"><label className="rounded-xl border border-white/[.07] bg-black/25 p-3"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Primary objective</span><input value={goal} onChange={e=>setGoal(e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none"/></label><label className="rounded-xl border border-white/[.07] bg-black/25 p-3"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Planning horizon</span><input value={horizon} onChange={e=>setHorizon(e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none"/></label></div>
  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{priorities.map(([name,text,Icon])=><button type="button" key={name} aria-pressed={selected.includes(name)} onClick={()=>toggle(name)} className={`rounded-2xl border p-4 text-left transition ${selected.includes(name)?'border-cyan-300/25 bg-cyan-300/[.06]':'border-white/[.07] bg-white/[.02]'}`}><Icon className="h-4 w-4 text-cyan-300"/><p className="mt-2 text-xs font-medium text-white">{name}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p></button>)}</div>
  <div className="mt-4 rounded-2xl border border-violet-300/10 bg-violet-300/[.025] p-4"><p className="text-[10px] uppercase tracking-[.12em] text-violet-300">Operating agenda · {horizon}</p><p className="mt-2 text-sm text-white">{goal || 'Define a company objective'}</p><div className="mt-3 flex flex-wrap gap-2">{focus.map(([name])=><span key={name} className="rounded-lg border border-white/[.07] px-2.5 py-1 text-xs text-zinc-400">{name}</span>)}</div></div>
  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
   <label className="min-w-0 flex-1 text-[10px] uppercase tracking-[.1em] text-zinc-600">Company workspace
    <select aria-label="Company workspace" value={workspaceId} onChange={event=>setWorkspaceId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white">{workspaces.length?workspaces.map(item=><option key={item.id} value={item.id}>{item.name}</option>):<option value="">No saved workspace</option>}</select>
   </label>
   <button type="button" onClick={saveAgenda} disabled={!workspaceId||busy||!goal.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-xs text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{busy?'Saving…':'Save agenda'}</button>
  </div>
  {!workspaces.length&&<p className="mt-2 text-xs text-zinc-500">Create a company workspace below before this agenda can be stored.</p>}
  {error&&<p role="alert" className="mt-2 rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-3 text-xs text-rose-200">{error}</p>}
  {notice&&<p role="status" className="mt-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs text-emerald-100">{notice}</p>}
 </section>
}
