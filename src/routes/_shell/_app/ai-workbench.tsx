import { createFileRoute } from '@tanstack/react-router';
import Screen from '@/screens/AIWorkbench';

export const Route = createFileRoute('/_shell/_app/ai-workbench')({
  head: () => ({
    meta: [
      { title: 'AI Workbench — Blackstar' },
      { name: 'description', content: '160 AI-powered drafting and analysis workflows powered by Blackstar\'s authenticated assistant runtime.' },
    ],
  }),
  component: Screen,
});
