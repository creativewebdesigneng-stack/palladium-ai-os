import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Terminal";

export const Route = createFileRoute("/_shell/_app/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal — PalladiumAI" },
      { name: "description", content: "A sandboxed terminal your agents can drive." },
      { property: "og:title", content: "Terminal — PalladiumAI" },
      { property: "og:description", content: "A sandboxed terminal your agents can drive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
