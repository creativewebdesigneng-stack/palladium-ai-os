import { Link } from 'react-router-dom';
import { Orbit } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ListingBrowser from '@/components/marketplace/ListingBrowser';

export default function AIMarketplacePage() {
  return (
    <>
      <PageHeader eyebrow="Blackstar Marketplace" title="Intelligence Marketplace" description="Discover, install and rate executable agent capabilities published through the Blackstar marketplace." action={<Link to="/creator-hub" className="flex items-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-400/[.07] px-3.5 py-2 text-sm font-medium text-violet-100 hover:bg-violet-400/[.12]"><Orbit className="h-4 w-4" />Creator hub</Link>} />
      <div className="rounded-[24px] border border-violet-300/[.06] bg-black/10 p-1 sm:p-2"><ListingBrowser /></div>
    </>
  );
}
