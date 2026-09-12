import { createFileRoute } from '@tanstack/react-router';
import CRMStudio from '@/screens/CRMStudio';


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-crm"><CRMStudio /></div>;
}
export const Route = createFileRoute('/_shell/_app/crm-studio')({
  component: SpatialPage,
});
