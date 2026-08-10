import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Store } from 'lucide-react';
import { MARKETPLACE_TABS, MARKETPLACE_MODELS } from './modelsData';

export default function ModelMarketplace() {
  const [tab, setTab] = useState('Featured');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Store className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Model Marketplace</h2>
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MARKETPLACE_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${tab === t ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{t}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETPLACE_MODELS.map((m, i) => (
          <motion.div key={m.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="group rounded-xl border border-white/10 bg-black/20 p-4 hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${m.grad} text-xs font-bold`}>{m.name.slice(0, 2)}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">{m.badge}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">{m.name}</h3>
            <p className="text-[11px] text-zinc-500">{m.provider}</p>
            <p className="mt-2 line-clamp-2 text-[11px] text-zinc-400">{m.desc}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">{m.tag}</span>
              <button className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">Install <ArrowRight className="h-3 w-3" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}