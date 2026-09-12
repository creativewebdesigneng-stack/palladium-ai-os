import { createFileRoute } from '@tanstack/react-router';
import CommerceStudio from '@/screens/CommerceStudio';

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-commerce"><CommerceStudio /></div>;
}

export const Route = createFileRoute('/_shell/_app/commerce-studio')({
  component: SpatialPage,
});
