import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Integrations";

export const Route = createFileRoute("/_shell/_app/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — PalladiumAI" },
      { name: "description", content: "Browse the external provider capabilities PalladiumAI is designed to integrate with." },
      { property: "og:title", content: "Integrations — PalladiumAI" },
      { property: "og:description", content: "Browse the external provider capabilities PalladiumAI is designed to integrate with." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
