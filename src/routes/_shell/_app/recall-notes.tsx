import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ZenNotes";

export const Route = createFileRoute("/_shell/_app/recall-notes")({
  head: () => ({
    meta: [
      { title: "Recall Notes — PalladiumAI" },
      { name: "description", content: "Capture, organize and promote Recall Notes into PalladiumAI Knowledge." },
      { property: "og:title", content: "Recall Notes — PalladiumAI" },
      { property: "og:description", content: "Capture, organize and promote Recall Notes into PalladiumAI Knowledge." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
