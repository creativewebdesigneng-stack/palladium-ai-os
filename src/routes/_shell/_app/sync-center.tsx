import { createFileRoute } from '@tanstack/react-router';
import SyncCenter from '@/screens/SyncCenter';

export const Route = createFileRoute('/_shell/_app/sync-center')({
  component: SyncCenter,
});
