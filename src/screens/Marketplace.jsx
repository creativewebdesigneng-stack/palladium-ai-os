import { useState } from 'react';
import { Plus, LayoutGrid, Code2, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import MarketplaceSearch from '@/components/marketplace/MarketplaceSearch';
import FeaturedCarousel from '@/components/marketplace/FeaturedCarousel';
import CategoryGrid from '@/components/marketplace/CategoryGrid';
import TrendingSection from '@/components/marketplace/TrendingSection';
import AgentsSection from '@/components/marketplace/AgentsSection';
import ApplicationsSection from '@/components/marketplace/ApplicationsSection';
import WorkflowLibrary from '@/components/marketplace/WorkflowLibrary';
import PluginsSection from '@/components/marketplace/PluginsSection';
import IntegrationsSection from '@/components/marketplace/IntegrationsSection';
import MCPServerLibrary from '@/components/marketplace/MCPServerLibrary';
import PromptStore from '@/components/marketplace/PromptStore';
import CreatorProfiles from '@/components/marketplace/CreatorProfiles';
import ReviewsSection from '@/components/marketplace/ReviewsSection';
import TopCharts from '@/components/marketplace/TopCharts';
import MyLibrary from '@/components/marketplace/MyLibrary';
import MarketplaceRightSidebar from '@/components/marketplace/MarketplaceRightSidebar';
import MarketplaceEmptyState from '@/components/marketplace/MarketplaceEmptyState';
import NeuralNetworkBackground from '@/components/visual/NeuralNetworkBackground';

const HEAD_ACTIONS = [
  { label: 'Publish Item', icon: Plus, primary: true },
  { label: 'Browse Categories', icon: LayoutGrid },
  { label: 'Developer Portal', icon: Code2 },
  { label: 'My Purchases', icon: ShoppingBag },
];

export default function Marketplace() {
  const [showEmpty, setShowEmpty] = useState(false);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button
          key={a.label}
          onClick={() => a.label === 'My Purchases' && setShowEmpty(true)}
          className={`pbtn ${a.primary ? 'pbtn-primary' : 'pbtn-secondary'} flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}
        >
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  if (showEmpty) {
    return (
      <>
        <PageHeader eyebrow="Marketplace" title="Marketplace" description="Discover AI agents, workflows, apps, plugins, templates and integrations built by the PalladiumAI community." action={headerActions} />
        <MarketplaceEmptyState onBrowse={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-30"><NeuralNetworkBackground intensity="low" /></div>
      <PageHeader eyebrow="Marketplace" title="Marketplace" description="Discover AI agents, workflows, apps, plugins, templates and integrations built by the PalladiumAI community." action={headerActions} />

      <div className="mb-6"><MarketplaceSearch /></div>

      <div className="mb-8"><FeaturedCarousel /></div>

      <div className="mb-8"><CategoryGrid /></div>

      <div className="mb-8"><TrendingSection /></div>

      <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
        <div className="space-y-8 min-w-0">
          <AgentsSection />
          <ApplicationsSection />
          <WorkflowLibrary />
          <PluginsSection />
          <IntegrationsSection />
          <MCPServerLibrary />
          <PromptStore />
          <CreatorProfiles />
          <ReviewsSection />
          <TopCharts />
          <MyLibrary />
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-6"><MarketplaceRightSidebar /></div>
        </div>
      </div>
    </>
  );
}