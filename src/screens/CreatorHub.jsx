import { useState, useEffect, useCallback } from 'react';
import { Rocket, BarChart3, LayoutList, UserCircle } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import CreatorOnboarding from '@/components/marketplace-agents/CreatorOnboarding';
import ListingsManager from '@/components/marketplace-agents/ListingsManager';
import CreatorAnalytics from '@/components/marketplace-agents/CreatorAnalytics';
import EditListing from '@/components/marketplace-agents/EditListing';
import { submitMarketplaceAgent, removeMarketplaceAgent } from '@/components/marketplace-agents/api';

// Creator Hub — the creator's home base. Onboards a user into a Creator, then
// exposes three tabs: Listings (manage + edit + submit + remove), Analytics
// (downloads / earnings / per-agent), and Profile (edit creator profile).
export default function CreatorHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('listings');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const profiles = await base44.entities.Creator.filter({ user_id: user.id }, '-created_date', 1);
      const p = profiles[0] || null;
      setProfile(p);
      if (p) {
        const its = await base44.entities.MarketplaceItem.filter({ creator_id: user.id }, '-created_date', 100);
        setItems(its);
      }
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async (id) => {
    try { await submitMarketplaceAgent({ item_id: id }); toast({ title: 'Submitted for review' }); load(); }
    catch (e) { toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }); }
  };
  const remove = async (id) => {
    try { await removeMarketplaceAgent({ item_id: id }); toast({ title: 'Listing removed' }); load(); }
    catch (e) { toast({ title: 'Remove failed', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading…</div>;
  if (!profile) return <CreatorOnboarding onCreated={load} />;

  const TABS = [['listings', 'Listings', LayoutList], ['analytics', 'Analytics', BarChart3], ['profile', 'Profile', UserCircle]];

  return (
    <>
      <PageHeader
        eyebrow="Creator"
        title="Creator Hub"
        description="Publish, manage and track your AI agents."
        action={
          <button onClick={() => setEditing({})} className="pbtn pbtn-primary flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white">
            <Rocket className="h-4 w-4" />New agent
          </button>
        }
      />
      <div className="mb-5 flex gap-1.5">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm ${tab === id ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}><Icon className="h-4 w-4" />{label}</button>
        ))}
      </div>
      {tab === 'listings' && <ListingsManager items={items} onEdit={setEditing} onSubmit={submit} onRemove={remove} />}
      {tab === 'analytics' && <CreatorAnalytics />}
      {tab === 'profile' && <CreatorOnboarding existing={profile} onCreated={load} />}
      {editing && <EditListing item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}