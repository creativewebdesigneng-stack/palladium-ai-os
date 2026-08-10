import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Agents";

export const Route = createFileRoute("/_shell/_app/agents/")({
  head: () => ({
    meta: [
      { title: "Agents — PalladiumAI" },
      { name: "description", content: "Manage every agent in your organisation." },
      { property: "og:title", content: "Agents — PalladiumAI" },
      { property: "og:description", content: "Manage every agent in your organisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
