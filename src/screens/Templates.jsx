import { useState, useMemo } from 'react';
import { Search, Upload, LayoutTemplate } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/palladium/PageHeader';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplatePreview from '@/components/templates/TemplatePreview';
import { listMarketplaceAgents, installMarketplaceAgent } from '@/lib/marketplace/marketplace.functions';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { Empty, Loading, Failed } from '@/components/business/live';
import { useToast } from '@/components/ui/use-toast';

const SORTS = [
  { id: 'popular', label: 'Most used' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
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
  const features = Array.isArray(listing.features) ? listing.features : [];
  return {
    id: listing.id,
    name: listing.title ?? listing.name ?? 'Untitled template',
    desc: listing.description || 'No description provided by the publisher.',
    category: listing.category || 'General',
    creator: listing.creator?.display_name || listing.creator_name || 'Unknown publisher',
    price: Number(listing.price) > 0 ? `£${Number(listing.price).toFixed(2)}` : 'Free',
    rating: listing.rating ? Number(listing.rating).toFixed(1) : '—',
    uses: Number(listing.install_count ?? 0),
    grad: GRADS[index % GRADS.length],
    createdAt: listing.created_at ?? null,
    preview: { hero: listing.title ?? 'Template', sections: features },
  };
}

export default function Templates() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const listFn = useServerFn(listMarketplaceAgents);
  const installFn = useServerFn(installMarketplaceAgent);

  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [favs, setFavs] = useState([]);
  const [preview, setPreview] = useState(null);

  const listings = useQuery({
    queryKey: ['marketplace-templates'],
    queryFn: () => listFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const templates = useMemo(
    () => (listings.data ?? []).map(toTemplate),
    [listings.data],
  );

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))).sort(),
    [templates],
  );

  const install = useMutation({
    mutationFn: (t) => installFn({ data: { item_id: t.id } }),
    onSuccess: (_r, t) => {
      toast({ title: 'Template installed', description: `${t.name} was added to your workspace.` });
      qc.invalidateQueries({ queryKey: ['marketplace-templates'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (err) =>
      toast({ variant: 'destructive', title: 'Install failed', description: friendlyMessage(err) }),
  });

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
    return [...list].sort((a, b) =>
      sort === 'rating'
        ? Number(b.rating === '—' ? 0 : b.rating) - Number(a.rating === '—' ? 0 : a.rating)
        : sort === 'newest'
          ? String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
          : b.uses - a.uses,
    );
  }, [templates, cat, q, sort]);

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Templates Marketplace"
        description="Published templates from the live marketplace. Installs are recorded against your account."
        action={
          <button
            onClick={() => navigate('/creator-hub')}
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            <Upload className="h-4 w-4" />Publish template
          </button>
        }
      />

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
              desc="Nothing has been published to the marketplace. Publish your own from the Creator Hub."
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
                  onUse={(x) => install.mutate(x)}
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
        onUse={(x) => install.mutate(x)}
        onFav={toggleFav}
        favs={favs}
      />
    </>
  );
}
