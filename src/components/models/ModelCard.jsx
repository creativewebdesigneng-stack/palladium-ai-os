import { motion } from 'framer-motion';
import { Check, GitCompare, UserPlus, Eye, Sparkles } from 'lucide-react';

const STARS = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

const FEAT = (m) => [
  { label: 'Vision', on: m.vision }, { label: 'Voice', on: m.voice },
  { label: 'Image', on: m.image }, { label: 'Tools', on: m.tools },
  { label: 'Stream', on: m.streaming },
];

export default function ModelCard({ model, onSelect, onCompare, selected }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect && onSelect(model)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[.035] p-4 backdrop-blur-xl transition ${selected ? 'border-violet-400/50 ring-1 ring-violet-400/40' : 'border-white/10 hover:border-white/20'}`}
    >
      {model.featured && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-400/20 px-2 py-0.5 text-[10px] text-violet-300">
          <Sparkles className="h-3 w-3" />Featured
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${model.grad} text-xs font-bold text-white`}>{model.name.slice(0, 2)}</span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{model.name}</h3>
          <p className="text-[11px] text-zinc-500">{model.provider}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Rate label="Speed" stars={model.speed} />
        <Rate label="Quality" stars={model.quality} />
        <Rate label="Reason" stars={model.reasoning} />
        <Rate label="Coding" stars={model.coding} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FEAT(model).map(f => (
          <span key={f.label} className={`rounded-md px-1.5 py-0.5 text-[10px] ${f.on ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-zinc-600 line-through'}`}>{f.label}</span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-[11px]">
        <span className="text-zinc-400">Context <b className="text-white">{model.context}</b></span>
        <span className="text-zinc-400">${model.priceIn}<b className="text-white/40">/</b>${model.priceOut} <span className="text-zinc-600">/1M</span></span>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[11px] text-zinc-500">{model.uses.join(' · ')}</p>

      <div className="mt-3 flex gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); onSelect && onSelect(model); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-1.5 text-[11px] font-medium text-white hover:opacity-90">
          <Check className="h-3 w-3" />Select
        </button>
        <button onClick={(e) => { e.stopPropagation(); onCompare && onCompare(model); }} className={`rounded-lg border p-1.5 ${selected ? 'border-violet-400/40 bg-violet-500/15 text-violet-300' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
          <GitCompare className="h-3.5 w-3.5" />
        </button>
        <button className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><UserPlus className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onSelect && onSelect(model); }} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5"><Eye className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}

function Rate({ label, stars }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-amber-400 tracking-tight">{STARS(stars)}</span>
    </div>
  );
}