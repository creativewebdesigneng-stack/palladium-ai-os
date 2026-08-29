import { createFileRoute } from '@tanstack/react-router';
import CommerceStudio from '@/screens/CommerceStudio';

export const Route = createFileRoute('/_shell/_app/commerce-studio')({
  component: CommerceStudio,
});
