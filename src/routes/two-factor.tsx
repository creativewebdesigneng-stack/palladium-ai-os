import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/TwoFactor";

export const Route = createFileRoute("/two-factor")({
  head: () => ({
    meta: [
      { title: "Two-factor verification — PalladiumAI" },
      {
        name: "description",
        content: "Confirm your identity with a second factor to protect your workspace.",
      },
      { property: "og:title", content: "Two-factor verification — PalladiumAI" },
      {
        property: "og:description",
        content: "Confirm your identity with a second factor to protect your workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
