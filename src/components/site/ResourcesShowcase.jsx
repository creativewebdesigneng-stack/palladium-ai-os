import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  GraduationCap,
  Layers,
  Newspaper,
  Search,
  Clock,
} from 'lucide-react';
import { CATEGORIES, FEATURED, RECENT, SECTIONS } from '@/components/site/resourcesData';

const ICONS = { Layers, BookOpen, Compass, GraduationCap, Newspaper, Code2 };
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((category) => [category.key, category.label]));
const CAT_TONE = {
  docs: 'text-sky-300',
  guides: 'text-violet-300',
  tutorials: 'text-emerald-300',
  platform: 'text-fuchsia-300',
  dev: 'text-teal-300',
};

export function ResourceSearch({ query, setQuery, active, setActive, results }) {
  return (
    <>
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Blackstar resources…"
          className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/40 focus:outline-none"
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((category) => {
          const Icon = ICONS[category.icon];
          const isActive = active === category.key;
          return (
            <button
              key={category.key}
              onClick={() => setActive(category.key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${isActive ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-300' : CAT_TONE[category.key] || 'text-zinc-400'}`} />
              {category.label}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs text-zinc-500">
        {results} resource{results === 1 ? '' : 's'}
        {active !== 'all' && ` in ${CAT_LABEL[active]}`}
        {query && ` matching "${query}"`}
      </p>
    </>
  );
}

function ArticleCard({ article, featured }) {
  const Icon = ICONS[CATEGORIES.find((category) => category.key === article.category)?.icon];
  const body = (
    <>
      {featured && (
        <div className={`relative h-32 bg-gradient-to-br ${article.tone} p-5`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.2),transparent_50%)]" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Icon className="h-3 w-3" /> {CAT_LABEL[article.category]}
          </span>
        </div>
      )}
      <div className={featured ? 'flex flex-1 flex-col p-5' : 'p-5'}>
        {!featured && (
          <div className="flex items-center gap-2 text-[11px]">
            <Icon className={`h-3.5 w-3.5 ${CAT_TONE[article.category]}`} />
            <span className={CAT_TONE[article.category]}>{CAT_LABEL[article.category]}</span>
          </div>
        )}
        <h3 className={featured ? 'text-lg font-semibold leading-snug text-white' : 'mt-2 text-sm font-semibold leading-snug text-white group-hover:text-violet-200'}>
          {article.title}
        </h3>
        {article.excerpt && <p className="mt-2 text-sm leading-relaxed text-zinc-400">{article.excerpt}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] text-zinc-500">
          <Clock className="h-3 w-3" /> {article.read}
        </div>
      </div>
    </>
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className={`group overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-white/20 hover:bg-white/[.04] ${featured ? 'flex flex-col' : ''}`}
    >
      <Link to={article.to} className="flex h-full flex-col">
        {body}
      </Link>
    </motion.article>
  );
}

export function ResourceGrid({ query, active }) {
  const q = query.trim().toLowerCase();
  const featured = useMemo(() => FEATURED.map((item) => ({ ...item })), []);
  const featuredFiltered = (active === 'all' ? featured : featured.filter((article) => article.category === active))
    .filter((article) => !q || article.title.toLowerCase().includes(q) || article.excerpt.toLowerCase().includes(q));
  const recentFiltered = RECENT.filter((article) => {
    const matchesCategory = active === 'all' || article.category === active;
    const matchesQuery = !q || article.title.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-7xl px-6">
      {featuredFiltered.length > 0 && (
        <>
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-violet-400">Featured</p>
          <motion.div layout className="grid gap-4 md:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {featuredFiltered.map((article) => <ArticleCard key={article.title} article={article} featured />)}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {recentFiltered.length > 0 && (
        <>
          <p className="mb-4 mt-10 text-xs uppercase tracking-[0.25em] text-violet-400">Current guides</p>
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {recentFiltered.map((article) => <ArticleCard key={article.title} article={article} />)}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {featuredFiltered.length === 0 && recentFiltered.length === 0 && (
        <div className="mt-10 text-center text-sm text-zinc-500">No resources found. Try a different search or category.</div>
      )}
    </div>
  );
}

export function SectionGrid() {
  const resources = [...FEATURED, ...RECENT];

  return (
    <div className="mx-auto grid max-w-7xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {SECTIONS.map((section, index) => {
        const Icon = ICONS[CATEGORIES.find((category) => category.key === section.key)?.icon];
        const count = resources.filter((resource) => resource.category === section.key).length;

        return (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
          >
            <Link to={section.to} className="group block rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-white/20 hover:bg-white/[.04]">
              <div className="flex items-center justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] ${section.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] text-zinc-500">{count} listed</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{section.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{section.desc}</p>
              <span className="mt-3 flex items-center gap-1 text-xs text-zinc-500 transition group-hover:text-white">
                Open <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
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
        <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Explore the platform</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">Use current Blackstar guides, then open the product surface that performs the work.</p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register?returnTo=/dashboard" className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Start Building <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/developers" className="rounded-xl border border-white/15 bg-white/[.03] px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
            Developer resources
          </Link>
        </div>
      </div>
    </div>
  );
}
