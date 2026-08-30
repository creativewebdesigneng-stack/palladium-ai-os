import { createFileRoute } from '@tanstack/react-router';
import MediaStudio from '@/screens/MediaStudioWorkspace';

export const Route = createFileRoute('/_shell/_app/media-studio')({
  component: MediaStudio,
});
