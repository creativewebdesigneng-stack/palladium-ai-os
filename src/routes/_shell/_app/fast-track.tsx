import { createFileRoute } from '@tanstack/react-router';
import FastTrackWorkspace from '@/screens/FastTrackWorkspace';

export const Route = createFileRoute('/_shell/_app/fast-track')({
  component: FastTrackWorkspace,
});
