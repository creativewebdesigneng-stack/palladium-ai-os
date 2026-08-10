import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Knowledge";

export const Route = createFileRoute("/_shell/_app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — PalladiumAI" },
      { name: "description", content: "Curate the knowledge base your agents rely on." },
      { property: "og:title", content: "Knowledge — PalladiumAI" },
      { property: "og:description", content: "Curate the knowledge base your agents rely on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
