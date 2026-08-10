import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Workforce";

export const Route = createFileRoute("/_shell/_app/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce — PalladiumAI" },
      { name: "description", content: "Your org chart of AI employees and their teams." },
      { property: "og:title", content: "Workforce — PalladiumAI" },
      { property: "og:description", content: "Your org chart of AI employees and their teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
