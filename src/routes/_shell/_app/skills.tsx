import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Skills";

export const Route = createFileRoute("/_shell/_app/skills")({
  head: () => ({
    meta: [
      { title: "Skills — PalladiumAI" },
      { name: "description", content: "Reusable skills your agents can learn and apply." },
      { property: "og:title", content: "Skills — PalladiumAI" },
      { property: "og:description", content: "Reusable skills your agents can learn and apply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
