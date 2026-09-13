import{useEffect,useState}from'react';
import{BriefcaseBusiness,Plus,History,ExternalLink,Download,ClipboardCopy,Check}from'lucide-react';
import{listLegalMatters,saveLegalMatter,listLegalMatterRuns}from'@/lib/legal/legal-matters.functions';
import{buildLegalProfessionalHandoffPacket,legalHandoffFilename}from'@/lib/legal/legal-professional-handoff';
import{JURISDICTIONS}from'@/lib/legal/jurisdictions';

export default function LegalMatters(){
  const[rows,setRows]=useState([]),[runs,setRuns]=useState([]),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
  const[form,setForm]=useState({title:'',jurisdiction:'United Kingdom',topic:'general',question:'',status:'open',notes:''});
  async function load(){try{setRows(await listLegalMatters({data:{}}));setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load legal matters.')}}
  useEffect(()=>{load()},[]);
  async function save(e){e.preventDefault();setBusy(true);try{await saveLegalMatter({data:form});setForm({...form,title:'',question:'',notes:''});await load()}catch(e){setError(e instanceof Error?e.message:'Could not save matter.')}finally{setBusy(false)}}
  async function open(row){setSelected(row);setCopied(false);try{setRuns(await listLegalMatterRuns({data:{matter_id:row.id}}));setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load research history.')}}
  function packet(){if(!selected)throw new Error('Select a legal matter first.');return buildLegalProfessionalHandoffPacket({matter:selected,runs});}
  function downloadPacket(){try{const content=packet();const blob=new Blob([content],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=legalHandoffFilename(selected?.title);link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);setError('')}catch(e){setError(e instanceof Error?e.message:'Could not create professional review packet.')}}
  async function copyPacket(){try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard access is unavailable in this browser.');await navigator.clipboard.writeText(packet());setCopied(true);setError('');setTimeout(()=>setCopied(false),1800)}catch(e){setError(e instanceof Error?e.message:'Could not copy professional review packet.')}}
  return <section className="rounded-[24px] border border-white/[.08] bg-white/[.02] p-5">
    <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-amber-300"/><h2 className="font-medium text-white">Legal matters & research packs</h2></div>
    <p className="mt-1 text-xs text-zinc-500">Create a matter to preserve its jurisdiction, question, working notes and evidence-backed research history.</p>
    <form onSubmit={save} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Matter title" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
      <select value={form.jurisdiction} onChange={e=>setForm({...form,jurisdiction:e.target.value})} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white">{JURISDICTIONS.map(j=><option key={j.id}>{j.name}</option>)}</select>
      <input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Topic" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white"/>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="rounded-xl border border-white/10 bg-[#101116] px-3 py-2 text-xs text-white"><option>open</option><option>review</option><option>closed</option></select>
      <textarea required value={form.question} onChange={e=>setForm({...form,question:e.target.value})} placeholder="Legal question / research issue" className="min-h-20 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white md:col-span-2 xl:col-span-3"/>
      <button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300/15 px-3 py-2 text-xs text-amber-100"><Plus className="h-3.5 w-3.5"/>Create matter</button>
    </form>
    {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-4 grid gap-3 xl:grid-cols-2">
      <div className="space-y-2">{rows.map(r=><button key={r.id} onClick={()=>open(r)} className="w-full rounded-xl border border-white/[.06] bg-black/20 p-3 text-left hover:border-amber-300/15"><div className="flex justify-between gap-2"><p className="text-xs font-medium text-white">{r.title}</p><span className="text-[9px] uppercase text-zinc-600">{r.status}</span></div><p className="mt-1 text-[10px] text-zinc-500">{r.jurisdiction} · {r.topic}</p><p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{r.question}</p></button>)}</div>
      {selected&&<div className="rounded-xl border border-white/[.06] bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><History className="h-3.5 w-3.5 text-zinc-500"/><p className="text-xs text-white">{selected.title} · research history</p></div><div className="flex gap-2"><button type="button" onClick={copyPacket} className="inline-flex items-center gap-1 rounded-lg border border-white/[.07] px-2.5 py-1.5 text-[10px] text-zinc-300 hover:border-cyan-300/20 hover:text-cyan-100">{copied?<Check className="h-3 w-3 text-emerald-300"/>:<ClipboardCopy className="h-3 w-3"/>}{copied?'Copied':'Copy hand-off'}</button><button type="button" onClick={downloadPacket} className="inline-flex items-center gap-1 rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-2.5 py-1.5 text-[10px] text-amber-100"><Download className="h-3 w-3"/>Download review packet</button></div></div>
        <p className="mt-2 rounded-lg border border-white/[.05] bg-white/[.015] p-2 text-[10px] leading-4 text-zinc-600">The professional-review packet is generated deterministically from this saved matter and its saved evidence. It does not add a new AI legal conclusion and is not legal advice.</p>
        {runs.length===0?<p className="mt-3 text-[11px] text-zinc-600">No saved research runs yet. The review packet will state that no evidence-backed research is saved rather than implying otherwise.</p>:<div className="mt-3 space-y-2">{runs.map(x=><div key={x.id} className="rounded-lg border border-white/[.05] p-3"><p className="text-[10px] text-zinc-600">{new Date(x.created_at).toLocaleString()} · {x.provider||'provider'} / {x.model||'model'}</p><p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] text-zinc-400">{x.report}</p><div className="mt-2 flex flex-wrap gap-2">{(x.sources||[]).slice(0,3).map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-cyan-300/70">{s.title.slice(0,36)}<ExternalLink className="h-2.5 w-2.5"/></a>)}</div></div>)}</div>}
      </div>}
    </div>
  </section>
}
