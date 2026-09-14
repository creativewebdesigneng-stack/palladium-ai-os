import {ArrowDown,ArrowUp,Copy,Layers3,Trash2} from 'lucide-react';
import {deleteWebsiteBlock,duplicateWebsiteBlock,listWebsiteBlockInstances,moveWebsiteBlock} from '@/lib/website-studio/website-blocks';

export default function WebsiteComponentManager({html,setHtml,pagePath}){
  const blocks=listWebsiteBlockInstances(html||'');
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-fuchsia-300"><Layers3 className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Page components</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Manage Website Studio blocks on the selected route without editing raw HTML. Hand-written content outside managed block markers is preserved.</p></div>
      <span className="rounded-full border border-fuchsia-300/15 px-2.5 py-1 text-[10px] text-fuchsia-200">{pagePath} · {blocks.length} managed block{blocks.length===1?'':'s'}</span>
    </div>
    <div className="mt-4 space-y-2">{blocks.length===0?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">Add a block from the visual library to manage it here.</div>:blocks.map((block,index)=><div key={block.instanceId} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/20 p-3">
      <span className="w-7 text-center text-[10px] text-zinc-700">{String(index+1).padStart(2,'0')}</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white">{block.name}</p><p className="mt-1 text-[10px] text-zinc-600">{block.category} · {block.blockId}</p></div>
      <button disabled={index===0} onClick={()=>setHtml(moveWebsiteBlock(html,block.instanceId,-1))} className="rounded-lg p-1.5 text-zinc-600 hover:text-white disabled:opacity-20" aria-label={'Move '+block.name+' up'}><ArrowUp className="h-3.5 w-3.5"/></button>
      <button disabled={index===blocks.length-1} onClick={()=>setHtml(moveWebsiteBlock(html,block.instanceId,1))} className="rounded-lg p-1.5 text-zinc-600 hover:text-white disabled:opacity-20" aria-label={'Move '+block.name+' down'}><ArrowDown className="h-3.5 w-3.5"/></button>
      <button onClick={()=>setHtml(duplicateWebsiteBlock(html,block.instanceId))} className="rounded-lg p-1.5 text-zinc-600 hover:text-fuchsia-200" aria-label={'Duplicate '+block.name}><Copy className="h-3.5 w-3.5"/></button>
      <button onClick={()=>setHtml(deleteWebsiteBlock(html,block.instanceId))} className="rounded-lg p-1.5 text-zinc-700 hover:text-rose-300" aria-label={'Delete '+block.name}><Trash2 className="h-3.5 w-3.5"/></button>
    </div>)}</div>
  </section>
}
