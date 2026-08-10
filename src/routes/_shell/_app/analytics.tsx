import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Analytics";

export const Route = createFileRoute("/_shell/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PalladiumAI" },
      { name: "description", content: "Outcome-level reporting for your AI workforce." },
      { property: "og:title", content: "Analytics — PalladiumAI" },
      { property: "og:description", content: "Outcome-level reporting for your AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
