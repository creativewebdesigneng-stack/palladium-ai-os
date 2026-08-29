import { createFileRoute } from '@tanstack/react-router';
import ModelArena from '@/screens/ModelArena';

export const Route = createFileRoute('/_shell/_app/model-arena')({
  component: ModelArena,
});
