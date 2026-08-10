import { FileBarChart, FileText, ScrollText, Presentation, FileType, Microscope, NotebookPen } from 'lucide-react';
import { TYPES } from './documentsData';

const ICONS = { FileBarChart, FileText, ScrollText, Presentation, FileType, Microscope, NotebookPen };

export default function DocumentTypes({ onCreate }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {TYPES.map((t) => { const I = ICONS[t.icon]; return (
        <button key={t.id} onClick={() => onCreate(t.id)} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center hover:border-violet-400/30 hover:bg-white/5">
          <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${t.tone}`}><I className="h-5 w-5 text-white" /></span>
          <span className="text-[12px] font-medium text-white">{t.label}</span>
          <span className="text-[10px] text-zinc-500">Create new</span>
        </button>
      );})}
    </div>
  );
}