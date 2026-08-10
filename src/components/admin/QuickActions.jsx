import { Users, CreditCard, Plug, Settings, ShieldCheck, ScrollText, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ICONS = { Users, CreditCard, Plug, Settings, ShieldCheck, ScrollText };

export default function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map(a => {
        const Icon = ICONS[a.icon] || Circle;
        return (
          <Link key={a.label} to={a.path} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm text-zinc-300 hover:border-violet-400/30 hover:bg-white/5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Icon className="h-4 w-4" /></span>
            <span className="text-[13px]">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}