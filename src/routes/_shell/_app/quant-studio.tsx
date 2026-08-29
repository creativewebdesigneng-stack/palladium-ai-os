import { createFileRoute } from '@tanstack/react-router';
import QuantStudio from '@/screens/QuantStudio';

export const Route = createFileRoute('/_shell/_app/quant-studio')({
  component: QuantStudio,
});
