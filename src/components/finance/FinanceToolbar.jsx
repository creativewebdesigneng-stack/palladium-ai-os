import { ArrowLeftRight, FileText, Users, Receipt, FileBarChart, Plus } from 'lucide-react';
import { SECTIONS } from './financeData';

const ICONS = { ArrowLeftRight, FileText, Users, Receipt, FileBarChart };

export default function FinanceToolbar({ section, setSection, onCreate }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
        {SECTIONS.map((s) => { const I = ICONS[s.icon]; return (
          <button key={s.id} onClick={() => setSection(s.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${section === s.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <I className="h-3.5 w-3.5" />{s.label}
          </button>
        ); })}
      </div>
      <button onClick={onCreate} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />New</button>
    </div>
  );
}