import { createFileRoute } from '@tanstack/react-router';
import FitnessStudio from '@/screens/FitnessStudio';

export const Route = createFileRoute('/_shell/_app/fitness-studio')({ component: FitnessStudio });
