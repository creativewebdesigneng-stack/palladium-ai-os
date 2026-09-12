import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentMarketplace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-agentmarket"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-agentmarket"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/agent-marketplace")({
  head: () => ({
    meta: [
      { title: "Agent marketplace — Blackstar" },
      { name: "description", content: "Hire pre-built agents from the community." },
      { property: "og:title", content: "Agent marketplace — Blackstar" },
      { property: "og:description", content: "Hire pre-built agents from the community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
