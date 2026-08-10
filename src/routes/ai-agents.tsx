import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIAgents";

export const Route = createFileRoute("/ai-agents")({
  head: () => ({
    meta: [
      { title: "AI Agents — PalladiumAI" },
      {
        name: "description",
        content:
          "Hire, configure and deploy specialised AI agents that plan, use tools and complete real work autonomously.",
      },
      { property: "og:title", content: "AI Agents — PalladiumAI" },
      {
        property: "og:description",
        content:
          "Hire, configure and deploy specialised AI agents that plan, use tools and complete real work autonomously.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
