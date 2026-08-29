import { createFileRoute } from '@tanstack/react-router';
import SmartTables from '@/screens/SmartTables';

export const Route = createFileRoute('/_shell/_app/smart-tables')({
  component: SmartTables,
});
