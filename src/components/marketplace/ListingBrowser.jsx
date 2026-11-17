import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { useUpgrade } from '@/lib/upgradeContext';
import AgentCard from '@/components/marketplace-agents/AgentCard';
import AgentDetailDrawer from '@/components/marketplace-agents/AgentDetailDrawer';
import { listPublishedAgents, installMarketplaceAgent } from '@/components/marketplace-agents/api';
import { CATEGORIES, normalizeAgent } from '@/components/marketplace-agents/marketplaceData';

function withMarketplaceTimeout(promise, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} did not respond within 15 seconds.`)), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

const SORTS = [
  { id: 'popular', label: 'Most installed' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
];

// Real-backend catalogue browser shared by the general Marketplace and the
// AI Marketplace screens. Reads published listings only; install/rate calls
// go straight through the marketplace server functions — nothing here
// decides plan/permission, the backend does.
export default function ListingBrowser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const [session, setSession] = useState('unknown');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [active, setActive] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => withMarketplaceTimeout(listPublishedAgents(undefined, 120), 'Marketplace catalogue'),
    enabled: session === 'yes',
    retry: false,
  });

  const agents = useMemo(() => (data || []).map(normalizeAgent), [data]);

  const install = useMutation({
    mutationFn: (agent) => installMarketplaceAgent({ item_id: agent.id }),
    onSuccess: (_res, agent) => {
      toast({ title: `${agent.name} installed`, description: 'Added to your agent library.' });
      setActive(null);
      qc.invalidateQueries({ queryKey: ['marketplace-listings'] });
    },
    onError: (e) => {
      console.error('[marketplace]', e);
      toast({ title: 'Install failed', description: friendlyMessage(e), variant: 'destructive' });
    },
  });

  const handleInstall = (agent) => {
    if (!gate('marketplaceAccess')) return;
    install.mutate(agent);
  };

  const filtered = useMemo(() => {
    let list = category === 'all' ? agents : agents.filter((a) => a.category === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.capabilities.some((c) => c.toLowerCase().includes(q)));
    const sorted = [...list];
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
    else sorted.sort((a, b) => (b.usage.installs || 0) - (a.usage.installs || 0));
    return sorted;
  }, [agents, category, query, sort]);

  if (session === 'unknown') {
    return <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] py-14 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Checking your marketplace access…</div>;
  }

  if (session === 'no') {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
        <p className="text-sm font-medium text-white">Sign in to browse the marketplace</p>
        <p className="mt-1 text-xs text-zinc-500">Listings, installs and reviews require a PalladiumAI account.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${category === c.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{c.label}</button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings, capabilities…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${sort === s.id ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] py-14 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading marketplace…
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/[.05] px-6 py-14 text-center">
          <TriangleAlert className="h-5 w-5 text-rose-300" />
          <p className="text-sm font-medium text-white">Could not load the marketplace</p>
          <p className="text-xs text-zinc-500">{friendlyMessage(error)}</p>
          <button onClick={() => refetch()} className="mt-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Try again</button>
        </div>
      )}

      {!isLoading && !error && (
        filtered.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {filtered.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} onInstall={handleInstall} />)}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
            <p className="text-sm font-medium text-white">{agents.length === 0 ? 'No published agent listings yet' : 'No listings match your filters'}</p>
            <p className="mt-1 text-xs text-zinc-500">{agents.length === 0 ? 'The catalogue only shows approved, published listings. Create a draft in the Creator Hub and submit it for review.' : 'Try a different category or search term.'}</p>
            {agents.length === 0 && <Link to="/creator-hub" className="mt-3 inline-flex rounded-lg border border-violet-300/20 px-3 py-2 text-xs text-violet-200">Open Creator Hub</Link>}
          </div>
        )
      )}

      <AgentDetailDrawer agent={active} onClose={() => setActive(null)} onInstall={handleInstall} />
    </>
  );
}
