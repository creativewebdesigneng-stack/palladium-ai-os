import { Inbox, Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server } from 'lucide-react';
import { CATEGORIES } from './notificationsData';

const ICONS = { Inbox, Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server };

export default function NotificationsCategoryNav({ active, setActive, counts }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[.025] p-1.5">
      {CATEGORIES.map((c) => {
        const Icon = ICONS[c.icon];
        const isActive = active === c.id;
        const count = counts[c.id] || 0;
        return (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${isActive ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-3.5 w-3.5" />{c.label}
            {count > 0 && <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-zinc-500'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}