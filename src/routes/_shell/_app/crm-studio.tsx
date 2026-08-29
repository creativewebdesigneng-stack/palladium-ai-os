import { createFileRoute } from '@tanstack/react-router';
import CRMStudio from '@/screens/CRMStudio';

export const Route = createFileRoute('/_shell/_app/crm-studio')({
  component: CRMStudio,
});
