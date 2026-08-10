import { TrendingUp, Megaphone, Wallet, FileBarChart, Users, LifeBuoy, StickyNote, Server, Sparkles, Plus } from 'lucide-react';
import { TEMPLATES } from './automationData';

const ICONS = { TrendingUp, Megaphone, Wallet, FileBarChart, Users, LifeBuoy, StickyNote, Server };

export default function AutomationTemplates({ onToast }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Automation Templates</h3>
        <span className="text-[11px] text-zinc-500">· {TEMPLATES.length} ready to use</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t) => { const I = ICONS[t.icon] || TrendingUp; return (
          <button key={t.name} onClick={() => onToast?.(`Creating from ${t.name} template`)} className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:border-violet-400/30 hover:bg-white/5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40"><I className="h-4 w-4 text-white" /></span>
              <div>
                <p className="text-[13px] font-medium text-white">{t.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">{t.category}</p>
              </div>
              <Plus className="ml-auto h-4 w-4 text-zinc-600 group-hover:text-violet-400" />
            </div>
            <p className="text-[11px] text-zinc-400">{t.desc}</p>
            <p className="mt-auto text-[10px] text-zinc-600">{t.actions} actions</p>
          </button>
        ); })}
      </div>
    </div>
  );
}