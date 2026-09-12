import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentBuilder";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-agentbuilder"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/agent-builder")({
  head: () => ({
    meta: [
      { title: "Agent builder — Blackstar" },
      { name: "description", content: "Design agent behaviour, tools and guardrails visually." },
      { property: "og:title", content: "Agent builder — Blackstar" },
      {
        property: "og:description",
        content: "Design agent behaviour, tools and guardrails visually.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
