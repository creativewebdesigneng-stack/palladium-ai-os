import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ListingBrowser from '@/components/marketplace/ListingBrowser';

export default function AIMarketplacePage() {
  return (
    <>
      <PageHeader eyebrow="Marketplace" title="AI Marketplace" description="Discover, install and rate AI agents built by the PalladiumAI community." action={
        <Link to="/creator-hub" className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3.5 py-2 text-sm text-violet-200 hover:bg-violet-500/20">
          <Sparkles className="h-4 w-4" />Become a creator
        </Link>
      } />
      <ListingBrowser />
    </>
  );
}
