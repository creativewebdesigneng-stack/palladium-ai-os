import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Forbidden";

export const Route = createFileRoute("/403")({
  head: () => ({
    meta: [
      { title: "Access denied — Blackstar" },
      { name: "description", content: "You do not have permission to view this page." },
      { property: "og:title", content: "Access denied — Blackstar" },
      { property: "og:description", content: "You do not have permission to view this page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
