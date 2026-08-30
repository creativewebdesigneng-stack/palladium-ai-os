import MediaStudio from './MediaStudio';
import GenerativeMediaPanel from '@/components/media/GenerativeMediaPanel';
import { useSessionReady } from '@/lib/useSessionReady';

export default function MediaStudioWorkspace() {
  const session = useSessionReady();
  return (
    <>
      <MediaStudio />
      <GenerativeMediaPanel enabled={session === 'yes'} />
    </>
  );
}
