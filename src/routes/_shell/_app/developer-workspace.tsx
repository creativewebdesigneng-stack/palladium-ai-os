import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperWorkspace";

export const Route = createFileRoute("/_shell/_app/developer-workspace")({
  head: () => ({
    meta: [
      { title: "Developer workspace — PalladiumAI" },
      { name: "description", content: "Navigate real developer APIs and runtime capability states." },
      { property: "og:title", content: "Developer workspace — PalladiumAI" },
      { property: "og:description", content: "Navigate real developer APIs and runtime capability states." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
