import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { TOOLBOX } from './automationData';

export default function AutomationToolbox() {
  const [open, setOpen] = useState(0);
  const [query, setQuery] = useState('');

  const filtered = TOOLBOX.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.toLowerCase().includes(query.toLowerCase())),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.025]">
      <div className="border-b border-white/10 p-3">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Toolbox</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {filtered.map((cat, i) => (
          <div key={cat.label} className="mb-0.5">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${cat.grad} text-white`}>
                <cat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-xs font-medium text-zinc-300">{cat.label}</span>
              <span className="text-[10px] text-zinc-600">{cat.items.length}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 py-1 pl-8">
                    {cat.items.map(item => (
                      <div
                        key={item}
                        draggable
                        className="flex cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 active:cursor-grabbing"
                      >
                        <span className="h-1 w-1 rounded-full bg-zinc-600" />
                        {item}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}