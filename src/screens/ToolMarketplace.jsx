import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, Loader2, TriangleAlert } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { friendlyMessage } from '@/lib/errors';
import MarketplaceToolbar from '@/components/tool-market/MarketplaceToolbar';
import PluginCard from '@/components/tool-market/PluginCard';
import PluginDetailDrawer from '@/components/tool-market/PluginDetailDrawer';
import { getToolFramework } from '@/lib/tools/tools.functions';

export default function ToolMarketplace() {
  const [session, setSession] = useState('unknown');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tool-marketplace'],
    queryFn: () => getToolFramework({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const tools = data?.tools ?? [];
  const categories = useMemo(() => [...new Set(tools.map((t) => t.category))].sort(), [tools]);

  const counts = useMemo(() => {
    const c = { All: tools.length };
    categories.forEach((cat) => { c[cat] = tools.filter((t) => t.category === cat).length; });
    return c;
  }, [tools, categories]);

  const filtered = useMemo(() => {
    let list = tools;
    if (category !== 'All') list = list.filter((t) => t.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }
    return list;
  }, [tools, category, query]);

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="Tool & Plugin Marketplace" description="Capabilities your agents can use, backed by the live tool framework." action={
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{tools.length} tools</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{categories.length} categories</span>
        </div>
      } />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Third-party plugin submissions aren't available yet — this marketplace shows the built-in tools your agents can already be granted.</p>
      </div>

      {session === 'no' && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
          <p className="text-sm font-medium text-white">Sign in to view the tool framework</p>
        </div>
      )}

      {session === 'yes' && isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] py-14 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tools…
        </div>
      )}

      {session === 'yes' && !isLoading && error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/[.05] px-6 py-14 text-center">
          <TriangleAlert className="h-5 w-5 text-rose-300" />
          <p className="text-sm font-medium text-white">Could not load the tool framework</p>
          <p className="text-xs text-zinc-500">{friendlyMessage(error)}</p>
          <button onClick={() => refetch()} className="mt-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Try again</button>
        </div>
      )}

      {session === 'yes' && !isLoading && !error && (
        <>
          <MarketplaceToolbar category={category} onCategory={setCategory} query={query} onQuery={setQuery} categories={categories} counts={counts} />

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => <PluginCard key={t.slug} tool={t} onOpen={setOpen} />)}
          </div>
          {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No tools match your search.</div>}
        </>
      )}

      <PluginDetailDrawer tool={open} onClose={() => setOpen(null)} />
    </>
  );
}
