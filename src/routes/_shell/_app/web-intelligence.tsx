import { createFileRoute } from '@tanstack/react-router';
import WebIntelligence from '@/screens/WebIntelligence';

export const Route = createFileRoute('/_shell/_app/web-intelligence')({ component: WebIntelligence });
