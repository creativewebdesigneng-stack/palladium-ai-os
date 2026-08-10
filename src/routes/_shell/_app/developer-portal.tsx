import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperPortal";

export const Route = createFileRoute("/_shell/_app/developer-portal")({
  head: () => ({
    meta: [
      { title: "Developer portal — PalladiumAI" },
      { name: "description", content: "API keys, webhooks and platform docs." },
      { property: "og:title", content: "Developer portal — PalladiumAI" },
      { property: "og:description", content: "API keys, webhooks and platform docs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
