import { FileBarChart, FileText, ScrollText, Presentation, FileType, Microscope, NotebookPen, Share2, Sparkles, Clock } from 'lucide-react';
import { DOCS, TEMPLATES, FORMATS, NAV } from './documentsData';

const TYPE_ICONS = { report: FileBarChart, proposal: FileText, contract: ScrollText, presentation: Presentation, document: FileType, research: Microscope, notes: NotebookPen };
const FORMAT_LABEL = { pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', csv: 'CSV', md: 'Markdown' };

function FormatBadge({ f }) {
  const fmt = FORMATS.find(x => x.id === f);
  return <span className={`rounded-full px-2 py-px text-[9px] font-medium ${fmt ? fmt.tone : 'text-zinc-300 bg-white/5'}`}>{FORMAT_LABEL[f] || f.toUpperCase()}</span>;
}

function DocCard({ d, onOpen }) {
  const I = TYPE_ICONS[d.type] || FileText;
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><I className="h-4 w-4 text-white" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white">{d.title}</p><p className="text-[10px] text-zinc-500">{d.author} · {d.updated}</p></div>
        {d.ai && <span className="flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-px text-[9px] font-medium text-violet-300"><Sparkles className="h-2.5 w-2.5" />AI</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <FormatBadge f={d.format} />
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">{d.shared && <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />Shared</span>}</div>
      </div>
      <button onClick={() => onOpen(d)} className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Open</button>
    </div>
  );
}

export function RecentView({ onOpen }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {DOCS.map(d => <DocCard key={d.id} d={d} onOpen={onOpen} />)}
    </div>
  );
}

export function AIView({ onOpen }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {DOCS.filter(d => d.ai).map(d => <DocCard key={d.id} d={d} onOpen={onOpen} />)}
    </div>
  );
}

export function SharedView({ onOpen }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {DOCS.filter(d => d.shared).map(d => <DocCard key={d.id} d={d} onOpen={onOpen} />)}
    </div>
  );
}

export function TemplatesView({ onUse }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {TEMPLATES.map(t => {
        const I = TYPE_ICONS[t.type] || FileText;
        return (
          <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${t.tone}`}><I className="h-4 w-4 text-white" /></span>
              <div className="min-w-0"><p className="truncate text-[13px] font-medium text-white">{t.title}</p><p className="text-[10px] text-zinc-500">{t.type} · {t.uses} uses</p></div>
            </div>
            <button onClick={() => onUse(t)} className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Use template</button>
          </div>
        );
      })}
    </div>
  );
}

export { NAV };