import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/HelpCentre";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Centre — Blackstar" },
      {
        name: "description",
        content:
          "Answers, troubleshooting and onboarding help for the Blackstar operating system.",
      },
      { property: "og:title", content: "Help Centre — Blackstar" },
      {
        property: "og:description",
        content:
          "Answers, troubleshooting and onboarding help for the Blackstar operating system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
