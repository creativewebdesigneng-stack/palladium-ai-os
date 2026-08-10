import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — PalladiumAI" },
      { name: "description", content: "Simple plans that scale from a single operator to an enterprise AI workforce. Start free." },
      { property: "og:title", content: "Pricing — PalladiumAI" },
      { property: "og:description", content: "Simple plans that scale from a single operator to an enterprise AI workforce. Start free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
