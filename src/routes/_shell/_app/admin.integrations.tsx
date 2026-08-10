import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminIntegrations";

export const Route = createFileRoute("/_shell/_app/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Admin · Integrations — PalladiumAI" },
      { name: "description", content: "Global connector configuration." },
      { property: "og:title", content: "Admin · Integrations — PalladiumAI" },
      { property: "og:description", content: "Global connector configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
