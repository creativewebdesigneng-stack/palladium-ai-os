import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Resources";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — PalladiumAI" },
      {
        name: "description",
        content: "Access live PalladiumAI product resources and see publication-feed availability.",
      },
      { property: "og:title", content: "Resources — PalladiumAI" },
      {
        property: "og:description",
        content: "Access live PalladiumAI product resources and see publication-feed availability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
