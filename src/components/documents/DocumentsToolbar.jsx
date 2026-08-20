import { Clock, LayoutTemplate, Sparkles } from 'lucide-react';
import { NAV } from './documentsConfig';

const ICONS = { Clock, LayoutTemplate, Sparkles };

export default function DocumentsToolbar({ view, setView, onGenerate }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
        {NAV.map((n) => {
          const I = ICONS[n.icon] || Clock;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${view === n.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <I className="h-3.5 w-3.5" />{n.label}
            </button>
          );
        })}
      </div>
      <button onClick={onGenerate} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white">
        <Sparkles className="h-3.5 w-3.5" />AI Generate
      </button>
    </div>
  );
}