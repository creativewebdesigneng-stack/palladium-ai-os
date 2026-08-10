import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Business";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "For Business — PalladiumAI" },
      { name: "description", content: "Run finance, marketing, support and operations with an autonomous AI workforce built for business outcomes." },
      { property: "og:title", content: "For Business — PalladiumAI" },
      { property: "og:description", content: "Run finance, marketing, support and operations with an autonomous AI workforce built for business outcomes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
