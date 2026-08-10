import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Payment";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Checkout — PalladiumAI" },
      {
        name: "description",
        content: "Complete your PalladiumAI subscription and activate your AI workforce.",
      },
      { property: "og:title", content: "Checkout — PalladiumAI" },
      {
        property: "og:description",
        content: "Complete your PalladiumAI subscription and activate your AI workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
