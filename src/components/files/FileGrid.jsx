import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, LayoutGrid, List, Star } from 'lucide-react';
import { FILES, FILE_TYPES, KNOWLEDGE_STATUS } from './filesData';
import { SectionHead } from './shared';
import FileCard from './FileCard';

export default function FileGrid({ onOpen, activeFilter }) {
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');

  const filtered = FILES.filter(f => {
    const matchesFilter = !activeFilter || f.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase())) || f.collection === activeFilter || f.ext === activeFilter.toLowerCase();
    const matchesQuery = !query || f.name.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={LayoutGrid} title="All Files" count={filtered.length} grad="from-violet-500 to-indigo-500"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files..." className="w-40 rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button onClick={() => setView('grid')} className={`grid h-7 w-7 place-items-center ${view === 'grid' ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500 hover:bg-white/5'}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button onClick={() => setView('list')} className={`grid h-7 w-7 place-items-center ${view === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500 hover:bg-white/5'}`}><List className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        }
      />

      <AnimatePresence mode="popLayout">
        {view === 'grid' ? (
          <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(f => <FileCard key={f.id} f={f} onOpen={onOpen} />)}
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(f => {
              const ft = FILE_TYPES[f.ext] || FILE_TYPES.txt;
              const ks = KNOWLEDGE_STATUS[f.knowledge] || KNOWLEDGE_STATUS.pending;
              return (
                <motion.div layout key={f.id} onClick={() => onOpen(f)} whileHover={{ x: 2 }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-2.5 hover:border-violet-400/30">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${ft.grad}`}><ft.icon className="h-4 w-4 text-white" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{f.name}</p>
                    <p className="text-[10px] text-zinc-500">{f.owner} · {f.size} · {f.modified}</p>
                  </div>
                  {f.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${ks.badge}`}>{ks.label}</span>
                  <span className="hidden text-[10px] text-zinc-500 sm:block">{f.collection}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}