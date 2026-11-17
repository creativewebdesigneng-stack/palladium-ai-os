import { useState, useMemo } from 'react';
import { Search, Upload, LayoutTemplate } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplatePreview from '@/components/templates/TemplatePreview';
import { listCreatorMarketplace } from '@/lib/marketplace/creator-commerce.functions';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { Empty, Loading, Failed } from '@/components/business/live';

function withTemplateMarketplaceTimeout(promise, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The template catalogue did not respond within 15 seconds.')), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'A–Z' },
];

const GRADS = [
  'from-violet-500 to-indigo-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

/** Maps a published marketplace listing into the card/preview shape. */
function toTemplate(listing, index) {
  const features = Array.isArray(listing.tags) ? listing.tags : [];
  return {
    id: listing.id,
    name: listing.title ?? listing.name ?? 'Untitled template',
    desc: listing.description || 'No description provided by the publisher.',
    category: listing.metadata?.category || 'Template',
    creator: listing.seller_id ? 'Community creator' : 'Blackstar',
    price: Number(listing.price_pence) > 0 ? `£${(Number(listing.price_pence) / 100).toFixed(2)}` : 'Free',
    rating: '—',
    uses: null,
    grad: GRADS[index % GRADS.length],
    createdAt: listing.created_at ?? null,
    preview: { hero: listing.title ?? 'Template', sections: features },
  };
}

export default function Templates() {
  const session = useSessionReady();
  const navigate = useNavigate();
  const listFn = useServerFn(listCreatorMarketplace);

  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [favs, setFavs] = useState([]);
  const [preview, setPreview] = useState(null);

  const listings = useQuery({
    queryKey: ['marketplace-templates'],
    queryFn: () => withTemplateMarketplaceTimeout(listFn({ data: undefined })),
    enabled: session === 'yes',
    retry: false,
  });

  const templates = useMemo(
    () => (listings.data ?? []).filter((listing) => listing.item_type === 'template').map(toTemplate),
    [listings.data],
  );

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))).sort(),
    [templates],
  );

  const toggleFav = (id) =>
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtered = useMemo(() => {
    let list = templates.filter((t) => cat === 'all' || t.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.desc.toLowerCase().includes(s) ||
          t.creator.toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) => sort === 'newest'
      ? String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
      : a.name.localeCompare(b.name));
  }, [templates, cat, q, sort]);

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Templates Marketplace"
        description="Approved template listings from the Creator Marketplace. Unverified mock inventory and unsupported usage claims are not displayed."
        action={
          <button
            onClick={() => navigate('/creator-hub')}
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            <Upload className="h-4 w-4" />Publish template
          </button>
        }
      />

      {session === 'unknown' && <Loading label="Checking your marketplace access…" />}
      {session === 'no' && <Failed message="Sign in to browse marketplace templates." />}
      {session === 'yes' && listings.isLoading && <Loading label="Loading published templates…" />}
      {listings.isError && (
        <Failed message={friendlyMessage(listings.error)} onRetry={() => listings.refetch()} />
      )}

      {listings.isSuccess && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates, creators…"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-medium ${sort === s.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setCat('all')}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {templates.length === 0 ? (
            <Empty
              icon={LayoutTemplate}
              title="No templates published yet"
              desc="Pre-launch: no approved community template listings have been published yet. Publish a real template from the Creator Hub; illustrative mock templates are not shown as marketplace inventory."
            />
          ) : filtered.length === 0 ? (
            <Empty title="No matches" desc="No templates match your filters." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  favs={favs}
                  onPreview={setPreview}
                  onUse={() => navigate('/creator-marketplace')}
                  onFav={toggleFav}
                />
              ))}
            </div>
          )}
        </>
      )}

      <TemplatePreview
        t={preview}
        onClose={() => setPreview(null)}
        onUse={() => navigate('/creator-marketplace')}
        onFav={toggleFav}
        favs={favs}
      />
    </>
  );
}
