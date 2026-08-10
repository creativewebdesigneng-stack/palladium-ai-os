import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/BusinessIntelligence";

export const Route = createFileRoute("/_shell/_app/business-intelligence")({
  head: () => ({
    meta: [
      { title: "Business intelligence — PalladiumAI" },
      { name: "description", content: "Ask questions of your data and get decisions." },
      { property: "og:title", content: "Business intelligence — PalladiumAI" },
      { property: "og:description", content: "Ask questions of your data and get decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
