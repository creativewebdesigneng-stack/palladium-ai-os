import { motion } from 'framer-motion';
import { Boxes } from 'lucide-react';
import { COMPONENTS } from './builderData';

export default function ComponentLibrary() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Boxes className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Component Library</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{COMPONENTS.length} generated</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {COMPONENTS.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="group overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className={`relative h-20 bg-gradient-to-br ${c.grad}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,.15),transparent_60%)]" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="h-10 w-12 rounded-md bg-white/20 backdrop-blur" />
              </div>
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-white">{c.name}</p>
              <p className="text-[10px] text-zinc-600">React component</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}