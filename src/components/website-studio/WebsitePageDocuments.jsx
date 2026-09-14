import {FileCode2,Plus} from 'lucide-react';
import {buildFallbackPageHtml,resolvePageHtml,setPageHtml} from '@/lib/website-studio/website-page-documents';
import {normalizePagePath} from '@/lib/website-studio/website-pages';

export default function WebsitePageDocuments({name,pages,homeHtml,setHomeHtml,setPages,activePath,setActivePath}){
  const safePages=Array.isArray(pages)&&pages.length?pages:[{name:'Home',path:'/'}];
  const normalizedActive=normalizePagePath(activePath||'/');
  const active=safePages.find(page=>normalizePagePath(page.path||'/')===normalizedActive)||safePages[0];
  const path=normalizePagePath(active?.path||'/');
  const isHome=path==='/';
  const explicitHtml=isHome?homeHtml:(typeof active?.html==='string'?active.html:'');
  const resolvedHtml=isHome?homeHtml:resolvePageHtml(name||'Website',homeHtml||'',active||{});
  const isFallback=!isHome&&!explicitHtml.trim();

  const update=(value)=>{
    if(isHome)setHomeHtml(value);
    else setPages(setPageHtml(safePages,path,value));
  };
  const initialize=()=>{
    if(isHome)return;
    setPages(setPageHtml(safePages,path,buildFallbackPageHtml(name||'Website',active||{})));
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-indigo-300"><FileCode2 className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Page documents</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Each route can own a real HTML document. Home uses the project HTML; other pages inherit global CSS/JavaScript and can be edited independently.</p></div>
      <div className="flex items-center gap-2">
        {isFallback&&<span className="rounded-full border border-amber-300/20 px-2 py-1 text-[10px] text-amber-300">Generated fallback</span>}
        <select value={path} onChange={e=>setActivePath(normalizePagePath(e.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white">{safePages.map((page,index)=><option key={page.path||index} value={normalizePagePath(page.path||'/')}>{page.name||page.path||'Page'}</option>)}</select>
      </div>
    </div>
    {isFallback&&<button onClick={initialize} className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-300/[.04] px-3 py-2 text-xs text-indigo-100"><Plus className="h-3.5 w-3.5"/>Initialize editable document</button>}
    <textarea value={resolvedHtml||''} onChange={e=>update(e.target.value)} rows={18} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none"/>
  </section>
}
