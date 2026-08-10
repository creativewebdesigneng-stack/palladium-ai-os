import { CreditCard, Plug, UserPlus, RotateCcw, KeyRound, Server, Circle } from 'lucide-react';

const ICONS = { CreditCard, Plug, UserPlus, RotateCcw, KeyRound, Server };

export default function AuditLog({ logs }) {
  return (
    <div className="space-y-2">
      {logs.map((l, i) => {
        const Icon = ICONS[l.icon] || Circle;
        return (
          <div key={i} className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400"><Icon className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-zinc-200">{l.action}</p>
              <p className="text-[10px] text-zinc-500">{l.actor} · {l.t}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}