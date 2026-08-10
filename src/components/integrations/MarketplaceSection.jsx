import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, ArrowUpRight, Star } from 'lucide-react';
import { MARKETPLACE_CATS, MARKETPLACE_ITEMS } from './integrationsData';
import { SectionHead, CapChips } from './shared';

export default function MarketplaceSection({ onOpen }) {
  const [cat, setCat] = useState('Popular');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Store} title="Integration Marketplace" grad="from-blue-500 to-cyan-500" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {MARKETPLACE_CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-2.5 py-1 text-xs transition ${cat === c ? 'bg-blue-500/20 text-blue-300' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{c}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MARKETPLACE_ITEMS.map((it, i) => (
          <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.25) }} whileHover={{ y: -2 }}
            className="group rounded-xl border border-white/10 bg-black/20 p-3.5 hover:border-blue-400/30">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${it.grad} shadow-lg`}><it.icon className="h-5 w-5 text-white" /></span>
              <span className="flex items-center gap-0.5 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400"><Star className="h-2.5 w-2.5 fill-amber-400" />{(4.2 + (i % 8) * 0.08).toFixed(1)}</span>
            </div>
            <h4 className="text-sm font-semibold text-white">{it.name}</h4>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{it.desc}</p>
            {it.capabilities?.length > 0 && <div className="mt-2"><CapChips caps={it.capabilities} max={3} /></div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => onOpen(it)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-1.5 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Install</button>
              <button onClick={() => onOpen(it)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5"><ArrowUpRight className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}