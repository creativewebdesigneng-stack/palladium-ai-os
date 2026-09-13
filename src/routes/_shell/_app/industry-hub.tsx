import { createFileRoute } from '@tanstack/react-router';
import IndustryHub from '@/screens/IndustryHub';

export const Route = createFileRoute('/_shell/_app/industry-hub')({
  head: () => ({ meta: [{ title: 'Industry Intelligence Hub — Blackstar' }, { name: 'description', content: 'Cross-sector industry intelligence, operations, strategy, growth, risk, workforce and transformation support.' }] }),
  component: IndustryHub,
});
