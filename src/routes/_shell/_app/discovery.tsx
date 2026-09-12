import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIDiscovery";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/discovery")({
  head: () => ({
    meta: [
      { title: "Discovery — Blackstar" },
      { name: "description", content: "Navigate Blackstar's live models, tools and marketplace data." },
      { property: "og:title", content: "Discovery — Blackstar" },
      { property: "og:description", content: "Navigate Blackstar's live models, tools and marketplace data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
