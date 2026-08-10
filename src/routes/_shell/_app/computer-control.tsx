import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ComputerControl";

export const Route = createFileRoute("/_shell/_app/computer-control")({
  head: () => ({
    meta: [
      { title: "Computer control — PalladiumAI" },
      { name: "description", content: "Let agents operate a browser and desktop safely." },
      { property: "og:title", content: "Computer control — PalladiumAI" },
      { property: "og:description", content: "Let agents operate a browser and desktop safely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
