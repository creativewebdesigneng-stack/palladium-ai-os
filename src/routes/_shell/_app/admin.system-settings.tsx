import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSystemSettings";

export const Route = createFileRoute("/_shell/_app/admin/system-settings")({
  head: () => ({
    meta: [
      { title: "Admin · System settings — PalladiumAI" },
      { name: "description", content: "Platform-wide configuration." },
      { property: "og:title", content: "Admin · System settings — PalladiumAI" },
      { property: "og:description", content: "Platform-wide configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
