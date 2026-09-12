import { createFileRoute } from '@tanstack/react-router';
import AstraCertificationWorkbench from '@/components/models/AstraCertificationWorkbench';
import IndependentEvaluatorVerification from '@/components/models/IndependentEvaluatorVerification';
import NativeRuntimeVerification from '@/components/models/NativeRuntimeVerification';
import ModelArena from '@/screens/ModelArena';

function ModelArenaWithCertification() {
  return (
    <>
      <NativeRuntimeVerification />
      <IndependentEvaluatorVerification />
      <AstraCertificationWorkbench />
      <ModelArena />
    </>
  );
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-modelarena"><ModelArenaWithCertification /></div>;
}

export const Route = createFileRoute('/_shell/_app/model-arena')({
  component: SpatialPage,
});
