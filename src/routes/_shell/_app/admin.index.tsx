import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Admin";

export const Route = createFileRoute("/_shell/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PalladiumAI" },
      { name: "description", content: "Platform administration overview." },
      { property: "og:title", content: "Admin — PalladiumAI" },
      { property: "og:description", content: "Platform administration overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
