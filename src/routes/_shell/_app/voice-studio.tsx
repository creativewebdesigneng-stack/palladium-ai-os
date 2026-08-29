import { createFileRoute } from '@tanstack/react-router';
import VoiceStudio from '@/screens/VoiceStudio';

export const Route = createFileRoute('/_shell/_app/voice-studio')({
  component: VoiceStudio,
});
