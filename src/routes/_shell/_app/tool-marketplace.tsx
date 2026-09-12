import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ToolMarketplace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-toolmarket"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/tool-marketplace")({
  head: () => ({
    meta: [
      { title: "Tool marketplace — Blackstar" },
      { name: "description", content: "Browse the live built-in tool registry available to your workspace." },
      { property: "og:title", content: "Tool marketplace — Blackstar" },
      { property: "og:description", content: "Browse the live built-in tool registry available to your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
