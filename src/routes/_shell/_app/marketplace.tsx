import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Marketplace";

export const Route = createFileRoute("/_shell/_app/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — PalladiumAI" },
      { name: "description", content: "Install capabilities, templates and integrations." },
      { property: "og:title", content: "Marketplace — PalladiumAI" },
      { property: "og:description", content: "Install capabilities, templates and integrations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
