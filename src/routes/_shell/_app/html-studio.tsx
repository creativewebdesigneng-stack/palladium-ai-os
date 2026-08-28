import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/HTMLStudio";

export const Route = createFileRoute("/_shell/_app/html-studio")({
  head: () => ({
    meta: [
      { title: "HTML Studio — PalladiumAI" },
      { name: "description", content: "Create and preview standalone HTML artifacts from source material with PalladiumAI agents." },
      { property: "og:title", content: "HTML Studio — PalladiumAI" },
      { property: "og:description", content: "Create and preview standalone HTML artifacts from source material with PalladiumAI agents." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
