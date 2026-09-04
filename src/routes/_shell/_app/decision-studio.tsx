import { createFileRoute } from '@tanstack/react-router';
import DecisionStudio from '@/screens/DecisionStudio';

export const Route = createFileRoute('/_shell/_app/decision-studio')({
  head: () => ({
    meta: [
      { title: 'Decision Studio — Blackstar' },
      { name: 'description', content: 'Governed optimization and counterfactual decision analysis for Blackstar.' },
      { property: 'og:title', content: 'Decision Studio — Blackstar' },
      { property: 'og:description', content: 'Compare policy-aware options before autonomous execution.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: DecisionStudio,
});
