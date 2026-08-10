import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Marketing";

export const Route = createFileRoute("/_shell/_app/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — PalladiumAI" },
      { name: "description", content: "Campaigns, content and growth on autopilot." },
      { property: "og:title", content: "Marketing — PalladiumAI" },
      { property: "og:description", content: "Campaigns, content and growth on autopilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
