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

export const Route = createFileRoute("/_shell/_app/builder")({
  head: () => ({
    meta: [
      { title: "Builder — PalladiumAI" },
      { name: "description", content: "Build, validate and deploy production applications with native PalladiumAI services and reusable app blueprints." },
      { property: "og:title", content: "Builder — PalladiumAI" },
      { property: "og:description", content: "Build, validate and deploy production applications with native PalladiumAI services and reusable app blueprints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderRoute,
});
