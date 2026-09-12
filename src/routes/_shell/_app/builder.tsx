import { createFileRoute } from "@tanstack/react-router";
import BuilderBlueprints from "@/components/builder/BuilderBlueprints";
import Screen from "@/screens/Builder";

function BuilderRoute() {
  return (
    <>
      <Screen />
      <BuilderBlueprints />
    </>
  );
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-builder"><BuilderRoute /></div>;
}

export const Route = createFileRoute("/_shell/_app/builder")({
  head: () => ({
    meta: [
      { title: "Builder — Blackstar" },
      { name: "description", content: "Build, validate and deploy production applications with native Blackstar services and reusable app blueprints." },
      { property: "og:title", content: "Builder — Blackstar" },
      { property: "og:description", content: "Build, validate and deploy production applications with native Blackstar services and reusable app blueprints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
