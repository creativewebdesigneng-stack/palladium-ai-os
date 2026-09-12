import { createFileRoute } from '@tanstack/react-router';
import VoiceStudio from '@/screens/VoiceStudioWorkspace';

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-voice"><VoiceStudio /></div>;
}

export const Route = createFileRoute('/_shell/_app/voice-studio')({
  component: SpatialPage,
});
