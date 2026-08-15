import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIAppBuilder";

export const Route = createFileRoute("/_shell/_app/ai-builder")({
  head: () => ({
    meta: [
      { title: "AI app builder — PalladiumAI" },
      { name: "description", content: "Review app-builder availability and production runtime requirements." },
      { property: "og:title", content: "AI app builder — PalladiumAI" },
      { property: "og:description", content: "Review app-builder availability and production runtime requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
