import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/GitControl";

export const Route = createFileRoute("/_shell/_app/version-control")({
  head: () => ({
    meta: [
      { title: "Version control — PalladiumAI" },
      { name: "description", content: "Branches, reviews and commits with agent assistance." },
      { property: "og:title", content: "Version control — PalladiumAI" },
      { property: "og:description", content: "Branches, reviews and commits with agent assistance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
