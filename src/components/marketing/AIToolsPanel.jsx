import { Megaphone, Users, Search, FileText, Share2, Mail, Loader2 } from 'lucide-react';
import { AI_TOOLS } from './marketingData';

const ICONS = { Megaphone, Users, Search, FileText, Share2, Mail };

export default function AIToolsPanel({ onRun, running }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3"><h3 className="text-sm font-semibold text-white">AI Marketing Tools</h3><p className="text-[11px] text-zinc-500">Generate campaigns, content, and analysis</p></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {AI_TOOLS.map((t) => { const I = ICONS[t.icon]; return (
          <button key={t.id} onClick={() => onRun(t.id)} disabled={running === t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-violet-400/30 hover:bg-white/5 disabled:opacity-60">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.tone}`}>{running === t.id ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <I className="h-4 w-4 text-white" />}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-white">{t.label}</p>
              <p className="truncate text-[10px] text-zinc-500">{t.desc}</p>
            </div>
          </button>
        ); })}
      </div>
    </div>
  );
}