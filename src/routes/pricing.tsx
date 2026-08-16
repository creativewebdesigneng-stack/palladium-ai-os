import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — PalladiumAI" },
      {
        name: "description",
        content:
          "Paid PalladiumAI plans for operators, teams, and enterprise AI workforces, starting from £150 per month.",
      },
      { property: "og:title", content: "Pricing — PalladiumAI" },
      {
        property: "og:description",
        content:
          "Paid PalladiumAI plans for operators, teams, and enterprise AI workforces, starting from £150 per month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
