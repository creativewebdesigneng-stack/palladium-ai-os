import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CreatorProfile";

export const Route = createFileRoute("/_shell/_app/creators/$id")({
  head: () => ({
    meta: [
      { title: "Creator profile — PalladiumAI" },
      { name: "description", content: "Browse a creator’s published agents and reviews." },
      { property: "og:title", content: "Creator profile — PalladiumAI" },
      { property: "og:description", content: "Browse a creator’s published agents and reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
