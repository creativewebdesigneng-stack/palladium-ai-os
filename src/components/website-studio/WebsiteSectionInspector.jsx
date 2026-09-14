import {useMemo,useState} from 'react';
import {Eye,EyeOff,Paintbrush,SlidersHorizontal,WandSparkles} from 'lucide-react';
import {applyWebsiteSectionContract,normalizeSections,updateWebsiteSection,websiteSectionContractCss} from '@/lib/website-studio/website-sections';
import {normalizePagePath,resolvePageHtml,setPageHtml} from '@/lib/website-studio/website-page-documents';

export default function WebsiteSectionInspector({project,setProject,activePath}){
  const pages=Array.isArray(project.pages)?project.pages:[];
  const normalizedPath=normalizePagePath(activePath||'/');
  const page=pages.find(item=>normalizePagePath(item?.path||'/')===normalizedPath);
  const rawSections=page?.sections||[];
  const sections=useMemo(()=>normalizeSections(rawSections),[rawSections]);
  const [selectedId,setSelectedId]=useState(sections[0]?.id||'');
  const selected=sections.find(section=>section.id===selectedId)||sections[0]||null;

  const update=(patch)=>{
    if(!selected)return;
    const nextSections=updateWebsiteSection(sections,selected.id,patch);
    const nextPages=pages.map(item=>normalizePagePath(item?.path||'/')===normalizedPath?{...item,sections:nextSections}:item);
    setProject({...project,pages:nextPages});
  };

  const applyToCode=()=>{
    if(!page)return;
    const source=resolvePageHtml(project.name||'Website',project.html||'',page);
    const nextHtml=applyWebsiteSectionContract(source,sections);
    let nextCss=project.css||'';
    const marker='/* BLACKSTAR_SECTION_CONTRACT */';
    if(!nextCss.includes(marker))nextCss=marker+'\n'+websiteSectionContractCss()+'\n'+nextCss;
    if(normalizedPath==='/')setProject({...project,html:nextHtml,css:nextCss});
    else setProject({...project,pages:setPageHtml(pages,normalizedPath,nextHtml),css:nextCss});
  };

  if(!page||!selected)return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-fuchsia-300"><Paintbrush className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Section properties</span></div><p className="mt-3 text-xs text-zinc-600">Add sections to the selected page to edit visual properties.</p></section>;

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-fuchsia-300"><SlidersHorizontal className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Visual section properties</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Tune section layout metadata visually, then compile it into the real page HTML/CSS when ready.</p></div>
      <button onClick={applyToCode} className="flex items-center gap-2 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/[.05] px-3 py-2 text-xs text-fuchsia-100"><WandSparkles className="h-3.5 w-3.5"/>Apply to page code</button>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-2">{sections.map(section=><button key={section.id} onClick={()=>setSelectedId(section.id)} className={(selected.id===section.id?'border-fuchsia-300/25 bg-fuchsia-300/[.06] ':'border-white/[.07] bg-black/20 ')+'w-full rounded-xl border p-3 text-left'}><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium text-white">{section.label}</p>{section.hidden?<EyeOff className="h-3.5 w-3.5 text-zinc-700"/>:<Eye className="h-3.5 w-3.5 text-zinc-500"/>}</div><p className="mt-1 text-[10px] text-zinc-600">{section.type}</p></button>)}</div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Label"><input value={selected.label} onChange={e=>update({label:e.target.value})}/></Field>
        <Field label="Variant"><input value={selected.variant||'default'} onChange={e=>update({variant:e.target.value})}/></Field>
        <Field label="Theme"><select value={selected.theme||'inherit'} onChange={e=>update({theme:e.target.value})}><option value="inherit">Inherit</option><option value="light">Light</option><option value="dark">Dark</option><option value="accent">Accent</option></select></Field>
        <Field label="Width"><select value={selected.width||'contained'} onChange={e=>update({width:e.target.value})}><option value="contained">Contained</option><option value="wide">Wide</option><option value="full">Full width</option></select></Field>
        <Field label="Vertical spacing"><select value={selected.padding||'normal'} onChange={e=>update({padding:e.target.value})}><option value="compact">Compact</option><option value="normal">Normal</option><option value="spacious">Spacious</option></select></Field>
        <label className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-[9px] uppercase tracking-[.1em] text-zinc-600">Visibility</span><button onClick={()=>update({hidden:!selected.hidden})} className={(selected.hidden?'border-amber-300/20 text-amber-200':'border-emerald-300/20 text-emerald-200')+' mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs'}>{selected.hidden?<EyeOff className="h-3.5 w-3.5"/>:<Eye className="h-3.5 w-3.5"/>}{selected.hidden?'Hidden':'Visible'}</button></label>
      </div>
    </div>
  </section>;
}

function Field({label,children}){return <label className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-[9px] uppercase tracking-[.1em] text-zinc-600">{label}</span>{children}</label>}
