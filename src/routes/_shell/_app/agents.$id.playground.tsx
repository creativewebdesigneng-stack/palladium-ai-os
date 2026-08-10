import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentPlayground";

export const Route = createFileRoute("/_shell/_app/agents/$id/playground")({
  head: () => ({
    meta: [
      { title: "Agent playground — PalladiumAI" },
      { name: "description", content: "Test an agent live before deploying it to production." },
      { property: "og:title", content: "Agent playground — PalladiumAI" },
      {
        property: "og:description",
        content: "Test an agent live before deploying it to production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
