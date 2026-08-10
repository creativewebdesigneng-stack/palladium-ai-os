import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Research";

export const Route = createFileRoute("/_shell/_app/search")({
  head: () => ({
    meta: [
      { title: "Research — PalladiumAI" },
      { name: "description", content: "Deep research runs with citations and structured output." },
      { property: "og:title", content: "Research — PalladiumAI" },
      { property: "og:description", content: "Deep research runs with citations and structured output." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
