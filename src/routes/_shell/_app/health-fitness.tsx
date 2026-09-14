import { createFileRoute } from '@tanstack/react-router';
import HealthFitnessHub from '@/screens/HealthFitnessHub';

function HealthFitnessPage() {
  return <div className="blackstar-core-page blackstar-health-fitness"><HealthFitnessHub /></div>;
}

export const Route = createFileRoute('/_shell/_app/health-fitness')({
  head: () => ({
    meta: [
      { title: 'Health & Fitness Hub — Blackstar' },
      { name: 'description', content: 'Private AI-assisted fitness, nutrition, sleep, recovery, health tracking, personal health records and bounded health guidance.' },
    ],
  }),
  component: HealthFitnessPage,
});
