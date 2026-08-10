import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/HelpCentre";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Centre — PalladiumAI" },
      {
        name: "description",
        content:
          "Answers, troubleshooting and onboarding help for the PalladiumAI operating system.",
      },
      { property: "og:title", content: "Help Centre — PalladiumAI" },
      {
        property: "og:description",
        content:
          "Answers, troubleshooting and onboarding help for the PalladiumAI operating system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
