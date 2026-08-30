import VoiceStudio from './VoiceStudio';
import LuxTtsPanel from '@/components/voice/LuxTtsPanel';
import { useSessionReady } from '@/lib/useSessionReady';

export default function VoiceStudioWorkspace() {
  const session = useSessionReady();
  return (
    <>
      <VoiceStudio />
      <LuxTtsPanel enabled={session === 'yes'} />
    </>
  );
}
