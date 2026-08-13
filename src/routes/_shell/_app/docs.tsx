import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperPortal";

export const Route = createFileRoute("/_shell/_app/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — PalladiumAI" },
      { name: "description", content: "API references, guides and examples for building on PalladiumAI." },
      { property: "og:title", content: "Documentation — PalladiumAI" },
      { property: "og:description", content: "API references, guides and examples for building on PalladiumAI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
