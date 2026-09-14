import { createFileRoute } from '@tanstack/react-router';
import RetailHub from '@/screens/RetailHub';
import RetailAdvancedOperations from '@/components/retail/RetailAdvancedOperations';
import RetailStoreOperations from '@/components/retail/RetailStoreOperations';

function RetailHubRoute() {
  return (
    <>
      <RetailHub />
      <div className="mt-6">
        <RetailAdvancedOperations />
      </div>
      <div className="mt-6">
        <RetailStoreOperations />
      </div>
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/retail-hub')({
  head: () => ({
    meta: [
      { title: 'Retail & Local Business Hub — Blackstar' },
      { name: 'description', content: 'AI-assisted retail operations for inventory, suppliers, bookings, orders, shipping, calls, returns, loyalty, promotions, demand forecasting, reordering, stock transfers, POS registers, cash sessions, stocktakes, gift credit, staff shifts and booking reminders.' },
    ],
  }),
  component: RetailHubRoute,
});
