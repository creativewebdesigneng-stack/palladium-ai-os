import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardPlus, Database, FileUp, HeartPulse, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import {
  generateHealthAppointmentBrief, getHealthIntelligenceOverview, importHealthRows, setHealthAppointmentBriefStatus,
} from '@/lib/health/health-intelligence.functions';

const SOURCE_OPTIONS=[
  ['json','JSON'],['csv','CSV'],['apple_health_export','Apple Health export'],['health_connect_export','Health Connect export'],
  ['fitbit_export','Fitbit export'],['garmin_export','Garmin export'],['oura_export','Oura export'],['other','Other export'],
];

export default function HealthIntelligenceCenter({ mode='insights' }) {
  const getFn=useServerFn(getHealthIntelligenceOverview);
  const importFn=useServerFn(importHealthRows);
  const briefFn=useServerFn(generateHealthAppointmentBrief);
  const briefStatusFn=useServerFn(setHealthAppointmentBriefStatus);
  const [data,setData]=useState({metrics:[],sleep:[],workouts:[],nutrition:[],imports:[],briefs:[]});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [importForm,setImportForm]=useState({source_type:'json',data_type:'metrics',filename:'',json:'[\n  {\n    "metric_type": "steps",\n    "value": 8000,\n    "unit": "steps",\n    "recorded_at": "'+new Date().toISOString()+'"\n  }\n]'});
  const [brief,setBrief]=useState({title:'Appointment preparation',appointment_date:'',clinician_or_service:'',goals:'',questions:''});

  async function load(){try{setData(await getFn({data:undefined}));}catch(e){setError(friendlyMessage(e));}}
  useEffect(()=>{load();},[]);
  async function run(key,fn){setBusy(key);setError('');try{await fn();await load();}catch(e){setError(friendlyMessage(e));}finally{setBusy('');}}

  const weightSeries=useMemo(()=>data.metrics.filter(x=>x.metric_type==='weight').map(x=>({date:new Date(x.recorded_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),value:Number(x.value)})),[data.metrics]);
  const stepsSeries=useMemo(()=>data.metrics.filter(x=>x.metric_type==='steps').map(x=>({date:new Date(x.recorded_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),value:Number(x.value)})),[data.metrics]);
  const sleepSeries=useMemo(()=>data.sleep.map(x=>({date:new Date(x.sleep_end).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),value:Math.round(((new Date(x.sleep_end)-new Date(x.sleep_start))/3600000)*10)/10})),[data.sleep]);

  async function doImport(){
    let rows;
    try{rows=JSON.parse(importForm.json);}catch{setError('Import data must be valid JSON.');return;}
    if(!Array.isArray(rows)||!rows.length){setError('Import data must be a non-empty JSON array.');return;}
    await run('import',()=>importFn({data:{source_type:importForm.source_type,data_type:importForm.data_type,filename:importForm.filename,rows}}));
  }
  async function createBrief(){
    if(!brief.title.trim()||!brief.goals.trim())return;
    const questions=brief.questions.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,20);
    await run('brief',()=>briefFn({data:{title:brief.title,appointment_date:brief.appointment_date||'',clinician_or_service:brief.clinician_or_service,goals:brief.goals,questions}}));
  }
  async function markBrief(id,status){await run(`brief-${id}`,()=>briefStatusFn({data:{id,status}}));}

  if(mode==='appointment') return <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
    <div className="flex items-center gap-2"><ClipboardPlus className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Clinician appointment preparation</h2></div>
    <p className="mt-1 text-[10px] leading-5 text-zinc-600">Create a concise draft from your own records, recent trends and medication list. It is preparation material, not a diagnosis or treatment plan.</p>
    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Field label="Brief title"><input className="hic-field" value={brief.title} onChange={e=>setBrief({...brief,title:e.target.value})}/></Field>
      <Field label="Appointment date"><input className="hic-field" type="date" value={brief.appointment_date} onChange={e=>setBrief({...brief,appointment_date:e.target.value})}/></Field>
      <Field label="Clinician / service"><input className="hic-field" value={brief.clinician_or_service} onChange={e=>setBrief({...brief,clinician_or_service:e.target.value})} placeholder="GP, physiotherapist, dietitian…"/></Field>
      <Field label="What do you want help with?"><textarea className="hic-field min-h-20 resize-none" value={brief.goals} onChange={e=>setBrief({...brief,goals:e.target.value})}/></Field>
      <Field label="Your questions (one per line)"><textarea className="hic-field min-h-24 resize-none" value={brief.questions} onChange={e=>setBrief({...brief,questions:e.target.value})}/></Field>
    </div>
    <button onClick={createBrief} disabled={busy==='brief'||!brief.goals.trim()} className="hic-primary mt-3">{busy==='brief'?<Loader2 className="h-4 w-4 animate-spin"/>:<ClipboardPlus className="h-4 w-4"/>}Prepare draft</button>
    <div className="mt-5 space-y-3">{data.briefs.length?data.briefs.map(item=>{const b=item.brief&&typeof item.brief==='object'?item.brief:{};return <article key={item.id} className="rounded-2xl border border-white/[.06] bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-zinc-100">{item.title}</p><p className="mt-1 text-[10px] text-zinc-600">{[item.appointment_date,item.clinician_or_service].filter(Boolean).join(' · ')}</p></div><span className={`text-[9px] uppercase ${item.status==='ready'?'text-emerald-300':'text-zinc-600'}`}>{item.status}</span></div><p className="mt-3 text-[11px] leading-5 text-zinc-300">{b.summary||'Draft brief'}</p><BriefList title="Recent changes" items={b.recent_changes}/><BriefList title="Medication list to confirm" items={b.medications_to_confirm}/><BriefList title="Records to discuss" items={b.records_to_discuss}/><BriefList title="Questions" items={b.questions}/><BriefList title="Items to raise promptly" items={b.red_flags_for_clinician}/><div className="mt-3 flex gap-2">{item.status==='draft'&&<button onClick={()=>markBrief(item.id,'ready')} className="hic-secondary">Mark ready</button>}<button onClick={()=>markBrief(item.id,'archived')} className="hic-secondary">Archive</button></div></article>}):<Empty text="No appointment briefs yet."/>}</div>
    <Styles/>
  </section>;

  return <div className="space-y-5">
    <section className="grid gap-4 xl:grid-cols-3">
      <Trend title="Weight trend" rows={weightSeries} unit=""/>
      <Trend title="Steps trend" rows={stepsSeries} unit=""/>
      <Trend title="Sleep duration" rows={sleepSeries} unit="h"/>
    </section>
    <section className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4 sm:p-5">
      <div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Validated health-data import</h2></div>
      <p className="mt-1 text-[10px] leading-5 text-zinc-600">Import normalized metrics or sleep data from exports. Selecting Apple Health, Health Connect, Fitbit, Garmin or Oura records provenance only; it does not claim a live account connection.</p>
      {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3"><Field label="Source"><select className="hic-field" value={importForm.source_type} onChange={e=>setImportForm({...importForm,source_type:e.target.value})}>{SOURCE_OPTIONS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field><Field label="Data type"><select className="hic-field" value={importForm.data_type} onChange={e=>setImportForm({...importForm,data_type:e.target.value})}><option value="metrics">Metrics</option><option value="sleep">Sleep</option></select></Field><Field label="File / batch label"><input className="hic-field" value={importForm.filename} onChange={e=>setImportForm({...importForm,filename:e.target.value})} placeholder="optional"/></Field></div>
      <Field label="Normalized JSON array"><textarea className="hic-field mt-1 min-h-48 font-mono text-[10px]" value={importForm.json} onChange={e=>setImportForm({...importForm,json:e.target.value})}/></Field>
      <div className="mt-3 flex flex-wrap items-center gap-3"><button onClick={doImport} disabled={busy==='import'} className="hic-primary">{busy==='import'?<Loader2 className="h-4 w-4 animate-spin"/>:<Database className="h-4 w-4"/>}Validate & import</button><span className="text-[10px] text-zinc-600">Maximum 500 rows per batch · invalid rows are rejected and logged.</span></div>
      <div className="mt-5 space-y-2">{data.imports.length?data.imports.slice(0,10).map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 p-3"><div><p className="text-xs text-zinc-300">{item.source_type.replaceAll('_',' ')}</p><p className="mt-1 text-[9px] text-zinc-600">{item.filename||'Unlabelled batch'} · {item.imported_rows} imported · {item.rejected_rows} rejected</p></div><span className={`text-[9px] uppercase ${item.status==='imported'?'text-emerald-300':item.status==='failed'?'text-rose-300':'text-amber-300'}`}>{item.status}</span></div>):<Empty text="No imports yet."/>}</div>
      <Styles/>
    </section>
    <section className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.03] p-4 text-[10px] leading-5 text-zinc-500"><ShieldCheck className="mr-2 inline h-4 w-4 text-cyan-300"/>Imported data retains source provenance. Blackstar uses trends for coaching and organisation, not to turn wearable readings into diagnoses.</section>
  </div>;
}
function Field({label,children}){return <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-600">{label}</span>{children}</label>}
function Empty({text}){return <div className="rounded-xl border border-dashed border-white/[.07] p-6 text-center text-xs text-zinc-600">{text}</div>}
function BriefList({title,items}){return Array.isArray(items)&&items.length?<div className="mt-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{title}</p><ul className="mt-1 space-y-1">{items.map((x,i)=><li key={i} className="text-[10px] leading-4 text-zinc-400">• {x}</li>)}</ul></div>:null}
function Trend({title,rows,unit}){return <div className="rounded-[24px] border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-300"/><h3 className="text-xs font-semibold text-white">{title}</h3></div>{rows.length?<div className="mt-3 h-44"><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows}><CartesianGrid stroke="rgba(255,255,255,.05)"/><XAxis dataKey="date" hide/><YAxis stroke="#71717a" fontSize={9} width={38}/><Tooltip contentStyle={{background:'#0c0d13',border:'1px solid rgba(255,255,255,.1)',fontSize:11}} formatter={(value)=>[`${value}${unit}`,title]}/><Area type="monotone" dataKey="value" stroke="#a78bfa" fill="rgba(167,139,250,.12)"/></AreaChart></ResponsiveContainer></div>:<div className="grid h-44 place-items-center text-xs text-zinc-700">No data yet</div>}</div>}
function Styles(){return <style>{`.hic-field{width:100%;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.28);border-radius:.75rem;padding:.62rem .72rem;font-size:.75rem;color:white;outline:none}.hic-field:focus{border-color:rgba(167,139,250,.42)}.hic-field option{background:#11131a}.hic-primary{display:inline-flex;align-items:center;gap:.5rem;border-radius:.75rem;background:rgb(196 181 253);padding:.65rem .9rem;font-size:.75rem;font-weight:600;color:#050505}.hic-primary:disabled{opacity:.4}.hic-secondary{border:1px solid rgba(255,255,255,.1);border-radius:.5rem;padding:.4rem .65rem;font-size:.625rem;color:rgb(212 212 216)}`}</style>}
