import { useState, useMemo } from 'react';
import { Search, Star, Download, Bot, Wrench, Cpu, Workflow, LayoutTemplate, Plug, Layers, LayoutGrid, BadgeCheck, X } from 'lucide-react';
import { CATEGORIES, COLLECTIONS, ITEMS, creatorById } from './marketData';

const CAT_ICONS = { Bot, Wrench, Cpu, Workflow, LayoutTemplate, Plug, Layers, LayoutGrid };

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`h-3 w-3 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
      ))}
      <span className="ml-1 text-[11px] font-medium text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

function ItemCard({ item, onOpen, onInstall }) {
  const c = creatorById(item.creator);
  const isFree = item.free;
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.grad}`}><LayoutGrid className="h-5 w-5 text-white" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{item.name}</p>
          <p className="truncate text-[10px] text-zinc-500">{c.name}{c.verified && <BadgeCheck className="ml-1 inline h-3 w-3 text-sky-400" />}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] text-zinc-400">{item.desc}</p>
      <div className="mt-3"><Stars rating={item.rating} /></div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{item.downloads}</span>
        <span>{item.reviews} reviews</span>
        <span className="font-medium text-emerald-300">{item.price}</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        <button onClick={() => onOpen(item)} className="flex-1 rounded-lg border border-white/10 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Details</button>
        <button onClick={() => onInstall(item)} className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium ${isFree ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'bg-white text-black'}`}>{isFree ? 'Install' : 'Purchase'}</button>
      </div>
    </div>
  );
}

export default function AIMarketplace({ onOpen }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [col, setCol] = useState('all');
  const [installed, setInstalled] = useState({});
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = useMemo(() => ITEMS.filter(i =>
    (cat === 'all' || i.type === cat) &&
    (col === 'all' || i.tags.includes(col)) &&
    (i.name.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, col]);

  const handleInstall = (item) => {
    setInstalled(s => ({ ...s, [item.id]: true }));
    flash(installed[item.id] ? `${item.name} reinstalled` : `${item.name} installed`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents, tools, models, workflows…" className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-9 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          {q && <button onClick={() => setQ('')} className="absolute right-2.5 top-2.5 text-zinc-600 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
        <p className="text-[11px] text-zinc-500">{filtered.length} results</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All</button>
        {CATEGORIES.map(c => { const I = CAT_ICONS[c.icon]; return (
          <button key={c.id} onClick={() => setCat(c.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c.id ? 'bg-violet-500/20 text-white' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}><I className="h-3.5 w-3.5" />{c.label}</button>
        );})}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {COLLECTIONS.map(c => (
          <button key={c.id} onClick={() => setCol(c.id)} className={`rounded-full border px-3 py-1 text-[11px] font-medium ${col === c.id ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{c.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No items match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => <ItemCard key={item.id} item={item} onOpen={onOpen} onInstall={handleInstall} />)}
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </div>
  );
}