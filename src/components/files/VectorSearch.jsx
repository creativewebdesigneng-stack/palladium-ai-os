import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, SlidersHorizontal, Tag } from 'lucide-react';
import { VECTOR_RESULTS, FILE_TYPES } from './filesData';
import { SectionHead } from './shared';

const FILTERS = ['Meaning', 'Keywords', 'Questions', 'Topics', 'Projects', 'Agents', 'Tags'];

export default function VectorSearch() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Meaning');
  const [searched, setSearched] = useState(false);

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/5 to-transparent p-4">
      <SectionHead icon={Search} title="AI Vector Search" grad="from-sky-500 to-blue-500" />

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setSearched(true)}
          placeholder="Search by meaning, question, or topic..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
        <button onClick={() => setSearched(true)} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-1.5 text-xs font-medium text-white">
          <Sparkles className="h-3.5 w-3.5" />Search
        </button>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1 text-xs transition ${filter === f ? 'bg-sky-500/20 text-sky-300' : 'border border-white/10 text-zinc-500 hover:bg-white/5'}`}>{f}</button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {(!searched || !query) && (
            <motion.div initial={{ opacity: 0 }} exit={{ opacity: 0 }} className="py-8 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-sky-400/40" />
              <p className="text-sm text-zinc-500">Enter a query to search semantically across all knowledge</p>
            </motion.div>
          )}
          {searched && query && VECTOR_RESULTS.map((r, i) => {
            const ft = FILE_TYPES[r.type] || FILE_TYPES.txt;
            return (
              <motion.div key={r.name} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[.03] p-3 hover:border-sky-400/30">
                <div className="flex items-start gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${ft.grad}`}><ft.icon className="h-4 w-4 text-white" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-white">{r.name}</p>
                      <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{r.score}%</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{r.snippet}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600">{r.collection}</span>
                      <div className="flex gap-1">{r.tags.map(t => <span key={t} className="flex items-center gap-0.5 rounded bg-white/5 px-1 py-0.5 text-[9px] text-zinc-400"><Tag className="h-2 w-2" />{t}</span>)}</div>
                    </div>
                  </div>
                </div>
                {/* Relevance bar */}
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${r.score}%` }} transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }} className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}