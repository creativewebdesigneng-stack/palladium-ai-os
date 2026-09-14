import { createFileRoute } from '@tanstack/react-router';
import RetailHub from '@/screens/RetailHub';

export const Route = createFileRoute('/_shell/_app/retail-hub')({
  head: () => ({
    meta: [
      { title: 'Retail & Local Business Hub — Blackstar' },
      { name: 'description', content: 'AI-assisted retail operations for inventory, stock, suppliers, bookings, orders, shipping, calls, staff and local business workflows.' },
    ],
  }),
  component: RetailHub,
});
