import { BadgeCheck, Users, Package, Download, ArrowUpRight } from 'lucide-react';
import { CREATORS, itemsByCreator } from './marketData';

export default function CreatorProfiles({ onOpenCreator }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-white">Creator Profiles</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CREATORS.map(c => {
          const itemCount = itemsByCreator(c.id).length;
          return (
            <button key={c.id} onClick={() => onOpenCreator(c)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left hover:border-violet-400/30">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.grad} text-sm font-semibold text-white`}>{c.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[13px] font-semibold text-white">{c.name}{c.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}</p>
                <p className="truncate text-[11px] text-zinc-500">{c.handle}</p>
                <div className="mt-1 flex gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.followers}</span>
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{itemCount} items</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" />{c.downloads}</span>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
}