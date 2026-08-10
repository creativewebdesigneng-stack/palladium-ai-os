import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIDiscovery";

export const Route = createFileRoute("/_shell/_app/discovery")({
  head: () => ({
    meta: [
      { title: "Discovery — PalladiumAI" },
      { name: "description", content: "Discover new models, tools and agents." },
      { property: "og:title", content: "Discovery — PalladiumAI" },
      { property: "og:description", content: "Discover new models, tools and agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
