import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIMarketplace";

export const Route = createFileRoute("/_shell/_app/ai-marketplace")({
  head: () => ({
    meta: [
      { title: "AI marketplace — PalladiumAI" },
      { name: "description", content: "Discover everything you can add to your OS." },
      { property: "og:title", content: "AI marketplace — PalladiumAI" },
      { property: "og:description", content: "Discover everything you can add to your OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
