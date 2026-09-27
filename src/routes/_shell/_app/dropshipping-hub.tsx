import { Suspense, lazy } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import DropshippingHub from '@/screens/DropshippingHub';

const Extra = {
  ConnectionMatrix: lazy(() => import('@/screens/DropshippingConnectionMatrix')),
  GrowthLab: lazy(() => import('@/screens/DropshippingGrowthLab')),
  OpportunityWatchlist: lazy(() => import('@/screens/DropshippingOpportunityWatchlist')),
  ProductPipeline: lazy(() => import('@/screens/DropshippingProductPipeline')),
  ListingWorkbench: lazy(() => import('@/screens/DropshippingListingWorkbench')),
  ControlTower: lazy(() => import('@/screens/DropshippingControlTower')),
  FulfilmentDesk: lazy(() => import('@/screens/DropshippingFulfilmentDesk')),
  TrackingReconciliation: lazy(() => import('@/screens/DropshippingTrackingReconciliation')),
  AutomationPack: lazy(() => import('@/screens/DropshippingAutomationPack')),
};

function ModuleFallback() {
  return <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-xs text-zinc-500">Loading dropshipping module…</div>;
}

function DropshippingHubRoute() {
  return (
    <>
      <DropshippingHub />
      <Suspense fallback={<ModuleFallback />}>
        <div className="mt-6 space-y-6">
          <Extra.ConnectionMatrix />
          <Extra.GrowthLab />
          <Extra.OpportunityWatchlist />
          <Extra.ProductPipeline />
          <Extra.ListingWorkbench />
          <Extra.ControlTower />
          <Extra.FulfilmentDesk />
          <Extra.TrackingReconciliation />
          <Extra.AutomationPack />
        </div>
      </Suspense>
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/dropshipping-hub')({
  component: DropshippingHubRoute,
});
