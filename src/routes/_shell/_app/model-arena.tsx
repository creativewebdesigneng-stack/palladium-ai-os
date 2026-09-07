import { createFileRoute } from '@tanstack/react-router';
import AstraCertificationWorkbench from '@/components/models/AstraCertificationWorkbench';
import NativeRuntimeVerification from '@/components/models/NativeRuntimeVerification';
import ModelArena from '@/screens/ModelArena';

function ModelArenaWithCertification() {
  return (
    <>
      <NativeRuntimeVerification />
      <AstraCertificationWorkbench />
      <ModelArena />
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/model-arena')({
  component: ModelArenaWithCertification,
});
