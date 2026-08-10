import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminUsers";

export const Route = createFileRoute("/_shell/_app/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin · Users — PalladiumAI" },
      { name: "description", content: "Manage platform users and access." },
      { property: "og:title", content: "Admin · Users — PalladiumAI" },
      { property: "og:description", content: "Manage platform users and access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
