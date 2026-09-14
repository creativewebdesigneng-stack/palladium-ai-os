import { createFileRoute } from '@tanstack/react-router';
import RetailHub from '@/screens/RetailHub';
import RetailAdvancedOperations from '@/components/retail/RetailAdvancedOperations';
import RetailStoreOperations from '@/components/retail/RetailStoreOperations';
import RetailExecutionControls from '@/components/retail/RetailExecutionControls';
import RetailCommerceControl from '@/components/retail/RetailCommerceControl';
import RetailServiceAutomationSection from '@/components/retail/RetailServiceAutomationSection';

function RetailHubRoute() {
  return (
    <>
      <RetailHub />
      <div className="mt-6">
        <RetailServiceAutomationSection />
      </div>
      <div className="mt-6">
        <RetailAdvancedOperations />
      </div>
      <div className="mt-6">
        <RetailStoreOperations />
      </div>
      <div className="mt-6">
        <RetailExecutionControls />
      </div>
      <div className="mt-6">
        <RetailCommerceControl />
      </div>
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
