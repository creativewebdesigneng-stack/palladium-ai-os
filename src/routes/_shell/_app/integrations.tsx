import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Integrations";

export const Route = createFileRoute("/_shell/_app/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — PalladiumAI" },
      { name: "description", content: "Connect the tools your business already runs on." },
      { property: "og:title", content: "Integrations — PalladiumAI" },
      { property: "og:description", content: "Connect the tools your business already runs on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
