import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ArrowUpRight, CornerDownLeft, ArrowUp, ArrowDown, X, Clock, TrendingUp, Filter } from 'lucide-react';
import { CATEGORIES, AI_EXAMPLES, RECENT_SEARCHES, POPULAR_SEARCHES } from './searchData';
import { runSearch, interpretQuery } from './searchEngine';
import { CategoryIcon, RelevanceBar, StatusBadge } from './shared';

export default function GlobalSearchOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [ai, setAi] = useState(true);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState(RECENT_SEARCHES);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => { if (open) { setQuery(''); setCategory('all'); setSelected(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const { groups, total, intent } = useMemo(() => runSearch(query, { ai, category }), [query, ai, category]);

  // flat ordered list for keyboard navigation
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setSelected(0); }, [query, category, ai]);

  const openItem = (item) => {
    if (!item) return;
    if (query.trim()) setRecent((r) => [query.trim(), ...r.filter((x) => x.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5));
    navigate(item.href);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); openItem(flat[selected]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  useEffect(() => {
    if (!open || !flat.length) return;
    const el = resultsRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected, open, flat.length]);

  let runningIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex justify-center bg-black/70 px-4 pt-[8vh] backdrop-blur-md" onMouseDown={onClose}>
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex h-[78vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101119] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}>
            {/* Input bar */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4">
            <Search className="h-5 w-5 text-zinc-500" />
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
              placeholder={ai ? 'Ask anything — “Show me all unfinished projects”' : 'Search PalladiumAI…'}
              className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
            <button onClick={() => setAi((v) => !v)} title="Toggle AI natural-language search"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${ai ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30' : 'text-zinc-500 hover:text-white'}`}>
              <Sparkles className="h-3.5 w-3.5" /> AI
            </button>
            <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 sm:block">ESC</kbd>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1">
            {/* Filter rail */}
            <div className="hidden w-44 shrink-0 overflow-y-auto border-r border-white/10 p-2 md:block">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 flex items-center gap-1"><Filter className="h-3 w-3" /> Filters</p>
              <FilterChip label="All results" active={category === 'all'} count={total} onClick={() => setCategory('all')} />
              {CATEGORIES.map((c) => {
                const count = groups.find((g) => g.category.id === c.id)?.items.length || 0;
                return <FilterChip key={c.id} label={c.label} icon={c.icon} grad={c.grad} count={count} active={category === c.id} onClick={() => setCategory(c.id)} />;
              })}
            </div>

            {/* Results / suggestions */}
            <div ref={resultsRef} className="min-w-0 flex-1 overflow-y-auto p-3">
              {!query.trim() ? (
                <Suggestions recent={recent} setRecent={setRecent} onPick={(q) => setQuery(q)} />
              ) : total === 0 ? (
                <NoResults query={query} ai={ai} intent={intent} />
              ) : (
                <div>
                  {ai && intent && <IntentSummary intent={intent} total={total} />}
                  {groups.map((g) => (
                    <div key={g.category.id} className="mb-4">
                      <div className="mb-1.5 flex items-center gap-2 px-1">
                        <CategoryIcon icon={g.category.icon} grad={g.category.grad} size="h-3.5 w-3.5" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{g.category.label}</span>
                        <span className="text-[10px] text-zinc-600">{g.items.length}</span>
                      </div>
                      {g.items.map((item) => {
                        runningIdx += 1;
                        const idx = runningIdx;
                        const isActive = idx === selected;
                        return (
                          <button key={item.id} data-idx={idx} onMouseMove={() => setSelected(idx)} onClick={() => openItem(item)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${isActive ? 'border-violet-400/40 bg-violet-500/10' : 'border-transparent hover:bg-white/5'}`}>
                            <CategoryIcon icon={g.category.icon} grad={g.category.grad} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                                <StatusBadge status={item.status} />
                              </div>
                              <p className="truncate text-[11px] text-zinc-500">{item.desc}</p>
                            </div>
                            <RelevanceBar score={item.score} />
                            <ArrowUpRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-violet-300' : 'text-zinc-600'}`} />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[10px] text-zinc-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><ArrowUp className="inline h-2.5 w-2.5" /></kbd><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><ArrowDown className="inline h-2.5 w-2.5" /></kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5"><CornerDownLeft className="inline h-2.5 w-2.5" /></kbd> open</span>
              <span className="hidden sm:flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">ESC</kbd> close</span>
            </div>
            <span className="text-zinc-700">{flat.length || total} result{total === 1 ? '' : 's'}{ai ? ' · AI mode' : ''}</span>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

function FilterChip({ label, icon, grad, count, active, onClick }) {
  return (
    <button onClick={onClick} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${active ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
      {icon ? <CategoryIcon icon={icon} grad={grad} size="h-3 w-3" /> : <Search className="h-3 w-3" />}
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && <span className="text-[9px] text-zinc-500">{count}</span>}
    </button>
  );
}

function Suggestions({ recent, setRecent, onPick }) {
  const runRecent = (q) => { onPick(q); };
  const removeRecent = (q) => setRecent((r) => r.filter((x) => x !== q));
  return (
    <div className="space-y-6 p-2">
      <div>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300"><Sparkles className="h-3.5 w-3.5" /> AI natural-language search</p>
        <div className="flex flex-wrap gap-2">
          {AI_EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => onPick(ex)} className="rounded-xl border border-violet-400/20 bg-violet-500/[.06] px-3 py-2 text-left text-xs text-zinc-200 transition hover:border-violet-400/40 hover:bg-violet-500/10">{ex}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"><Clock className="h-3.5 w-3.5" /> Recent searches</p>
        {recent.length ? (
          <div className="space-y-1">
            {recent.map((q) => (
              <div key={q} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5">
                <Clock className="h-3.5 w-3.5 text-zinc-600" />
                <button onClick={() => runRecent(q)} className="flex-1 text-left">{q}</button>
                <button onClick={() => removeRecent(q)} className="opacity-0 transition group-hover:opacity-100"><X className="h-3.5 w-3.5 text-zinc-600 hover:text-white" /></button>
              </div>
            ))}
          </div>
        ) : <p className="px-2 text-xs text-zinc-600">No recent searches yet.</p>}
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"><TrendingUp className="h-3.5 w-3.5" /> Popular searches</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((q) => (
            <button key={q} onClick={() => onPick(q)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white">{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntentSummary({ intent, total }) {
  const parts = [];
  if (intent.categories.length) parts.push(intent.categories.join(', '));
  if (intent.status) parts.push(`status: ${intent.status.join('/')}`);
  if (intent.notStatuses.length) parts.push(`not: ${intent.notStatuses.join('/')}`);
  if (intent.recency !== null) parts.push(intent.recency === 0 ? 'today' : intent.recency === 7 ? 'last week' : `≤ ${intent.recency}d`);
  if (!parts.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-violet-400/15 bg-violet-500/[.05] px-3 py-2 text-[11px] text-zinc-300">
      <Sparkles className="h-3.5 w-3.5 text-violet-300" />
      <span className="text-zinc-500">Interpreted as:</span>
      {parts.map((p, i) => <span key={i} className="rounded-md bg-white/5 px-1.5 py-0.5 text-zinc-300">{p}</span>)}
      <span className="ml-auto text-zinc-600">{total} matched</span>
    </div>
  );
}

function NoResults({ query, ai, intent }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5"><Search className="h-5 w-5 text-zinc-500" /></span>
      <h3 className="mt-3 text-sm font-medium text-white">No results for “{query}”</h3>
      <p className="mt-1 max-w-xs text-xs text-zinc-500">
        {ai ? 'Try rephrasing, or switch off AI mode for plain keyword search.' : 'Try different keywords or enable AI mode for natural-language search.'}
      </p>
    </div>
  );
}