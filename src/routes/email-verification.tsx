import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/EmailVerification";

export const Route = createFileRoute("/email-verification")({
  head: () => ({
    meta: [
      { title: "Verify your email — PalladiumAI" },
      {
        name: "description",
        content: "Confirm your email address to activate your PalladiumAI workspace.",
      },
      { property: "og:title", content: "Verify your email — PalladiumAI" },
      {
        property: "og:description",
        content: "Confirm your email address to activate your PalladiumAI workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
