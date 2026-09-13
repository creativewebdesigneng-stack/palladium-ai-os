import { useEffect, useState } from 'react';
import { Building2, Save, Trash2, Bot, Target, ShieldAlert } from 'lucide-react';
import { deleteCompanyWorkspace, listCompanyWorkspaces, saveCompanyWorkspace } from '@/lib/company/company-workspaces.functions';

const blank={name:'',industry:'',stage:'build',geography:'',mission:'',company_context:'',objectives:[],priorities:[],risks:[],department_plan:{},ai_workforce_plan:[],notes:''};
const parseList=(v)=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,50);

export default function CompanyWorkspace(){
 const [items,setItems]=useState([]),[form,setForm]=useState(blank),[error,setError]=useState('');
 const load=()=>listCompanyWorkspaces({data:{}}).then(setItems).catch(e=>setError(e instanceof Error?e.message:'Could not load company workspaces.'));
 useEffect(()=>{load()},[]);
 const save=async()=>{setError('');try{await saveCompanyWorkspace({data:form});setForm(blank);await load()}catch(e){setError(e instanceof Error?e.message:'Could not save company workspace.')}};
 const remove=async(id)=>{try{await deleteCompanyWorkspace({data:{id}});if(form.id===id)setForm(blank);await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete company workspace.')}};
 return <section className="rounded-[26px] border border-white/[.08] bg-black/25 p-5 lg:p-6">
  <div className="flex items-center gap-2 text-emerald-300"><Building2 className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[.16em]">Private company workspace</span></div>
  <h2 className="mt-2 text-xl font-semibold text-white">Keep company context, priorities and AI workforce planning persistent</h2>
  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">This stores planning context only. Organisation membership remains in Organisations; departments and executable AI workers remain in Workforce OS.</p>
  {error&&<p className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-3 text-xs text-rose-200">{error}</p>}
  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
   <div className="space-y-3 rounded-2xl border border-white/[.07] p-4">
    <div className="grid gap-3 md:grid-cols-2"><Field label="Company / workspace name" value={form.name} set={v=>setForm({...form,name:v})}/><Field label="Industry" value={form.industry} set={v=>setForm({...form,industry:v})}/><Field label="Geography / market" value={form.geography} set={v=>setForm({...form,geography:v})}/><label><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">Stage</span><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-sm text-white">{['start','build','grow','optimise','expand','transform'].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <Area label="Mission / purpose" value={form.mission} set={v=>setForm({...form,mission:v})}/>
    <Area label="Company context" value={form.company_context} set={v=>setForm({...form,company_context:v})}/>
    <Area label="Objectives (one per line)" value={form.objectives.join('\n')} set={v=>setForm({...form,objectives:parseList(v)})}/>
    <Area label="Current priorities (one per line)" value={form.priorities.join('\n')} set={v=>setForm({...form,priorities:parseList(v)})}/>
    <Area label="Key risks (one per line)" value={form.risks.join('\n')} set={v=>setForm({...form,risks:parseList(v)})}/>
    <button disabled={!form.name.trim()} onClick={save} className="flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-xs text-emerald-100 disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{form.id?'Update':'Save'} company workspace</button>
   </div>
   <div className="space-y-2">{items.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-600">No company workspaces saved yet.</div>:items.map(x=><article key={x.id} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="flex items-start justify-between gap-3"><button onClick={()=>setForm({...blank,...x})} className="min-w-0 text-left"><h3 className="truncate text-sm font-medium text-white hover:text-emerald-200">{x.name}</h3><p className="mt-1 text-xs text-zinc-600">{x.industry||'Unspecified industry'}{x.stage?' · '+x.stage:''}{x.geography?' · '+x.geography:''}</p></button><button onClick={()=>remove(x.id)} className="text-zinc-700 hover:text-rose-300" aria-label="Delete company workspace"><Trash2 className="h-4 w-4"/></button></div><div className="mt-3 grid grid-cols-3 gap-2"><Metric icon={Target} label="Objectives" value={x.objectives?.length||0}/><Metric icon={Bot} label="AI plan" value={x.ai_workforce_plan?.length||0}/><Metric icon={ShieldAlert} label="Risks" value={x.risks?.length||0}/></div>{x.priorities?.length>0&&<p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">{x.priorities.join(' · ')}</p>}</article>)}</div>
  </div>
 </section>
}
function Field({label,value,set}){return <label className="block"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">{label}</span><input value={value||''} onChange={e=>set(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-sm text-white outline-none"/></label>}
function Area({label,value,set}){return <label className="block"><span className="text-[10px] uppercase tracking-[.1em] text-zinc-600">{label}</span><textarea value={value||''} onChange={e=>set(e.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-sm text-white outline-none"/></label>}
function Metric({icon:Icon,label,value}){return <div className="rounded-xl border border-white/[.06] p-2.5"><Icon className="h-3.5 w-3.5 text-violet-300"/><p className="mt-1 text-lg font-semibold text-white">{value}</p><p className="text-[9px] uppercase tracking-[.08em] text-zinc-700">{label}</p></div>}
