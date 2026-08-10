import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AINews";

export const Route = createFileRoute("/_shell/_app/news-research")({
  head: () => ({
    meta: [
      { title: "News & research — PalladiumAI" },
      { name: "description", content: "Stay current on AI with curated intelligence." },
      { property: "og:title", content: "News & research — PalladiumAI" },
      { property: "og:description", content: "Stay current on AI with curated intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
