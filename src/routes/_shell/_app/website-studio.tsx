import { createFileRoute } from '@tanstack/react-router';
import WebsiteStudio from '@/screens/WebsiteStudio';

export const Route = createFileRoute('/_shell/_app/website-studio')({
  head: () => ({
    meta: [
      { title: 'Website Studio — Blackstar' },
      { name: 'description', content: 'Prompt, design, edit, preview and prepare websites for deployment with Blackstar.' },
    ],
  }),
  component: WebsiteStudio,
});
