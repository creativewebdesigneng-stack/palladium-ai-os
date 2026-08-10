import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentMarketplace";

export const Route = createFileRoute("/_shell/_app/agent-marketplace")({
  head: () => ({
    meta: [
      { title: "Agent marketplace — PalladiumAI" },
      { name: "description", content: "Hire pre-built agents from the community." },
      { property: "og:title", content: "Agent marketplace — PalladiumAI" },
      { property: "og:description", content: "Hire pre-built agents from the community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
