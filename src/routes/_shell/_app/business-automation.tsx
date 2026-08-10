import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/BusinessAutomation";

export const Route = createFileRoute("/_shell/_app/business-automation")({
  head: () => ({
    meta: [
      { title: "Business automation — PalladiumAI" },
      { name: "description", content: "Automate back-office processes end to end." },
      { property: "og:title", content: "Business automation — PalladiumAI" },
      { property: "og:description", content: "Automate back-office processes end to end." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
