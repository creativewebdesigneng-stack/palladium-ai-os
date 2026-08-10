import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminPlatformAnalytics";

export const Route = createFileRoute("/_shell/_app/admin/platform-analytics")({
  head: () => ({
    meta: [
      { title: "Admin · Platform analytics — PalladiumAI" },
      { name: "description", content: "Usage and growth across the platform." },
      { property: "og:title", content: "Admin · Platform analytics — PalladiumAI" },
      { property: "og:description", content: "Usage and growth across the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
