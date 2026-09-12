import { createFileRoute } from '@tanstack/react-router';
import FastTrackWorkspace from '@/screens/FastTrackWorkspace';

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><FastTrackWorkspace /></div>;
}

export const Route = createFileRoute('/_shell/_app/fast-track')({
  component: SpatialPage,
});
