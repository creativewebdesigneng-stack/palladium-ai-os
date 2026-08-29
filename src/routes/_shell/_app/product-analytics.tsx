import { createFileRoute } from '@tanstack/react-router';
import ProductAnalytics from '@/screens/ProductAnalytics';

export const Route = createFileRoute('/_shell/_app/product-analytics')({
  component: ProductAnalytics,
});
