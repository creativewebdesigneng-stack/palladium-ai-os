import {Copyright,RefreshCw} from 'lucide-react';
import {buildFallbackPageHtml,setPageHtml} from '@/lib/website-studio/website-page-documents';
import {normalizePagePath} from '@/lib/website-studio/website-pages';
import {upsertWebsiteFooter,upsertWebsiteFooterCss} from '@/lib/website-studio/website-footer';

export default function WebsiteFooterBuilder({name,brief,setBrief,pages,setPages,homeHtml,setHomeHtml,css,setCss}){
  const safePages=Array.isArray(pages)?pages:[];
  const footer={brand:name||'Website',text:'',showNavigation:true,copyright:'',...(brief?.footer||{})};
  const update=(key,value)=>setBrief({...brief,footer:{...footer,[key]:value}});

  const apply=()=>{
    let nextHome=homeHtml||'';
    let nextPages=safePages;
    for(const page of safePages){
      const path=normalizePagePath(page.path||'/');
      if(path==='/'){
        nextHome=upsertWebsiteFooter(nextHome,footer,safePages);
        continue;
      }
      const base=typeof page.html==='string'&&page.html.trim()?page.html:buildFallbackPageHtml(name||'Website',page);
      nextPages=setPageHtml(nextPages,path,upsertWebsiteFooter(base,footer,safePages));
    }
    setHomeHtml(nextHome);
    setPages(nextPages);
    setCss(upsertWebsiteFooterCss(css||''));
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-slate-300"><Copyright className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Shared footer</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Configure one footer and materialize it across every route. Re-applying updates the existing marked footer instead of adding duplicates.</p></div>
      <button disabled={!safePages.length} onClick={apply} className="flex items-center gap-2 rounded-xl border border-slate-300/20 bg-white/[.03] px-3 py-2 text-xs text-slate-100 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Apply to all pages</button>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Field label="Brand"><input value={footer.brand} onChange={e=>update('brand',e.target.value)} placeholder={name||'Brand'}/></Field>
      <Field label="Copyright"><input value={footer.copyright} onChange={e=>update('copyright',e.target.value)} placeholder="© 2026 Company"/></Field>
      <Field label="Footer text"><textarea rows={3} value={footer.text} onChange={e=>update('text',e.target.value)} placeholder="Short footer description."/></Field>
      <label className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 p-3 text-xs text-zinc-400"><input type="checkbox" checked={footer.showNavigation!==false} onChange={e=>update('showNavigation',e.target.checked)}/>Include visible page navigation</label>
    </div>
    <style>{`.footer-field{display:block;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18);border-radius:.75rem;padding:.75rem}.footer-field span{display:block;font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666}.footer-field input,.footer-field textarea{margin-top:.45rem;width:100%;resize:vertical;background:transparent;font-size:.75rem;line-height:1.4;color:white;outline:none}`}</style>
  </section>
}
function Field({label,children}){return <label className="footer-field"><span>{label}</span>{children}</label>}
