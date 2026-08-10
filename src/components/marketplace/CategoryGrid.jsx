import { motion } from 'framer-motion';
import SectionHead from './SectionHead';
import { CATEGORIES } from './marketplaceData';
import { LayoutGrid } from 'lucide-react';

export default function CategoryGrid() {
  return (
    <div>
      <SectionHead icon={LayoutGrid} title="Browse Categories" count={CATEGORIES.length} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {CATEGORIES.map((c, i) => (
          <motion.button
            key={c.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            whileHover={{ y: -3 }}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left hover:border-white/20"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${c.grad} text-white shadow-lg`}>
              <c.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{c.name}</p>
              <p className="text-[11px] text-zinc-500">{c.count} items</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}