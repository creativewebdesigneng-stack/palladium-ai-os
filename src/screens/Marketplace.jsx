import { Link } from 'react-router-dom';
import { Sparkles, Wrench, Store } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ListingBrowser from '@/components/marketplace/ListingBrowser';

export default function Marketplace() {
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Link to="/creator-hub" className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/30">
        <Sparkles className="h-4 w-4" />Creator Hub
      </Link>
      <Link to="/tool-marketplace" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">
        <Wrench className="h-4 w-4" />Tool Marketplace
      </Link>
      <Link to="/ai-marketplace" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">
        <Store className="h-4 w-4" />AI Marketplace
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="Marketplace" description="Discover AI agents built and published by the PalladiumAI community." action={headerActions} />
      <ListingBrowser />
    </>
  );
}
