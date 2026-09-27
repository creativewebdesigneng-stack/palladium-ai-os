import { Suspense, lazy } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import RetailHub from '@/screens/RetailHub';

const Extra = {
  ServiceAutomation: lazy(() => import('@/components/retail/RetailServiceAutomationSection')),
  AdvancedOperations: lazy(() => import('@/components/retail/RetailAdvancedOperations')),
  StoreOperations: lazy(() => import('@/components/retail/RetailStoreOperations')),
  ExecutionControls: lazy(() => import('@/components/retail/RetailExecutionControls')),
  CommerceControl: lazy(() => import('@/components/retail/RetailCommerceControl')),
};

function RetailModuleFallback({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-xs text-zinc-500">
      Loading {label}…
    </div>
  );
}

function RetailHubRoute() {
  return (
    <>
      <RetailHub />
      <Suspense fallback={<RetailModuleFallback label="service automation" />}>
        <div className="mt-6"><Extra.ServiceAutomation /></div>
      </Suspense>
      <Suspense fallback={<RetailModuleFallback label="advanced operations" />}>
        <div className="mt-6"><Extra.AdvancedOperations /></div>
      </Suspense>
      <Suspense fallback={<RetailModuleFallback label="store operations" />}>
        <div className="mt-6"><Extra.StoreOperations /></div>
      </Suspense>
      <Suspense fallback={<RetailModuleFallback label="execution controls" />}>
        <div className="mt-6"><Extra.ExecutionControls /></div>
      </Suspense>
      <Suspense fallback={<RetailModuleFallback label="commerce control" />}>
        <div className="mt-6"><Extra.CommerceControl /></div>
      </Suspense>
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/retail-hub')({
  head: () => ({
    meta: [
      { title: 'Retail & Local Business Hub — Blackstar' },
      { name: 'description', content: 'AI-assisted retail operations for inventory, suppliers, bookings, orders, shipping, calls, governed AI receptionist actions, customer communications, returns, loyalty, promotions, forecasting, stock transfers, POS registers, cash sessions, stocktakes, gift credit, staff shifts, automated reminders, connected Shopify order sync, payment ledgers and audited till reconciliation.' },
    ],
  }),
  component: RetailHubRoute,
});
