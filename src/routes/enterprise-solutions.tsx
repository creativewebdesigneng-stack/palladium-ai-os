import { createFileRoute } from '@tanstack/react-router';
import { Link } from 'react-router-dom';
import EnterpriseSolutionsCatalogue from '@/components/enterprise/EnterpriseSolutionsCatalogue';

function EnterpriseSolutionsPage() {
  return (
    <div className="blackstar-core-page min-h-screen bg-[#07080c] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Enterprise solutions navigation" className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link to="/" className="font-semibold tracking-wider text-amber-200">BLACKSTAR</Link>
          <div className="flex gap-4">
            <Link to="/pricing" className="text-zinc-300 hover:text-white">Platform pricing</Link>
            <Link to="/marketplace" className="text-zinc-300 hover:text-white">Marketplace</Link>
          </div>
        </nav>
        <EnterpriseSolutionsCatalogue />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/enterprise-solutions')({
  head: () => ({
    meta: [
      { title: 'Enterprise AI Solutions — Blackstar' },
      { name: 'description', content: 'Explore Blackstar enterprise solution programme proposals at indicative £100,000 and £1 million scopes. Subject to due diligence and signed contract.' },
      { property: 'og:title', content: 'Enterprise AI Solutions — Blackstar' },
      { property: 'og:description', content: 'Proposed enterprise AI programmes with defined deliverables, limitations and acceptance requirements.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: EnterpriseSolutionsPage,
});
