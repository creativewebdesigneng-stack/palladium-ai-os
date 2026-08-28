import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SEOStudio";

export const Route = createFileRoute("/_shell/_app/seo-studio")({
  head: () => ({
    meta: [
      { title: "SEO Studio — PalladiumAI" },
      { name: "description", content: "Track keyword, ranking, backlink and site-audit intelligence in PalladiumAI." },
      { property: "og:title", content: "SEO Studio — PalladiumAI" },
      { property: "og:description", content: "Track keyword, ranking, backlink and site-audit intelligence in PalladiumAI." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
