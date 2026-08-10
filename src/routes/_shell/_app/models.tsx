import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Models";

export const Route = createFileRoute("/_shell/_app/models")({
  head: () => ({
    meta: [
      { title: "Models — PalladiumAI" },
      { name: "description", content: "Compare and route across frontier and open models." },
      { property: "og:title", content: "Models — PalladiumAI" },
      { property: "og:description", content: "Compare and route across frontier and open models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
