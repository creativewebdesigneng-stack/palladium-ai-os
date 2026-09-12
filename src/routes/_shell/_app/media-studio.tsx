import { createFileRoute } from '@tanstack/react-router';
import MediaStudio from '@/screens/MediaStudioWorkspace';


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-media"><MediaStudio /></div>;
}
export const Route = createFileRoute('/_shell/_app/media-studio')({
  component: SpatialPage,
});
