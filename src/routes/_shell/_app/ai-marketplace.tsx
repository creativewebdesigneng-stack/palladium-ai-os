import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIMarketplace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-aimarket"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-aimarket"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/ai-marketplace")({
  head: () => ({
    meta: [
      { title: "AI marketplace — Blackstar" },
      { name: "description", content: "Discover everything you can add to your OS." },
      { property: "og:title", content: "AI marketplace — Blackstar" },
      { property: "og:description", content: "Discover everything you can add to your OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
