import {Compass,RefreshCw,Eye,EyeOff} from 'lucide-react';
import {buildFallbackPageHtml,setPageHtml} from '@/lib/website-studio/website-page-documents';
import {normalizePagePath} from '@/lib/website-studio/website-pages';
import {upsertWebsiteNavigation,upsertWebsiteNavigationCss} from '@/lib/website-studio/website-navigation';

export default function WebsiteNavigationBuilder({name,pages,setPages,homeHtml,setHomeHtml,css,setCss}){
  const safePages=Array.isArray(pages)?pages:[];
  const updatePage=(index,patch)=>setPages(safePages.map((page,i)=>i===index?{...page,...patch}:page));

  const apply=()=>{
    const nextCss=upsertWebsiteNavigationCss(css||'');
    let nextHome=homeHtml||'';
    let nextPages=safePages;

    for(const page of safePages){
      const path=normalizePagePath(page.path||'/');
      if(path==='/'){
        nextHome=upsertWebsiteNavigation(nextHome,safePages,path);
        continue;
      }
      const base=typeof page.html==='string'&&page.html.trim()?page.html:buildFallbackPageHtml(name||'Website',page);
      nextPages=setPageHtml(nextPages,path,upsertWebsiteNavigation(base,safePages,path));
    }

    setHomeHtml(nextHome);
    setPages(nextPages);
    setCss(nextCss);
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-teal-300"><Compass className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Shared navigation</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Configure one accessible primary navigation and apply it consistently across every route. Re-applying updates the marked navigation block instead of duplicating it.</p></div>
      <button disabled={!safePages.length} onClick={apply} className="flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[.05] px-3 py-2 text-xs text-teal-100 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Apply to all pages</button>
    </div>
    <div className="mt-4 space-y-2">{safePages.map((page,index)=><div key={page.path||index} className="grid gap-2 rounded-xl border border-white/[.07] bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
      <div><p className="text-xs font-medium text-white">{page.name||'Untitled page'}</p><p className="mt-1 text-[10px] text-zinc-600">{normalizePagePath(page.path||'/')}</p></div>
      <input value={page.navLabel??page.name??''} onChange={e=>updatePage(index,{navLabel:e.target.value})} placeholder="Navigation label" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"/>
      <button onClick={()=>updatePage(index,{includeInNav:page.includeInNav===false?true:false})} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[10px] ${page.includeInNav===false?'border-white/10 text-zinc-600':'border-teal-300/20 text-teal-200'}`}>{page.includeInNav===false?<EyeOff className="h-3.5 w-3.5"/>:<Eye className="h-3.5 w-3.5"/>}{page.includeInNav===false?'Hidden':'Visible'}</button>
    </div>)}</div>
  </section>
}
