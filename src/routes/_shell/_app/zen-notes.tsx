import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ZenNotes";

export const Route = createFileRoute("/_shell/_app/zen-notes")({
  head: () => ({
    meta: [
      { title: "Zen Notes — PalladiumAI" },
      { name: "description", content: "Write, organize and promote notes into PalladiumAI Knowledge." },
      { property: "og:title", content: "Zen Notes — PalladiumAI" },
      { property: "og:description", content: "Write, organize and promote notes into PalladiumAI Knowledge." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
