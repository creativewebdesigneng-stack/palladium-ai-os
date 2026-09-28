import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ZenNotes";

export const Route = createFileRoute("/_shell/_app/recall-notes")({
  head: () => ({
    meta: [
      { title: "Recall Notes — Blackstar" },
      { name: "description", content: "Capture, organize and promote Recall Notes into Blackstar Knowledge." },
      { property: "og:title", content: "Recall Notes — Blackstar" },
      { property: "og:description", content: "Capture, organize and promote Recall Notes into Blackstar Knowledge." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
