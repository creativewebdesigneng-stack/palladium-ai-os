import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CreatorHub";

export const Route = createFileRoute("/_shell/_app/creator-hub")({
  head: () => ({
    meta: [
      { title: "Creator hub — PalladiumAI" },
      { name: "description", content: "Publish and monetise agents you build." },
      { property: "og:title", content: "Creator hub — PalladiumAI" },
      { property: "og:description", content: "Publish and monetise agents you build." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
