import {LayoutTemplate,Sparkles} from 'lucide-react';
import {WEBSITE_TEMPLATES} from '@/lib/website-studio/website-templates';

export default function WebsiteTemplateGallery({onSelect}){
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-violet-300"><LayoutTemplate className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Starter templates</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Start from a structured multi-page system, then refine it with visual controls or Blackstar AI.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{WEBSITE_TEMPLATES.map(template=><button key={template.id} onClick={()=>onSelect(template.id)} className="rounded-xl border border-white/[.07] bg-black/20 p-4 text-left hover:border-violet-300/20"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{template.name}</p><Sparkles className="h-3.5 w-3.5 text-violet-300"/></div><p className="mt-1 text-[10px] uppercase tracking-[.1em] text-zinc-700">{template.category}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{template.description}</p><p className="mt-3 text-[10px] text-zinc-600">{template.pages.length} pages</p></button>)}</div>
  </section>
}
