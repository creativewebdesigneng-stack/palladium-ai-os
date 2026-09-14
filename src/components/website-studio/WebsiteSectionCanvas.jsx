import {useMemo,useState} from 'react';
import {ArrowUp,ArrowDown,LayoutTemplate,Plus,Trash2} from 'lucide-react';
import {addWebsiteSection,moveWebsiteSection,normalizeSections} from '@/lib/website-studio/website-sections';

const presets=['Hero','Features','Gallery','Testimonials','Pricing','FAQ','Contact','CTA'];

export default function WebsiteSectionCanvas({pages,setPages}){
  const safePages=Array.isArray(pages)?pages:[];
  const [activePath,setActivePath]=useState(safePages[0]?.path||'/');
  const activeIndex=Math.max(0,safePages.findIndex(page=>(page.path||'/')===activePath));
  const active=safePages[activeIndex]||safePages[0]||{name:'Home',path:'/',sections:[]};
  const sections=useMemo(()=>normalizeSections(active.sections||[]),[active.sections]);

  const updateSections=(next)=>{
    if(!safePages.length)return;
    setPages(safePages.map((page,index)=>index===activeIndex?{...page,sections:next}:page));
  };
  const remove=(index)=>updateSections(sections.filter((_,i)=>i!==index));

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-purple-300"><LayoutTemplate className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Page section canvas</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Shape each page visually by ordering its sections. AI iterations use this structure as an explicit layout contract.</p></div>
      <select value={active.path||'/'} onChange={e=>setActivePath(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">{safePages.map((page,index)=><option key={page.path||index} value={page.path||'/'}>{page.name||page.path||'Page'}</option>)}</select>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">{presets.map(type=><button key={type} onClick={()=>updateSections(addWebsiteSection(sections,type))} className="flex items-center gap-1 rounded-lg border border-purple-300/15 bg-purple-300/[.04] px-2.5 py-1.5 text-[10px] text-purple-100"><Plus className="h-3 w-3"/>{type}</button>)}</div>

    <div className="mt-4 space-y-2">{sections.length===0?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">No sections on this page yet.</div>:sections.map((section,index)=><div key={section.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/20 p-3">
      <span className="w-7 text-center text-[10px] text-zinc-700">{String(index+1).padStart(2,'0')}</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{section.label}</p><p className="mt-1 text-[10px] text-zinc-600">{section.type}</p></div>
      <button disabled={index===0} onClick={()=>updateSections(moveWebsiteSection(sections,index,-1))} className="rounded-lg p-1.5 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5"/></button>
      <button disabled={index===sections.length-1} onClick={()=>updateSections(moveWebsiteSection(sections,index,1))} className="rounded-lg p-1.5 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5"/></button>
      <button onClick={()=>remove(index)} className="rounded-lg p-1.5 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button>
    </div>)}</div>
  </section>;
}
