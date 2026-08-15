import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Builder";

export const Route = createFileRoute("/_shell/_app/builder")({
  head: () => ({
    meta: [
      { title: "Builder — PalladiumAI" },
      { name: "description", content: "View the current PalladiumAI app-builder availability and production pipeline requirements." },
      { property: "og:title", content: "Builder — PalladiumAI" },
      { property: "og:description", content: "View the current PalladiumAI app-builder availability and production pipeline requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
