import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentDetail";

export const Route = createFileRoute("/_shell/_app/agents/$id/")({
  head: () => ({
    meta: [
      { title: "Agent detail — PalladiumAI" },
      { name: "description", content: "Inspect an agent’s configuration, tools and performance." },
      { property: "og:title", content: "Agent detail — PalladiumAI" },
      {
        property: "og:description",
        content: "Inspect an agent’s configuration, tools and performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
