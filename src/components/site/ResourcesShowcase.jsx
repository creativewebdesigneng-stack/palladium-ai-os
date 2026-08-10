import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search, ArrowRight, ArrowUpRight, BookOpen, Compass, GraduationCap,
  FlaskConical, Newspaper, Trophy, Code2, Users, Layers, Clock,
} from 'lucide-react';
import { CATEGORIES, FEATURED, RECENT, SECTIONS } from '@/components/site/resourcesData';

const ICONS = { Layers, BookOpen, Compass, GraduationCap, FlaskConical, Newspaper, Trophy, Code2, Users };

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
const CAT_TONE = {
  docs: 'text-sky-300', guides: 'text-violet-300', tutorials: 'text-emerald-300',
  research: 'text-cyan-300', blog: 'text-fuchsia-300', cases: 'text-amber-300',
  dev: 'text-teal-300', community: 'text-rose-300',
};

export function ResourceSearch({ query, setQuery, active, setActive, results }) {
  return (
    <>
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources, docs, guides and research…"
          className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.icon];
          const isActive = active === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
                isActive ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-300' : CAT_TONE[c.key] || 'text-zinc-400'}`} />
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs text-zinc-500">
        {results} resource{results === 1 ? '' : 's'}{active !== 'all' && ` in ${CAT_LABEL[active]}`}{query && ` matching "${query}"`}
      </p>
    </>
  );
}

function ArticleCard({ a, featured }) {
  const Icon = ICONS[CATEGORIES.find((c) => c.key === a.category)?.icon];
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-white/20 hover:bg-white/[.04] ${featured ? 'flex flex-col' : 'p-5'}`}
    >
      {featured && (
        <>
          <div className={`relative h-32 bg-gradient-to-br ${a.tone} p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.2),transparent_50%)]" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              <Icon className="h-3 w-3" /> {CAT_LABEL[a.category]}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="text-lg font-semibold leading-snug text-white">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a.excerpt}</p>
            <div className="mt-auto flex items-center gap-2 pt-4 text-[11px] text-zinc-500">
              <span>{a.author}</span><span>·</span><Clock className="h-3 w-3" /><span>{a.read}</span><span>·</span><span>{a.date}</span>
            </div>
          </div>
        </>
      )}
      {!featured && (
        <>
          <div className="flex items-center gap-2 text-[11px]">
            <Icon className={`h-3.5 w-3.5 ${CAT_TONE[a.category]}`} />
            <span className={CAT_TONE[a.category]}>{CAT_LABEL[a.category]}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-white group-hover:text-violet-200">{a.title}</h3>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{a.author}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.read} · {a.date}</span>
          </div>
        </>
      )}
    </motion.article>
  );
}

export function ResourceGrid({ query, active }) {
  const q = query.trim().toLowerCase();
  const all = useMemo(() => FEATURED.map((f) => ({ ...f })), []);
  const featFiltered = (active === 'all' ? all : all.filter((a) => a.category === active)).filter((a) => !q || a.title.toLowerCase().includes(q) || a.author.toLowerCase().includes(q));
  const recentFiltered = RECENT.filter((a) => {
    const matchCat = active === 'all' || a.category === active;
    const matchQ = !q || a.title.toLowerCase().includes(q) || a.author.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="mx-auto max-w-7xl px-6">
      {featFiltered.length > 0 && (
        <>
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-violet-400">Featured</p>
          <motion.div layout className="grid gap-4 md:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {featFiltered.map((a) => <ArticleCard key={a.title} a={a} featured />)}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {recentFiltered.length > 0 && (
        <>
          <p className="mb-4 mt-10 text-xs uppercase tracking-[0.25em] text-violet-400">Recent articles</p>
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {recentFiltered.map((a) => <ArticleCard key={a.title} a={a} />)}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {featFiltered.length === 0 && recentFiltered.length === 0 && (
        <div className="mt-10 text-center text-sm text-zinc-500">No resources found. Try a different search or category.</div>
      )}
    </div>
  );
}

export function SectionGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {SECTIONS.map((s, i) => {
        const Icon = ICONS[CATEGORIES.find((c) => c.key === s.key)?.icon];
        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
            className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]"
          >
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${s.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] text-zinc-500">{s.count}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">{s.label}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
            <span className="mt-3 flex items-center gap-1 text-xs text-zinc-500 transition group-hover:text-white">
              Browse <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ResourceCta() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#0c0d14] to-cyan-500/15 p-12 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.3),transparent_60%)]" />
        <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Never stop learning</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Explore docs, guides and research — then put it to work building your AI workforce.</p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/docs" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">Read the Docs</Link>
        </div>
      </div>
    </div>
  );
}