import { FileBarChart, FileText, ScrollText, Presentation, FileType, Microscope, NotebookPen, Sparkles } from 'lucide-react';
import { FORMATS, SOURCE_LABEL, STARTER_PROMPTS } from './documentsConfig';

const TYPE_ICONS = { report: FileBarChart, proposal: FileText, contract: ScrollText, presentation: Presentation, document: FileType, research: Microscope, notes: NotebookPen };
const FORMAT_LABEL = { pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', csv: 'CSV', md: 'Markdown' };

function FormatBadge({ value }) {
  const fmt = FORMATS.find((item) => item.id === value);
  return <span className={`rounded-full px-2 py-px text-[9px] font-medium ${fmt ? fmt.tone : 'text-zinc-300 bg-white/5'}`}>{FORMAT_LABEL[value] || String(value || 'md').toUpperCase()}</span>;
}

function updatedLabel(value) {
  if (!value) return 'Saved';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Saved' : date.toLocaleString();
}

function DocCard({ document, selected, onOpen }) {
  const I = TYPE_ICONS[document.doc_type] || FileText;
  const ai = String(document.source || '').startsWith('ai_');
  return (
    <button
      type="button"
      onClick={() => onOpen(document)}
      className={`group w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-violet-400/50 bg-violet-500/[.08]' : 'border-white/10 bg-white/[.03] hover:border-white/20 hover:bg-white/[.05]'}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><I className="h-4 w-4 text-white" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{document.title}</p>
          <p className="truncate text-[10px] text-zinc-500">{SOURCE_LABEL[document.source] || 'Saved document'} · {updatedLabel(document.updated_at)}</p>
        </div>
        {ai && <span className="flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-px text-[9px] font-medium text-violet-300"><Sparkles className="h-2.5 w-2.5" />AI</span>}
      </div>
      <div className="mt-3 flex items-center justify-between"><FormatBadge value={document.format} /><span className="text-[10px] text-zinc-500">Open</span></div>
    </button>
  );
}

export function DocumentsGrid({ documents, selectedId, onOpen, emptyText = 'No saved documents yet.' }) {
  if (!documents.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-5 py-10 text-center text-sm text-zinc-500">{emptyText}</div>;
  }
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{documents.map((document) => <DocCard key={document.id} document={document} selected={selectedId === document.id} onOpen={onOpen} />)}</div>;
}

export function StarterPromptsView({ onUse }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {STARTER_PROMPTS.map((starter) => {
        const I = TYPE_ICONS[starter.doc_type] || FileText;
        return (
          <button key={starter.id} type="button" onClick={() => onUse(starter)} className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left hover:border-violet-400/30 hover:bg-white/5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><I className="h-4 w-4 text-white" /></span>
              <div className="min-w-0"><p className="truncate text-[13px] font-medium text-white">{starter.title}</p><p className="text-[10px] text-zinc-500">Starter prompt · not a saved document</p></div>
            </div>
            <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-zinc-400">{starter.prompt}</p>
            <span className="mt-3 inline-block text-[11px] text-violet-300">Use prompt</span>
          </button>
        );
      })}
    </div>
  );
}