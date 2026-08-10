import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Features";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — PalladiumAI" },
      { name: "description", content: "Explore the PalladiumAI platform: agent orchestration, automation studio, memory, tools and enterprise controls." },
      { property: "og:title", content: "Features — PalladiumAI" },
      { property: "og:description", content: "Explore the PalladiumAI platform: agent orchestration, automation studio, memory, tools and enterprise controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
