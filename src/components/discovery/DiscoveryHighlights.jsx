import { Sparkles, TrendingUp, Clock, Wand2 } from 'lucide-react';
import { ITEMS } from './discoveryData';

function MiniRow({ item }) {
  return (
    <button onClick={() => item.onClick?.(item)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] p-2.5 text-left hover:border-violet-400/30">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${item.grad} text-xs font-semibold text-white`}>{item.name[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-white">{item.name}</p>
        <p className="truncate text-[10px] text-zinc-500">{item.categoryLabel}</p>
      </div>
      <span className="text-[10px] text-zinc-500">{item.rating.toFixed(1)}★</span>
    </button>
  );
}

export default function DiscoveryHighlights({ onPick }) {
  const catLabel = (id) => ({ models:'AI Models', agents:'AI Agents', tools:'AI Tools', apps:'AI Apps', apis:'AI APIs', companies:'AI Companies', research:'AI Research', news:'AI News' }[id] || id);
  const trending = ITEMS.filter(i => i.trending).slice(0, 5).map(i => ({ ...i, categoryLabel: catLabel(i.category), onClick: onPick }));
  const recent = [...ITEMS].filter(i => i.added !== '—').sort((a, b) => new Date(b.added + ' 2026') - new Date(a.added + ' 2026')).slice(0, 5).map(i => ({ ...i, categoryLabel: catLabel(i.category), onClick: onPick }));

  const recs = ITEMS.filter(i => ['d5','d11','d14','d9','d21'].includes(i.id)).map(i => ({ ...i, categoryLabel: catLabel(i.category), onClick: onPick }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white"><TrendingUp className="h-4 w-4 text-emerald-400" />Trending now</p>
        <div className="space-y-1.5">{trending.map(i => <MiniRow key={i.id} item={i} />)}</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white"><Clock className="h-4 w-4 text-sky-400" />Recently added</p>
        <div className="space-y-1.5">{recent.map(i => <MiniRow key={i.id} item={i} />)}</div>
      </div>
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.06] to-transparent p-4">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white"><Wand2 className="h-4 w-4 text-violet-400" />AI recommendations</p>
        <p className="mb-2 text-[11px] text-zinc-500"><Sparkles className="mr-1 inline h-3 w-3 text-violet-400" />Based on your discovery activity</p>
        <div className="space-y-1.5">{recs.map(i => <MiniRow key={i.id} item={i} />)}</div>
      </div>
    </div>
  );
}