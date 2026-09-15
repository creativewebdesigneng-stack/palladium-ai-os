import { createFileRoute } from '@tanstack/react-router';
import ConstructionIndustrialHub from '@/screens/ConstructionIndustrialHub';

export const Route = createFileRoute('/_shell/_app/construction-industrial-hub')({
  head: () => ({
    meta: [
      { title: 'Construction & Industrial Hub — Blackstar' },
      { name: 'description', content: 'AI-assisted construction, engineering and industrial operations across estimating, planning, safety, quality, plant, BIM, procurement, commercial control and maintenance.' },
    ],
  }),
  component: ConstructionIndustrialHub,
});
