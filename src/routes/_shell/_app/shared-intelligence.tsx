import { createFileRoute } from '@tanstack/react-router';
import Screen from '@/screens/SharedIntelligence';

export const Route = createFileRoute('/_shell/_app/shared-intelligence')({
  head: () => ({
    meta: [
      { title: 'Shared Intelligence — Blackstar' },
      { name: 'description', content: 'Govern human-agent collaboration and inspect relationship intelligence across Blackstar workspaces and Knowledge-linked context.' },
      { property: 'og:title', content: 'Shared Intelligence — Blackstar' },
      { property: 'og:description', content: 'Govern human-agent collaboration and inspect relationship intelligence across Blackstar workspaces and Knowledge-linked context.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: Screen,
});
