import { createFileRoute } from '@tanstack/react-router';
import ThreeDStudio from '@/screens/ThreeDStudio';


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-threed"><ThreeDStudio /></div>;
}
export const Route = createFileRoute('/_shell/_app/three-d-studio')({
  head: () => ({ meta: [{ title: '3D Studio — Blackstar' }, { name: 'description', content: 'Generate real image-to-3D assets through a configured Modly-compatible worker.' }] }),
  component: SpatialPage,
});
