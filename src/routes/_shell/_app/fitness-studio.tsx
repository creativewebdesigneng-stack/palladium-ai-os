import { createFileRoute } from '@tanstack/react-router';
import FitnessStudio from '@/screens/FitnessStudio';

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><FitnessStudio /></div>;
}

export const Route = createFileRoute('/_shell/_app/fitness-studio')({ component: SpatialPage });
