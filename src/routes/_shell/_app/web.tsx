import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Web";

export const Route = createFileRoute("/_shell/_app/web")({
  head: () => ({
    meta: [
      { title: "Web — PalladiumAI" },
      { name: "description", content: "Search live public web sources through PalladiumAI's audited server-side discovery layer." },
      { property: "og:title", content: "Web — PalladiumAI" },
      { property: "og:description", content: "Live source-backed public web discovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
