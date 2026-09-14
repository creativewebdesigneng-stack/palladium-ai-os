import {useState} from 'react';
import {FilePlus2,FileText,Trash2} from 'lucide-react';
import {addWebsitePage,removeWebsitePage} from '@/lib/website-studio/website-pages';

export default function WebsitePageManager({pages,setPages}){
  const [name,setName]=useState('');
  const [path,setPath]=useState('');
  const add=()=>{if(!name.trim())return;setPages(addWebsitePage(pages,name,path));setName('');setPath('')};
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-sky-300"><FileText className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Pages & routes</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Define the intended site map here. Website Studio keeps routing structure explicit so AI iterations can add or redesign pages without silently inventing paths.</p>
    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Page name" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"/><input value={path} onChange={e=>setPath(e.target.value)} placeholder="/optional-path" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"/><button onClick={add} disabled={!name.trim()} className="flex items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.06] px-3 py-2 text-xs text-sky-100 disabled:opacity-40"><FilePlus2 className="h-3.5 w-3.5"/>Add page</button></div>
    <div className="mt-3 space-y-2">{(pages||[]).map((page,index)=><div key={page.path||index} className="flex items-center gap-3 rounded-xl border border-white/[.07] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{page.name||'Untitled page'}</p><p className="mt-1 text-[10px] text-zinc-600">{page.path||'/'}</p></div><span className="rounded-full border border-white/[.07] px-2 py-0.5 text-[9px] text-zinc-600">{page.status||'draft'}</span><button disabled={(page.path||'/')==='/'} onClick={()=>setPages(removeWebsitePage(pages,page.path))} className="rounded-lg p-1.5 text-zinc-700 hover:text-rose-300 disabled:opacity-20" aria-label={'Delete '+(page.name||'page')}><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
  </section>
}
