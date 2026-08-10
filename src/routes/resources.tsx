import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Resources";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — PalladiumAI" },
      { name: "description", content: "Guides, templates, changelog and research to help you get the most out of your AI workforce." },
      { property: "og:title", content: "Resources — PalladiumAI" },
      { property: "og:description", content: "Guides, templates, changelog and research to help you get the most out of your AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
