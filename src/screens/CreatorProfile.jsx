import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Globe, Download, Bot } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AgentCard from '@/components/marketplace-agents/AgentCard';
import AgentDetailDrawer from '@/components/marketplace-agents/AgentDetailDrawer';
import { getCreatorStats } from '@/components/marketplace-agents/api';
import { normalizeAgent } from '@/components/marketplace-agents/marketplaceData';

// Public creator profile: avatar, verified badge, bio, website, aggregate
// stats (agent count, downloads), and a grid of the creator's published
// agents. Clicking an agent opens the shared detail drawer.
export default function CreatorProfile() {
  const { id } = useParams();
  const [creator, setCreator] = useState(null);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profiles, its, st] = await Promise.all([
          base44.entities.Creator.filter({ user_id: id }, '-created_date', 1),
          base44.entities.MarketplaceItem.filter({ creator_id: id, status: 'published' }, '-created_date', 60),
          getCreatorStats(id),
        ]);
        setCreator(profiles[0] || { name: 'Creator', bio: '' });
        setItems(its.map(normalizeAgent));
        setStats(st);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const install = (agent) => {
    base44.functions.invoke('installMarketplaceAgent', { item_id: agent.id }).catch(() => {});
    setActive(null);
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading creator…</div>;
  if (!creator) return <div className="text-sm text-zinc-500">Creator not found.</div>;

  return (
    <>
      <div className="mb-4">
        <Link to="/agent-marketplace" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to marketplace</Link>
      </div>
      <div className="mb-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-semibold text-white">{(creator.name || 'C').slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">{creator.name}</h1>
            {creator.verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
            {creator.website && <a href={creator.website} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white"><Globe className="h-4 w-4" /></a>}
          </div>
          {creator.handle && <p className="text-xs text-zinc-500">{creator.handle}</p>}
          <p className="mt-2 text-sm text-zinc-300">{creator.bio || 'No bio yet.'}</p>
          <div className="mt-3 flex gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><Bot className="h-3.5 w-3.5" />{stats?.agent_count ?? 0} agents</span>
            <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{stats?.total_downloads ?? 0} downloads</span>
          </div>
        </div>
      </div>
      <h2 className="mb-3 text-sm font-semibold text-white">Agents by {creator.name}</h2>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((a) => <AgentCard key={a.id} agent={a} onOpen={setActive} onInstall={install} />)}</div>
      ) : <p className="text-xs text-zinc-600">No published agents yet.</p>}
      <AgentDetailDrawer agent={active} onClose={() => setActive(null)} onInstall={install} />
    </>
  );
}