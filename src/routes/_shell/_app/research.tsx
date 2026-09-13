import { createFileRoute } from '@tanstack/react-router';
import Research from '@/screens/Research';

export const Route = createFileRoute('/_shell/_app/research')({
  head: () => ({
    meta: [
      { title: 'Research — Blackstar' },
      { name: 'description', content: 'Source-backed live web research and cited AI synthesis.' },
    ],
  }),
  component: Research,
});
