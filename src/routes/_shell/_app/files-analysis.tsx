import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/FileAnalysis";

export const Route = createFileRoute("/_shell/_app/files-analysis")({
  head: () => ({
    meta: [
      { title: "File analysis — PalladiumAI" },
      { name: "description", content: "Extract insight from documents, sheets and media." },
      { property: "og:title", content: "File analysis — PalladiumAI" },
      { property: "og:description", content: "Extract insight from documents, sheets and media." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
