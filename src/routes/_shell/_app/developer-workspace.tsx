import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperWorkspace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-developer"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-developer"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/developer-workspace")({
  head: () => ({
    meta: [
      { title: "Developer workspace — Blackstar" },
      { name: "description", content: "Navigate real developer APIs and runtime capability states." },
      { property: "og:title", content: "Developer workspace — Blackstar" },
      { property: "og:description", content: "Navigate real developer APIs and runtime capability states." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
