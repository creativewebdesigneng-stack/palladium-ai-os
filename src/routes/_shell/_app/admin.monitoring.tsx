import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SystemMonitoring";

export const Route = createFileRoute("/_shell/_app/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Admin · Monitoring — PalladiumAI" },
      { name: "description", content: "Health, latency and incident signals." },
      { property: "og:title", content: "Admin · Monitoring — PalladiumAI" },
      { property: "og:description", content: "Health, latency and incident signals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
