import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/EmailVerification";

export const Route = createFileRoute("/email-verification")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { title: "Verify your email — Blackstar" },
      {
        name: "description",
        content: "Confirm your email address to activate your Blackstar workspace.",
      },
      { property: "og:title", content: "Verify your email — Blackstar" },
      {
        property: "og:description",
        content: "Confirm your email address to activate your Blackstar workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
