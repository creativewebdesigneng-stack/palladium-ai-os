import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/BrowserPreview";

export const Route = createFileRoute("/_shell/_app/browser-preview")({
  head: () => ({
    meta: [
      { title: "Browser preview — PalladiumAI" },
      { name: "description", content: "Preview and test live web output." },
      { property: "og:title", content: "Browser preview — PalladiumAI" },
      { property: "og:description", content: "Preview and test live web output." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
