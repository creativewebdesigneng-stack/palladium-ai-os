import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AgentBuilder";

export const Route = createFileRoute("/_shell/_app/agent-builder")({
  head: () => ({
    meta: [
      { title: "Agent builder — PalladiumAI" },
      { name: "description", content: "Design agent behaviour, tools and guardrails visually." },
      { property: "og:title", content: "Agent builder — PalladiumAI" },
      {
        property: "og:description",
        content: "Design agent behaviour, tools and guardrails visually.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
