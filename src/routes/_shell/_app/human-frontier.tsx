import { createFileRoute } from '@tanstack/react-router';
import HumanFrontier from '@/screens/HumanFrontier';

export const Route = createFileRoute('/_shell/_app/human-frontier')({
  head: () => ({
    meta: [
      { title: 'Human Frontier — Blackstar' },
      { name: 'description', content: 'Twenty user-controlled, human-led tools for firsthand observation, consent, practical action and personal judgement.' },
      { property: 'og:title', content: 'Human Frontier — Blackstar' },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: () => <div className="blackstar-core-page"><HumanFrontier /></div>,
});
