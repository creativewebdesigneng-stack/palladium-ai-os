import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ToolMarketplace";

export const Route = createFileRoute("/_shell/_app/tool-marketplace")({
  head: () => ({
    meta: [
      { title: "Tool marketplace — PalladiumAI" },
      { name: "description", content: "Browse the live built-in tool registry available to your workspace." },
      { property: "og:title", content: "Tool marketplace — PalladiumAI" },
      { property: "og:description", content: "Browse the live built-in tool registry available to your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
