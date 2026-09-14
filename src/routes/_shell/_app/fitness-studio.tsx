import { createFileRoute } from '@tanstack/react-router';
import HealthFitnessHub from '@/screens/HealthFitnessHub';

function FitnessCompatibilityPage() {
  return <div className="blackstar-core-page blackstar-health-fitness"><HealthFitnessHub /></div>;
}

export const Route = createFileRoute('/_shell/_app/fitness-studio')({
  head: () => ({ meta: [{ title: 'Health & Fitness Hub — Blackstar' }] }),
  component: FitnessCompatibilityPage,
});
