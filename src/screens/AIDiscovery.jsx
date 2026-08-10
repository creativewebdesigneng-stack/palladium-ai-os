import { useState, useMemo } from 'react';
import { Info, Compass } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import DiscoveryFilters from '@/components/discovery/DiscoveryFilters';
import DiscoveryCard from '@/components/discovery/DiscoveryCard';
import DiscoveryHighlights from '@/components/discovery/DiscoveryHighlights';
import { ITEMS, CATEGORIES } from '@/components/discovery/discoveryData';

export default function AIDiscovery() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [rating, setRating] = useState('any');
  const [sort, setSort] = useState('relevance');

  const filtered = useMemo(() => {
    let list = ITEMS.filter(i =>
      (cat === 'all' || i.category === cat) &&
      (rating === 'any' || i.rating >= parseFloat(rating)) &&
      (i.name.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase()) || i.capabilities.join(' ').toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'trending') list = [...list].sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
    if (sort === 'recent') list = [...list].sort((a, b) => b.added.localeCompare(a.added));
    return list;
  }, [q, cat, rating, sort]);

  return (
    <>
      <PageHeader eyebrow="Discovery" title="AI Discovery" description="A central discovery engine for AI models, agents, tools, apps, APIs, companies, research and news — search, filter and explore the AI ecosystem." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Compass className="h-3.5 w-3.5 text-zinc-500" />{CATEGORIES.length} categories · {ITEMS.length} items</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Listings are illustrative mock data. The interface is backend-ready for a future discovery integration.</p></div>

      <div className="mb-6"><DiscoveryFilters q={q} setQ={setQ} cat={cat} setCat={setCat} rating={rating} setRating={setRating} sort={sort} setSort={setSort} /></div>

      <div className="mb-6"><DiscoveryHighlights onPick={(i) => setCat(i.category)} /></div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">All results</h3>
        <p className="text-[11px] text-zinc-500">{filtered.length} found</p>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No results match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => <DiscoveryCard key={item.id} item={item} />)}
        </div>
      )}
    </>
  );
}