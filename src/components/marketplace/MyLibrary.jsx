import { useState } from 'react';
import { motion } from 'framer-motion';
import { Library } from 'lucide-react';
import SectionHead from './SectionHead';
import { MY_LIBRARY } from './marketplaceData';

export default function MyLibrary() {
  const [active, setActive] = useState(0);
  const current = MY_LIBRARY[active];

  return (
    <div>
      <SectionHead icon={Library} title="My Library" count={MY_LIBRARY.reduce((a, t) => a + t.count, 0)} grad="from-teal-500 to-cyan-500" />
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MY_LIBRARY.map((t, i) => (
            <button
              key={t.tab}
              onClick={() => setActive(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${active === i ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}
            >
              <t.icon className="h-3.5 w-3.5" />{t.tab}
              <span className={`rounded-full px-1.5 text-[10px] ${active === i ? 'bg-black/10' : 'bg-white/10'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {current.items.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${current.tab === 'Updates Available' ? 'from-amber-500 to-orange-500' : 'from-violet-500 to-indigo-500'} text-white`}>
                <current.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{item}</span>
              <button className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">
                {current.tab === 'Updates Available' ? 'Update' : current.tab === 'Installed' ? 'Open' : current.tab === 'Purchased' ? 'Launch' : 'View'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}