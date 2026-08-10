import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Rocket, Store, Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { Link } from 'react-router-dom';
import AgentCard from '@/components/marketplace-agents/AgentCard';
import AgentDetailDrawer from '@/components/marketplace-agents/AgentDetailDrawer';
import CreatorPanel from '@/components/marketplace-agents/CreatorPanel';
import { base44 } from '@/api/base44Client';
import { useUpgrade } from '@/lib/upgradeContext';
import { useToast } from '@/components/ui/use-toast';
import { CATEGORIES, FILTERS, AGENTS, normalizeAgent } from '@/components/marketplace-agents/marketplaceData';

export default function AgentMarketplace() {
  const { gate } = useUpgrade();
  const { toast } = useToast();
  const [category, setCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('discover');
  const [active, setActive] = useState(null);
  const [agents, setAgents] = useState(AGENTS);

  // Load published agents from the backend; fall back to the built-in catalog
  // when no records exist yet so browsing always works.
  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.MarketplaceItem.filter({ type: 'agent', status: 'published' }, '-created_date', 60);
        if (items && items.length) setAgents(items.map(normalizeAgent));
      } catch {}
    })();
  }, []);

  const toggleFilter = (id) => setActiveFilters((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);

  const filtered = useMemo(() => {
    let list = category === 'all' ? agents : agents.filter((a) => a.category === category);
    if (activeFilters.includes('free')) list = list.filter((a) => a.price === 'Free');
    if (activeFilters.includes('paid')) list = list.filter((a) => a.price !== 'Free');
    if (activeFilters.includes('popular')) list = list.filter((a) => a.isPopular);
    if (activeFilters.includes('newest')) list = list.filter((a) => a.isNew);
    if (activeFilters.includes('verified')) list = list.filter((a) => a.isVerified);
    if (activeFilters.includes('enterprise')) list = list.filter((a) => a.isEnterprise);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.capabilities.some((c) => c.toLowerCase().includes(q)));
    return list;
  }, [agents, category, activeFilters, query]);

  const featured = useMemo(() => [...agents].sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || b.rating - a.rating).slice(0, 6), [agents]);

  // Free users can browse; installing/using an agent requires a paid plan
  // (marketplaceAccess). The upgrade modal opens automatically when gated.
  const handleInstall = async (agent) => {
    if (!gate('marketplaceAccess')) return;
    if (agent._backend) { try { await base44.functions.invoke('installMarketplaceAgent', { item_id: agent.id }); } catch {} }
    setAgents((list) => list.map((a) => a.id === agent.id ? { ...a, usage: { ...a.usage, installs: (a.usage?.installs || 0) + 1 } } : a));
    setActive(null);
    toast({ title: `${agent.name} installed`, description: 'Added to your agent library.' });
  };

  // Creator marketplace: publish a draft agent listing for review.
  const handlePublish = async (form) => {
    if (!gate('createAgents')) return;
    try {
      const cat = CATEGORIES.find((c) => c.label === form.category);
      const price = form.pricing === 'Free' ? 0 : (parseInt(form.pricing.replace(/[^0-9]/g, ''), 10) || 0);
      await base44.functions.invoke('saveMarketplaceAgent', {
        title: form.name, description: form.description,
        category: cat ? cat.id : (form.category || '').toLowerCase(),
        price, version: '1.0.0', features: form.capabilities, revenue_share: 30,
        required_plan: 'free', usage_requirements: '',
        metadata: { grad: form.icon, initials: (form.name || '').slice(0, 2).toUpperCase(), documentation: form.documentation },
      });
      toast({ title: 'Draft created', description: 'Open the Creator Hub to submit it for review.' });
    } catch (e) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="AI Agent Marketplace" description="Discover AI workers built for real-world tasks."
        action={
          <div className="flex gap-2">
            <button onClick={() => setView('discover')} className={`rounded-xl px-3.5 py-2 text-sm ${view === 'discover' ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}><Store className="mr-1.5 inline h-4 w-4" />Discover</button>
            <button onClick={() => setView('publish')} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm ${view === 'publish' ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}><Rocket className="h-4 w-4" />Publish</button>
            <Link to="/creator-hub" className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3.5 py-2 text-sm text-violet-200 hover:bg-violet-500/20"><Sparkles className="h-4 w-4" />Creator Hub</Link>
          </div>
        } />

      {view === 'discover' ? (
        <>
          {/* Category chips */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${category === c.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{c.label}</button>
            ))}
          </div>

          {/* Search + filters */}
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents, capabilities…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => toggleFilter(f.id)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${activeFilters.includes(f.id) ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Featured */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-white">Featured agents</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {featured.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} onInstall={handleInstall} />)}
            </div>
          </section>

          {/* All agents */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">All agents</h2>
              <span className="text-[11px] text-zinc-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
            </div>
            {filtered.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {filtered.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} onInstall={handleInstall} />)}
                </AnimatePresence>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
                <p className="text-sm font-medium text-white">No agents match your filters</p>
                <p className="mt-1 text-xs text-zinc-500">Try clearing filters or searching for something else.</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="mx-auto max-w-2xl"><CreatorPanel onPublish={handlePublish} /></div>
      )}

      <AgentDetailDrawer agent={active} onClose={() => setActive(null)} onInstall={handleInstall} />
    </>
  );
}