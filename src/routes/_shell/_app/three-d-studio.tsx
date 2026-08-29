import { createFileRoute } from '@tanstack/react-router';
import ThreeDStudio from '@/screens/ThreeDStudio';

export const Route = createFileRoute('/_shell/_app/three-d-studio')({
  head: () => ({ meta: [{ title: '3D Studio — PalladiumAI' }, { name: 'description', content: 'Generate real image-to-3D assets through a configured Modly-compatible worker.' }] }),
  component: ThreeDStudio,
});
