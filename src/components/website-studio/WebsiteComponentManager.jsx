import { ArrowDown, ArrowUp, Copy, Layers3, Trash2 } from 'lucide-react';
import {
  deleteWebsiteBlock,
  duplicateWebsiteBlock,
  listWebsiteBlockInstances,
  moveWebsiteBlock,
} from '@/lib/website-studio/website-blocks';

/**
 * Operates only on explicitly marked Blackstar visual blocks in the currently
 * selected page document. Hand-written/AI-generated unmarked HTML stays intact.
 */
export default function WebsiteComponentManager({ html = '', setHtml, pagePath = '/' }) {
  const blocks = listWebsiteBlockInstances(html);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4" aria-label="Selected page components">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-fuchsia-300"><Layers3 className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Managed page components</span></div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Arrange, duplicate and delete visual-library blocks on this page. Custom HTML outside managed block markers is preserved. Changes are in the editor until you save the website project.</p>
        </div>
        <span className="rounded-full border border-fuchsia-300/15 px-2.5 py-1 text-[10px] text-fuchsia-200">{pagePath} · {blocks.length} managed block{blocks.length === 1 ? '' : 's'}</span>
      </div>
      {!blocks.length ? <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">No managed components on this route. Add a visual-library block while this page is selected to manage it here. Existing unmarked HTML remains editable in Page documents.</p> :
        <ol className="mt-4 space-y-2">
          {blocks.map((block, index) => (
            <li key={block.instanceId} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 p-3">
              <span className="w-6 text-center text-[10px] text-zinc-500">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{block.name}</p><p className="text-[10px] text-zinc-500">{block.category} · {block.blockId}</p></div>
              <button type="button" disabled={index === 0} onClick={() => setHtml(moveWebsiteBlock(html, block.instanceId, -1))} className="rounded-lg p-1.5 text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={'Move ' + block.name + ' up'}><ArrowUp className="h-4 w-4"/></button>
              <button type="button" disabled={index === blocks.length - 1} onClick={() => setHtml(moveWebsiteBlock(html, block.instanceId, 1))} className="rounded-lg p-1.5 text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" aria-label={'Move ' + block.name + ' down'}><ArrowDown className="h-4 w-4"/></button>
              <button type="button" onClick={() => setHtml(duplicateWebsiteBlock(html, block.instanceId))} className="rounded-lg p-1.5 text-zinc-400 hover:text-fuchsia-200" aria-label={'Duplicate ' + block.name}><Copy className="h-4 w-4"/></button>
              <button type="button" onClick={() => setHtml(deleteWebsiteBlock(html, block.instanceId))} className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-300" aria-label={'Delete ' + block.name}><Trash2 className="h-4 w-4"/></button>
            </li>
          ))}
        </ol>}
    </section>
  );
}
