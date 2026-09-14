import {useState} from 'react';
import {LayoutTemplate,Plus,RefreshCw,Trash2} from 'lucide-react';
import {buildFallbackPageHtml,setPageHtml} from '@/lib/website-studio/website-page-documents';
import {normalizePagePath} from '@/lib/website-studio/website-pages';
import {upsertWebsiteFooter,upsertWebsiteFooterCss} from '@/lib/website-studio/website-footer';

const emptyLink={label:'',href:''};

export default function WebsiteFooterBuilder({project,setProject}){
  const brief=project.brief||{};
  const siteChrome=brief.siteChrome||{};
  const saved=siteChrome.footer||{};
  const [config,setConfig]=useState({
    brand:saved.brand||project.name||'',
    tagline:saved.tagline||'',
    copyright:saved.copyright||'',
    legalLinks:Array.isArray(saved.legalLinks)?saved.legalLinks:[],
    socialLinks:Array.isArray(saved.socialLinks)?saved.socialLinks:[],
  });

  const persist=(next)=>setProject({...project,brief:{...brief,siteChrome:{...siteChrome,footer:next}}});
  const update=(key,value)=>{const next={...config,[key]:value};setConfig(next);persist(next)};
  const updateLink=(group,index,patch)=>{
    const nextLinks=config[group].map((item,i)=>i===index?{...item,...patch}:item);
    update(group,nextLinks);
  };
  const addLink=(group)=>update(group,[...config[group],{...emptyLink}]);
  const removeLink=(group,index)=>update(group,config[group].filter((_,i)=>i!==index));

  const apply=()=>{
    const pages=Array.isArray(project.pages)?project.pages:[];
    let nextHome=upsertWebsiteFooter(project.html||'',config);
    let nextPages=pages;
    for(const page of pages){
      const path=normalizePagePath(page.path||'/');
      if(path==='/')continue;
      const base=typeof page.html==='string'&&page.html.trim()?page.html:buildFallbackPageHtml(project.name||'Website',page);
      nextPages=setPageHtml(nextPages,path,upsertWebsiteFooter(base,config));
    }
    setProject({...project,brief:{...brief,siteChrome:{...siteChrome,footer:config}},html:nextHome,pages:nextPages,css:upsertWebsiteFooterCss(project.css||'')});
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-cyan-300"><LayoutTemplate className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Shared footer</span></div><p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">Define site-wide footer content once and apply it consistently across every route. Re-applying updates the marked footer block rather than duplicating it.</p></div>
      <button onClick={apply} className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-100"><RefreshCw className="h-3.5 w-3.5"/>Apply to all pages</button>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <Field label="Brand"><input value={config.brand} onChange={e=>update('brand',e.target.value)} placeholder="Company"/></Field>
      <Field label="Tagline"><input value={config.tagline} onChange={e=>update('tagline',e.target.value)} placeholder="Short positioning line"/></Field>
      <Field label="Copyright"><input value={config.copyright} onChange={e=>update('copyright',e.target.value)} placeholder="Leave blank for automatic year"/></Field>
    </div>

    <LinkGroup title="Legal links" links={config.legalLinks} onAdd={()=>addLink('legalLinks')} onChange={(i,p)=>updateLink('legalLinks',i,p)} onRemove={i=>removeLink('legalLinks',i)}/>
    <LinkGroup title="Social links" links={config.socialLinks} onAdd={()=>addLink('socialLinks')} onChange={(i,p)=>updateLink('socialLinks',i,p)} onRemove={i=>removeLink('socialLinks',i)}/>

    <style>{`.footer-field{display:block;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18);border-radius:.75rem;padding:.75rem}.footer-field span{display:block;font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666}.footer-field input{margin-top:.45rem;width:100%;background:transparent;font-size:.75rem;color:white;outline:none}`}</style>
  </section>
}

function Field({label,children}){return <label className="footer-field"><span>{label}</span>{children}</label>}
function LinkGroup({title,links,onAdd,onChange,onRemove}){return <div className="mt-4 rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium text-white">{title}</p><button onClick={onAdd} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400"><Plus className="h-3 w-3"/>Add</button></div><div className="mt-3 space-y-2">{links.length===0?<p className="text-[10px] text-zinc-600">No links configured.</p>:links.map((link,index)=><div key={index} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"><input value={link.label} onChange={e=>onChange(index,{label:e.target.value})} placeholder="Label" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"/><input value={link.href} onChange={e=>onChange(index,{href:e.target.value})} placeholder="/privacy or https://…" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"/><button onClick={()=>onRemove(index)} className="rounded-lg p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div></div>}
