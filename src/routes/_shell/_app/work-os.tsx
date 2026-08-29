import { createFileRoute } from '@tanstack/react-router';
import ProjectWorkOS from '@/screens/ProjectWorkOS';

export const Route = createFileRoute('/_shell/_app/work-os')({
  component: ProjectWorkOS,
});
