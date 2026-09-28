import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SEOStudio";

export const Route = createFileRoute("/_shell/_app/seo-studio")({
  head: () => ({
    meta: [
      { title: "SEO Studio — Blackstar" },
      { name: "description", content: "Track keyword, ranking, backlink and site-audit intelligence in Blackstar." },
      { property: "og:title", content: "SEO Studio — Blackstar" },
      { property: "og:description", content: "Track keyword, ranking, backlink and site-audit intelligence in Blackstar." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
