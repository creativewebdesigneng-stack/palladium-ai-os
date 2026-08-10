import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Documents";

export const Route = createFileRoute("/_shell/_app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — PalladiumAI" },
      { name: "description", content: "Draft, review and store business documents." },
      { property: "og:title", content: "Documents — PalladiumAI" },
      { property: "og:description", content: "Draft, review and store business documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
